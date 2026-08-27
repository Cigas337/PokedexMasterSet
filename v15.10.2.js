/* Pokédex M7 v15.10.2 RC · regression fix: featured card integrity + resilient expansions */
(function(){
  'use strict';

  const VERSION='15.10.2-rc1';
  const PTCG='https://api.pokemontcg.io/v2';
  const TDX='https://api.tcgdex.net/v2/en';
  const previousFetch=window.fetch.bind(window);
  const setCatalogCache={ptcg:null,tdx:null};
  const setDetailCache=new Map();
  const inflight=new Map();

  const once=(fn)=>document.readyState==='loading'
    ?document.addEventListener('DOMContentLoaded',fn,{once:true})
    :fn();

  function norm(v){
    return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  }
  function compact(v){return norm(v).replace(/\b(pokemon|tcg|collection|cards|card|set|the)\b/g,' ').replace(/\s+/g,' ').trim()}
  function numKey(v){
    const s=String(v??'').trim().toLowerCase();
    if(/^\d+$/.test(s))return String(parseInt(s,10));
    return s.replace(/^0+(?=\d)/,'');
  }
  function jsonResponse(data,source='m7-v15102'){
    return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json; charset=utf-8','X-M7-Source':source}});
  }

  function xhrJson(url,{timeout=16000,retries=2}={}){
    const key=url;
    if(inflight.has(key))return inflight.get(key);
    const task=(async()=>{
      let last;
      for(let attempt=0;attempt<=retries;attempt++){
        try{
          const data=await new Promise((resolve,reject)=>{
            const xhr=new XMLHttpRequest();
            xhr.open('GET',url,true);
            xhr.timeout=timeout;
            xhr.setRequestHeader('Accept','application/json');
            xhr.onreadystatechange=()=>{
              if(xhr.readyState!==4)return;
              if(xhr.status>=200&&xhr.status<300){
                try{resolve(JSON.parse(xhr.responseText))}catch(err){reject(err)}
              }else reject(new Error(`HTTP ${xhr.status}`));
            };
            xhr.onerror=()=>reject(new Error('Erro de rede'));
            xhr.ontimeout=()=>reject(new Error('Timeout'));
            xhr.send();
          });
          return data;
        }catch(err){last=err;if(attempt<retries)await new Promise(r=>setTimeout(r,220*(attempt+1)))}
      }
      throw last||new Error('Falha de ligação');
    })().finally(()=>inflight.delete(key));
    inflight.set(key,task);
    return task;
  }

  async function ptcgCatalog(){
    if(setCatalogCache.ptcg)return setCatalogCache.ptcg;
    const raw=await xhrJson(`${PTCG}/sets?orderBy=-releaseDate&pageSize=250&select=id,name,series,ptcgoCode,releaseDate,printedTotal,total,images`);
    const rows=Array.isArray(raw?.data)?raw.data:[];
    setCatalogCache.ptcg=rows;
    return rows;
  }
  async function tdxCatalog(){
    if(setCatalogCache.tdx)return setCatalogCache.tdx;
    const raw=await xhrJson(`${TDX}/sets`,{timeout:18000,retries:1});
    const rows=Array.isArray(raw)?raw:Array.isArray(raw?.data)?raw.data:[];
    setCatalogCache.tdx=rows;
    return rows;
  }

  function scoreName(a,b){
    const aa=compact(a),bb=compact(b);
    if(!aa||!bb)return 0;
    if(aa===bb)return 100;
    if(aa.includes(bb)||bb.includes(aa))return 86;
    const A=new Set(aa.split(' ')),B=new Set(bb.split(' '));
    const common=[...A].filter(x=>B.has(x)).length;
    return common/Math.max(A.size,B.size)*70;
  }
  async function tdxSetByName(name){
    const rows=await tdxCatalog();
    let best=null,bestScore=0;
    for(const row of rows){
      const s=scoreName(name,row?.name||row?.id||'');
      if(s>bestScore){best=row;bestScore=s}
    }
    return bestScore>=48?best:null;
  }

  async function ptcgSetCards(setId){
    const cacheKey=`ptcg:${setId}`;
    if(setDetailCache.has(cacheKey))return setDetailCache.get(cacheKey);
    const task=(async()=>{
      let meta=null;
      try{const m=await xhrJson(`${PTCG}/sets/${encodeURIComponent(setId)}`,{timeout:12000,retries:1});meta=m?.data||m||null}catch(_){ }
      const pageSize=250;
      const q=encodeURIComponent(`set.id:${setId}`);
      const select=encodeURIComponent('id,name,number,set,images,nationalPokedexNumbers,rarity,supertype,subtypes');
      const first=await xhrJson(`${PTCG}/cards?q=${q}&page=1&pageSize=${pageSize}&orderBy=number&select=${select}`);
      let rows=Array.isArray(first?.data)?first.data:[];
      const total=Number(first?.totalCount||rows.length);
      const pages=Math.max(1,Math.ceil(total/pageSize));
      for(let p=2;p<=pages;p++){
        const next=await xhrJson(`${PTCG}/cards?q=${q}&page=${p}&pageSize=${pageSize}&orderBy=number&select=${select}`);
        if(Array.isArray(next?.data))rows=rows.concat(next.data);
      }
      if(!rows.length)throw new Error('Coleção sem cartas na fonte principal');
      meta=meta||rows[0]?.set||{};
      return {meta,rows,total};
    })();
    setDetailCache.set(cacheKey,task);
    return task;
  }

  async function tdxSetDetail(name){
    const set=await tdxSetByName(name);
    if(!set?.id)return null;
    const key=`tdx:${set.id}`;
    if(setDetailCache.has(key))return setDetailCache.get(key);
    const task=xhrJson(`${TDX}/sets/${encodeURIComponent(set.id)}`,{timeout:18000,retries:1}).then(raw=>({set,raw})).catch(()=>null);
    setDetailCache.set(key,task);
    return task;
  }
  function tdxCardFor(raw,number,name){
    const rows=Array.isArray(raw?.cards)?raw.cards:[];
    const nk=numKey(number),nn=compact(name);
    return rows.find(c=>numKey(c?.localId||c?.number)===nk)
      ||rows.find(c=>nn&&compact(c?.name)===nn)
      ||null;
  }

  function currentExpansionName(){return String(document.getElementById('v155DetailName')?.textContent||'').trim()}

  async function buildExpansionPayload(setId){
    let main=null;
    try{main=await ptcgSetCards(setId)}catch(err){console.warn('[M7 v15.10.2] PTCG set fallback:',setId,err?.message||err)}
    let name=String(main?.meta?.name||currentExpansionName()||setId);
    const shouldEnrich=/mcdonald/i.test(name)||!main;
    let alt=null;
    if(shouldEnrich){try{alt=await tdxSetDetail(name)}catch(_){ }}

    if(main){
      const rows=main.rows.map(c=>{
        const altCard=alt?tdxCardFor(alt.raw,c?.number,c?.name):null;
        const primary=String(altCard?.image||c?.images?.small||c?.images?.large||'');
        return {
          id:String(c?.id||''),localId:String(c?.number||''),name:String(c?.name||'Carta'),
          image:primary,images:c?.images||{},rarity:String(c?.rarity||''),
          nationalPokedexNumbers:Array.isArray(c?.nationalPokedexNumbers)?c.nationalPokedexNumbers:[]
        };
      });
      const meta=main.meta||{};
      document.body.dataset.m7ExpansionResolved=alt?'ptcg+tcgdex-images':'ptcg';
      return {
        id:String(setId),name:String(meta?.name||name),logo:String(meta?.images?.logo||alt?.raw?.logo||alt?.set?.logo||''),
        symbol:String(meta?.images?.symbol||alt?.raw?.symbol||alt?.set?.symbol||''),releaseDate:String(meta?.releaseDate||alt?.raw?.releaseDate||''),
        cardCount:{official:Number(meta?.printedTotal||main.total||rows.length),total:Number(meta?.total||main.total||rows.length)},cards:rows
      };
    }

    if(alt?.raw){
      const raw=alt.raw;
      const cards=(Array.isArray(raw?.cards)?raw.cards:[]).map(c=>({
        id:String(c?.id||`${alt.set.id}-${c?.localId||''}`),localId:String(c?.localId||c?.number||''),name:String(c?.name||'Carta'),
        image:String(c?.image||''),images:{},rarity:String(c?.rarity||''),nationalPokedexNumbers:Array.isArray(c?.dexId)?c.dexId:[]
      }));
      document.body.dataset.m7ExpansionResolved='tcgdex-fallback';
      return {
        id:String(setId),name:String(raw?.name||alt.set?.name||name),logo:String(raw?.logo||alt.set?.logo||''),symbol:String(raw?.symbol||alt.set?.symbol||''),
        releaseDate:String(raw?.releaseDate||alt.set?.releaseDate||''),cardCount:{official:Number(raw?.cardCount?.official||raw?.cardCount?.total||cards.length),total:Number(raw?.cardCount?.total||cards.length)},cards
      };
    }
    throw new Error('Nenhuma fonte conseguiu carregar esta coleção');
  }

  /* Intercept only expansion-detail calls generated by v15.5. Catalog/search remain on v15.10. */
  window.fetch=async function(input,init){
    const url=input instanceof Request?input.url:String(input||'');
    let parsed=null;try{parsed=new URL(url,location.href)}catch(_){ }
    const m=parsed?.pathname?.match(/^\/v2\/en\/sets\/([^/]+)$/);
    if(url.startsWith(TDX)&&m){
      const setId=decodeURIComponent(m[1]);
      try{return jsonResponse(await buildExpansionPayload(setId),'m7-v15102-expansion')}
      catch(err){console.warn('[M7 v15.10.2] expansion resolver:',err);return previousFetch(input,init)}
    }
    return previousFetch(input,init);
  };

  function unprefixedId(v){return String(v||'').replace(/^[a-z]{2}::/i,'')}
  function bestSnapshotImage(snap){
    const direct=[snap?.canonicalImageSmall,snap?.canonicalImageLarge,snap?.imageSmall,snap?.imageLarge,snap?.variantImage];
    const fall=Array.isArray(snap?.imageFallbacks)?snap.imageFallbacks:[];
    return [...direct,...fall].map(String).find(Boolean)||'';
  }
  function repairFeaturedForPokemon(id,{persist=false}={}){
    if(typeof pokemonCardDetail!=='function')return false;
    const d=pokemonCardDetail(id);if(!d?.featured||!d?.owned?.[d.featured])return false;
    let changed=false;
    const oldKey=String(d.featured),old=d.owned[oldKey];
    const rawId=unprefixedId(old?.tcgdexOriginalId||old?.id||oldKey.split('@@')[0]);
    const variantKey=String(old?.variantKey||oldKey.split('@@')[1]||'default');
    const candidates=Object.entries(d.owned).filter(([k,s])=>{
      const sid=unprefixedId(s?.tcgdexOriginalId||s?.id||k.split('@@')[0]);
      return sid===rawId&&String(s?.variantKey||k.split('@@')[1]||'default')===variantKey;
    });
    const english=candidates.find(([k,s])=>!String(k).includes('::')&&!String(s?.id||'').includes('::'));
    if((String(oldKey).includes('::')||String(old?.id||'').includes('::'))&&english){d.featured=english[0];changed=true}
    const snap=d.owned[d.featured];
    if(snap){
      const image=bestSnapshotImage(snap);
      if(image){
        for(const field of ['canonicalImageSmall','canonicalImageLarge','imageSmall','imageLarge']){
          if(!snap[field]){snap[field]=image;changed=true}
        }
      }
    }
    if(changed){
      try{if(typeof saveCardDetailStore==='function')saveCardDetailStore()}catch(_){ }
      if(persist&&typeof persistCardDetails==='function')persistCardDetails(id).catch(()=>{});
    }
    return changed;
  }
  function repairAllFeatured({persist=false}={}){
    let n=0;for(let id=1;id<=1025;id++)if(repairFeaturedForPokemon(id,{persist}))n++;
    if(n){
      try{if(typeof renderCurrentPage==='function')renderCurrentPage(false)}catch(_){ }
      try{if(typeof updateCollectionValueUI==='function')updateCollectionValueUI()}catch(_){ }
    }
    document.body.dataset.m7FeaturedRepairs=String(n);
    return n;
  }

  once(()=>{
    document.body.classList.add('m7-v15102');
    document.body.dataset.m7RegressionFix=VERSION;
    setTimeout(()=>repairAllFeatured({persist:true}),700);
    setTimeout(()=>repairAllFeatured({persist:false}),1800);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>repairAllFeatured({persist:false}),150)});
    window.m7RepairFeaturedCards=()=>repairAllFeatured({persist:true});
  });
})();
