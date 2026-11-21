import {createHmac,timingSafeEqual} from "node:crypto";
const MAX_BYTES=1_000_000;
/**
 * Este modulo deve ser chamado SOMENTE pelo backend receptor HTTPS.
 * A assinatura cobre o corpo BRUTO da mensagem, antes de interpreta-la.
 */
export function assinaturaMetaValida(rawBody,signature,appSecret){
  const raw=Buffer.isBuffer(rawBody)?rawBody:Buffer.from(String(rawBody??""),"utf8");
  if(!appSecret || !Buffer.isBuffer(raw) || raw.length>MAX_BYTES || !/^sha256=[a-f\d]{64}$/i.test(String(signature??"")))return false;
  const expected=Buffer.from("sha256="+createHmac("sha256",appSecret).update(raw).digest("hex"));
  const supplied=Buffer.from(signature);
  return expected.length===supplied.length && timingSafeEqual(expected,supplied);
}
export function extrairEventosMeta(rawBody){
  const raw=Buffer.isBuffer(rawBody)?rawBody:Buffer.from(String(rawBody??""),"utf8");
  if(!raw.length||raw.length>MAX_BYTES)throw Error("Evento muito grande ou vazio");
  const parsed=JSON.parse(raw.toString("utf8"));
  if(parsed.object!=="whatsapp_business_account")throw Error("Evento não é WhatsApp Business");
  const events=[];
  for(const entry of (parsed.entry??[])){
    for(const change of (entry.changes??[])){
      if(change.field!=="messages")continue;
      const value=change.value??{},phoneId=String(value.metadata?.phone_number_id??"");
      if(!/^\d{8,32}$/.test(phoneId))continue;
      for(const m of (value.messages??[])){
        const source=String(m.from??"").replace(/\D/g,"");
        if(!/^[1-9]\d{9,14}$/.test(source)||!String(m.id??"").trim())continue;
        const text=m.type==="text"?String(m.text?.body??""):m.type==="button"?
          String(m.button?.text??""):m.type==="interactive"?
          String(m.interactive?.button_reply?.title??m.interactive?.list_reply?.title??""):"[conteúdo "+String(m.type??"não textual")+"]";
        events.push({phoneId,externalId:String(m.id),from:"+"+source,text,
          type:String(m.type??"unknown"),timestamp:m.timestamp?new Date(Number(m.timestamp)*1000).toISOString():null});
      }
    }
  }
  return events.slice(0,250);
}
/**
 * Encaminhar somente apos comparar a assinatura X-Hub-Signature-256 usando
 * o segredo do app da conta CORRESPONDENTE. Multiplos clientes nao compartilham
 * carteiras de mensagens, nem callback sem verificacao.
 */
export async function receberWebhookMeta({central,rawBody,signature,resolveSecret}){
  if(typeof resolveSecret!=="function")throw Error("Cofre de segredos indisponível");
  const events=extrairEventosMeta(rawBody);
  let added=0,duplicates=0,ignored=0;
  const validado=new Set();
  for(const e of events){
    const connection=central.store.findWhatsAppProviderId("whatsapp-cloud",e.phoneId);
    if(!connection){ignored++;continue;}
    const key=connection.tenantId+"|"+connection.id;
    if(!validado.has(key)){
      const secret=await resolveSecret(connection.secretRef);
      if(!assinaturaMetaValida(rawBody,signature,secret?.appSecret))throw Error("Assinatura Meta inválida");
      validado.add(key);
    }
    const r=central.mensagemRecebida({tenantId:connection.tenantId,connectionId:connection.id,
      externalId:e.externalId,from:e.from,to:connection.identity,text:e.text,receivedAt:e.timestamp??undefined});
    if(r.duplicate)duplicates++;else added++;
  }
  return {added,duplicates,ignored,webhookMessages:events.length};
}
