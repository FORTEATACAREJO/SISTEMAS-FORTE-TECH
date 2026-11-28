import {createHash,randomBytes} from "node:crypto";
import {normalizarIdentidade} from "../multicanal/catalogo.mjs";

const GOOGLE = {
  authorize:"https://accounts.google.com/o/oauth2/v2/auth",
  token:"https://oauth2.googleapis.com/token",
  profile:"https://gmail.googleapis.com/gmail/v1/users/me/profile",
  scope:"https://www.googleapis.com/auth/gmail.readonly",
  extra:{access_type:"offline",prompt:"consent"},
  identity:profile=>profile.emailAddress
};
const MICROSOFT = {
  authorize:"https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize",
  token:"https://login.microsoftonline.com/organizations/oauth2/v2.0/token",
  profile:"https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName",
  scope:"https://graph.microsoft.com/Mail.Read",
  extra:{prompt:"select_account"},
  additionalScopes:"offline_access https://graph.microsoft.com/User.Read",
  identity:profile=>profile.mail||profile.userPrincipalName
};

const providers = new Map([["gmail-api",GOOGLE],["microsoft-graph",MICROSOFT]]);
const value = input => typeof input==="string" && input.length>0 && input.length<=8192;
const nonce = ()=>randomBytes(32).toString("base64url");
const challenge = verifier=>createHash("sha256").update(verifier).digest("base64url");

export function criarOAuth({config,redirectUri,cofre,fetcher=fetch,clock=Date.now}) {
  const redirect = new URL(redirectUri);
  if(redirect.protocol!=="https:"||redirect.username||redirect.password||redirect.search||redirect.hash)
    throw Error("Callback OAuth inválido");
  const apps = new Map();
  for(const [provider,protocol] of providers) {
    const app = config?.[provider];
    if(app?.clientId && app?.clientSecret) apps.set(provider,{...protocol,...app});
  }
  const get = provider=>{
    if(!apps.has(provider)) throw Error("Aplicativo OAuth não configurado");
    return apps.get(provider);
  };
  const scopes = app=>[app.scope,app.additionalScopes].filter(Boolean).join(" ");
  const fetchJson = async (url,options)=>{
    const response = await fetcher(url,{...options,redirect:"error",signal:AbortSignal.timeout(8000)});
    if(!response.ok) throw Error("Provedor recusou a autorização");
    return response.json();
  };

  return {
    disponiveis:[...apps.keys()],
    async iniciar({actor,connection}) {
      const app=get(connection.provider);
      const state=nonce(), verifier=nonce();
      await cofre(actor,connection.id,"iniciar",{p_estado:state,p_verifier:verifier});
      const url=new URL(app.authorize);
      url.search=new URLSearchParams({
        response_type:"code",client_id:app.clientId,redirect_uri:redirect.href,scope:scopes(app),
        state,code_challenge:challenge(verifier),code_challenge_method:"S256",...app.extra
      });
      return {authorizationUrl:url.href};
    },
    async concluir({actor,connection,state,code}) {
      const app=get(connection.provider);
      if(typeof state!=="string"||!/^[A-Za-z0-9_-]{43}$/.test(state)||!value(code))
        throw Error("Retorno OAuth inválido");
      const {verifier}=await cofre(actor,connection.id,"consumir",{p_estado:state});
      if(!verifier) throw Error("Autorização expirada ou já utilizada");
      const tokens=await fetchJson(app.token,{
        method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
        body:new URLSearchParams({
          grant_type:"authorization_code",client_id:app.clientId,client_secret:app.clientSecret,
          redirect_uri:redirect.href,code,code_verifier:verifier,
          ...(connection.provider==="microsoft-graph"?{scope:scopes(app)}:{})
        })
      });
      const granted=typeof tokens.scope==="string"?tokens.scope.split(/\s+/):[];
      const hasScope=granted.some(s=>s.toLowerCase()===app.scope.toLowerCase()||
        (connection.provider==="microsoft-graph"&&s.toLowerCase()==="mail.read"));
      if(!value(tokens.access_token)||!value(tokens.refresh_token)||!hasScope||
         !Number.isFinite(tokens.expires_in)||tokens.expires_in<=0)
        throw Error("Permissão de leitura ou renovação ausente");
      const profile=await fetchJson(app.profile,{headers:{Authorization:"Bearer "+tokens.access_token}});
      if(normalizarIdentidade("email",app.identity(profile))!==connection.identity)
        throw Error("A conta autorizada difere do cadastro");
      await cofre(actor,connection.id,"guardar",{p_segredo:{
        provider:connection.provider,accessToken:tokens.access_token,refreshToken:tokens.refresh_token,
        scopes:granted,expiresAt:new Date(clock()+tokens.expires_in*1000).toISOString()
      }});
      return {status:"credencial_guardada",sendEnabled:false,receiveEnabled:false};
    }
  };
}
