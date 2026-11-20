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
test("utiliza a caixa contato verificada e trata emails como exemplo",()=>{
  assert.equal(config.email.primary,"contato@forteatacarejo.com.br");
  assert.equal(config.email.mailbox_access_verified,true);
  assert.equal(config.email.mailbox_label,"E-mails");
  assert.equal(config.email.additional_mailbox_enabled,false);
  assert.equal(config.email.promotions_outbound_enabled,false);
  assert.equal(config.gmail.archive,"entradasforteatacarejo@gmail.com");
});
test("nao contem tokens ou secrets em canais publicos",()=>{
  const texto=JSON.stringify(config).toLowerCase();
  for(const key of ["access_token","verify_token","app_secret","service_role","api_key"]) assert.ok(!texto.includes('"'+key+'"'),"segredo sensivel: "+key);
});
