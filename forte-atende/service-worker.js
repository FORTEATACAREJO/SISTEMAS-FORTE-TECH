// FORTE ATENDE: somente recursos estaticos publicos; nenhuma API ou mensagem e armazenada.
const CACHE="forte-atende-shell-v1";
const SHELL=["./painel.html","./manifest.webmanifest"];
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));
 self.skipWaiting();
});
self.addEventListener("activate",event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("forte-atende-shell-")&&k!==CACHE).map(k=>caches.delete(k)))));
 self.clients.claim();
});
self.addEventListener("fetch",event=>{
 const req=event.request;
 if(req.method!=="GET"||new URL(req.url).origin!==self.location.origin)return;
 const url=new URL(req.url);
 if(url.pathname.includes("/api/")||url.pathname.includes("/webhooks/")||req.headers.has("authorization"))return;
 if(req.mode==="navigate"){
  event.respondWith(fetch(req).catch(()=>caches.match("./painel.html")));
 }
});
