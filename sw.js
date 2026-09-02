const CACHE_NAME='pokedexm7-shell-v15.10.3';
const PUSH_API='https://wdljzuqoftrontqhhatr.supabase.co/functions/v1/push-subscriptions';
const PUSH_API_KEY='sb_publishable_MslRW16TUUxlAEnUNiQ2sQ_3FrG4sLy';
const CORE=[
  './','./index.html','./manifest.webmanifest',
  './icon-180.png','./icon-192.png','./icon-512.png',
  './v15.css?v=15.0.0','./v15.1.css?v=15.1.0','./v15.2.css?v=15.2.0','./v15.3.css?v=15.3.0',
  './v15.5.css?v=15.5.0','./v15.7.css?v=15.7.1','./v15.8.css?v=15.8.2','./v15.9.css?v=15.9.0','./v15.10.css?v=15.10.0',
  './v15.js?v=15.0.0','./v15-fix.js?v=15.0.0','./v15.1.js?v=15.1.0','./v15.2.js?v=15.2.0','./v15.3.js?v=15.3.0',
  './v15.5.js?v=15.5.0','./v15.7.js?v=15.7.1','./v15.8.js?v=15.8.2','./v15.9.js?v=15.9.0',
  './v15.10.js?v=15.10.0','./v15.10.1.js?v=15.10.1','./v15.10.2.js','./v15.10.3.js?v=15.10.3'];

function urlBase64ToUint8Array(value){
  const padding='='.repeat((4-value.length%4)%4);
  const raw=atob((value+padding).replace(/-/g,'+').replace(/_/g,'/'));
  return Uint8Array.from(raw,char=>char.charCodeAt(0));
}

function safeTargetUrl(value){
  try{
    const url=new URL(String(value||''),self.registration.scope);
    const localHttp=url.protocol==='http:'&&(url.hostname==='localhost'||url.hostname==='127.0.0.1');
    return url.protocol==='https:'||localHttp?url.href:self.registration.scope;
  }catch(_){
    return self.registration.scope;
  }
}

async function applicationServerKey(oldSubscription){
  const previous=oldSubscription?.options?.applicationServerKey;
  if(previous)return previous;
  const response=await fetch(PUSH_API,{method:'GET',headers:{apikey:PUSH_API_KEY},cache:'no-store'});
  if(!response.ok)throw new Error('Push config HTTP '+response.status);
  const data=await response.json();
  if(!data?.vapidPublicKey)throw new Error('VAPID public key unavailable');
  return urlBase64ToUint8Array(data.vapidPublicKey);
}

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
      if(fresh?.ok){
        const cache=await caches.open(CACHE_NAME);
        cache.put(req,fresh.clone()).catch(()=>{});
      }
      return fresh;
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
    data:{
      url:safeTargetUrl(data.url||self.registration.scope),
      eventType:data.eventType||'',
      store:data.store||'',
      collection:data.collection||''
    },
    timestamp:data.timestamp||Date.now(),
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=safeTargetUrl(event.notification?.data?.url);
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    if(target.startsWith(self.registration.scope)){
      const existing=windows.find(client=>client.url.startsWith(self.registration.scope));
      if(existing){
        try{await existing.navigate(target)}catch(_){}
        return existing.focus();
      }
    }
    try{return await self.clients.openWindow(target)}catch(_){
      if(windows[0])return windows[0].focus();
    }
  })());
});

self.addEventListener('pushsubscriptionchange',event=>{
  event.waitUntil((async()=>{
    try{
      const key=await applicationServerKey(event.oldSubscription);
      const sub=await self.registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
      const response=await fetch(PUSH_API,{
        method:'POST',
        headers:{'Content-Type':'application/json',apikey:PUSH_API_KEY},
        body:JSON.stringify({
          action:'subscribe',
          subscription:sub.toJSON(),
          userAgent:self.navigator?.userAgent||'',
          platform:'service-worker',
          locale:'pt-PT',
          collections:['*'],
          stores:['*']
        })
      });
      if(!response.ok)throw new Error('Push resubscribe HTTP '+response.status);
    }catch(error){
      console.warn('pushsubscriptionchange',error);
    }
  })());
});
