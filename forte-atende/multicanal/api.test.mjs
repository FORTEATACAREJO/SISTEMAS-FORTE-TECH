import test from "node:test";
import assert from "node:assert/strict";
import {criarServidorApi} from "./api.mjs";
import {CentralMulticanal} from "./central.mjs";

test("API bloqueia acesso sem sessao e nao permite trocar tenant pelo body",async()=>{
 const actor={tenantId:"empresa1",userId:"user1",role:"admin"};
 const svc=new CentralMulticanal({adapters:{}});
 const server=criarServidorApi({central:svc,authenticate:async()=>actor});
 await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const url="http://127.0.0.1:"+server.address().port;
 try{
   const noAuth=await fetch(url+"/api/conexoes");
   assert.equal(noAuth.status,401);
   const r=await fetch(url+"/api/conexoes",{
      method:"POST",headers:{Authorization:"Bearer teste-local","Content-Type":"application/json"},
      body:JSON.stringify({tenantId:"empresa2",id:"email001",provider:"gmail-api",identity:"a@example.com",secretRef:"vault/email001"})
   });
   assert.equal(r.status,201);
   const a=await r.json();
   assert.equal(a.connection.tenantId,"empresa1");
   assert.equal(Object.hasOwn(a.connection,"secretRef"),false);
   const q=await fetch(url+"/api/conexoes",{headers:{Authorization:"Bearer teste-local"}});
   assert.equal((await q.json()).connections.length,1);
   const forbidden=await fetch(url+"/api/conexoes",{headers:{Authorization:"Bearer teste-local",Origin:"https://malicioso.example"}});
   assert.equal(forbidden.status,403);
 }finally{await new Promise(r=>server.close(r));}
});
test("API exige autenticador de servidor e nao libera webhook por padrao",async()=>{
 assert.throws(()=>criarServidorApi({central:new CentralMulticanal()}),/Autenticador/);
 const s=criarServidorApi({central:new CentralMulticanal(),authenticate:async()=>({tenantId:"empresa1",userId:"u",role:"master"})});
 await new Promise(r=>s.listen(0,"127.0.0.1",r));
 try{
   const res=await fetch("http://127.0.0.1:"+s.address().port+"/webhooks/meta",{method:"POST",body:"{}"});
   assert.equal(res.status,503);
 }finally{await new Promise(r=>s.close(r));}
});
