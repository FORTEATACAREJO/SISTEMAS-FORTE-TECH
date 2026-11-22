// A caixa precisa de conexão. Nunca servir a demonstração ou guardar dados da sessão.
self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("forte-atende-shell-")).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || req.mode !== "navigate" ||
      url.pathname.includes("/api/") || url.pathname.includes("/webhooks/") || req.headers.has("authorization")) return;
  event.respondWith(fetch(req).catch(() => new Response(
    '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FORTE ATENDE</title><h1>Sem conexão</h1><p>Conecte-se à internet para abrir a caixa de atendimento.</p><a href="./caixa-real.html">Tentar novamente</a></html>',
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
  )));
});
