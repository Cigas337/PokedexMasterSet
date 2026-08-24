const CACHE_NAME='pokedex-xl-v11-2-dex-grade-foil';
const SHELL=['./','./index.html','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);

  // Nunca colocar os dados da coleção/Supabase em cache: têm de vir sempre atualizados.
  if(url.hostname.endsWith('supabase.co')){
    event.respondWith(fetch(req));
    return;
  }

  // Navegação: rede primeiro, ficheiro local como fallback offline.
  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req,{cache:'no-store'}).then(res=>{
        const copy=res.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',copy));
        return res;
      }).catch(()=>caches.match('./index.html'))
    );
    return;
  }

  // Catálogo de cartas: resposta em cache imediatamente quando já existe,
  // e atualização silenciosa em segundo plano. Assim os cliques repetidos são instantâneos
  // e uma falha temporária da API não obriga o utilizador a clicar várias vezes.
  if(url.hostname==='api.pokemontcg.io' || url.hostname==='api.tcgdex.net'){
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache=>{
        const cached=await cache.match(req);
        const refresh=fetch(req).then(res=>{
          if(res && res.ok) cache.put(req,res.clone()).catch(()=>{});
          return res;
        }).catch(()=>null);
        if(cached){
          event.waitUntil(refresh);
          return cached;
        }
        const fresh=await refresh;
        if(fresh) return fresh;
        throw new Error('API de cartas/preços indisponível');
      })
    );
    return;
  }

  // App shell e recursos Pokémon: cache primeiro para acelerar e permitir uso offline parcial.
  const cacheable = url.origin===self.location.origin ||
    url.hostname==='raw.githubusercontent.com' ||
    url.hostname==='pokeapi.co' ||
    url.hostname==='cdn.jsdelivr.net';

  if(cacheable){
    event.respondWith(
      caches.match(req).then(cached=>{
        if(cached) return cached;
        return fetch(req).then(res=>{
          if(res && (res.ok || res.type==='opaque')){
            const copy=res.clone();
            caches.open(CACHE_NAME).then(cache=>cache.put(req,copy)).catch(()=>{});
          }
          return res;
        });
      })
    );
    return;
  }

  event.respondWith(fetch(req));
});
