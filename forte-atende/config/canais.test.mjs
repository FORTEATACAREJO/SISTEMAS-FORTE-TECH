import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const config = JSON.parse(await readFile(new URL("./canais-homologacao.json", import.meta.url), "utf8"));
test("usa numero +55 64 99917 2700 e IDs Meta registrados",()=>{
  assert.equal(config.whatsapp.phone_e164, "+5564999172700");
  assert.equal(config.whatsapp.waba_id, "1081614524680450");
  assert.equal(config.whatsapp.phone_number_id, "1278417945364665");
});
test("preserva webhook compartilhado sem ativar disparos",()=>{
  assert.equal(config.whatsapp.do_not_override_shared_webhook,true);
  assert.equal(config.whatsapp.outbound_messages_enabled,false);
  assert.equal(config.whatsapp.promotional_campaigns_enabled,false);
  assert.equal(config.safeguards.do_not_change_fiscal_webhook,true);
});
test("tres caixas independentes no cadastro apontam ao Gmail unico",()=>{
  const xs=config.email.mailboxes;
  assert.equal(xs.length,3);
  assert.deepEqual(xs.map(x=>x.address),[
    "gerencia@forteatacarejo.com.br",
    "contato@forteatacarejo.com.br",
    "orcamentos@forteatacarejo.com.br"
  ]);
  assert.equal(new Set(xs.map(x=>x.address)).size,3);
  assert.equal(config.email.central_inbox,"entradasforteatacarejo@gmail.com");
  assert.ok(xs.every(x=>x.forward_to===config.email.central_inbox));
  assert.ok(xs.every(x=>x.forwarding_test_received_on==="2026-11-20"));
  assert.equal(config.gmail.archive,config.email.central_inbox);
  assert.equal(config.email.example_not_mailbox,"emails@forteatacarejo.com.br");
});
test("nao confunde encaminhamento verificado com acesso Hostinger independente",()=>{
  const xs=Object.fromEntries(config.email.mailboxes.map(x=>[x.unit,x]));
  assert.equal(xs.contato.direct_hostinger_access_verified,true);
  assert.equal(xs.gerencia.direct_hostinger_access_verified,false);
  assert.equal(xs.orcamentos.direct_hostinger_access_verified,false);
  assert.equal(xs.gerencia.send_as_verified,false);
  assert.equal(xs.orcamentos.send_as_verified,false);
  assert.equal(config.email.promotions_outbound_enabled,false);
});
test("nao contem tokens ou secrets em canais publicos",()=>{
  const texto=JSON.stringify(config).toLowerCase();
  for(const key of ["access_token","verify_token","app_secret","service_role","api_key"]) assert.ok(!texto.includes('"'+key+'"'),"segredo sensivel: "+key);
});
