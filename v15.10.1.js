/* Pokédex M7 v15.10.1 RC · expansion image recovery patch */
(function(){
  'use strict';

  const VERSION='15.10.1-rc1';
  const TDX='https://api.tcgdex.net/v2/en';
  const setCache=new Map();
  const cardCache=new Map();
  const recovering=new WeakSet();

  const once=(fn)=>document.readyState==='loading'
    ?document.addEventListener('DOMContentLoaded',fn,{once:true})
    :fn();

  function xhrJson(url,timeout=12000){
    return new Promise((resolve,reject)=>{
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
  }

  function normalizeNumber(v){
    const s=String(v??'').trim().toLowerCase();
    if(/^\d+$/.test(s))return String(parseInt(s,10));
    return s.replace(/^0+(?=\d)/,'');
  }
  function norm(v){
    return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'');
  }
  function currentSetId(){
    const meta=String(document.getElementById('v155DetailMeta')?.textContent||'').trim();
    const first=meta.split('·')[0]?.trim();
    return first||'';
  }
  function cardInfo(holder){
    const card=holder.closest('.m7-v155-card');
    const button=card?.querySelector('[data-v155-search-card]');
    return {
      setId:currentSetId(),
      number:String(button?.dataset.v155SearchNumber||card?.querySelector('.m7-v155-card-copy span')?.textContent||'').replace(/^#/,'').trim(),
      name:String(button?.dataset.v155SearchCard||card?.querySelector('.m7-v155-card-copy strong')?.textContent||'').trim()
    };
  }

  async function getRawSet(setId){
    const key=String(setId||'').trim();
    if(!key)return null;
    if(setCache.has(key))return setCache.get(key);
    const task=xhrJson(`${TDX}/sets/${encodeURIComponent(key)}`).catch(()=>null);
    setCache.set(key,task);
    return task;
  }

  async function getRawCard(setId,number){
    const key=`${setId}-${number}`;
    if(cardCache.has(key))return cardCache.get(key);
    const variants=[String(number||'').trim()];
    if(/^\d+$/.test(variants[0])){
      const n=String(parseInt(variants[0],10));
      variants.push(n,n.padStart(2,'0'),n.padStart(3,'0'));
    }
    const task=(async()=>{
      for(const local of [...new Set(variants.filter(Boolean))]){
        try{
          const row=await xhrJson(`${TDX}/cards/${encodeURIComponent(setId+'-'+local)}`);
          if(row?.image)return row;
        }catch(_){ }
      }
      return null;
    })();
    cardCache.set(key,task);
    return task;
  }

  function findInSet(raw,number,name){
    const rows=Array.isArray(raw?.cards)?raw.cards:[];
    const nk=normalizeNumber(number),nn=norm(name);
    return rows.find(c=>normalizeNumber(c?.localId)===nk)
      ||rows.find(c=>nn&&norm(c?.name)===nn)
      ||null;
  }

  function candidates(base){
    const clean=String(base||'').trim().replace(/[?#].*$/,'').replace(/\/(?:high|low)\.(?:webp|png|jpe?g)$/i,'').replace(/\.(?:webp|png|jpe?g)$/i,'');
    if(!clean)return [];
    return [
      `${clean}/low.webp`,`${clean}/low.png`,`${clean}/low.jpg`,
      `${clean}/high.webp`,`${clean}/high.png`,`${clean}/high.jpg`
    ];
  }

  function tryCandidates(img,holder,list,index=0){
    if(index>=list.length){
      recovering.delete(holder);
      holder.classList.add('m7-v15101-image-unavailable');
      return;
    }
    const url=list[index];
    const done=()=>{
      img.onload=null;img.onerror=null;
      img.hidden=false;img.style.display='';
      holder.classList.remove('m7-v1510-image-missing','m7-v15101-image-unavailable');
      holder.querySelector('.fallback-name')?.remove();
      holder.querySelector('.m7-v1510-image-label')?.remove();
      recovering.delete(holder);
    };
    img.onload=done;
    img.onerror=()=>tryCandidates(img,holder,list,index+1);
    img.hidden=false;
    img.style.display='';
    img.src=url;
  }

  async function recoverHolder(holder){
    if(!holder||recovering.has(holder))return;
    const img=holder.querySelector('img[data-v155-image]');
    if(!img)return;
    const info=cardInfo(holder);
    if(!info.setId||!info.number)return;
    recovering.add(holder);
    holder.classList.add('m7-v15101-image-recovering');
    try{
      const rawSet=await getRawSet(info.setId);
      let raw=findInSet(rawSet,info.number,info.name);
      if(!raw?.image)raw=await getRawCard(info.setId,info.number);
      const list=candidates(raw?.image);
      holder.classList.remove('m7-v15101-image-recovering');
      if(list.length){tryCandidates(img,holder,list);return}
    }catch(_){ }
    holder.classList.remove('m7-v15101-image-recovering');
    recovering.delete(holder);
  }

  function scan(root=document){
    const holders=[];
    if(root.matches?.('.m7-v155-card-img'))holders.push(root);
    root.querySelectorAll?.('.m7-v155-card-img').forEach(h=>holders.push(h));
    holders.forEach(holder=>{
      const img=holder.querySelector('img[data-v155-image]');
      if(!img)return;
      const fallback=holder.querySelector('.fallback-name,.m7-v1510-image-label');
      const hidden=img.hidden||img.style.display==='none'||!img.getAttribute('src');
      if(fallback||hidden)recoverHolder(holder);
    });
  }

  function installObserver(){
    scan();
    const obs=new MutationObserver(muts=>{
      for(const m of muts){
        if(m.type==='childList'){
          if(m.target?.closest?.('.m7-v155-card-img'))scan(m.target.closest('.m7-v155-card-img'));
          m.addedNodes.forEach(n=>{if(n.nodeType===1)scan(n)});
        }
        if(m.type==='attributes'&&m.target instanceof HTMLImageElement&&m.target.matches('[data-v155-image]')){
          scan(m.target.closest('.m7-v155-card-img')||m.target.parentElement);
        }
      }
    });
    obs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src','style','hidden']});

    document.addEventListener('error',e=>{
      const img=e.target;
      if(!(img instanceof HTMLImageElement)||!img.matches('.m7-v155-card-img img[data-v155-image]'))return;
      const holder=img.closest('.m7-v155-card-img');
      setTimeout(()=>recoverHolder(holder),0);
    },true);
  }

  once(()=>{
    document.body.classList.add('m7-v15101');
    document.body.dataset.m7ImagePatch=VERSION;
    installObserver();
    setTimeout(()=>scan(),400);
    setTimeout(()=>scan(),1200);
  });
})();
