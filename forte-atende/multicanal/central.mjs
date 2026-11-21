import { randomUUID } from "node:crypto";
import { definirConexao, normalizarIdentidade } from "./catalogo.mjs";

/**
 * Repositorio EM MEMORIA, somente para testes e desenvolvimento.
 * Producao exige armazenamento transacional, RLS, filas e deduplicacao persistente.
 */
export class MemoriaDeHomologacao {
  constructor(){this.connections=new Map();this.messages=new Map();this.drafts=new Map();}
  key(tenantId,id){return tenantId+"|"+id;}
  addConnection(c){
    if(this.connections.has(this.key(c.tenantId,c.id)))throw Error("Conexão já cadastrada");
    for(const other of this.connections.values()){
      if(other.tenantId===c.tenantId && other.canal===c.canal && other.identity===c.identity) throw Error("Identidade já conectada nesta empresa");
      if(c.canal==="whatsapp" && other.provider===c.provider && other.externalAccountId===c.externalAccountId)throw Error("Número já vinculado a outra conexão");
    }
    this.connections.set(this.key(c.tenantId,c.id),c);return c;
  }
  getConnection(tenantId,id){return this.connections.get(this.key(tenantId,id))??null;}
  updateConnection(c){this.connections.set(this.key(c.tenantId,c.id),c);return c;}
  listConnections(tenantId){return [...this.connections.values()].filter(c=>c.tenantId===tenantId);}
  findWhatsAppProviderId(provider,externalId){
    return [...this.connections.values()].find(c=>c.provider===provider && c.externalAccountId===String(externalId) && c.status==="verified" && c.receiveEnabled)??null;
  }
  addInbound(m){
    const key=this.key(m.tenantId,m.connectionId)+"|"+m.externalId;
    if(this.messages.has(key))return {message:this.messages.get(key),duplicate:true};
    this.messages.set(key,m);
    return {message:m,duplicate:false};
  }
  listMessages(tenantId,{connectionId,limit=100}={}){
    return [...this.messages.values()]
      .filter(m=>m.tenantId===tenantId&&(!connectionId||m.connectionId===connectionId))
      .sort((a,b)=>b.receivedAt.localeCompare(a.receivedAt)).slice(0,Math.max(0,Math.min(limit,200)));
  }
  putDraft(d){this.drafts.set(this.key(d.tenantId,d.id),d);return d;}
  getDraft(tenantId,id){return this.drafts.get(this.key(tenantId,id))??null;}
}
const PERMISSOES={
  cadastro:new Set(["master","admin"]),
  consulta:new Set(["master","admin","atendente"]),
  redacao:new Set(["master","admin","atendente"]),
  aprovacao:new Set(["master","admin"])
};
function autorizar(actor,tipo){
  if(!actor||typeof actor.tenantId!=="string"||!actor.tenantId||typeof actor.userId!=="string"||!actor.userId||!PERMISSOES[tipo].has(actor.role)) throw Error("Acesso não autorizado");
}
function textoCurto(s,max=8000){if(typeof s!=="string"||!s.trim()||s.length>max)throw Error("Texto obrigatório ou muito longo");return s.trim();}
export class CentralMulticanal {
  constructor({store=new MemoriaDeHomologacao(),adapters={},clock=()=>new Date()}={}){
    this.store=store;this.adapters=adapters;this.clock=clock;
  }
  conexoes(actor){autorizar(actor,"consulta");return this.store.listConnections(actor.tenantId).map(({secretRef,...visible})=>visible);}
  registrar(actor,input){
    autorizar(actor,"cadastro");
    const c=definirConexao({...input,tenantId:actor.tenantId,id:input.id||randomUUID()});
    return this.store.addConnection(c);
  }
  async validar(actor,id,{permitirEnvio=false,permitirRecebimento=true}={}){
    autorizar(actor,"cadastro");
    const c=this.store.getConnection(actor.tenantId,id);
    if(!c)throw Error("Conexão não encontrada");
    const adapter=this.adapters[c.provider];
    if(typeof adapter?.verify!=="function")throw Error("Adaptador de verificação indisponível");
    // Só o servidor pode injetar este adaptador; o cliente nunca decide que uma conta é verificada.
    const result=await adapter.verify(c);
    const identity=result?.identity;
    if(typeof identity!=="string"||normalizarIdentidade(c.canal,identity)!==c.identity || result?.authenticated!==true)
      throw Error("Credenciais não correspondem à identidade vinculada");
    if(c.externalAccountId && result.externalAccountId && String(result.externalAccountId)!==c.externalAccountId)
      throw Error("ID externo divergente");
    if(permitirEnvio && result.canSend!==true)throw Error("O provedor não concedeu permissão de envio");
    if(permitirRecebimento && result.canReceive!==true)throw Error("O provedor não concedeu permissão de leitura");
    const next=Object.freeze({...c,status:"verified",verifiedAt:this.clock().toISOString(),
      sendEnabled:Boolean(permitirEnvio),receiveEnabled:Boolean(permitirRecebimento)});
    this.store.updateConnection(next);
    return {id:next.id,status:next.status,sendEnabled:next.sendEnabled,receiveEnabled:next.receiveEnabled};
  }
  mensagemRecebida({tenantId,connectionId,externalId,from,to,text,receivedAt,originalRecipient=null}){
    // Exclusivo do backend autenticado/webhook com assinatura verificada. Nunca expor diretamente ao cliente.
    const c=this.store.getConnection(tenantId,connectionId);
    if(!c||c.status!=="verified"||!c.receiveEnabled)throw Error("Conexão de recebimento não verificada");
    if(typeof externalId!=="string"||!externalId.trim()||externalId.length>256)throw Error("ID externo inválido");
    const sender=normalizarIdentidade(c.canal,from);
    const recipient=normalizarIdentidade(c.canal,to);
    if(recipient!==c.identity)throw Error("Mensagem destinada a outra conta");
    const m={id:randomUUID(),tenantId,connectionId,canal:c.canal,externalId:externalId.trim(),
      from:sender,to:recipient,originalRecipient:originalRecipient?String(originalRecipient).slice(0,254):null,
      text:typeof text==="string"?text.slice(0,50000):"",
      receivedAt:receivedAt||this.clock().toISOString()};
    return this.store.addInbound(m);
  }
  async sincronizarCaixa(actor,connectionId,{max=20}={}){
    autorizar(actor,"consulta");
    const c=this.store.getConnection(actor.tenantId,connectionId);
    if(!c||c.canal!=="email"||c.status!=="verified"||!c.receiveEnabled)throw Error("Caixa não autorizada para leitura");
    const adapter=this.adapters[c.provider];
    if(typeof adapter?.list!=="function")throw Error("Provedor sem leitura implementada");
    const entries=await adapter.list(c,{max:Math.max(1,Math.min(Number(max)||20,50))});
    if(!Array.isArray(entries))throw Error("Resposta inválida da caixa postal");
    let added=0,duplicates=0,ignored=0;
    for(const e of entries.slice(0,50)){
      try{
        const inbox=this.mensagemRecebida({tenantId:c.tenantId,connectionId:c.id,
          externalId:String(e.externalId??""),from:e.from,to:c.identity,
          originalRecipient:String(e.to??""),text:String(e.text??""),receivedAt:e.receivedAt});
        if(inbox.duplicate)duplicates++;else added++;
      }catch{ignored++;}
    }
    return {added,duplicates,ignored};
  }
  caixaEntrada(actor,filters={}){
    autorizar(actor,"consulta");
    if(filters.connectionId&&!this.store.getConnection(actor.tenantId,filters.connectionId))throw Error("Conexão de outra empresa");
    return this.store.listMessages(actor.tenantId,filters);
  }
  rascunho(actor,{connectionId,to,subject="",text,kind="service",template=null,replyWindowEndsAt=null,consent=false,unsubscribe=""}){
    autorizar(actor,"redacao");
    const c=this.store.getConnection(actor.tenantId,connectionId);
    if(!c)throw Error("Conexão indisponível");
    const destination=normalizarIdentidade(c.canal,to);
    const body=textoCurto(text);
    if(!["service","campaign"].includes(kind))throw Error("Tipo de mensagem inválido");
    if(c.canal==="email" && (!subject||typeof subject!=="string"||subject.length>180||/[\r\n]/.test(subject)))throw Error("Assunto inválido");
    if(kind==="campaign"&&!consent)throw Error("Campanha exige autorização do destinatário");
    if(kind==="campaign"&&c.canal==="email"&&!c.settings?.emailMarketingVerified)throw Error("Exige provedor de e-mail marketing homologado");
    if(kind==="campaign"&&c.canal==="email"&&(!unsubscribe||!/^https:\/\//.test(unsubscribe)))throw Error("Descadastro HTTPS obrigatório");
    if(c.canal==="whatsapp"){
      const insideWindow=replyWindowEndsAt && new Date(replyWindowEndsAt).getTime()>this.clock().getTime();
      if(!insideWindow&&!template?.name)throw Error("Fora da janela de serviço: template aprovado obrigatório");
      if(kind==="campaign"&&template?.category!=="MARKETING")throw Error("Campanha WhatsApp exige template de marketing");
    }
    return this.store.putDraft({id:randomUUID(),tenantId:actor.tenantId,connectionId,
      to:destination,subject,text:body,kind,template,unsubscribe,consent,
      status:"draft",createdBy:actor.userId,createdAt:this.clock().toISOString(),approvedBy:null});
  }
  aprovar(actor,draftId){
    autorizar(actor,"aprovacao");
    const d=this.store.getDraft(actor.tenantId,draftId);
    if(!d||d.status!=="draft")throw Error("Rascunho indisponível para aprovação");
    return this.store.putDraft({...d,status:"approved",approvedBy:actor.userId,approvedAt:this.clock().toISOString()});
  }
  async enviarAprovado(actor,draftId){
    autorizar(actor,"redacao");
    const d=this.store.getDraft(actor.tenantId,draftId);
    if(!d||d.status!=="approved"||!d.approvedBy)throw Error("Mensagem não aprovada");
    const c=this.store.getConnection(actor.tenantId,d.connectionId);
    if(!c||c.status!=="verified"||!c.sendEnabled)throw Error("Conta não habilitada para envio");
    const adapter=this.adapters[c.provider];
    if(typeof adapter?.send!=="function")throw Error("Provedor não possui serviço de envio");
    // Reserva ANTES do contato externo: falha de rede -> estado incerto; nunca repetir cegamente.
    this.store.putDraft({...d,status:"sending",sendingAt:this.clock().toISOString()});
    try{
      const sent=await adapter.send(c,d);
      if(!sent?.externalId)throw Error("Resposta do provedor sem ID de envio");
      return this.store.putDraft({...d,status:sent.acceptedOnly?"accepted":"sent",externalId:String(sent.externalId),
        sentAt:this.clock().toISOString()});
    }catch(e){
      this.store.putDraft({...d,status:"unknown",errorCode:"DELIVERY_UNCERTAIN"});
      throw Error("Envio incerto; conferir no provedor antes de repetir");
    }
  }
}
