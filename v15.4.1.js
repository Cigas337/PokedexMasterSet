/* Pokédex M7 v15.4.1 · navigation-safe Shop + TCGdex Expansions */
(function(){
  const nav=document.getElementById('m7AppNav');
  const wrap=document.querySelector('.wrap');
  const footer=wrap?.querySelector('.footer');
  if(!nav||!wrap||!footer)return;
  document.body.classList.add('m7-v1541');

  // Discard the v15.4 views. Their async callbacks keep references to the
  // detached nodes, so they can no longer overwrite this hotfix UI.
  const oldShop=document.getElementById('m7ShopView');
  const oldExp=document.getElementById('m7ExpansionsView');
  oldShop?.remove(); oldExp?.remove();

  const shopView=document.createElement('section');
  shopView.id='m7ShopView'; shopView.dataset.m7ViewPanel='shop';
  shopView.className='m7-v15-view m7-v1541-shop';
  shopView.innerHTML='<div class="m7-inline-page-head"><div><span>SHOP</span><h2>Produtos / Stock</h2><p>Lojas, disponibilidade e notificações Push.</p></div></div><div class="m7-shop-host" id="m7ShopHost"><div class="m7-shop-loading">A preparar Produtos / Stock…</div></div>';
  footer.before(shopView);

  const expView=document.createElement('section');
  expView.id='m7ExpansionsView'; expView.dataset.m7ViewPanel='expansions';
  expView.className='m7-v15-view m7-v1541-expansions';
  expView.innerHTML=`<div class="m7-expansions-surface"><div id="m7ExpansionListScreen"><header class="m7-expansion-title"><h2>Expansões</h2></header><div class="m7-expansion-search"><span>⌕</span><input id="m7ExpansionQuery" autocomplete="off" placeholder="Buscar por Nome"></div><div class="m7-expansion-filters"><button class="m7-expansion-filter clear" id="m7ExpansionClear" type="button">×</button><select id="m7ExpansionRegion"><option value="intl">🇺🇸 Internacional</option></select><select id="m7ExpansionSeries"><option value="all">▦ Era</option></select><select id="m7ExpansionType"><option value="all">▱ Tipo</option><option value="main">Principal</option><option value="special">Especial</option><option value="promo">Promos</option></select></div><span class="m7-expansion-source">Catálogo internacional · TCGdex</span><div id="m7ExpansionSets"><div class="m7-expansion-loading">A carregar expansões…</div></div></div><div id="m7ExpansionDetailScreen" hidden><div class="m7-expansion-detail-head"><button type="button" id="m7ExpansionBack" class="m7-expansion-back">‹</button><div class="m7-expansion-detail-logo"><img id="m7ExpansionDetailLogo" alt=""></div><div class="m7-expansion-detail-copy"><span id="m7ExpansionDetailSeries"></span><h2 id="m7ExpansionDetailName"></h2><p id="m7ExpansionDetailMeta"></p></div><div class="m7-expansion-detail-progress" id="m7ExpansionDetailProgress"><strong>0</strong><span>de 0</span></div></div><div class="m7-expansion-card-tools"><div class="m7-expansion-card-search"><span>⌕</span><input id="m7ExpansionCardQuery" placeholder="Pesquisar carta nesta expansão…"></div><select id="m7ExpansionOwnedFilter"><option value="all">Todas</option><option value="owned">Tenho</option><option value="missing">Em falta</option></select><select id="m7ExpansionSupertype" disabled><option>Cartas da expansão</option></select></div><div class="m7-expansion-card-grid" id="m7ExpansionCards"></div></div></div>`;
  footer.before(expView);

  function esc(v){return typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'')}
  function deactivateCustom(){shopView.classList.remove('active');expView.classList.remove('active')}
  function activate(view,name){document.querySelectorAll('.m7-v15-view').forEach(v=>v.classList.remove('active'));view.classList.add('active');nav.querySelectorAll('[data-app-nav]').forEach(b=>b.classList.toggle('active',b.dataset.appNav===name));document.body.dataset.m7View=name;try{localStorage.setItem('pokedexm7-v15-view',name)}catch(_){}window.scrollTo({top:0,behavior:'auto'})}

  // This listener is on document capture so it runs before the faulty v15.4
  // listeners attached directly to the nav element.
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('#m7AppNav [data-app-nav]');
    if(!b)return;
    const name=b.dataset.appNav;
    if(name==='shop'){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();showShop();return;
    }
    if(name==='expansions'){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();showExpansions();return;
    }
    deactivateCustom();
  },true);

  // ---------- SHOP ----------
  let shopMounted=false;
  function mountStockModal(){
    const host=document.getElementById('m7ShopHost');
    const modal=document.getElementById('stockModal');
    if(!host||!modal)return false;
    modal.classList.add('m7-shop-inline-modal');
    modal.classList.remove('m7-stock-detached');
    modal.removeAttribute('aria-hidden');
    modal.style.removeProperty('display');
    host.innerHTML='';
    if(modal.parentElement!==host)host.appendChild(modal);
    document.body.classList.remove('modal-open','stock-open');
    shopMounted=true;
    return true;
  }
  function showShop(){
    activate(shopView,'shop');
    // Render/update stock using the old, proven function, but keep the entire
    // modal DOM intact so none of its event handlers are lost.
    try{
      if(typeof v124OpenStock==='function')v124OpenStock();
      else document.getElementById('productStockBtn')?.click();
    }catch(err){
      const host=document.getElementById('m7ShopHost');
      if(host)host.innerHTML=`<div class="m7-expansion-error"><div><strong>Não foi possível abrir o Stock.</strong><span>${esc(err?.message||'Erro interno')}</span></div></div>`;
    }
    requestAnimationFrame(()=>mountStockModal());
    setTimeout(()=>mountStockModal(),60);
    setTimeout(()=>mountStockModal(),220);
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-v15-action="notifications"]');
    if(!b)return;
    e.preventDefault();e.stopPropagation();showShop();setTimeout(()=>document.getElementById('stockNotifyBtn')?.scrollIntoView({behavior:'smooth',block:'center'}),250);
  },true);
  new MutationObserver(()=>{if(shopMounted&&shopView.classList.contains('active')){mountStockModal();document.body.classList.remove('modal-open','stock-open')}}).observe(document.body,{attributes:true,attributeFilter:['class']});

  // ---------- EXPANSIONS ----------
  const ERA_RULES=[
    [/^me/i,'Mega Evolution',100],[/^sv/i,'Scarlet & Violet',90],[/^swsh/i,'Sword & Shield',80],[/^sm/i,'Sun & Moon',70],[/^xy/i,'XY',60],[/^bw/i,'Black & White',50],[/^hgss/i,'HeartGold & SoulSilver',45],[/^(pl|dp)/i,'Diamond & Pearl',40],[/^ex/i,'EX',35],[/^(ecard|neo|gym|base)/i,'Classic',20]
  ];
  function eraFor(set){for(const [re,label,rank] of ERA_RULES)if(re.test(set.id||''))return {label,rank};return {label:'Outras expansões',rank:10}}
  function typeFor(set){const s=norm(`${set.name} ${set.id}`);if(/promo|blackstar|gallery/.test(s))return 'promo';if(/fates|151|celebrations|pokemongo|crownzenith|prismatic|shrouded|special/.test(s))return 'special';return 'main'}
  function totalFor(set){return Number(set?.cardCount?.total||set?.cardCount?.official||0)}
  function logoFor(set){return String(set?.logo||'')}
  function cardImg(card,quality='low'){const base=String(card?.image||'');if(!base)return '';if(/\.(png|jpe?g|webp)(\?|$)/i.test(base))return base;return `${base}/${quality}.webp`}

  function ownedRows(){const out=[];const data=Array.isArray(window.__supabaseData)?window.__supabaseData:[];for(const row of data){const owned=row?.card_details?.owned;if(!owned||typeof owned!=='object')continue;for(const x of Object.values(owned)){if(x&&typeof x==='object')out.push({id:String(x.id||x.tcgdexOriginalId||''),name:String(x.name||''),number:String(x.number||''),setCode:String(x.setCode||''),setName:String(x.setName||'')})}}return out}
  function setMatch(set,row){return norm(row.setName)===norm(set.name)||norm(row.setCode)===norm(set.id)}
  function isOwned(card,set){const cid=norm(card.id),num=norm(card.localId||card.number),name=norm(card.name);return ownedRows().some(r=>(norm(r.id)&&norm(r.id)===cid)||(setMatch(set,r)&&norm(r.number)===num&&(!r.name||norm(r.name)===name)))}
  function ownedCount(set,cards){if(Array.isArray(cards)&&cards.length)return cards.filter(c=>isOwned(c,set)).length;const keys=new Set();for(const r of ownedRows())if(setMatch(set,r))keys.add(`${norm(r.number)}|${norm(r.name)}`);return keys.size}

  let sets=[],filtered=[],currentSet=null,currentCards=[],loadToken=0;
  async function loadSets(){
    const holder=document.getElementById('m7ExpansionSets');
    holder.innerHTML='<div class="m7-expansion-loading">A carregar expansões…</div>';
    try{
      const r=await fetch('https://api.tcgdex.net/v2/en/sets',{cache:'no-store'});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const data=await r.json();
      if(!Array.isArray(data))throw new Error('Resposta inválida');
      sets=data.map(s=>({...s,__era:eraFor(s)})).sort((a,b)=>(b.__era.rank-a.__era.rank)||String(b.id).localeCompare(String(a.id),undefined,{numeric:true}));
      const eras=[...new Set(sets.map(s=>s.__era.label))];
      document.getElementById('m7ExpansionSeries').innerHTML='<option value="all">▦ Era</option>'+eras.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
      applyFilters();
    }catch(err){
      holder.innerHTML=`<div class="m7-expansion-error"><div><strong>Não foi possível carregar as expansões.</strong><span>${esc(err?.message||'Erro de ligação')}</span><button type="button" class="m7-expansion-retry" id="m7ExpansionRetry">Tentar novamente</button></div></div>`;
      document.getElementById('m7ExpansionRetry')?.addEventListener('click',loadSets,{once:true});
    }
  }
  function applyFilters(){
    const q=norm(document.getElementById('m7ExpansionQuery')?.value||''),era=document.getElementById('m7ExpansionSeries')?.value||'all',type=document.getElementById('m7ExpansionType')?.value||'all';
    filtered=sets.filter(s=>(!q||norm(`${s.name} ${s.id}`).includes(q))&&(era==='all'||s.__era.label===era)&&(type==='all'||typeFor(s)===type));renderSets();
  }
  function renderSets(){
    const holder=document.getElementById('m7ExpansionSets');
    if(!filtered.length){holder.innerHTML='<div class="m7-expansion-empty">Nenhuma expansão encontrada.</div>';return}
    const groups=new Map();for(const s of filtered){if(!groups.has(s.__era.label))groups.set(s.__era.label,[]);groups.get(s.__era.label).push(s)}
    holder.innerHTML=[...groups.entries()].map(([era,rows])=>`<section class="m7-expansion-group"><h3>${esc(era)}</h3><div class="m7-expansion-set-grid">${rows.map(s=>{const total=totalFor(s),own=Math.min(total||9999,ownedCount(s)),pct=total?own/total*100:0;return `<button type="button" class="m7-expansion-set-card" data-hotfix-set="${esc(s.id)}"><div class="m7-expansion-set-top"><span class="m7-expansion-code">${esc(s.id)}</span><span class="m7-expansion-countwrap"><span>${own} de ${total||'—'}</span><span class="m7-set-ring" style="--p:${pct.toFixed(2)}"></span></span></div><div class="m7-expansion-set-logo">${logoFor(s)?`<img loading="lazy" src="${esc(logoFor(s))}" alt="${esc(s.name)}">`:`<span>${esc(s.name)}</span>`}</div><strong>${esc(s.name)}</strong></button>`}).join('')}</div></section>`).join('');
  }
  async function openSet(set){
    currentSet=set;currentCards=[];const token=++loadToken;
    document.getElementById('m7ExpansionListScreen').hidden=true;document.getElementById('m7ExpansionDetailScreen').hidden=false;
    const logo=document.getElementById('m7ExpansionDetailLogo');logo.src=logoFor(set);logo.alt=set.name||'Expansão';
    document.getElementById('m7ExpansionDetailSeries').textContent=set.__era.label;
    document.getElementById('m7ExpansionDetailName').textContent=set.name||'Expansão';
    document.getElementById('m7ExpansionDetailMeta').textContent=`${set.id} · ${totalFor(set)||'—'} cartas`;
    updateProgress();
    const grid=document.getElementById('m7ExpansionCards');grid.innerHTML='<div class="m7-expansion-card-loading">A carregar cartas desta expansão…</div>';
    try{
      const r=await fetch(`https://api.tcgdex.net/v2/en/sets/${encodeURIComponent(set.id)}`,{cache:'no-store'});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const data=await r.json();if(token!==loadToken)return;
      currentCards=Array.isArray(data?.cards)?data.cards:[];
      renderCards();updateProgress();
    }catch(err){if(token!==loadToken)return;grid.innerHTML=`<div class="m7-expansion-error"><div><strong>Não foi possível carregar as cartas.</strong><span>${esc(err?.message||'Erro de ligação')}</span><button type="button" class="m7-expansion-retry" id="m7ExpansionCardsRetry">Tentar novamente</button></div></div>`;document.getElementById('m7ExpansionCardsRetry')?.addEventListener('click',()=>openSet(set),{once:true})}
    window.scrollTo({top:0,behavior:'auto'});
  }
  function updateProgress(){if(!currentSet)return;const total=currentCards.length||totalFor(currentSet),own=ownedCount(currentSet,currentCards),pct=total?own/total*100:0,el=document.getElementById('m7ExpansionDetailProgress');el.style.setProperty('--p',pct.toFixed(2));el.innerHTML=`<strong>${own}</strong><span>de ${total||'—'}</span>`}
  function renderCards(){
    const q=norm(document.getElementById('m7ExpansionCardQuery')?.value||''),mode=document.getElementById('m7ExpansionOwnedFilter')?.value||'all';
    const rows=currentCards.filter(c=>{const own=isOwned(c,currentSet);return (!q||norm(`${c.name} ${c.localId||''}`).includes(q))&&(mode==='all'||(mode==='owned'?own:!own))});
    const grid=document.getElementById('m7ExpansionCards');
    if(!rows.length){grid.innerHTML='<div class="m7-expansion-empty">Nenhuma carta corresponde a estes filtros.</div>';return}
    grid.innerHTML=rows.map(c=>{const own=isOwned(c,currentSet);return `<article class="m7-expansion-card ${own?'owned':'missing'}"><div class="m7-expansion-card-preview"><span class="m7-expansion-card-status">${own?'✓ TENHO':'EM FALTA'}</span><div class="m7-expansion-card-image"><img loading="lazy" src="${esc(cardImg(c,'low'))}" alt="${esc(c.name||'Carta')}" onerror="this.onerror=null;this.src='${esc(String(c.image||''))}'"></div><div class="m7-expansion-card-copy"><strong>${esc(c.name||'Carta')}</strong><span>#${esc(c.localId||'—')}</span></div></div></article>`}).join('');
  }
  function showExpansions(){activate(expView,'expansions');if(!sets.length)loadSets();else renderSets()}

  document.getElementById('m7ExpansionQuery')?.addEventListener('input',applyFilters);
  document.getElementById('m7ExpansionSeries')?.addEventListener('change',applyFilters);
  document.getElementById('m7ExpansionType')?.addEventListener('change',applyFilters);
  document.getElementById('m7ExpansionClear')?.addEventListener('click',()=>{document.getElementById('m7ExpansionQuery').value='';document.getElementById('m7ExpansionSeries').value='all';document.getElementById('m7ExpansionType').value='all';applyFilters()});
  document.getElementById('m7ExpansionSets')?.addEventListener('click',e=>{const b=e.target.closest('[data-hotfix-set]');if(!b)return;const s=sets.find(x=>String(x.id)===String(b.dataset.hotfixSet));if(s)openSet(s)});
  document.getElementById('m7ExpansionBack')?.addEventListener('click',()=>{loadToken++;currentSet=null;currentCards=[];document.getElementById('m7ExpansionDetailScreen').hidden=true;document.getElementById('m7ExpansionListScreen').hidden=false;renderSets();window.scrollTo({top:0,behavior:'auto'})});
  document.getElementById('m7ExpansionCardQuery')?.addEventListener('input',renderCards);
  document.getElementById('m7ExpansionOwnedFilter')?.addEventListener('change',renderCards);

  // Don't fetch anything until Expansions is actually opened. This prevents a
  // remote API problem from affecting startup or blocking the rest of the app.
})();
