import test from "node:test";
import assert from "node:assert/strict";
import {listarPlugins,obterPlugin} from "./registro.mjs";
import {GerenciadorPlugins} from "./gerenciador.mjs";
import {CentralMulticanal,MemoriaDeHomologacao} from "../multicanal/central.mjs";
import {criarServidorApi} from "../multicanal/api.mjs";

const actor=(tenantId="empresa1",role="admin")=>({tenantId,role,userId:"usuario-teste"});
const central=()=>new CentralMulticanal({store:new MemoriaDeHomologacao(),adapters:{
  "gmail-api":{verify:async c=>({authenticated:true,identity:c.identity,canSend:true,canReceive:true})}
}});
const testarServidor=async(server,fn)=>{
  await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
  try{return await fn("http://127.0.0.1:"+server.address().port);}
  finally{await new Promise(ok=>server.close(ok));}
};

test("cinco plugins nativos possuem metadados e provedores reais",()=>{
 const plugs=listarPlugins();
 assert.deepEqual(plugs.map(p=>p.id),["gmail","whatsapp-business","microsoft365","email-imap","whatsapp-parceiro"]);
 assert.equal(obterPlugin("gmail").provider,"gmail-api");
 assert.equal(obterPlugin("whatsapp-business").provider,"whatsapp-cloud");
 assert.equal(obterPlugin("microsoft365").provider,"microsoft-graph");
 assert.equal(obterPlugin("email-imap").provider,"imap-smtp");
 assert.equal(obterPlugin("whatsapp-parceiro").situacaoCodigo,"interface_extensivel");
 assert.equal(listarPlugins({canal:"whatsapp"}).length,2);
 assert.equal(obterPlugin("nao-existe"),null);
});
test("instalacao cria conexao pendente, sem segredos, e permite multiplas caixas",()=>{
 const c=central(),p=new GerenciadorPlugins({central:c});
 const a=p.instalar(actor(),{pluginId:"gmail",identity:"compras@example.com",displayName:"Compras"});
 const b=p.instalar(actor(),{pluginId:"gmail",identity:"gerencia@example.com",displayName:"Gerência"});
 assert.equal(a.status,"pending");
 assert.equal(a.sendEnabled,false);
 assert.equal(a.receiveEnabled,false);
 assert.equal(Object.hasOwn(a,"secretRef"),false);
 const listed=p.catalogo(actor()).find(x=>x.id==="gmail").conexoes;
 assert.equal(listed.length,2);
 assert.equal(Object.hasOwn(listed[0],"secretRef"),false);
 assert.equal(b.identity,"gerencia@example.com");
 assert.throws(()=>p.instalar(actor(),{pluginId:"gmail",identity:"compras@example.com"}),/já conectada/);
});
test("acesso por empresa e perfis evita contas de outro tenant",()=>{
 const p=new GerenciadorPlugins({central:central()});
 p.instalar(actor("empresa1"),{pluginId:"gmail",identity:"empresa1@example.com"});
 p.instalar(actor("empresa2"),{pluginId:"gmail",identity:"empresa2@example.com"});
 assert.deepEqual(p.catalogo(actor("empresa1")).find(x=>x.id==="gmail").conexoes.map(x=>x.identity),["empresa1@example.com"]);
 assert.throws(()=>p.instalar(actor("empresa1","atendente"),{pluginId:"gmail",identity:"x@example.com"}),/não autorizado/);
 assert.throws(()=>p.instalar(actor(),{pluginId:"whatsapp-parceiro",identity:"+5564999172700"}),/depende do adaptador/);
 assert.throws(()=>p.instalar(actor(),{pluginId:"desconhecido",identity:"x@example.com"}),/não encontrado/);
});
test("OAuth falha fechado sem broker de autenticação",async()=>{
 const p=new GerenciadorPlugins({central:central()});
 const installed=p.instalar(actor(),{pluginId:"gmail",identity:"a@example.com"});
 await assert.rejects(()=>p.prepararAutorizacao(actor(),installed.id),/OAuth não configurado/);
});
test("OAuth usa URL de Google/Microsoft autorizada e rejeita sites externos",async()=>{
 const c=central();
 const broker={iniciar:async args=>({
   authorizationUrl:args.provider==="gmail-api"?
     "https://accounts.google.com/o/oauth2/v2/auth?response_type=code&state=estado-simulado":
     "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?response_type=code&state=estado-simulado"
 })};
 const p=new GerenciadorPlugins({central:c,oauthBroker:broker});
 const g=p.instalar(actor(),{pluginId:"gmail",identity:"a@example.com"});
 assert.equal((await p.prepararAutorizacao(actor(),g.id)).status,"aguardando_autorizacao_usuario");
 const m=p.instalar(actor(),{pluginId:"microsoft365",identity:"b@example.com"});
 assert.match((await p.prepararAutorizacao(actor(),m.id)).authorizationUrl,/login\.microsoftonline\.com/);
 const wa=p.instalar(actor(),{pluginId:"whatsapp-business",identity:"+5564999172700",externalAccountId:"1278417945364665"});
 assert.equal((await p.prepararAutorizacao(actor(),wa.id)).status,"aguardando_credencial_no_backend");
 p.oauthBroker={iniciar:async()=>({authorizationUrl:"https://sistema-falso.example/autorizar"})};
 await assert.rejects(()=>p.prepararAutorizacao(actor(),g.id),/não confiável/);
});
test("verificar só ativa conexão com resposta autenticada do provedor",async()=>{
 const p=new GerenciadorPlugins({central:central()});
 const c=p.instalar(actor(),{pluginId:"gmail",identity:"a@example.com"});
 const check=await p.verificar(actor(),c.id,{permitirEnvio:true,permitirRecebimento:true});
 assert.equal(check.status,"verified");
 assert.equal(check.sendEnabled,true);
 await assert.rejects(()=>p.verificar(actor("empresa2"),c.id),/não encontrada/);
});
test("rotas /api/plugins exigem sessao e nao expõem referências de segredo",async()=>{
 const p=new GerenciadorPlugins({central:central()});
 const server=criarServidorApi({central:p.central,authenticate:async()=>actor(),pluginManager:p});
 await testarServidor(server,async base=>{
   assert.equal((await fetch(base+"/api/plugins")).status,401);
   const headers={Authorization:"Bearer exemplo-teste","Content-Type":"application/json"};
   const list=await fetch(base+"/api/plugins",{headers});
   assert.equal(list.status,200);
   assert.equal((await list.json()).plugins.length,5);
   const res=await fetch(base+"/api/plugins/instalar",{method:"POST",headers,
     body:JSON.stringify({pluginId:"gmail",identity:"contato@example.com",tenantId:"empresa2",secretRef:"senha-vazada"})
   });
   assert.equal(res.status,201);
   const data=await res.json();
   assert.equal(data.connection.status,"pending");
   assert.equal(Object.hasOwn(data.connection,"secretRef"),false);
   assert.equal(p.catalogo(actor()).find(x=>x.id==="gmail").conexoes[0].identity,"contato@example.com");
   const bad=await fetch(base+"/api/plugins/instalar",{method:"POST",headers,
     body:JSON.stringify({pluginId:"nao-existe",identity:"teste@example.com"})});
   assert.equal(bad.status,400);
 });
});
