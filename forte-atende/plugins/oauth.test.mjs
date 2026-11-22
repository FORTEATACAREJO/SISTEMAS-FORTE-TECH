import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {criarOAuth} from "./oauth.mjs";

const redirectUri = "https://example.test/integracoes.html";
const actor = {tenantId:"empresa-teste",userId:"admin-teste",role:"admin"};
const apps = {
  "gmail-api":{clientId:"google-test",clientSecret:"test-secret"},
  "microsoft-graph":{clientId:"microsoft-test",clientSecret:"test-secret"}
};

for (const scenario of [
  ["gmail-api","accounts.google.com","oauth2.googleapis.com","gmail.googleapis.com","https://www.googleapis.com/auth/gmail.readonly",{emailAddress:"teste@example.com"}],
  ["microsoft-graph","login.microsoftonline.com","login.microsoftonline.com","graph.microsoft.com","Mail.Read User.Read",{mail:"teste@example.com"}]
]) {
  const [provider,authorizationHost,tokenHost,profileHost,scope,profile] = scenario;
  test(provider+" usa PKCE, confirma conta e grava credenciais sem ativar canal",async()=>{
    const connection={id:"conexao-teste",provider,identity:"teste@example.com"};
    const states=new Map();
    const stored=[];
    let exchanged=0;
    const cofre=async (principal,id,action,data)=>{
      assert.equal(id,connection.id);
      const key=principal.userId+"|"+data.p_estado;
      if(action==="iniciar"){states.set(key,data.p_verifier);return {ok:true};}
      if(action==="consumir"){const verifier=states.get(key);states.delete(key);return {verifier};}
      stored.push(data.p_segredo);
      return {ok:true};
    };
    const broker=criarOAuth({config:apps,redirectUri,cofre,clock:()=>0,fetcher:async(url,options)=>{
      if(options.method==="POST"){
        exchanged++;
        assert.equal(new URL(url).hostname,tokenHost);
        assert.equal(options.body.get("client_secret"),"test-secret");
        assert.equal(options.body.get("redirect_uri"),redirectUri);
        assert.equal(options.body.get("grant_type"),"authorization_code");
        assert.equal(createHash("sha256").update(options.body.get("code_verifier")).digest("base64url"),challenge);
        return Response.json({access_token:"access-teste",refresh_token:"refresh-teste",scope,expires_in:3600});
      }
      assert.equal(new URL(url).hostname,profileHost);
      assert.equal(options.headers.Authorization,"Bearer access-teste");
      return Response.json(profile);
    }});
    const started=await broker.iniciar({actor,connection});
    const url=new URL(started.authorizationUrl);
    assert.equal(url.hostname,authorizationHost);
    assert.equal(url.searchParams.get("code_challenge_method"),"S256");
    assert.doesNotMatch(url.search,/secret|mail\.send/i);
    const state=url.searchParams.get("state");
    const challenge=url.searchParams.get("code_challenge");
    await assert.rejects(()=>broker.concluir({actor:{...actor,userId:"outro"},connection,state,code:"code"}),/expirada/);
    assert.equal(exchanged,0);
    const result=await broker.concluir({actor,connection,state,code:"code"});
    assert.deepEqual(result,{status:"credencial_guardada",sendEnabled:false,receiveEnabled:false});
    assert.equal(stored[0].provider,provider);
    assert.equal(stored[0].expiresAt,"1970-01-01T01:00:00.000Z");
    assert.doesNotMatch(JSON.stringify(result),/access-teste|refresh-teste/);
    await assert.rejects(()=>broker.concluir({actor,connection,state,code:"code"}),/já utilizada/);
    assert.equal(exchanged,1);
  });
}
test("OAuth recusa conta divergente sem gravar tokens",async()=>{
 const broker=criarOAuth({config:apps,redirectUri,cofre:async(_a,_c,action)=>{
   assert.equal(action,"consumir");return {verifier:"v".repeat(43)};
 },fetcher:async(_url,options)=>Response.json(options.method==="POST"?
   {access_token:"a",refresh_token:"r",scope:"https://www.googleapis.com/auth/gmail.readonly",expires_in:3600}:
   {emailAddress:"outra@example.com"})});
 await assert.rejects(()=>broker.concluir({actor,connection:{id:"id",provider:"gmail-api",identity:"teste@example.com"},
   state:"a".repeat(43),code:"code"}),/difere/);
});
