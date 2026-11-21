import http from "node:http";
import {listarProvedores} from "./catalogo.mjs";

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
export function criarServidorApi({central,authenticate,allowedOrigins=[],metaWebhook=null}={}){
 if(!central||typeof authenticate!=="function")throw Error("Autenticador de sessão obrigatório");
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
     if(url.pathname==="/webhooks/meta"&&req.method==="POST"){
       if(typeof metaWebhook!=="function")return response(res,503,{error:"Webhook não configurado"});
       // metaWebhook obrigatoriamente verifica X-Hub-Signature-256 e body bruto.
       const raw=await readBody(req,1_000_000);
       const result=await metaWebhook(raw,String(req.headers["x-hub-signature-256"]||""));
       return response(res,200,{received:true,added:result?.added??0});
     }
     if(!url.pathname.startsWith("/api/"))return response(res,404,{error:"Não encontrado"});
     if(req.headers.authorization?.startsWith("Bearer ")!==true)return response(res,401,{error:"Sessão obrigatória"});
     const actor=await authenticate(req);
     if(!actor?.tenantId||!actor?.userId||!actor?.role)return response(res,401,{error:"Sessão inválida"});
     if(req.method==="GET"&&url.pathname==="/api/provedores")return response(res,200,{providers:listarProvedores()});
     if(req.method==="GET"&&url.pathname==="/api/conexoes")return response(res,200,{connections:central.conexoes(actor)});
     if(req.method==="GET"&&url.pathname==="/api/mensagens"){
       return response(res,200,{messages:central.caixaEntrada(actor,{connectionId:url.searchParams.get("connectionId")||undefined,limit:Number(url.searchParams.get("limit"))||50})});
     }
     const body=req.method==="POST"?JSON.parse((await readBody(req)).toString("utf8")||"{}"):{};
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
     const unauthorized=/não autorizado|outra empresa/.test(message);
     const uncertain=/Envio incerto/.test(message);
     const status=unauthorized?403:uncertain?502:
       /indisponível|não instalado|Cofre|conector/i.test(message)?503:400;
     return response(res,status,{error:uncertain?"Resultado incerto: verificar no provedor antes de tentar novamente":
       unauthorized?"Acesso não autorizado":status===503?"Integração indisponível":"Operação recusada"});
   }
 });
}
