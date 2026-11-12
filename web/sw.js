/* World of Ascension service worker (v5_57).
   The server replaces __BUILD__ with a hash of all game files, so every rebuild with changed files gets a fresh cache
   and the old one is deleted. Game files are served from the device cache first (instant start, works offline);
   /api and /ws are never touched. Needs https or localhost (browsers do not allow service workers on plain http LAN addresses). */
const BUILD='__BUILD__';
const CACHE='woa-'+BUILD, EXT='woa-ext';
const CORE=['./','index.html','models3d.js','audio.js','manifest.json'];
const LOCAL_OPT=['three.min.js'];  /* optional local copy of three.js (used when you drop it into web/) */
const CROSS=['https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','https://fonts.googleapis.com/css2?family=Marcellus+SC&family=Figtree:wght@400;600;700&display=swap'];
const CROSS_HOSTS=['cdnjs.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com'];

self.addEventListener('install',e=>{
  e.waitUntil((async()=>{
    const c=await caches.open(CACHE);
    await c.addAll(CORE.map(u=>new Request(u,{cache:'reload'})));
    await Promise.all(LOCAL_OPT.map(u=>fetch(u,{cache:'reload'}).then(r=>{if(r.ok)return c.put(u,r)}).catch(()=>{})));
    const x=await caches.open(EXT);
    await Promise.all(CROSS.map(async u=>{if(await x.match(u))return;try{const r=await fetch(new Request(u,{mode:'no-cors'}));await x.put(u,r)}catch(_){}}));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    for(const k of await caches.keys())if(k.startsWith('woa-')&&k!==CACHE&&k!==EXT)await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);let store=CACHE;
  if(u.origin===location.origin){if(u.pathname.startsWith('/api')||u.pathname==='/ws'||u.pathname==='/sw.js')return}
  else if(CROSS_HOSTS.includes(u.hostname))store=EXT;
  else return;
  e.respondWith((async()=>{
    const hit=await caches.match(r,{ignoreSearch:u.origin===location.origin});
    if(hit)return hit;
    const res=await fetch(r);
    if(res&&(res.ok||res.type==='opaque')){const cp=res.clone();caches.open(store).then(c=>c.put(r,cp)).catch(()=>{})}
    return res;
  })());
});
