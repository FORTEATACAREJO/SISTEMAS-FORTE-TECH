import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";

const dir=dirname(fileURLToPath(import.meta.url));
const source=readFileSync(join(dir,"notificacoes.js"),"utf8");
const html=readFileSync(join(dir,"caixa-real.html"),"utf8");

function notificationHarness(){
 const updates=[];
 const heading={children:[],appendChild(value){this.children.push(value);}};
 const pill={id:"",hidden:true,style:{},textContent:"",setAttribute(){}};
 const document={
  title:"FORTE ATENDE | Caixa real em homologação",
  readyState:"complete",
  createElement(){return pill;},
  querySelector(selector){return selector===".app-title h1"?heading:null;},
  getElementById(id){return id===pill.id?pill:null;},
  body:{appendChild(){}},
 };
 const navigator={
  async setAppBadge(value){updates.push(value);},
  async clearAppBadge(){updates.push(0);}
 };
 const window={};
 runInNewContext(source,{window,document,navigator});
 return {api:window.FORTE_ATENDE_NOTIFICACOES,document,pill,heading,updates};
}

test("contador usa o número real, permanece no cabeçalho e preserva título",async()=>{
 const {api,document,pill,heading,updates}=notificationHarness();
 assert.equal(heading.children[0],pill);
 await api.atualizarNaoLidas(3);
 assert.equal(api.total(),3);
 assert.equal(pill.textContent,"3");
 assert.equal(pill.hidden,false);
 assert.equal(document.title,"(3) FORTE ATENDE | Caixa real em homologação");
 assert.deepEqual(updates,[3]);
 await api.atualizarNaoLidas(0);
 assert.equal(api.total(),0);
 assert.equal(pill.hidden,true);
 assert.equal(document.title,"FORTE ATENDE | Caixa real em homologação");
 assert.deepEqual(updates,[3,0]);
});

test("limita exibição a 99+ e descarta contagens inválidas",async()=>{
 const {api,pill,updates}=notificationHarness();
 await api.atualizarNaoLidas(152);
 assert.equal(pill.textContent,"99+");
 assert.equal(api.total(),152);
 await api.atualizarNaoLidas(-9);
 assert.equal(api.total(),0);
 await api.atualizarNaoLidas("inexistente");
 assert.equal(api.total(),0);
 assert.deepEqual(updates,[152,0,0]);
});

test("caixa real atualiza badge com total global autenticado e zera na saída",()=>{
 assert.match(html,/<script src="\.\/notificacoes\.js" defer><\/script>/);
 assert.match(html,/Number\.isSafeInteger\(page\?\.unread\)/);
 assert.match(html,/applyInboxUnread\(page\)/);
 assert.match(html,/badgeEpoch \+= 1;/);
 assert.match(html,/if \(!session\) void window\.FORTE_ATENDE_NOTIFICACOES\?\.atualizarNaoLidas\(0\)/);
 assert.match(html,/setInterval\(refreshUnreadBadge, 30000\)/);
 assert.doesNotMatch(source,/localStorage|sessionStorage|indexedDB/);
});
