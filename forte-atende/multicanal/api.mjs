import http from "node:http";
import {AtendimentoCompartilhado} from "./atendimento.mjs";
import {listarProvedores} from "./catalogo.mjs";
import {GerenciadorPlugins} from "../plugins/gerenciador.mjs";

const MAX_JSON=64*1024;
const response=(res,status,data)=>{
 res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",
   "X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'"});
 res.end(JSON.stringify(data));
};
async function readBody(req,maxBytes=MAX_JSON){
 const chunks=[];let size=0;
 for await(const chunk of req){
   size+=chunk.length;
   if(size>maxBytes)throw Error("Payload acima do limite");
   chunks.push(chunk);
 }
 return Buffer.concat(chunks);
}
const sanitize=({secretRef,...data})=>data;
/**
 * API REST sem autenticacao improvisada: servidor hospedeiro OBRIGATORIAMENTE
 * injeta authenticate(req) verificando a sessao de servidor (nao headers tenant).
 * Regras de negocio estao em CentralMulticanal. Nao chama listen automaticamente.
 */
export function criarServidorApi({central,authenticate,allowedOrigins=[],metaWebhook=null,pluginManager=null,pluginsOnly=false,registryEnabled,registryAuth,providerAuthorization=[],vaultConfigured=false,atendimento=new AtendimentoCompartilhado()}={}){
 if(!central||typeof authenticate!=="function")throw Error("Autenticador de sessão obrigatório");
 const plugins=pluginManager??new GerenciadorPlugins({central});
 const origins=new Set(allowedOrigins);
 return http.createServer(async(req,res)=>{
   try{
     const origin=req.headers.origin;
     if(origin&&!origins.has(origin))return response(res,403,{error:"Origem não autorizada"});
     if(origin){res.setHeader("Access-Control-Allow-Origin",origin);res.setHeader("Vary","Origin");}
     if(req.method==="OPTIONS"){
       res.writeHead(204,{"Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Authorization, Content-Type","Cache-Control":"no-store"});return res.end();
     }
     const url=new URL(req.url||"/","https://local.invalid");
     if(url.pathname==="/health"&&req.method==="GET")return response(res,200,{service:"forte-atende-multicanal",status:"api-source"});
     if(url.pathname==="/api/plugins/status"&&req.method==="GET"&&typeof registryEnabled==="boolean")
       return response(res,200,{registryEnabled,providerAuthorizationEnabled:providerAuthorization.length>0,
         ...(vaultConfigured?{vaultConfigured,oauthProviders:providerAuthorization}:{}),...(registryAuth?{auth:registryAuth}:{})});
     if(url.pathname==="/webhooks/meta"&&req.method==="POST"){
       if(typeof metaWebhook!=="function")return response(res,503,{error:"Webhook não configurado"});
       // metaWebhook obrigatoriamente verifica X-Hub-Signature-256 e body bruto.
       const raw=await readBody(req,1_000_000);
       const result=await metaWebhook(raw,String(req.headers["x-hub-signature-256"]||""));
       return response(res,200,{received:true,added:result?.added??0});
     }
     if(pluginsOnly && url.pathname!=="/api/plugins" && !url.pathname.startsWith("/api/plugins/"))return response(res,404,{error:"Não encontrado"});
     if(!url.pathname.startsWith("/api/"))return response(res,404,{error:"Não encontrado"});
     if(req.headers.authorization?.startsWith("Bearer ")!==true)return response(res,401,{error:"Sessão obrigatória"});
     const actor=await authenticate(req);
     if(actor?.forbidden)return response(res,403,{error:"Acesso não autorizado"});
     if(!actor?.tenantId||!actor?.userId||!actor?.role)return response(res,401,{error:"Sessão inválida"});
     const body=req.method==="POST"?JSON.parse((await readBody(req)).toString("utf8")||"{}"):{};
     if(req.method==="GET"&&url.pathname==="/api/atendimento/conversas")return response(res,200,{conversas:atendimento.listar(actor),resumo:atendimento.resumo(actor)});
     if(req.method==="GET"&&url.pathname==="/api/atendimento/exclusoes")return response(res,200,{itens:atendimento.caixaExclusoes(actor)});
     if(req.method==="POST"&&url.pathname==="/api/atendimento/exclusoes/restaurar"){if(body.confirmar!==true)return response(res,400,{error:"Confirmação obrigatória"});return response(res,200,{resultado:atendimento.recuperarExclusao(actor,body)});}
     if(req.method==="GET"&&url.pathname==="/api/atendimento/resumo")return response(res,200,atendimento.resumo(actor));
     if(req.method==="GET"&&url.pathname==="/api/provedores")return response(res,200,{providers:listarProvedores()});
     if(req.method==="GET"&&url.pathname==="/api/plugins")return response(res,200,{plugins:await plugins.catalogo(actor,{canal:url.searchParams.get("canal")||undefined}),
         canRegister:["master","admin"].includes(actor.role)});
     if(req.method==="GET"&&url.pathname==="/api/conexoes")return response(res,200,{connections:central.conexoes(actor)});
     if(req.method==="GET"&&url.pathname==="/api/mensagens"){
       return response(res,200,{messages:central.caixaEntrada(actor,{connectionId:url.searchParams.get("connectionId")||undefined,limit:Number(url.searchParams.get("limit"))||50})});
     }

     if(req.method==="POST"&&url.pathname==="/api/atendimento/contatos")return response(res,201,{contato:atendimento.contato(actor,body)});
     const acao=url.pathname.match(new RegExp("^/api/atendimento/conversas/([^/]+)/(ler|assumir|resolver|responder)$"));
     if(req.method==="POST"&&acao){
       const id=decodeURIComponent(acao[1]);
       const resultado=acao[2]==="ler"?atendimento.marcarLida(actor,id):acao[2]==="assumir"?atendimento.assumir(actor,id):acao[2]==="resolver"?atendimento.resolver(actor,id):atendimento.registrarResposta(actor,id,body.texto);
       return response(res,200,{resultado});
     }
     const gestao=url.pathname.match(new RegExp("^/api/atendimento/conversas/([^/]+)/(arquivar|restaurar|excluir|excluir-mensagem)$"));
     if(req.method==="POST"&&gestao){
       if(body.confirmar!==true) return response(res,400,{error:"Confirmação explícita obrigatória"});
       if(["excluir","excluir-mensagem"].includes(gestao[2]) && body.confirmarUsuario!==actor.userId)return response(res,400,{error:"Confirmação deve identificar o usuário autenticado"});
       const id=decodeURIComponent(gestao[1]),op=gestao[2];
       const resultado=op==="arquivar"?atendimento.arquivar(actor,id):op==="restaurar"?atendimento.restaurar(actor,id):op==="excluir"?atendimento.excluirConversa(actor,id):atendimento.excluirMensagem(actor,id,body.mensagemId);
       return response(res,200,{resultado});
     }
     if(req.method==="POST"&&url.pathname==="/api/plugins/instalar")
       return response(res,201,{connection:await plugins.instalar(actor,body)});
     const pluginOauth=url.pathname.match(/^\/api\/plugins\/conexoes\/([a-zA-Z0-9_-]+)\/autorizar$/);
     if(req.method==="POST"&&pluginOauth)
       return response(res,200,{authorization:await plugins.prepararAutorizacao(actor,pluginOauth[1])});
     const pluginCallback=url.pathname.match(/^\/api\/plugins\/conexoes\/([a-zA-Z0-9_-]+)\/concluir$/);
     if(req.method==="POST"&&pluginCallback)
       return response(res,200,{authorization:await plugins.concluirAutorizacao(actor,pluginCallback[1],body)});
     const pluginVerify=url.pathname.match(/^\/api\/plugins\/conexoes\/([a-zA-Z0-9_-]+)\/verificar$/);
     if(req.method==="POST"&&pluginVerify)
       return response(res,200,{connection:await plugins.verificar(actor,pluginVerify[1],body)});
     if(req.method==="POST"&&url.pathname==="/api/conexoes")
       return response(res,201,{connection:sanitize(central.registrar(actor,body))});
     const verify=url.pathname.match(/^\/api\/conexoes\/([a-zA-Z0-9_-]+)\/verificar$/);
     if(req.method==="POST"&&verify)
       return response(res,200,{connection:await central.validar(actor,verify[1],body)});
     const sync=url.pathname.match(/^\/api\/conexoes\/([a-zA-Z0-9_-]+)\/sincronizar$/);
     if(req.method==="POST"&&sync)
       return response(res,200,{result:await central.sincronizarCaixa(actor,sync[1],body)});
     if(req.method==="POST"&&url.pathname==="/api/rascunhos")
       return response(res,201,{draft:central.rascunho(actor,body)});
     const approve=url.pathname.match(/^\/api\/rascunhos\/([a-zA-Z0-9_-]+)\/aprovar$/);
     if(req.method==="POST"&&approve)
       return response(res,200,{draft:central.aprovar(actor,approve[1])});
     const send=url.pathname.match(/^\/api\/rascunhos\/([a-zA-Z0-9_-]+)\/enviar$/);
     if(req.method==="POST"&&send)
       return response(res,200,{draft:await central.enviarAprovado(actor,send[1])});
     return response(res,404,{error:"Endpoint não encontrado"});
   }catch(e){
     // Falhas sem propagar tokens, URLs de segredo ou headers do provedor.
     const message=String(e?.message||"Falha");
     const conflict=/já conectado/.test(message);
     const unauthorized=/não autorizado|outra empresa/.test(message);
     const uncertain=/Envio incerto/.test(message);
     const status=conflict?409:unauthorized?403:uncertain?502:
       /indisponível|não instalado|não configurad[oa]|Cofre|conector/i.test(message)?503:400;
     return response(res,status,{error:uncertain?"Resultado incerto: verificar no provedor antes de tentar novamente":
       conflict?"Essa conta já está cadastrada":unauthorized?"Acesso não autorizado":status===503?"Integração indisponível":"Operação recusada"});
   }
 });
}
