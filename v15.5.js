/* Pokédex M7 v15.5.0 · clean Shop + Expansions runtime
   Important: v15.4.js and v15.4.1.js must NOT be loaded with this file. */
(function(){
  const nav=document.getElementById('m7AppNav');
  const wrap=document.querySelector('.wrap');
  const footer=wrap?.querySelector('.footer');
  if(!nav||!wrap||!footer)return;
  document.body.classList.add('m7-v155');

  const esc=(v)=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=(v)=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'');
  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  const isVisible=(el)=>!!(el&&el.offsetParent!==null);

  function unlockPage(){
    document.body.classList.remove('modal-open','stock-open','m7-v155-shop-open');
    document.documentElement.style.overflow='';
    document.body.style.overflow='';
    document.body.style.pointerEvents='';
  }

  /* ---------- NAV + VIEWS ---------- */
  const shopBtn=nav.querySelector('[data-app-nav="shop"]');
  const profileBtn=nav.querySelector('[data-app-nav="profile"]');
  let expBtn=nav.querySelector('[data-app-nav="expansions"]');
  if(!expBtn){
    expBtn=document.createElement('button');
    expBtn.type='button'; expBtn.className='m7-nav-btn'; expBtn.dataset.appNav='expansions'; expBtn.setAttribute('aria-label','Expansões');
    expBtn.innerHTML='<svg viewBox="0 0 24 24"><path d="M4 7.5 12 4l8 3.5-8 3.5z"></path><path d="m4 12 8 3.5 8-3.5"></path><path d="m4 16.5 8 3.5 8-3.5"></path></svg><span>Expansões</span>';
    profileBtn?.before(expBtn);
  }
  if(shopBtn){const t=shopBtn.querySelector('span:last-child');if(t)t.textContent='Shop'}

  let shopView=document.getElementById('m7ShopView');
  if(shopView)shopView.remove();
  shopView=document.createElement('section');
  shopView.id='m7ShopView'; shopView.className='m7-v15-view'; shopView.dataset.m7ViewPanel='shop';
  shopView.innerHTML='<div class="m7-v155-page-head"><div><span>SHOP</span><h2>Produtos / Stock</h2><p>Produtos, lojas, disponibilidade e notificações Push.</p></div></div><div id="m7ShopHost"><div class="m7-v155-shop-placeholder">A preparar Produtos / Stock…</div></div>';
  footer.before(shopView);

  let expView=document.getElementById('m7ExpansionsView');
  if(expView)expView.remove();
  expView=document.createElement('section');
  expView.id='m7ExpansionsView'; expView.className='m7-v15-view'; expView.dataset.m7ViewPanel='expansions';
  expView.innerHTML=`<div class="m7-v155-exp-shell">
    <div id="v155SetList">
      <div class="m7-v155-exp-title"><h2>Expansões</h2></div>
      <div class="m7-v155-exp-search"><span>⌕</span><input id="v155SetQuery" autocomplete="off" placeholder="Buscar por Nome"></div>
      <div class="m7-v155-exp-filters"><button id="v155SetClear" class="m7-v155-exp-clear" type="button">×</button><select id="v155SetRegion"><option value="intl">🇺🇸 Internacional</option></select><select id="v155SetSeries"><option value="all">▦ Era</option></select></div>
      <div id="v155SetResults"><div class="m7-v155-state">A carregar expansões…</div></div>
    </div>
    <div id="v155SetDetail" hidden>
      <div class="m7-v155-detail-head"><button id="v155Back" class="m7-v155-back" type="button">‹</button><div class="m7-v155-detail-logo"><img id="v155DetailLogo" alt=""></div><div class="m7-v155-detail-copy"><span id="v155DetailSeries"></span><h2 id="v155DetailName"></h2><p id="v155DetailMeta"></p></div><div id="v155DetailCount" class="m7-v155-detail-count"><strong>0</strong><span>de 0</span></div></div>
      <div class="m7-v155-card-tools"><div class="m7-v155-card-search"><span>⌕</span><input id="v155CardQuery" placeholder="Pesquisar nesta expansão…"></div><select id="v155OwnedFilter"><option value="all">Todas</option><option value="owned">Tenho</option><option value="missing">Em falta</option></select></div>
      <div id="v155Cards" class="m7-v155-card-grid"></div>
    </div>
  </div>`;
  footer.before(expView);

  function setCustomView(name){
    unlockPage();
    document.querySelectorAll('.m7-v15-view').forEach(v=>v.classList.toggle('active',v.dataset.m7ViewPanel===name));
    nav.querySelectorAll('[data-app-nav]').forEach(b=>b.classList.toggle('active',b.dataset.appNav===name));
    document.body.dataset.m7View=name;
    try{localStorage.setItem('pokedexm7-v15-view',name)}catch(_){}
    window.scrollTo({top:0,behavior:'auto'});
  }
  function hideCustomViews(){
    shopView.classList.remove('active'); expView.classList.remove('active');
    unlockPage();
  }

  /* Capture phase is deliberate: it prevents v15's old special-case Shop handler. */
  nav.addEventListener('click',e=>{
    const btn=e.target.closest('[data-app-nav]'); if(!btn)return;
    const view=btn.dataset.appNav;
    if(view==='shop'){
      e.preventDefault(); e.stopImmediatePropagation(); showShop(); return;
    }
    if(view==='expansions'){
      e.preventDefault(); e.stopImmediatePropagation(); showExpansions(); return;
    }
    hideCustomViews();
  },true);

  /* ---------- SHOP ---------- */
  let shopMounted=false;
  function mountWholeStockModal(){
    const host=document.getElementById('m7ShopHost');
    const modal=document.getElementById('stockModal');
    if(!host||!modal)return false;
    if(modal.parentElement!==host){host.innerHTML='';host.appendChild(modal)}
    modal.classList.remove('m7-stock-detached');
    modal.removeAttribute('aria-hidden');
    modal.style.removeProperty('display'); modal.style.removeProperty('visibility'); modal.style.removeProperty('opacity'); modal.style.removeProperty('pointer-events');
    shopMounted=true;
    return true;
  }
  async function showShop(){
    setCustomView('shop');
    document.body.classList.add('m7-v155-shop-open');
    const mounted=mountWholeStockModal();
    if(!mounted){
      document.getElementById('m7ShopHost').innerHTML='<div class="m7-v155-state"><div><strong>Produtos / Stock ainda não está pronto.</strong><span>Recarrega a aplicação e tenta novamente.</span></div></div>';
      unlockPage(); return;
    }
    try{
      if(typeof v124OpenStock==='function')v124OpenStock();
      else if(typeof openStock==='function')openStock();
    }catch(err){console.warn('[M7 v15.5] Stock open:',err)}
    await sleep(0); mountWholeStockModal();
    await sleep(80); mountWholeStockModal();
    /* Opening the legacy modal may set a global scroll lock. In page mode it is not wanted. */
    document.body.classList.remove('modal-open','stock-open');
    document.documentElement.style.overflow=''; document.body.style.overflow=''; document.body.style.pointerEvents='';
    document.body.classList.add('m7-v155-shop-open');
  }
  /* Profile's notifications shortcut should land on the Shop page. */
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-v15-action="notifications"]'); if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();showShop().then(()=>setTimeout(()=>document.getElementById('stockNotifyBtn')?.scrollIntoView({behavior:'smooth',block:'center'}),120));
  },true);

  /* ---------- OWNED CARD INDEX ---------- */
  function ownedRecords(){
    const rows=[];
    const mons=Array.isArray(window.__all)?window.__all:[];
    for(const p of mons){
      let d=null;try{d=typeof getCardDetails==='function'?getCardDetails(p.id):null}catch(_){}
      const owned=d?.owned;if(!owned||typeof owned!=='object')continue;
      for(const c of Object.values(owned)){
        if(!c||typeof c!=='object')continue;
        rows.push({id:String(c.id||''),tdx:String(c.tcgdexOriginalId||''),name:String(c.name||''),number:String(c.number||''),setCode:String(c.setCode||''),setName:String(c.setName||'')});
      }
    }
    return rows;
  }
  function cardOwned(card,set){
    const cid=norm(card?.id),num=norm(card?.localId||card?.number),name=norm(card?.name),sid=norm(set?.id),sname=norm(set?.name);
    return ownedRecords().some(r=>{
      if(cid&&(norm(r.id)===cid||norm(r.tdx)===cid))return true;
      const sameSet=(sid&&(norm(r.setCode)===sid||norm(r.setCode).includes(sid)||sid.includes(norm(r.setCode))))||(sname&&norm(r.setName)===sname);
      return sameSet&&num&&norm(r.number)===num&&(!r.name||!name||norm(r.name)===name);
    });
  }
  function ownedForSet(set,cards){return (cards||[]).filter(c=>cardOwned(c,set)).length}

  /* ---------- IMAGE FALLBACKS ---------- */
  function uniq(a){return [...new Set(a.filter(Boolean))]}
  function imageCandidates(base,kind){
    const s=String(base||'').trim();if(!s)return [];
    if(/\.(?:webp|png|jpe?g)(?:\?.*)?$/i.test(s))return [s];
    if(kind==='card')return uniq([`${s}/high.webp`,`${s}/low.webp`,`${s}.webp`,`${s}.png`,s]);
    return uniq([`${s}.webp`,`${s}.png`,s,`${s}/high.webp`,`${s}/low.webp`]);
  }
  function setImg(img,base,kind,fallbackText){
    const list=imageCandidates(base,kind);let i=0;
    const fail=()=>{i++;if(i<list.length)img.src=list[i];else{img.removeAttribute('src');img.style.display='none';const holder=img.parentElement;if(holder&&fallbackText&&!holder.querySelector('.fallback-name'))holder.insertAdjacentHTML('beforeend',`<span class="fallback-name">${esc(fallbackText)}</span>`)} };
    img.onerror=fail;
    if(list.length){img.style.display='';img.src=list[0]}else fail();
  }
  function hydrateImages(root=document){
    root.querySelectorAll('img[data-v155-image]').forEach(img=>{if(img.dataset.v155Hydrated)return;img.dataset.v155Hydrated='1';setImg(img,img.dataset.v155Image,img.dataset.v155Kind||'set',img.dataset.v155Fallback||'')});
  }

  /* ---------- EXPANSIONS / TCGDEX ---------- */
  const TDX='https://api.tcgdex.net/v2/en';
  const SET_CACHE='pokedexm7-v155-sets-cache';
  let sets=[],setsLoaded=false,currentSet=null,currentCards=[],loadToken=0;
  async function jsonFetch(url,timeout=15000){
    const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),timeout);
    try{const r=await fetch(url,{cache:'no-store',signal:ctl.signal,headers:{Accept:'application/json'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.json()}finally{clearTimeout(timer)}
  }
  function normalizeSet(raw){
    const series=typeof raw?.serie==='object'?raw.serie?.name:(raw?.serie||raw?.series||'Outras expansões');
    return {id:String(raw?.id||''),name:String(raw?.name||raw?.id||'Expansão'),series:String(series||'Outras expansões'),logo:raw?.logo||raw?.symbol||raw?.image||'',symbol:raw?.symbol||'',total:Number(raw?.cardCount?.official||raw?.cardCount?.total||raw?.total||0),releaseDate:String(raw?.releaseDate||raw?.release_date||'')};
  }
  function readSetCache(){try{const v=JSON.parse(localStorage.getItem(SET_CACHE)||'null');return Array.isArray(v?.sets)?v.sets:[]}catch(_){return []}}
  function writeSetCache(rows){try{localStorage.setItem(SET_CACHE,JSON.stringify({at:Date.now(),sets:rows}))}catch(_){}}
  async function loadSets(force=false){
    const holder=document.getElementById('v155SetResults');
    if(setsLoaded&&!force){renderSets();return}
    holder.innerHTML='<div class="m7-v155-state">A carregar expansões…</div>';
    try{
      const raw=await jsonFetch(`${TDX}/sets`);
      const arr=Array.isArray(raw)?raw:Array.isArray(raw?.data)?raw.data:[];
      sets=arr.map(normalizeSet).filter(s=>s.id&&s.name);
      if(!sets.length)throw new Error('Catálogo vazio');
      setsLoaded=true;writeSetCache(sets);buildSeries();renderSets();
    }catch(err){
      const cached=readSetCache();
      if(cached.length){sets=cached;setsLoaded=true;buildSeries();renderSets();return}
      holder.innerHTML=`<div class="m7-v155-state"><div><strong>Não foi possível carregar as expansões.</strong><span>${esc(err?.name==='AbortError'?'Tempo de ligação excedido':err?.message||'Erro de ligação')}</span><button id="v155RetrySets" type="button">Tentar novamente</button></div></div>`;
      document.getElementById('v155RetrySets')?.addEventListener('click',()=>loadSets(true));
    }
  }
  function buildSeries(){
    const sel=document.getElementById('v155SetSeries');const cur=sel.value||'all';
    const values=[...new Set(sets.map(s=>s.series).filter(Boolean))].sort((a,b)=>b.localeCompare(a,'en'));
    sel.innerHTML='<option value="all">▦ Era</option>'+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(values.includes(cur))sel.value=cur;
  }
  function renderSets(){
    const holder=document.getElementById('v155SetResults'),q=norm(document.getElementById('v155SetQuery')?.value||''),series=String(document.getElementById('v155SetSeries')?.value||'all');
    const list=sets.filter(s=>(!q||norm(`${s.name} ${s.id} ${s.series}`).includes(q))&&(series==='all'||s.series===series));
    if(!list.length){holder.innerHTML='<div class="m7-v155-state"><div><strong>Nenhuma expansão encontrada.</strong><span>Experimenta outro nome ou limpa os filtros.</span></div></div>';return}
    const groups=new Map();for(const s of list){if(!groups.has(s.series))groups.set(s.series,[]);groups.get(s.series).push(s)}
    holder.innerHTML=[...groups.entries()].map(([group,rows])=>`<section class="m7-v155-exp-group"><h3>${esc(group)}</h3><div class="m7-v155-exp-grid">${rows.map(s=>{const known=s.total||0;const owned=ownedForSet(s,[]);const pct=known?owned/known*100:0;return `<button type="button" class="m7-v155-set" data-v155-set="${esc(s.id)}"><div class="m7-v155-set-top"><span class="m7-v155-code">${esc(s.id)}</span><span class="m7-v155-progress"><span>${owned} de ${known||'—'}</span><i class="m7-v155-ring" style="--p:${pct.toFixed(2)}"></i></span></div><div class="m7-v155-set-image"><img alt="${esc(s.name)}" data-v155-image="${esc(s.logo)}" data-v155-kind="set" data-v155-fallback="${esc(s.name)}"></div><strong>${esc(s.name)}</strong></button>`}).join('')}</div></section>`).join('');
    hydrateImages(holder);
  }
  async function openSet(set){
    const token=++loadToken;currentSet=set;currentCards=[];
    document.getElementById('v155SetList').hidden=true;document.getElementById('v155SetDetail').hidden=false;
    document.getElementById('v155DetailSeries').textContent=set.series||'Pokémon TCG';document.getElementById('v155DetailName').textContent=set.name;document.getElementById('v155DetailMeta').textContent=[set.id,set.releaseDate].filter(Boolean).join(' · ');
    setImg(document.getElementById('v155DetailLogo'),set.logo,'set',set.name);updateDetailCount();
    const grid=document.getElementById('v155Cards');grid.innerHTML='<div class="m7-v155-state">A carregar cartas desta expansão…</div>';
    try{
      const raw=await jsonFetch(`${TDX}/sets/${encodeURIComponent(set.id)}`);
      if(token!==loadToken)return;
      const cardRows=Array.isArray(raw?.cards)?raw.cards:Array.isArray(raw?.data?.cards)?raw.data.cards:[];
      if(raw?.logo)set.logo=raw.logo;if(raw?.cardCount)set.total=Number(raw.cardCount.official||raw.cardCount.total||set.total||0);
      currentCards=cardRows.map(c=>({id:String(c?.id||''),localId:String(c?.localId||c?.number||''),name:String(c?.name||'Carta'),image:c?.image||c?.images?.large||c?.images?.small||''})).filter(c=>c.id||c.name);
      if(!set.total)set.total=currentCards.length;
      renderCards();updateDetailCount();renderSets();
    }catch(err){
      if(token!==loadToken)return;
      grid.innerHTML=`<div class="m7-v155-state"><div><strong>Não foi possível carregar esta expansão.</strong><span>${esc(err?.name==='AbortError'?'Tempo de ligação excedido':err?.message||'Erro de ligação')}</span><button id="v155RetrySet" type="button">Tentar novamente</button></div></div>`;
      document.getElementById('v155RetrySet')?.addEventListener('click',()=>openSet(set));
    }
    window.scrollTo({top:0,behavior:'auto'});
  }
  function updateDetailCount(){
    const el=document.getElementById('v155DetailCount');if(!el||!currentSet)return;
    const total=currentCards.length||currentSet.total||0,owned=currentCards.length?ownedForSet(currentSet,currentCards):0,pct=total?owned/total*100:0;el.style.setProperty('--p',String(Math.max(0,Math.min(100,pct))));el.innerHTML=`<strong>${owned}</strong><span>de ${total||'—'}</span>`;
  }
  function renderCards(){
    const grid=document.getElementById('v155Cards'),q=norm(document.getElementById('v155CardQuery')?.value||''),filter=String(document.getElementById('v155OwnedFilter')?.value||'all');
    const rows=currentCards.filter(c=>{const owned=cardOwned(c,currentSet);return (!q||norm(`${c.name} ${c.localId}`).includes(q))&&(filter==='all'||(filter==='owned'?owned:!owned))});
    if(!rows.length){grid.innerHTML='<div class="m7-v155-state"><div><strong>Nenhuma carta corresponde aos filtros.</strong></div></div>';return}
    grid.innerHTML=rows.map(c=>{const owned=cardOwned(c,currentSet);return `<article class="m7-v155-card ${owned?'owned':'missing'}"><div class="m7-v155-card-img"><span class="m7-v155-status">${owned?'✓ TENHO':'EM FALTA'}</span><img alt="${esc(c.name)}" data-v155-image="${esc(c.image)}" data-v155-kind="card" data-v155-fallback="${esc(c.name)}"></div><div class="m7-v155-card-copy"><strong>${esc(c.name)}</strong><span>#${esc(c.localId||'—')}</span></div><button type="button" data-v155-search-card="${esc(c.name)}" data-v155-search-number="${esc(c.localId)}">${owned?'Ver carta':'Procurar / adicionar'}</button></article>`}).join('');hydrateImages(grid);
  }
  function showExpansions(){setCustomView('expansions');if(!setsLoaded)loadSets();else renderSets()}

  document.getElementById('v155SetQuery')?.addEventListener('input',renderSets);document.getElementById('v155SetSeries')?.addEventListener('change',renderSets);
  document.getElementById('v155SetClear')?.addEventListener('click',()=>{document.getElementById('v155SetQuery').value='';document.getElementById('v155SetSeries').value='all';renderSets()});
  document.getElementById('v155SetResults')?.addEventListener('click',e=>{const b=e.target.closest('[data-v155-set]');if(!b)return;const s=sets.find(x=>x.id===b.dataset.v155Set);if(s)openSet(s)});
  document.getElementById('v155Back')?.addEventListener('click',()=>{loadToken++;currentSet=null;currentCards=[];document.getElementById('v155SetDetail').hidden=true;document.getElementById('v155SetList').hidden=false;renderSets();window.scrollTo({top:0,behavior:'auto'})});
  document.getElementById('v155CardQuery')?.addEventListener('input',renderCards);document.getElementById('v155OwnedFilter')?.addEventListener('change',renderCards);
  document.getElementById('v155Cards')?.addEventListener('click',e=>{const b=e.target.closest('[data-v155-search-card]');if(!b)return;const name=b.dataset.v155SearchCard||'',num=b.dataset.v155SearchNumber||'';hideCustomViews();nav.querySelector('[data-app-nav="search"]')?.click();setTimeout(()=>{const q=document.getElementById('m7GlobalQuery');if(q){q.value=`${name} ${num}`.trim();document.getElementById('m7GlobalSubmit')?.click()}},80)});

  /* If another part of the old app opens stock through the hidden legacy button,
     route it into the page after the original click has done its work. */
  document.getElementById('productStockBtn')?.addEventListener('click',()=>setTimeout(()=>{if(!shopView.classList.contains('active'))showShop()},0));

  /* Saved custom route. v15.2 does not know these names, so restore after its boot. */
  setTimeout(()=>{let saved='';try{saved=localStorage.getItem('pokedexm7-v15-view')||''}catch(_){}if(saved==='shop')showShop();else if(saved==='expansions')showExpansions()},140);
  unlockPage();
})();
