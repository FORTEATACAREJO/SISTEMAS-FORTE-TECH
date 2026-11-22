import test from "node:test";
import assert from "node:assert/strict";
import {once} from "node:events";
import { criarServidorApi } from "../multicanal/api.mjs";
import { criarIntegracaoOperacional } from "./operacional.mjs";

const empresaA = "11111111-1111-4111-8111-111111111111";
const empresaB = "22222222-2222-4222-8222-222222222222";
const accounts = {
  "admin-a": {empresa:empresaA, role:"ADMINISTRADOR"},
  "admin-b": {empresa:empresaB, role:"MASTER"},
  "atendente": {empresa:empresaA, role:"OPERADOR_GERAL"},
  "bloqueado": {empresa:empresaA, role:"MASTER", trocar_senha:true}
};
const userId = "33333333-3333-4333-8333-333333333333";
const persisted = [];
const origin = "https://painel.example";

async function fetcher(url,options) {
  assert.equal(url.origin,"https://operacional.example");
  assert.equal(options.headers.apikey,"sb_publishable_test");
  const account = accounts[options.headers.authorization.replace("Bearer ","")];
  const json = (body,status=200) => Response.json(body,{status});
  if (!account) return json({},401);
  switch(url.pathname) {
    case "/auth/v1/user":
      return json({id:userId});
    case "/rest/v1/rpc/access_current_module":
      assert.deepEqual(JSON.parse(options.body),{p_app:"vendas"});
      return json({allowed:true,role:account.role});
    case "/rest/v1/fc_perfis":
      assert.equal(url.searchParams.get("user_id"),"eq."+userId);
      return json([{empresa_id:account.empresa,ativo:true,trocar_senha:account.trocar_senha,
        status_aprovacao:"APROVADO",permissoes:{vendas:true}}]);
    case "/rest/v1/forte_atende_plugin_registros": {
      if (options.method==="POST") {
        const row = JSON.parse(options.body);
        assert.equal(row.empresa_id,account.empresa);
        assert.equal(Object.hasOwn(row,"secret_ref"),false);
        assert.equal(Object.hasOwn(row,"send_enabled"),false);
        if (persisted.some(r=>r.empresa_id===row.empresa_id&&r.identity===row.identity)) return json({},409);
        persisted.push(row);
        return json([row],201);
      }
      assert.equal(url.searchParams.get("empresa_id"),"eq."+account.empresa);
      const id = url.searchParams.get("id");
      return json(persisted.filter(row=>row.empresa_id===account.empresa&&(!id||id==="eq."+row.id)));
    }
    default:
      assert.fail("Chamada inesperada: "+url.pathname);
  }
}

async function withServer(fn) {
  const operational = criarIntegracaoOperacional({url:"https://operacional.example",publishableKey:"sb_publishable_test",fetcher});
  const server = criarServidorApi({...operational,pluginsOnly:true,registryEnabled:true,allowedOrigins:[origin]});
  server.listen(0,"127.0.0.1");
  await once(server,"listening");
  try {
    await fn((path,{token,body,requestOrigin=origin}={})=>fetch("http://127.0.0.1:"+server.address().port+path,{
      method:body?"POST":"GET",
      headers:{Origin:requestOrigin,...(token?{Authorization:"Bearer "+token}:{}),...(body?{"Content-Type":"application/json"}:{})},
      body:body?JSON.stringify(body):undefined
    }));
  } finally {
    await new Promise(resolve=>server.close(resolve));
  }
}

test("fluxo do painel persiste cadastro pendente e bloqueia ativação e envio",async()=>{
  const path = "/api/plugins";
  const body = {pluginId:"gmail",identity:"contato@example.com",tenantId:empresaB,secretRef:"ignorar",sendEnabled:true};
  let id;
  await withServer(async call=>{
    assert.deepEqual(await (await call(path+"/status")).json(),{registryEnabled:true,providerAuthorizationEnabled:false});
    assert.equal((await call(path,{requestOrigin:"https://fora.example"})).status,403);
    assert.equal((await call(path)).status,401);
    assert.equal((await call(path,{token:"expirado"})).status,401);
    assert.equal((await call(path,{token:"bloqueado"})).status,403);
    assert.equal((await call(path+"/instalar",{token:"atendente",body})).status,403);
    const created = await call(path+"/instalar",{token:"admin-a",body});
    assert.equal(created.status,201);
    const {connection} = await created.json();
    ({id} = connection);
    assert.equal(connection.status,"pending");
    assert.equal(connection.sendEnabled,false);
    assert.equal(connection.receiveEnabled,false);
    assert.equal(Object.hasOwn(connection,"secretRef"),false);
    assert.equal((await call(path+"/instalar",{token:"admin-a",body})).status,409);
    assert.equal((await call("/api/rascunhos/"+id+"/enviar",{token:"admin-a",body:{}})).status,404);
  });

  await withServer(async call=>{
    const a = await (await call(path,{token:"atendente"})).json();
    const b = await (await call(path,{token:"admin-b"})).json();
    assert.equal(a.plugins.find(p=>p.id==="gmail").conexoes[0].id,id);
    assert.equal(b.plugins.find(p=>p.id==="gmail").conexoes.length,0);
    assert.equal((await call(path+"/conexoes/"+id+"/autorizar",{token:"admin-b",body:{}})).status,400);
    assert.equal((await call(path+"/conexoes/"+id+"/autorizar",{token:"admin-a",body:{}})).status,503);
    assert.equal((await call(path+"/conexoes/"+id+"/verificar",{token:"admin-a",body:{permitirEnvio:true}})).status,503);
  });
});
