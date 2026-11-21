import {randomUUID} from "node:crypto";
import {normalizarIdentidade} from "./catalogo.mjs";

const GOOGLE="https://gmail.googleapis.com/gmail/v1/users/me";
const GRAPH="https://graph.microsoft.com/v1.0";
const SCOPES={
 gmailRead:["https://www.googleapis.com/auth/gmail.readonly","https://www.googleapis.com/auth/gmail.modify","https://mail.google.com/"],
 gmailSend:["https://www.googleapis.com/auth/gmail.send","https://www.googleapis.com/auth/gmail.compose","https://mail.google.com/"],
 graphRead:["Mail.Read","Mail.ReadWrite"],
 graphSend:["Mail.Send"]
};
const hasScope=(secret,allowed)=>Array.isArray(secret.scopes)&&secret.scopes.some(x=>allowed.includes(x));
const clean=(s,max=10000)=>{const str=String(s??"");if(str.length>max)throw Error("Campo muito longo");return str;};
const noHeaderBreak=s=>{if(/[\r\n]/.test(s))throw Error("Cabeçalho de e-mail inválido");return s;};
const extractHeaders=headers=>Object.fromEntries((headers??[]).map(h=>[String(h.name).toLowerCase(),h.value]));
const parseAddress=raw=>{const m=String(raw??"").match(/[a-zA-Z0-9.!#$%&\x27*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/);return m?m[0].toLowerCase():"";};
async function expectJson(response){
 if(!response?.ok)throw Error("Provedor recusou operação ("+(response?.status||"rede")+")");
 if(response.status===204||response.status===202)return {};
 return response.json();
}
function requireToken(secret){
 const token=String(secret?.accessToken??"");
 if(!token||token.length>4096||/[\r\n]/.test(token))throw Error("Credenciais não disponíveis");
 return token;
}
function accessAllowed(provider,connection){if(connection.provider!==provider)throw Error("Adaptador vinculado a outra conta");}
function messageMime(c,d) {
 const from=noHeaderBreak(c.identity),to=noHeaderBreak(d.to);
 const subject=base64url(d.subject); // base64url nao serve em cabeçalho RFC 2047; usar base64 normal abaixo
 const header=[
  "From: <"+from+">","To: <"+to+">",
  "Subject: =?UTF-8?B?"+Buffer.from(d.subject,"utf8").toString("base64")+"?=",
  "MIME-Version: 1.0","Content-Type: text/plain; charset=UTF-8",
  "Content-Transfer-Encoding: base64",...(
    d.kind==="campaign"&&d.unsubscribe?["List-Unsubscribe: <"+noHeaderBreak(d.unsubscribe)+">"]:[]
  ),""
 ];
 const body=Buffer.from(d.text,"utf8").toString("base64").replace(/.{1,76}/g,"$&\r\n").trimEnd();
 return Buffer.from(header.join("\r\n")+"\r\n"+body,"utf8").toString("base64url");
}
/**
 * Transportes usam credenciais provenientes EXCLUSIVAMENTE de um cofre do servidor.
 * Nao expor createAdapters ao navegador: o caller injeta resolveSecret() e fetch.
 * IMAP/SMTP e BSP precisam de transportes concretos instalados no backend.
 */
export function criarAdaptadores({resolveSecret,fetcher=fetch,imapSmtpTransport=null,bspTransport=null,webhookVerificado=async()=>false}={}){
 if(typeof resolveSecret!=="function")throw Error("Cofre de segredos obrigatório");
 const secrets=async c=>{const s=await resolveSecret(c.secretRef,{tenantId:c.tenantId,connectionId:c.id,provider:c.provider});if(!s||typeof s!=="object")throw Error("Credencial não encontrada");return s;};
 const authorized=async(c)=>({Authorization:"Bearer "+requireToken(await secrets(c))});
 return {
  "gmail-api":{
    async verify(c){
      accessAllowed("gmail-api",c);
      const secret=await secrets(c);
      const profile=await expectJson(await fetcher(GOOGLE+"/profile",{headers:{Authorization:"Bearer "+requireToken(secret)}}));
      return {authenticated:true,identity:profile.emailAddress,
        canReceive:hasScope(secret,SCOPES.gmailRead),canSend:hasScope(secret,SCOPES.gmailSend)};
    },
    async list(c,{max=20}={}){
      const h=await authorized(c);
      const url=new URL(GOOGLE+"/messages");
      url.searchParams.set("maxResults",String(Math.min(50,Math.max(1,max))));
      url.searchParams.set("labelIds","INBOX");
      const page=await expectJson(await fetcher(url,{headers:h}));
      const result=[];
      for(const m of (page.messages??[])){
        const detailed=await expectJson(await fetcher(GOOGLE+"/messages/"+encodeURIComponent(m.id)+"?format=full",{headers:h}));
        const hs=extractHeaders(detailed.payload?.headers);
        result.push({externalId:String(detailed.id),from:parseAddress(hs.from),to:hs.to??c.identity,
          subject:hs.subject??"",text:detailed.snippet??"",receivedAt:new Date(Number(detailed.internalDate)||Date.now()).toISOString()});
      }
      return result;
    },
    async send(c,d){
      const h=await authorized(c);
      const data=await expectJson(await fetcher(GOOGLE+"/messages/send",{
        method:"POST",headers:{...h,"Content-Type":"application/json"},
        body:JSON.stringify({raw:messageMime(c,d)})
      }));
      if(!data.id)throw Error("Gmail não retornou ID");
      return {externalId:String(data.id)};
    }
  },
  "microsoft-graph":{
    async verify(c){
      accessAllowed("microsoft-graph",c);
      const s=await secrets(c);
      const user=await expectJson(await fetcher(GRAPH+"/me?$select=mail,userPrincipalName",{headers:{Authorization:"Bearer "+requireToken(s)}}));
      return {authenticated:true,identity:user.mail||user.userPrincipalName,
        canReceive:hasScope(s,SCOPES.graphRead),canSend:hasScope(s,SCOPES.graphSend)};
    },
    async list(c,{max=20}={}){
      const h=await authorized(c);
      const url=GRAPH+"/me/mailFolders/inbox/messages?$top="+Math.max(1,Math.min(max,50))+
        "&$select=id,from,toRecipients,subject,bodyPreview,receivedDateTime";
      const r=await expectJson(await fetcher(url,{headers:h}));
      return (r.value??[]).map(m=>({
        externalId:m.id,from:m.from?.emailAddress?.address??"",
        to:m.toRecipients?.[0]?.emailAddress?.address??c.identity,
        subject:m.subject??"",text:m.bodyPreview??"",receivedAt:m.receivedDateTime??new Date().toISOString()
      }));
    },
    async send(c,d){
      const h=await authorized(c);
      const r=await fetcher(GRAPH+"/me/sendMail",{method:"POST",
        headers:{...h,"Content-Type":"application/json"},
        body:JSON.stringify({message:{subject:d.subject,body:{contentType:"Text",content:d.text},
          toRecipients:[{emailAddress:{address:d.to}}]},saveToSentItems:true})});
      if(!r?.ok)throw Error("Microsoft Graph recusou operação ("+(r?.status||"rede")+")");
      // Graph responde 202 Accepted (nao fornece Message ID nem comprova entrega).
      const requestId=r.headers?.get?.("request-id")||randomUUID();
      return {externalId:"graph-accepted:"+requestId,acceptedOnly:true};
    }
  },
  "imap-smtp":{
    async verify(c){
      accessAllowed("imap-smtp",c);
      if(typeof imapSmtpTransport?.verify!=="function")throw Error("Conector IMAP/SMTP não instalado");
      return imapSmtpTransport.verify(c,await secrets(c));
    },
    async list(c,options={}){
      if(typeof imapSmtpTransport?.list!=="function")throw Error("Conector IMAP não instalado");
      return imapSmtpTransport.list(c,await secrets(c),options);
    },
    async send(c,d){
      if(typeof imapSmtpTransport?.send!=="function")throw Error("Conector SMTP não instalado");
      return imapSmtpTransport.send(c,await secrets(c),d);
    }
  },
  "whatsapp-cloud":{
    async verify(c){
      accessAllowed("whatsapp-cloud",c);
      const s=await secrets(c);
      const version=/^v\d+\.\d+$/.test(s.graphVersion??"")?s.graphVersion:"v26.0";
      const data=await expectJson(await fetcher("https://graph.facebook.com/"+version+"/"+
        encodeURIComponent(c.externalAccountId)+"?fields=id,display_phone_number,verified_name",
        {headers:{Authorization:"Bearer "+requireToken(s)}}));
      if(String(data.id)!==c.externalAccountId)throw Error("Phone Number ID não confirmado");
      let number=String(data.display_phone_number??"").replace(/\D/g,"");
      // Meta geralmente retorna o codigo de pais no display_phone_number.
      const identity=normalizarIdentidade("whatsapp","+"+number);
      return {authenticated:true,identity,externalAccountId:String(data.id),
        canSend:s.allowBusinessMessages===true,
        canReceive:await webhookVerificado(c)};
    },
    async send(c,d){
      const s=await secrets(c);
      const version=/^v\d+\.\d+$/.test(s.graphVersion??"")?s.graphVersion:"v26.0";
      const message={messaging_product:"whatsapp",to:d.to.replace(/^\+/,"")};
      if(d.template?.name) {
        message.type="template";
        message.template={name:d.template.name,language:{code:d.template.language||"pt_BR"},
          ...(Array.isArray(d.template.components)?{components:d.template.components}:{})};
      } else {message.type="text";message.text={body:d.text,preview_url:false};}
      const data=await expectJson(await fetcher("https://graph.facebook.com/"+version+"/"+encodeURIComponent(c.externalAccountId)+"/messages",{
        method:"POST",
        headers:{Authorization:"Bearer "+requireToken(s),"Content-Type":"application/json"},
        body:JSON.stringify(message)
      }));
      const id=data.messages?.[0]?.id;
      if(!id)throw Error("Meta não retornou ID da mensagem");
      return {externalId:String(id)};
    }
  },
  "whatsapp-bsp":{
    async verify(c){
      if(typeof bspTransport?.verify!=="function")throw Error("BSP autorizado não instalado");
      return bspTransport.verify(c,await secrets(c));
    },
    async send(c,d){
      if(typeof bspTransport?.send!=="function")throw Error("BSP autorizado não instalado");
      return bspTransport.send(c,await secrets(c),d);
    }
  }
 };
}
