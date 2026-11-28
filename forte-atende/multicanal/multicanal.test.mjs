import test from "node:test";
import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {listarProvedores,definirConexao} from "./catalogo.mjs";
import {CentralMulticanal,MemoriaDeHomologacao} from "./central.mjs";
import {criarAdaptadores} from "./adaptadores.mjs";
import {extrairEventosMeta,assinaturaMetaValida,receberWebhookMeta} from "./webhook-meta.mjs";
import {criarTransporteImapSmtp} from "./transporte-imap-smtp.mjs";

const admin=(tenantId="empresa1")=>({tenantId,userId:"master-1",role:"master"});
const atendente=(tenantId="empresa1")=>({tenantId,userId:"atendente-2",role:"atendente"});
const mockAdapters={
 "gmail-api":{
   verify:async c=>({authenticated:true,identity:c.identity,canSend:true,canReceive:true}),
   list:async c=>[{externalId:"m1",from:"cliente@example.com",to:"orcamentos@example.com",text:"teste",
                 receivedAt:"2026-11-20T12:00:00Z"}],
   send:async()=>({externalId:"sent-001"})
 },
 "whatsapp-cloud":{
   verify:async c=>({authenticated:true,identity:c.identity,externalAccountId:c.externalAccountId,canSend:true,canReceive:true}),
   send:async()=>({externalId:"wamid.001"})
 }
};
function setup(){
 const service=new CentralMulticanal({store:new MemoriaDeHomologacao(),adapters:mockAdapters,clock:()=>new Date("2026-11-20T13:00:00Z")});
 return service;
}
test("catalogo admite multiplos provedores em ambos os canais",()=>{
 assert.ok(listarProvedores("email").some(x=>x.id==="gmail-api"));
 assert.ok(listarProvedores("email").some(x=>x.id==="microsoft-graph"));
 assert.ok(listarProvedores("email").some(x=>x.id==="imap-smtp"));
 assert.ok(listarProvedores("whatsapp").some(x=>x.id==="whatsapp-cloud"));
 assert.ok(listarProvedores("whatsapp").some(x=>x.id==="whatsapp-bsp"));
});
test("cadastro exige cofre e recusa tokens e configuracao nao homologada",()=>{
 const input={id:"email01",tenantId:"empresa1",provider:"gmail-api",identity:"pessoa@example.com",secretRef:"vault/empresa1/email01"};
 assert.equal(definirConexao(input).status,"pending");
 assert.throws(()=>definirConexao({...input,settings:{accessToken:"vazamento"}}),/sensível|permitida/);
 assert.throws(()=>definirConexao({...input,secretRef:"senha simples com espacos"}),/segredo/);
 assert.equal(definirConexao({...input,settings:{displayName:"Caixa",forwardedAliases:["gerencia@example.com"]}}).settings.emailMarketingVerified,false);
});
test("cada empresa enxerga apenas suas conexoes e nao pode consultar as de outra",()=>{
 const s=setup();
 s.registrar(admin(),{id:"email01",provider:"gmail-api",identity:"a@example.com",secretRef:"vault/empresa1/email01"});
 s.registrar(admin("empresa2"),{id:"email02",provider:"gmail-api",identity:"b@example.com",secretRef:"vault/empresa2/email02"});
 assert.equal(s.conexoes(admin()).length,1);
 assert.equal(s.conexoes(admin("empresa2"))[0].identity,"b@example.com");
 assert.equal("secretRef" in s.conexoes(admin())[0],false);
 assert.throws(()=>s.caixaEntrada(admin("empresa2"),{connectionId:"email01"}),/outra empresa/);
 assert.throws(()=>s.registrar(atendente(),{id:"email03",provider:"gmail-api",identity:"c@example.com",secretRef:"vault/empresa1/email03"}),/não autorizado/);
});
test("conta nao pode ativar envio sem verificacao real do adaptador",async()=>{
 const s=setup();
 s.registrar(admin(),{id:"email01",provider:"gmail-api",identity:"a@example.com",secretRef:"vault/empresa1/email01"});
 const d=s.rascunho(admin(),{connectionId:"email01",to:"cliente@example.com",subject:"Teste",text:"Olá"});
 assert.equal(d.status,"draft");
 await assert.rejects(()=>s.enviarAprovado(admin(),d.id),/não aprovada/);
});
test("sincronizacao idempotente preserva destinatario original encaminhado",async()=>{
 const s=setup();
 s.registrar(admin(),{id:"email01",provider:"gmail-api",identity:"central@example.com",secretRef:"vault/empresa1/email01"});
 await s.validar(admin(),"email01",{permitirRecebimento:true,permitirEnvio:false});
 const a=await s.sincronizarCaixa(admin(),"email01");
 const b=await s.sincronizarCaixa(admin(),"email01");
 assert.deepEqual([a.added,a.duplicates,b.added,b.duplicates],[1,0,0,1]);
 const m=s.caixaEntrada(admin())[0];
 assert.equal(m.to,"central@example.com");
 assert.equal(m.originalRecipient,"orcamentos@example.com");
 assert.equal(s.caixaEntrada(admin("empresa2")).length,0);
});
test("resposta requer identidade verificada, aprovacao e idempotencia",async()=>{
 const s=setup();
 s.registrar(admin(),{id:"email01",provider:"gmail-api",identity:"a@example.com",secretRef:"vault/empresa1/email01"});
 const d=s.rascunho(atendente(),{connectionId:"email01",to:"cliente@example.com",subject:"Oi",text:"Olá!"});
 await assert.rejects(()=>s.enviarAprovado(admin(),d.id),/não aprovada/);
 s.aprovar(admin(),d.id);
 await assert.rejects(()=>s.enviarAprovado(admin(),d.id),/não habilitada/);
 await s.validar(admin(),"email01",{permitirEnvio:true,permitirRecebimento:true});
 const sent=await s.enviarAprovado(atendente(),d.id);
 assert.equal(sent.status,"sent");
 assert.equal(sent.externalId,"sent-001");
 await assert.rejects(()=>s.enviarAprovado(admin(),d.id),/não aprovada/);
});
test("falha de envio vira status incerto e nao repete tentativa",async()=>{
 const s=new CentralMulticanal({adapters:{"gmail-api":{
   verify:async c=>({authenticated:true,identity:c.identity,canSend:true,canReceive:true}),
   send:async()=>{throw Error("timeout")}
 }}});
 s.registrar(admin(),{id:"email01",provider:"gmail-api",identity:"a@example.com",secretRef:"vault/email01"});
 await s.validar(admin(),"email01",{permitirEnvio:true});
 const d=s.rascunho(admin(),{connectionId:"email01",to:"cliente@example.com",subject:"Olá",text:"Teste"});
 s.aprovar(admin(),d.id);
 await assert.rejects(()=>s.enviarAprovado(admin(),d.id),/Envio incerto/);
 assert.equal(s.store.getDraft("empresa1",d.id).status,"unknown");
 await assert.rejects(()=>s.enviarAprovado(admin(),d.id),/não aprovada/);
});
test("campanha de email bloqueada sem servico marketing mesmo com consentimento",()=>{
 const s=setup();
 s.registrar(admin(),{id:"email01",provider:"gmail-api",identity:"a@example.com",secretRef:"vault/email01"});
 assert.throws(()=>s.rascunho(admin(),{connectionId:"email01",to:"dest@example.com",subject:"Oferta",text:"Cimento",kind:"campaign",consent:true,unsubscribe:"https://example.com/unsubscribe"}),/marketing homologado/);
});
test("WhatsApp exige janela de atendimento ou template; marketing exige tipo correto",async()=>{
 const s=setup();
 s.registrar(admin(),{id:"wa001",provider:"whatsapp-cloud",identity:"+5564999172700",externalAccountId:"1278417945364665",secretRef:"vault/wa001"});
 assert.throws(()=>s.rascunho(admin(),{connectionId:"wa001",to:"+5564999993333",text:"Olá"}),/template aprovado/);
 const reply=s.rascunho(admin(),{connectionId:"wa001",to:"+5564999993333",text:"Olá",replyWindowEndsAt:"2026-11-20T15:00:00Z"});
 assert.equal(reply.kind,"service");
 assert.throws(()=>s.rascunho(admin(),{connectionId:"wa001",to:"+5564999993333",text:"Oferta",kind:"campaign",consent:true,template:{name:"pedido"}}),/template de marketing/);
 const campaign=s.rascunho(admin(),{connectionId:"wa001",to:"+5564999993333",text:"Oferta",kind:"campaign",consent:true,template:{name:"oferta_aprovada",category:"MARKETING"}});
 assert.equal(campaign.kind,"campaign");
});
function webhookFixture(phoneId="1278417945364665"){
 const event={
   object:"whatsapp_business_account",
   entry:[{
     changes:[{
       field:"messages",
       value:{
         metadata:{phone_number_id:phoneId},
         messages:[{
           id:"wamid.test-99",
           from:"5534999993333",
           type:"text",
           text:{body:"Olá"},
           timestamp:"1795179600"
         }]
       }
     }]
   }]
 };
 return Buffer.from(JSON.stringify(event));
}
test("webhook verifica HMAC, registra por numero e nao duplica",async()=>{
 const s=setup();
 s.registrar(admin(),{id:"wa001",provider:"whatsapp-cloud",identity:"+5564999172700",externalAccountId:"1278417945364665",secretRef:"vault/wa001"});
 await s.validar(admin(),"wa001");
 const raw=webhookFixture(),secret="sample-app-secret";
 const signature="sha256="+createHmac("sha256",secret).update(raw).digest("hex");
 assert.equal(assinaturaMetaValida(raw,signature,secret),true);
 assert.equal(assinaturaMetaValida(raw,signature,"outro"),false);
 assert.equal(extrairEventosMeta(raw).length,1);
 const params={central:s,rawBody:raw,signature,resolveSecret:async()=>({appSecret:secret})};
 const a=await receberWebhookMeta(params);
 const b=await receberWebhookMeta(params);
 assert.deepEqual([a.added,a.duplicates,b.added,b.duplicates],[1,0,0,1]);
 assert.equal(s.caixaEntrada(admin())[0].from,"+5534999993333");
 await assert.rejects(()=>receberWebhookMeta({...params,signature:"sha256="+"0".repeat(64)}),/Assinatura Meta inválida/);
});
test("webhook de numero inexistente nao e atribuido a outra empresa",async()=>{
 const s=setup(),raw=webhookFixture("99999999999");
 const r=await receberWebhookMeta({central:s,rawBody:raw,signature:"invalid",resolveSecret:async()=>({})});
 assert.equal(r.added,0);
 assert.equal(r.ignored,1);
});
test("adaptador Gmail valida a identidade e constroi MIME com assunto UTF-8",async()=>{
 const requests=[];
 const fetcher=async(url,opt={})=>{
  requests.push({url:String(url),opt});
  if(String(url).endsWith("/profile"))return new Response(JSON.stringify({emailAddress:"a@example.com"}),{status:200});
  if(String(url).endsWith("/messages/send"))return new Response(JSON.stringify({id:"gmail-abc"}),{status:200});
  throw Error("URL inesperada "+url);
 };
 const adapters=criarAdaptadores({fetcher,resolveSecret:async()=>({accessToken:"oauth-test",scopes:[
 "https://www.googleapis.com/auth/gmail.send","https://www.googleapis.com/auth/gmail.readonly"
 ]})});
 const c=definirConexao({id:"mail001",tenantId:"empresa1",provider:"gmail-api",identity:"a@example.com",secretRef:"vault/mail001"});
 const verified=await adapters["gmail-api"].verify(c);
 assert.equal(verified.identity,"a@example.com");assert.equal(verified.canSend,true);
 const result=await adapters["gmail-api"].send(c,{to:"b@example.com",subject:"Promoção",text:"Olá mundo",kind:"service"});
 assert.equal(result.externalId,"gmail-abc");
 const sent=JSON.parse(requests.at(-1).opt.body).raw;
 const raw=Buffer.from(sent,"base64url").toString("utf8");
 assert.match(raw,/To: <b@example.com>/);assert.match(raw,/Subject: =\?UTF-8\?B\?/);
 assert.match(raw,/T2zDoSBtdW5kbw==/); // texto "Olá mundo" em base64
});
test("Graph retorna aceite, nao uma entrega, e BSP permanece modular",async()=>{
 const fetcher=async(url,opt={})=>{
  if(String(url).includes("/me?$select"))return new Response(JSON.stringify({mail:"a@example.com"}),{status:200});
  if(String(url).endsWith("/me/sendMail"))return new Response(null,{status:202,headers:{"request-id":"example-request"}});
  throw Error("URL inesperada");
 };
 const adapters=criarAdaptadores({fetcher,resolveSecret:async()=>({accessToken:"oauth-test",scopes:["Mail.Read","Mail.Send"]})});
 const c=definirConexao({id:"graph001",tenantId:"empresa1",provider:"microsoft-graph",identity:"a@example.com",secretRef:"vault/graph001"});
 assert.equal((await adapters["microsoft-graph"].verify(c)).canReceive,true);
 const r=await adapters["microsoft-graph"].send(c,{to:"b@example.com",subject:"Olá",text:"Oi"});
 assert.equal(r.acceptedOnly,true);
 assert.equal(r.externalId,"graph-accepted:example-request");
 const imap=definirConexao({id:"imap001",tenantId:"empresa1",provider:"imap-smtp",identity:"c@example.com",secretRef:"vault/imap001"});
 await assert.rejects(()=>adapters["imap-smtp"].verify(imap),/não instalado/);
});

test("IMAP SMTP serve qualquer caixa com TLS, identidade de envio verificada e sem rede no teste",async()=>{
 class FakeImap {
   constructor(config){assert.equal(config.secure,true);this.mailbox={exists:1,uidValidity:42};}
   async connect(){return true;}
   async getMailboxLock(){return {release(){}};}
   async *fetch(){yield {uid:16,source:Buffer.from("mime")};}
   async logout(){}
 }
 const sent=[];
 const nodemailer={createTransport:opts=>({async verify(){return true;},async sendMail(d){sent.push(d);return {messageId:"<fake-123@example.com>"};},close(){}})};
 const simpleParser=async()=>({from:{value:[{address:"cliente@example.com"}]},to:{value:[{address:"suporte@example.com"}]},subject:"Pedido",text:"Mensagem",date:new Date("2026-11-20T10:00:00Z")});
 const driver=criarTransporteImapSmtp({ImapFlow:FakeImap,nodemailer,simpleParser});
 const c=definirConexao({id:"imap001",tenantId:"empresa1",provider:"imap-smtp",identity:"suporte@example.com",secretRef:"vault/imap001"});
 const secret={imap:{host:"imap.example.com",port:993,user:"suporte@example.com",password:"nao-real"},smtp:{host:"smtp.example.com",port:465,user:"suporte@example.com",password:"nao-real"},verifiedSender:"suporte@example.com"};
 const check=await driver.verify(c,secret);
 assert.deepEqual([check.authenticated,check.canReceive,check.canSend],[true,true,true]);
 const m=await driver.list(c,secret);
 assert.equal(m[0].externalId,"42:16");
 assert.equal(m[0].text,"Mensagem");
 const r=await driver.send(c,secret,{to:"cliente@example.com",subject:"Re: Pedido",text:"Olá"});
 assert.equal(r.acceptedOnly,true);
 assert.equal(sent[0].from,"suporte@example.com");
 assert.equal(sent[0].to,"cliente@example.com");
 await assert.rejects(()=>driver.send(c,{...secret,verifiedSender:"qualquer@example.com"},{to:"cliente@example.com",subject:"Oi",text:"Teste"}),/não verificada/);
 await assert.rejects(()=>driver.list(c,{...secret,imap:{...secret.imap,port:143}}),/TLS/);
});

test("envio promocional exige prova de opt-in e template aprovados no backend",async()=>{
 const s=setup();
 s.registrar(admin(),{id:"wa002",provider:"whatsapp-cloud",identity:"+5564999172700",
   externalAccountId:"1278417945364665",secretRef:"vault/wa002"});
 await s.validar(admin(),"wa002",{permitirEnvio:true,permitirRecebimento:true});
 const draft=s.rascunho(admin(),{connectionId:"wa002",to:"+5564999993333",text:"Oferta de cimento",
   kind:"campaign",consent:true,consentReference:"consent-record-1",
   template:{name:"oferta_aprovada",category:"MARKETING"}});
 s.aprovar(admin(),draft.id);
 await assert.rejects(()=>s.enviarAprovado(admin(),draft.id),/Consentimento/);
 assert.equal(s.store.getDraft("empresa1",draft.id).status,"approved");
 s.consentVerifier=async()=>true;
 await assert.rejects(()=>s.enviarAprovado(admin(),draft.id),/Template WhatsApp/);
 s.templateVerifier=async()=>true;
 const result=await s.enviarAprovado(admin(),draft.id);
 assert.equal(result.status,"sent");
 assert.equal(result.externalId,"wamid.001");
});
test("provedor que apenas aceitou SMTP/Graph nao significa entrega confirmada",async()=>{
 const s=new CentralMulticanal({adapters:{"gmail-api":{
   verify:async c=>({authenticated:true,identity:c.identity,canSend:true,canReceive:true}),
   send:async()=>({externalId:"accepted-id",acceptedOnly:true})
 }}});
 s.registrar(admin(),{id:"email777",provider:"gmail-api",identity:"contato@example.com",secretRef:"vault/777"});
 await s.validar(admin(),"email777",{permitirEnvio:true});
 const draft=s.rascunho(admin(),{connectionId:"email777",to:"cliente@example.com",subject:"Olá",text:"Oi"});
 s.aprovar(admin(),draft.id);
 const r=await s.enviarAprovado(admin(),draft.id);
 assert.equal(r.status,"accepted");
});
