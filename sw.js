const CACHE_NAME='pokedexm7-shell-v15.6.0';
const PUSH_API='https://wdljzuqoftrontqhhatr.supabase.co/functions/v1/push-subscriptions';
const PUSH_API_KEY='sb_publishable_MslRW16TUUxlAEnUNiQ2sQ_3FrG4sLy';
const CORE=['./','./index.html','./manifest.webmanifest','./v15.css','./v15.js','./v15-fix.js','./v15.5.css','./v15.5.js'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await Promise.all(CORE.map(async url=>{try{await cache.add(new Request(url,{cache:'reload'}))}catch(_){}}));
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('pokedexm7-shell-')&&k!==CACHE_NAME).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req);
        const cache=await caches.open(CACHE_NAME);
        cache.put('./index.html',fresh.clone()).catch(()=>{});
        return fresh;
      }catch(_){
        return (await caches.match(req))||(await caches.match('./index.html'))||Response.error();
      }
    })());
    return;
  }
  event.respondWith((async()=>{
    const cached=await caches.match(req);
    const update=fetch(req).then(async fresh=>{
      if(fresh?.ok){const cache=await caches.open(CACHE_NAME);cache.put(req,fresh.clone()).catch(()=>{});}return fresh;
    }).catch(()=>null);
    return cached||(await update)||Response.error();
  })());
});

self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch(_){data={body:event.data?.text?.()||''}}
  const title=data.title||'Pokédex M7';
  const options={
    body:data.body||'Nova atualização de stock Pokémon.',
    tag:data.tag||'pokedexm7-stock',
    renotify:true,
    icon:'./icon-180.png',
    badge:'./icon-180.png',
    image:data.image||undefined,
    data:{url:data.url||self.registration.scope,eventType:data.eventType||'',store:data.store||'',collection:data.collection||''},
    timestamp:data.timestamp||Date.now(),
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification?.data?.url||self.registration.scope;
  event.waitUntil((async()=>{
    try{return await self.clients.openWindow(target)}catch(_){
      const list=await self.clients.matchAll({type:'window',includeUncontrolled:true});
      if(list[0])return list[0].focus();
    }
  })());
});

self.addEventListener('pushsubscriptionchange',event=>{
  event.waitUntil((async()=>{
    try{
      const key=event.oldSubscription?.options?.applicationServerKey;
      if(!key)return;
      const sub=await self.registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
      await fetch(PUSH_API,{method:'POST',headers:{'Content-Type':'application/json','apikey':PUSH_API_KEY},body:JSON.stringify({action:'subscribe',subscription:sub.toJSON(),userAgent:self.navigator?.userAgent||'',platform:'service-worker',locale:'pt-PT',collections:['*'],stores:['*']})});
    }catch(e){console.warn('pushsubscriptionchange',e)}
  })());
});
