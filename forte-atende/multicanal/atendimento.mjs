import {randomUUID} from "node:crypto";

// Contrato de dominio da central compartilhada. Store em memoria SOMENTE para homologacao.
const TIPOS=new Set(["cliente","fornecedor","motorista","outro"]);
const ROLES=new Set(["master","admin","atendente"]);
const clean=(v,max=160)=>String(v??"").trim().slice(0,max);
const key=(tenant,id)=>tenant+"|"+id;
function requireActor(a){if(!a?.tenantId||!a?.userId||!ROLES.has(a.role))throw Error("Acesso não autorizado");}
export class AtendimentoCompartilhado {
 constructor({clock=()=>new Date()}={}){this.clock=clock;this.contatos=new Map();this.conversas=new Map();this.eventos=new Set();this.historico=[];}
 contato(actor,{canal="whatsapp",identidade,nome="",tipo="outro",referenciaOperacional=null}={}){
  requireActor(actor);if(!TIPOS.has(tipo))throw Error("Tipo de contato inválido");
  if(!["whatsapp","email"].includes(canal)||!clean(identidade,254))throw Error("Identidade inválida");
  const id=key(actor.tenantId,canal+":"+clean(identidade,254).toLowerCase());
  const anterior=this.contatos.get(id);
  const proximo={id,tenantId:actor.tenantId,canal,identidade:clean(identidade,254),nome:clean(nome)||anterior?.nome||"",
    tipos:[...new Set([...(anterior?.tipos||[]).filter(t=>t!=="outro"),tipo])],referenciaOperacional:referenciaOperacional??anterior?.referenciaOperacional??null,
    atualizadoPor:actor.userId,atualizadoEm:this.clock().toISOString()};
  this.contatos.set(id,proximo);return proximo;
 }
 receber({tenantId,canal,identidade,externalId,text,origin="provedor"}={}){
  if(!tenantId||!["whatsapp","email"].includes(canal)||!clean(identidade,254)||!clean(externalId,256))throw Error("Evento inválido");
  const dedup=key(tenantId,canal+":"+clean(externalId,256));
  if(this.eventos.has(dedup))return {duplicate:true};
  const id=key(tenantId,canal+":"+clean(identidade,254).toLowerCase());
  const conversa=this.conversas.get(id)||{id,tenantId,canal,identidade:clean(identidade,254),status:"pendente",responsavel:null,mensagens:[],lidaPor:[]};
  const mensagem={id:randomUUID(),externalId:clean(externalId,256),texto:clean(text,50000),origin,recebidaEm:this.clock().toISOString()};
  conversa.mensagens.push(mensagem);conversa.status="pendente";conversa.lidaPor=[];
  this.eventos.add(dedup);this.conversas.set(id,conversa);
  return {duplicate:false,conversaId:id,mensagemId:mensagem.id,encaminharOperacional:canal==="whatsapp"&&this.contatos.get(id)?.tipos.includes("fornecedor")===true};
 }
 listar(actor){requireActor(actor);return [...this.conversas.values()].filter(c=>c.tenantId===actor.tenantId&&!c.excluida).map(c=>({...c,contato:this.contatos.get(c.id)||null}));}
 marcarLida(actor,id){requireActor(actor);const c=this.conversas.get(id);if(!c||c.tenantId!==actor.tenantId)throw Error("Conversa não encontrada");c.lidaPor=[...new Set([...c.lidaPor,actor.userId])];return c;}
 assumir(actor,id){requireActor(actor);const c=this.conversas.get(id);if(!c||c.tenantId!==actor.tenantId)throw Error("Conversa não encontrada");if(c.responsavel&&c.responsavel!==actor.userId)throw Error("Atendimento já assumido por outro usuário");c.responsavel=actor.userId;c.status="em_atendimento";return c;}
 registrarResposta(actor,id,texto){requireActor(actor);const c=this.conversas.get(id);if(!c||c.tenantId!==actor.tenantId)throw Error("Conversa não encontrada");if(c.responsavel&&c.responsavel!==actor.userId)throw Error("Atendimento de outro usuário");const registro={conversaId:id,autorId:actor.userId,texto:clean(texto,8000),criadoEm:this.clock().toISOString(),status:"rascunho_nao_enviado"};if(!registro.texto)throw Error("Texto obrigatório");this.historico.push(registro);return registro;}
 resolver(actor,id){requireActor(actor);const c=this.conversas.get(id);if(!c||c.tenantId!==actor.tenantId)throw Error("Conversa não encontrada");c.status="resolvido";return c;}
 arquivar(actor,id){requireActor(actor);const c=this.conversas.get(id);if(!c||c.tenantId!==actor.tenantId)throw Error("Conversa não encontrada");c.arquivada=true;c.arquivadaPor=actor.userId;c.arquivadaEm=this.clock().toISOString();return c;}
 restaurar(actor,id){requireActor(actor);const c=this.conversas.get(id);if(!c||c.tenantId!==actor.tenantId)throw Error("Conversa não encontrada");c.arquivada=false;return c;}
 excluirMensagem(actor,id,mensagemId){requireActor(actor);if(!["master","admin"].includes(actor.role))throw Error("Exclusão exige administrador");const c=this.conversas.get(id);if(!c||c.tenantId!==actor.tenantId)throw Error("Conversa não encontrada");const m=c.mensagens.find(m=>m.id===mensagemId);if(!m)throw Error("Mensagem não encontrada");m.excluida=true;m.texto="[Mensagem removida da visualização]";m.excluidaPor=actor.userId;m.excluidaEm=this.clock().toISOString();return {id:m.id,excluida:true,escopo:"somente_forte_atende"};}
 excluirConversa(actor,id){requireActor(actor);if(!["master","admin"].includes(actor.role))throw Error("Exclusão exige administrador");const c=this.conversas.get(id);if(!c||c.tenantId!==actor.tenantId)throw Error("Conversa não encontrada");c.excluida=true;c.excluidaPor=actor.userId;c.excluidaEm=this.clock().toISOString();return {id,excluida:true,escopo:"somente_forte_atende"};}
 resumo(actor){const conversas=this.listar(actor);return {pendentes:conversas.filter(c=>c.status!=="resolvido").length,naoLidas:conversas.filter(c=>!c.lidaPor.includes(actor.userId)).length};}
}
