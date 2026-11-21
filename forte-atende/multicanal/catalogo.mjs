/**
 * FORTE ATENDE: catalogo extensivel de provedores.
 * Nao e possivel integrar automaticamente WhatsApp pessoal: usar API Business oficial
 * ou um BSP autorizado. "Qualquer e-mail" = conta com OAuth/API ou IMAP+SMTP habilitados.
 * Este modulo nao contem tokens nem realiza conexao.
 */
export const PROVEDORES = Object.freeze({
  "gmail-api": Object.freeze({ canal:"email", nome:"Gmail / Google Workspace", recepcao:"gmail-api", envio:"gmail-api", autenticacao:"oauth2" }),
  "microsoft-graph": Object.freeze({ canal:"email", nome:"Outlook / Microsoft 365", recepcao:"graph-api", envio:"graph-api", autenticacao:"oauth2" }),
  "imap-smtp": Object.freeze({ canal:"email", nome:"E-mail IMAP + SMTP (Hostinger e outros)", recepcao:"imap", envio:"smtp", autenticacao:"credencial-servidor-ou-oauth2" }),
  "whatsapp-cloud": Object.freeze({ canal:"whatsapp", nome:"WhatsApp Business Cloud API (Meta)", recepcao:"webhook-meta", envio:"graph-api", autenticacao:"token-servidor" }),
  "whatsapp-bsp": Object.freeze({ canal:"whatsapp", nome:"WhatsApp Business via provedor oficial (BSP)", recepcao:"webhook-provedor", envio:"api-provedor", autenticacao:"credencial-servidor" })
});
export function listarProvedores(canal) {
  const xs=Object.entries(PROVEDORES).filter(([,p])=>!canal||p.canal===canal);
  return xs.map(([id,p])=>({id,...p}));
}
export function normalizarIdentidade(canal,valor) {
  const s=String(valor??"").trim();
  if(canal==="email") {
    if(s.length>254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s)) throw Error("E-mail inválido");
    return s.toLowerCase();
  }
  if(canal==="whatsapp") {
    const d=s.replace(/[^\d+]/g,"");
    if(!/^\+[1-9]\d{9,14}$/.test(d))throw Error("Número WhatsApp deve estar em formato internacional E.164");
    return d;
  }
  throw Error("Canal não suportado");
}
export function definirConexao({id,tenantId,provider,identity,secretRef,externalAccountId,settings={}}) {
  if(!/^[a-zA-Z0-9_-]{3,100}$/.test(String(tenantId??"")))throw Error("Empresa inválida");
  if(!/^[a-zA-Z0-9_-]{3,100}$/.test(String(id??"")))throw Error("ID de conexão inválido");
  const tipo=PROVEDORES[provider];
  if(!tipo)throw Error("Provedor desconhecido");
  if(!/^[a-zA-Z0-9/_-]{3,180}$/.test(String(secretRef??"")))throw Error("Referência de segredo inválida");
  if(settings?.accessToken||settings?.password||settings?.secret||settings?.apiKey)throw Error("Credenciais não podem ser armazenadas na configuração");
  if(provider==="whatsapp-cloud" && !/^\d{8,32}$/.test(String(externalAccountId??"")))throw Error("Phone Number ID obrigatório na Meta");
  if(provider==="whatsapp-bsp" && !String(externalAccountId??"").trim())throw Error("ID da conta no BSP obrigatório");
  return Object.freeze({
    id:String(id),tenantId:String(tenantId),provider,canal:tipo.canal,
    identity:normalizarIdentidade(tipo.canal,identity),
    secretRef:String(secretRef),externalAccountId:String(externalAccountId??"").trim(),
    settings:Object.freeze({...settings}),
    status:"pending",sendEnabled:false,receiveEnabled:false,
    verifiedAt:null
  });
}
