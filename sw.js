// Tudo o que ela vê — guarda o app e os vídeos no celular para tocar sem espera e sem internet.
const CASCA = "tqev-casca-v3", VIDEOS = "tqev-videos-v1";
const ARQ = ["./", "index.html", "manifest.json", "app_imagens/ep01.jpg", "app_imagens/ep02.jpg", "app_imagens/ep03.jpg", "app_imagens/icone-192.png", "app_imagens/icone-512.png"];

self.addEventListener("install", e => e.waitUntil(caches.open(CASCA).then(c => c.addAll(ARQ)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => ![CASCA, VIDEOS].includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim())
));

// Responde pedaços do vídeo guardado (o navegador pede o vídeo em partes)
async function respostaParcial(req, resp){
  const range = req.headers.get("range");
  const blob = await resp.blob();
  if(!range) return new Response(blob, {status:200, headers:{"Content-Type":"video/mp4", "Content-Length":blob.size, "Accept-Ranges":"bytes"}});
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  let ini = m[1] ? parseInt(m[1]) : 0, fim = m[2] ? parseInt(m[2]) : blob.size - 1;
  if(!m[1] && m[2]){ ini = blob.size - parseInt(m[2]); fim = blob.size - 1; }
  fim = Math.min(fim, blob.size - 1);
  return new Response(blob.slice(ini, fim + 1), {status:206, headers:{
    "Content-Type":"video/mp4", "Content-Range":`bytes ${ini}-${fim}/${blob.size}`, "Content-Length":(fim - ini + 1), "Accept-Ranges":"bytes"}});
}

self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if(u.origin !== location.origin || e.request.method !== "GET") return;
  if(u.pathname.endsWith(".mp4")){
    e.respondWith((async () => {
      const c = await caches.open(VIDEOS);
      const r = await c.match(u.pathname);
      if(r) return respostaParcial(e.request, r);
      return fetch(e.request);
    })());
    return;
  }
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CASCA).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
