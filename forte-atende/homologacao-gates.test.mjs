import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";

const root=dirname(fileURLToPath(import.meta.url));
const config=JSON.parse(readFileSync(join(root,"config/canais-homologacao.json"),"utf8"));

test("canais homologados nao permitem disparo real antes da aprovacao",()=>{
 assert.equal(config.safeguards.send_real_message,false);
 assert.equal(config.whatsapp.outbound_messages_enabled,false);
 assert.equal(config.whatsapp.promotional_campaigns_enabled,false);
 assert.equal(config.email.promotions_outbound_enabled,false);
 assert.equal(config.whatsapp.do_not_override_shared_webhook,true);
});
test("tres caixas corporativas distintas encaminham ao arquivo central",()=>{
 assert.equal(config.email.central_inbox,"entradasforteatacarejo@gmail.com");
 assert.deepEqual(config.email.mailboxes.map(x=>x.address).sort(),[
 "contato@forteatacarejo.com.br","gerencia@forteatacarejo.com.br",
 "orcamentos@forteatacarejo.com.br"].sort());
 for(const box of config.email.mailboxes){
  assert.equal(box.forward_to,config.email.central_inbox);
  assert.equal(typeof box.send_as_verified,"boolean");
 }
});
test("WhatsApp comercial correto sem assumir conexao operacional",()=>{
 assert.equal(config.whatsapp.phone_e164,"+5564999172700");
 assert.equal(config.whatsapp.connection_status,"pendente_validacao_em_tempo_real");
});
test("PWA somente pode ser liberado com manifesto e icones fisicos",()=>{
 const manifestPath=join(root,"manifest.webmanifest");
 if(!existsSync(manifestPath)){
  assert.fail("BLOQUEIO DE LIBERACAO: manifest.webmanifest ausente; nao anunciar instalacao");
 }
 const manifest=JSON.parse(readFileSync(manifestPath,"utf8"));
 assert.equal(manifest.display,"standalone");
 assert.ok(manifest.start_url);
 for(const size of ["192x192","512x512"]){
  const icon=manifest.icons?.find(x=>x.sizes?.split(" ").includes(size));
  assert.ok(icon,"icone PWA ausente: "+size);
  assert.ok(existsSync(join(root,icon.src)),"arquivo de icone nao existe: "+icon.src);
 }
});

test("painel vincula manifesto e registra service worker apenas em HTTPS",()=>{
 const html=readFileSync(join(root,"painel.html"),"utf8");
 assert.match(html,/<link rel="manifest" href="\.\/manifest\.webmanifest">/);
 assert.match(html,/navigator\.serviceWorker\.register\('\.\/service-worker\.js'\)/);
 assert.match(html,/location\.protocol === 'https:'/);
});
test("service worker nao armazena chamadas autenticadas nem API",()=>{
 const sw=readFileSync(join(root,"service-worker.js"),"utf8");
 assert.match(sw,/req\.headers\.has\("authorization"\)/);
 assert.match(sw,/url\.pathname\.includes\("\/api\/"\)/);
 assert.doesNotMatch(sw,/cache\.put\(/);
});
