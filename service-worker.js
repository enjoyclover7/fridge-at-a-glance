const CACHE_NAME='fridge-pwa-v4';
const BASE_PATH='/fridge-at-a-glance/';
const APP_SHELL=[BASE_PATH,`${BASE_PATH}index.html`,`${BASE_PATH}styles.css`,`${BASE_PATH}recipes.js`,`${BASE_PATH}app.js`,`${BASE_PATH}receipt.js`,`${BASE_PATH}manifest.webmanifest`,`${BASE_PATH}assets/hero-fridge-balanced.webp`,`${BASE_PATH}assets/icons/icon-192.png`,`${BASE_PATH}assets/icons/icon-512.png`,`${BASE_PATH}assets/icons/icon-maskable-512.png`,`${BASE_PATH}assets/icons/apple-touch-icon.png`];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    if(response&&response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>event.request.mode==='navigate'?caches.match(`${BASE_PATH}index.html`):Response.error())));
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});
