/* Pokédex M7 v15.10.0 RC · final polish, unified expansion data + perceived performance */
(function(){
  'use strict';

  const VERSION='15.10.0-rc1';
  const PTCG='https://api.pokemontcg.io/v2';
  const TDX_PREFIX='https://api.tcgdex.net/v2/en';
  const SET_CACHE='pokedexm7-v1510-ptcg-sets-v1';
  const CARD_CACHE='pokedexm7-v1510-ptcg-setcards-v1';
  const SCROLL_CACHE='pokedexm7-v1510-scroll-v1';
  const CATALOG_TTL=24*60*60*1000;
  const CARD_TTL=24*60*60*1000;
  const STALE_TTL=7*24*60*60*1000;
  const nativeFetch=window.fetch.bind(window);
  const responseMemory=new Map();
  const inFlight=new Map();

  const once=(fn)=>document.readyState==='loading'
    ?document.addEventListener('DOMContentLoaded',fn,{once:true})
    :fn();

  function safeJson(raw,fallback=null){try{return JSON.parse(raw)}catch(_){return fallback}}
  function readLocal(key){try{return safeJson(localStorage.getItem(key)||'',null)}catch(_){return null}}
  function writeLocal(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(_){return false}}
  function esc(v){return typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function now(){return Date.now()}

  function jsonResponse(data){
    return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json; charset=utf-8','X-M7-Source':'PokemonTCG'}});
  }

  function rememberResponse(key,text,status=200,headers={}){
    responseMemory.set(key,{at:now(),text,status,headers});
    if(responseMemory.size>48){
      const oldest=[...responseMemory.entries()].sort((a,b)=>a[1].at-b[1].at).slice(0,responseMemory.size-40);
      oldest.forEach(([k])=>responseMemory.delete(k));
    }
  }

  function responseFromMemory(key,ttl=120000){
    const hit=responseMemory.get(key);
    if(!hit||now()-hit.at>ttl)return null;
    return new Response(hit.text,{status:hit.status,headers:hit.headers});
  }

  async function cachedNetworkFetch(input,init,url){
    const method=String(init?.method||(input instanceof Request?input.method:'GET')||'GET').toUpperCase();
    if(method!=='GET')return nativeFetch(input,init);
    const key=url;
    const hit=responseFromMemory(key);
    if(hit)return hit;
    if(inFlight.has(key)){
      const saved=await inFlight.get(key);
      return new Response(saved.text,{status:saved.status,headers:saved.headers});
    }
    const task=(async()=>{
      const nextInit={...(init||{})};
      if(nextInit.cache==='no-store')nextInit.cache='default';
      const res=await nativeFetch(input,nextInit);
      if(!res.ok)return {response:res,text:null,status:res.status,headers:{}};
      const clone=res.clone();
      const type=clone.headers.get('content-type')||'';
      if(!/json/i.test(type))return {response:res,text:null,status:res.status,headers:{}};
      const text=await clone.text();
      const headers={'Content-Type':type||'application/json; charset=utf-8'};
      rememberResponse(key,text,res.status,headers);
      return {response:res,text,status:res.status,headers};
    })();
    inFlight.set(key,task);
    try{
      const saved=await task;
      return saved.response;
    }finally{inFlight.delete(key)}
  }

  function normalizeCatalogSet(s){
    return {
      id:String(s?.id||''),
      name:String(s?.name||s?.id||'Expansão'),
      serie:{name:String(s?.series||'Outras expansões')},
      logo:String(s?.images?.logo||''),
      symbol:String(s?.images?.symbol||''),
      cardCount:{official:Number(s?.printedTotal||s?.total||0),total:Number(s?.total||s?.printedTotal||0)},
      releaseDate:String(s?.releaseDate||''),
      ptcgoCode:String(s?.ptcgoCode||'')
    };
  }

  async function fetchPtcgCatalog(){
    const url=`${PTCG}/sets?orderBy=-releaseDate&select=id,name,series,ptcgoCode,releaseDate,printedTotal,total,images`;
    const res=await nativeFetch(url,{cache:'default',headers:{Accept:'application/json'}});
    if(!res.ok)throw new Error(`Pokémon TCG sets HTTP ${res.status}`);
    const json=await res.json();
    const rows=Array.isArray(json?.data)?json.data:[];
    if(!rows.length)throw new Error('Catálogo Pokémon TCG vazio');
    const data=rows.map(normalizeCatalogSet).filter(s=>s.id&&s.name);
    writeLocal(SET_CACHE,{at:now(),data});
    return data;
  }

  async function getCatalog(){
    const cached=readLocal(SET_CACHE);
    const age=cached?.at?now()-Number(cached.at):Infinity;
    if(Array.isArray(cached?.data)&&cached.data.length&&age<CATALOG_TTL)return cached.data;
    if(Array.isArray(cached?.data)&&cached.data.length&&age<STALE_TTL){
      setTimeout(()=>fetchPtcgCatalog().catch(()=>{}),0);
      return cached.data;
    }
    return fetchPtcgCatalog();
  }

  function readCardCache(){
    const raw=readLocal(CARD_CACHE);
    return raw&&typeof raw==='object'&&raw.entries&&typeof raw.entries==='object'?raw:{entries:{}};
  }

  function writeCardCache(setId,payload){
    const store=readCardCache();
    store.entries[String(setId)]={at:now(),payload};
    const rows=Object.entries(store.entries).sort((a,b)=>Number(b[1]?.at||0)-Number(a[1]?.at||0));
    store.entries=Object.fromEntries(rows.slice(0,10));
    writeLocal(CARD_CACHE,store);
  }

  async function fetchPtcgSetCards(setId){
    const pageSize=250;
    const select=encodeURIComponent('id,name,number,set,images,nationalPokedexNumbers,rarity,supertype,subtypes');
    const query=encodeURIComponent(`set.id:${setId}`);
    const fetchPage=async(page)=>{
      const url=`${PTCG}/cards?q=${query}&page=${page}&pageSize=${pageSize}&orderBy=number&select=${select}`;
      const res=await nativeFetch(url,{cache:'default',headers:{Accept:'application/json'}});
      if(!res.ok)throw new Error(`Pokémon TCG cards HTTP ${res.status}`);
      return res.json();
    };
    const first=await fetchPage(1);
    let rows=Array.isArray(first?.data)?first.data:[];
    const totalCount=Number(first?.totalCount||rows.length);
    const pages=Math.max(1,Math.ceil(totalCount/pageSize));
    for(let p=2;p<=pages;p++){
      const next=await fetchPage(p);
      if(Array.isArray(next?.data))rows=rows.concat(next.data);
    }
    const seen=new Set();
    rows=rows.filter(c=>{const id=String(c?.id||'');if(!id||seen.has(id))return false;seen.add(id);return true});
    let meta=rows[0]?.set||null;
    if(!meta){
      try{
        const res=await nativeFetch(`${PTCG}/sets/${encodeURIComponent(setId)}`,{cache:'default',headers:{Accept:'application/json'}});
        if(res.ok){const json=await res.json();meta=json?.data||json||null}
      }catch(_){ }
    }
    const payload={
      id:String(setId),
      name:String(meta?.name||setId),
      logo:String(meta?.images?.logo||''),
      symbol:String(meta?.images?.symbol||''),
      releaseDate:String(meta?.releaseDate||''),
      cardCount:{official:Number(meta?.printedTotal||totalCount||rows.length),total:Number(meta?.total||totalCount||rows.length)},
      cards:rows.map(c=>({
        id:String(c?.id||''),
        localId:String(c?.number||''),
        name:String(c?.name||'Carta'),
        image:String(c?.images?.small||c?.images?.large||''),
        images:c?.images||{},
        rarity:String(c?.rarity||''),
        nationalPokedexNumbers:Array.isArray(c?.nationalPokedexNumbers)?c.nationalPokedexNumbers:[]
      }))
    };
    writeCardCache(setId,payload);
    return payload;
  }

  async function getSetCards(setId){
    const cached=readCardCache()?.entries?.[String(setId)];
    const age=cached?.at?now()-Number(cached.at):Infinity;
    if(cached?.payload&&age<CARD_TTL)return cached.payload;
    if(cached?.payload&&age<STALE_TTL){
      setTimeout(()=>fetchPtcgSetCards(setId).catch(()=>{}),0);
      return cached.payload;
    }
    return fetchPtcgSetCards(setId);
  }

  async function interceptTcgDex(url){
    const parsed=new URL(url,location.href);
    const basePath='/v2/en/sets';
    if(parsed.pathname===basePath||parsed.pathname===basePath+'/'){
      const data=await getCatalog();
      document.body.dataset.m7ExpansionSource='pokemon-tcg-api';
      return jsonResponse(data);
    }
    const m=parsed.pathname.match(/^\/v2\/en\/sets\/([^/]+)$/);
    if(m){
      const setId=decodeURIComponent(m[1]);
      const payload=await getSetCards(setId);
      document.body.dataset.m7ExpansionSource='pokemon-tcg-api';
      return jsonResponse(payload);
    }
    return null;
  }

  /* v15.5 keeps its stable rendering/ownership logic. Only its TCGdex data
     requests are translated to the same Pokémon TCG API used by Search. */
  window.fetch=async function(input,init){
    const url=input instanceof Request?input.url:String(input||'');
    if(url.startsWith(TDX_PREFIX)){
      try{
        const translated=await interceptTcgDex(url);
        if(translated)return translated;
      }catch(err){
        console.warn('[M7 v15.10] Pokémon TCG expansion bridge:',err);
        try{return await nativeFetch(input,init)}catch(_){throw err}
      }
    }
    if(url.startsWith(PTCG)){
      try{return await cachedNetworkFetch(input,init,url)}catch(err){return nativeFetch(input,init)}
    }
    return nativeFetch(input,init);
  };

  function loadingMarkup(count=8){
    return `<div class="m7-v1510-skeleton-grid">${Array.from({length:count},()=>'<div class="m7-v1510-skeleton-card"><i></i><b></b><span></span></div>').join('')}</div>`;
  }

  function upgradeLoading(root=document){
    root.querySelectorAll?.('.m7-global-search-loading,.m7-v155-state').forEach(el=>{
      if(el.dataset.m7V1510Skeleton==='1')return;
      const text=(el.textContent||'').toLowerCase();
      if(!/(a carregar|a procurar cartas|preparar produtos)/.test(text))return;
      el.dataset.m7V1510Skeleton='1';
      el.classList.add('m7-v1510-loading-state');
      el.innerHTML=loadingMarkup(innerWidth<=760?4:8);
    });
  }

  function installLoadingObserver(){
    upgradeLoading();
    const obs=new MutationObserver(muts=>{
      muts.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)upgradeLoading(n)}));
    });
    obs.observe(document.body,{subtree:true,childList:true});
  }

  function installImageRecovery(){
    document.addEventListener('error',e=>{
      const img=e.target;
      if(!(img instanceof HTMLImageElement))return;
      if(img.matches('[data-v155-image]'))return; // v15.5 already owns these fallbacks.
      if(!img.matches('.m7-global-card-image img,.m7-global-detail-image img,.dex-card img,.binder-card img'))return;
      const src=img.getAttribute('src')||'';
      const attempt=Number(img.dataset.m7V1510Attempt||0);
      if(/images\.pokemontcg\.io/i.test(src)&&attempt<1){
        img.dataset.m7V1510Attempt='1';
        const alt=/_hires\.png(?:\?.*)?$/i.test(src)
          ?src.replace(/_hires\.png(\?.*)?$/i,'.png$1')
          :src.replace(/\.png(\?.*)?$/i,'_hires.png$1');
        if(alt!==src){img.src=alt;return}
      }
      const holder=img.parentElement;
      holder?.classList.add('m7-v1510-image-missing');
      img.hidden=true;
      if(holder&&!holder.querySelector('.m7-v1510-image-label')){
        const label=document.createElement('span');label.className='m7-v1510-image-label';label.textContent='Imagem indisponível';holder.appendChild(label);
      }
    },true);
  }

  function readScrolls(){try{return safeJson(sessionStorage.getItem(SCROLL_CACHE)||'',{})||{}}catch(_){return {}}}
  function writeScrolls(v){try{sessionStorage.setItem(SCROLL_CACHE,JSON.stringify(v))}catch(_){}}
  function installScrollMemory(){
    let current=document.body.dataset.m7View||'portfolio';
    document.addEventListener('click',e=>{
      const btn=e.target.closest?.('#m7AppNav [data-app-nav]');
      if(!btn)return;
      const positions=readScrolls();
      if(current)positions[current]=Math.max(0,window.scrollY||0);
      writeScrolls(positions);
      const target=String(btn.dataset.appNav||'');
      setTimeout(()=>{
        current=document.body.dataset.m7View||target||current;
        const saved=readScrolls()[target];
        if(Number.isFinite(Number(saved))&&Number(saved)>0&&document.body.dataset.m7View===target){
          window.scrollTo({top:Number(saved),behavior:'auto'});
        }
      },180);
    },true);
    const bodyObserver=new MutationObserver(()=>{current=document.body.dataset.m7View||current});
    bodyObserver.observe(document.body,{attributes:true,attributeFilter:['data-m7-view']});
    addEventListener('pagehide',()=>{const p=readScrolls();if(current)p[current]=Math.max(0,window.scrollY||0);writeScrolls(p)});
  }

  function installTapFeedback(){
    document.addEventListener('click',e=>{
      const el=e.target.closest?.('.m7-v155-set,.m7-global-card,.m7-home-action,.m7-setting-row,.binder-inspect-btn');
      if(!el)return;
      el.classList.remove('m7-v1510-tapped');
      void el.offsetWidth;
      el.classList.add('m7-v1510-tapped');
      setTimeout(()=>el.classList.remove('m7-v1510-tapped'),260);
    },true);
  }

  function installViewportState(){
    const sync=()=>{
      document.documentElement.style.setProperty('--m7-v1510-vh',`${visualViewport?.height||innerHeight}px`);
      document.body.classList.toggle('m7-v1510-portrait',innerHeight>=innerWidth);
      document.body.classList.toggle('m7-v1510-landscape',innerWidth>innerHeight);
    };
    sync();
    addEventListener('resize',sync,{passive:true});
    visualViewport?.addEventListener('resize',sync,{passive:true});
  }

  function installFinalAudit(){
    window.m7FinalAudit=()=>{
      const activeNav=[...document.querySelectorAll('#m7AppNav [data-app-nav].active')].map(x=>x.dataset.appNav);
      const activeViews=[...document.querySelectorAll('.m7-v15-view.active')].map(x=>x.dataset.m7ViewPanel);
      const mobile=matchMedia('(max-width:760px)').matches;
      const stats=document.querySelector('.m7-stats-panel');
      const statsVisible=!!(stats&&getComputedStyle(stats).display!=='none'&&stats.getBoundingClientRect().height>0);
      const images=[...document.querySelectorAll('.m7-global-card-image img,.m7-v155-card-img img,.m7-v155-set-image img')];
      const broken=images.filter(img=>img.hidden||(!img.complete&&img.getAttribute('src'))).length;
      const report={
        version:VERSION,
        view:document.body.dataset.m7View||'',
        activeNav,
        activeViews,
        expansionSource:document.body.dataset.m7ExpansionSource||'not-loaded',
        expansionSets:document.querySelectorAll('.m7-v155-set').length,
        expansionCards:document.querySelectorAll('.m7-v155-card').length,
        searchCards:document.querySelectorAll('.m7-global-card').length,
        stockCards:document.querySelectorAll('#m7ShopHost .stock-card').length,
        mobile,
        portfolioStatsVisible:document.body.dataset.m7View==='portfolio'?statsVisible:null,
        imageIssues:broken,
        horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+2
      };
      const bad=activeNav.length>1||activeViews.length>1||report.horizontalOverflow||(mobile&&report.view==='portfolio'&&!statsVisible);
      console[bad?'warn':'info'](`[M7 ${VERSION}] final audit`,report);
      return report;
    };
  }

  once(()=>{
    document.body.classList.add('m7-v1510');
    document.body.dataset.m7FinalPolish=VERSION;
    installLoadingObserver();
    installImageRecovery();
    installScrollMemory();
    installTapFeedback();
    installViewportState();
    installFinalAudit();
    setTimeout(()=>window.m7FinalAudit?.(),900);
  });
})();
