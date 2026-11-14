import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);const read=p=>readFileSync(new URL(p,root),'utf8');
const cfg=JSON.parse(read('commercial-config.json'));
test('Multiempresarial tem identidade e PWA próprios',()=>{
 const home=read('index.html');
 assert.match(home,/Multiempresarial/);
 assert.match(home,/Sistemas Forte Tech/);
 for(const page of ['demo.html','admin.html','contador.html'])assert.ok(read(page).length>100);
 assert.equal(JSON.parse(read('manifest.webmanifest')).short_name,'Multiempresarial');
 assert.match(read('index.html'),/href="\/admin.html"/);
});
test('Publicação inicial é demonstrativa e mensalidade não é cobrada',()=>{
 assert.equal(cfg.productName,'Multiempresarial');
 assert.equal(cfg.pricing.amountCents,null);
 assert.equal(cfg.pricing.billingInterval,'MONTHLY');
 assert.equal(cfg.pricing.collectionEnabled,false);
 assert.equal(cfg.pricing.checkoutEnabled,false);
 assert.equal(cfg.identity.fiscalEmission,false);
 assert.equal(cfg.identity.aiOperationsEnabled,false);
 assert.match(read('index.html'),/Valor a definir|valor a definir/);
});
test('Frontend usa apenas a chave publicável do Supabase e rota do novo host',()=>{
 const admin=read('admin.js');
 assert.match(admin,/sb_publishable_/);
 assert.doesNotMatch(admin,/SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(read('admin.html'),/multiempresarial-forte-tech.onrender.com/);
 assert.match(read('demo.html'),/Cadastros fictícios feitos aqui/);
});

test('SIWC integra plano sem simular parceria nem liberar login',()=>{const product=JSON.parse(read('config/product.json'));assert.equal(cfg.pricing.aiIncludedInOffer,true);assert.equal(product.ai.inferenceEnabled,false);assert.equal(cfg.signInWithChatGPT.status,'AGUARDANDO_APROVACAO');assert.equal(cfg.signInWithChatGPT.chatgptPlanUsageEnabled,false);assert.equal(cfg.signInWithChatGPT.identityLoginEnabled,false);assert.match(read('index.html'),/Sign in with ChatGPT/);});
