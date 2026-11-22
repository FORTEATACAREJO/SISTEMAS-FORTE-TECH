import {randomUUID} from "node:crypto";
import {listarPlugins,obterPlugin} from "./registro.mjs";

/**
 * Gestor de plugins para o backend do FORTE ATENDE.
 * Instalar = cadastrar conexao PENDENTE; nao cria/usa credenciais automaticamente.
 * O host injeta um broker OAuth autenticado quando a integracao esta configurada.
 */
export class GerenciadorPlugins {
  constructor({central,oauthBroker=null}={}){
    if(!central)throw Error("Central Multicanal obrigatória");
    this.central=central;
    this.oauthBroker=oauthBroker;
  }
  async catalogo(actor,{canal}={}){
    // Validar assinatura/sessao pelo host ANTES de chamar este método;
    // central.conexoes ainda valida vinculo e perfil do actor.
    const minhas=await this.central.conexoes(actor);
    return listarPlugins({canal}).map(p=>({
      ...p,
      conexoes:minhas.filter(c=>c.provider===p.provider).map(c=>({
        id:c.id,identity:c.identity,status:c.status,
        sendEnabled:c.sendEnabled,receiveEnabled:c.receiveEnabled,
        externalAccountId:c.externalAccountId||null
      }))
    }));
  }
  async instalar(actor,{pluginId,identity,externalAccountId="",displayName="",forwardedAliases=[]}={}){
    if(!["master","admin"].includes(actor?.role))throw Error("Acesso não autorizado");
    const p=obterPlugin(pluginId);
    if(!p)throw Error("Plugin não encontrado");
    if(p.situacaoCodigo==="interface_extensivel")throw Error("Instalação depende do adaptador de parceiro");
    const id=randomUUID();
    // Caminho opaco: quem cria a credencial e o host, com vault e RBAC.
    const secretRef="forte-atende/"+actor.tenantId+"/"+id;
    const c=await this.central.registrar(actor,{
      id,provider:p.provider,identity,
      externalAccountId,secretRef,settings:{displayName,forwardedAliases}
    });
    return {id:c.id,pluginId:p.id,provider:c.provider,identity:c.identity,
      status:c.status,sendEnabled:c.sendEnabled,receiveEnabled:c.receiveEnabled,
      proximoPasso:p.autenticacao==="oauth2"?"autorizar_oauth_no_servidor":"configurar_credencial_no_cofre"};
  }
  async prepararAutorizacao(actor,connectionId){
    if(!["master","admin"].includes(actor?.role))throw Error("Acesso não autorizado");
    const c=await this.central.store.getConnection(actor.tenantId,connectionId,actor);
    if(!c)throw Error("Conexão não encontrada");
    const p=listarPlugins().find(x=>x.provider===c.provider);
    if(!p)throw Error("Plugin não reconhecido");
    if(p.autenticacao!=="oauth2"){
      return {status:"aguardando_credencial_no_backend",pluginId:p.id,
        instrucao:"Associe a conta autorizada ao cofre seguro do servidor e execute a verificação; nunca inclua tokens no GitHub."};
    }
    if(typeof this.oauthBroker?.iniciar!=="function") throw Error("Serviço OAuth não configurado");
    const r=await this.oauthBroker.iniciar({
      tenantId:actor.tenantId,userId:actor.userId,connectionId:c.id,
      provider:c.provider,scopes:p.escopos
    });
    const url=typeof r?.authorizationUrl==="string"?r.authorizationUrl:"";
    const parsed=new URL(url);
    const host=parsed.hostname.toLowerCase();
    if(parsed.protocol!=="https:"||
      (c.provider==="gmail-api" && host!=="accounts.google.com")||
      (c.provider==="microsoft-graph" && host!=="login.microsoftonline.com"))
      throw Error("URL de autorização não confiável");
    return {status:"aguardando_autorizacao_usuario",pluginId:p.id,authorizationUrl:url};
  }
  async verificar(actor,connectionId,flags={permitirEnvio:false,permitirRecebimento:true}){
    if(!["master","admin"].includes(actor?.role))throw Error("Acesso não autorizado");
    return this.central.validar(actor,connectionId,flags);
  }
}
