/* Pokédex M7 v15.1.0 · Portfolio-first navigation + missing-card discovery */
(function(){
  const nav=document.getElementById('m7AppNav');
  const home=document.getElementById('m7HomeView');
  const portfolio=document.getElementById('m7PortfolioView');
  const search=document.getElementById('m7SearchView');
  if(!nav||!portfolio||!search)return;
  document.body.classList.add('m7-v151');

  const homeBtn=nav.querySelector('[data-app-nav="home"]');
  const portfolioBtn=nav.querySelector('[data-app-nav="portfolio"]');
  const searchBtn=nav.querySelector('[data-app-nav="search"]');
  const shopBtn=nav.querySelector('[data-app-nav="shop"]');
  const profileBtn=nav.querySelector('[data-app-nav="profile"]');
  homeBtn?.remove();
  [portfolioBtn,searchBtn,shopBtn,profileBtn].forEach(btn=>btn&&nav.appendChild(btn));
  if(portfolioBtn){
    portfolioBtn.setAttribute('aria-label','Portefólio · página principal');
    const label=portfolioBtn.querySelector('span:last-child');
    if(label)label.textContent='Portfolio';
  }
  try{if((localStorage.getItem('pokedexm7-v15-view')||'home')==='home')localStorage.setItem('pokedexm7-v15-view','portfolio')}catch(_){ }

  const heading=portfolio.querySelector('.m7-view-heading');
  if(heading){
    const kicker=heading.querySelector('.m7-view-kicker');
    const title=heading.querySelector('h2');
    const copy=heading.querySelector('p');
    if(kicker)kicker.textContent='Portfolio · Master Set';
    if(title)title.textContent='A tua coleção';
    if(copy)copy.textContent='Tudo o que tens, o que ainda falta e o progresso do teu Master Set num único ecrã.';
  }
  const homeHero=home?.querySelector('.m7-home-hero');
  const homeMetrics=home?.querySelector('.m7-metric-grid');
  if(homeHero){
    homeHero.classList.add('m7-v151-portfolio-hero');
    const kicker=homeHero.querySelector('.m7-view-kicker');
    const title=homeHero.querySelector('h2');
    const copy=homeHero.querySelector('p');
    if(kicker)kicker.textContent='Pokédex M7 · Portfolio';
    if(title)title.innerHTML='O teu Master Set.<br>Tudo num só lugar.';
    if(copy)copy.textContent='Vê as cartas que já tens, descobre o que falta e salta diretamente para Search ou Shop quando precisares.';
    const actions=homeHero.querySelector('.m7-home-actions');
    if(actions){
      actions.innerHTML=`<button class="m7-home-action primary" data-v151-nav="search" type="button"><strong>Procurar cartas em falta</strong><span>Pesquisa e descobertas de lançamentos recentes.</span></button><button class="m7-home-action" data-v151-action="photo" type="button"><strong>Pesquisar por foto</strong><span>Fotografa uma carta que acabaste de tirar do pack.</span></button><button class="m7-home-action" data-v151-nav="shop" type="button"><strong>Produtos / Stock</strong><span>Lojas, disponibilidade e notificações Push.</span></button><button class="m7-home-action" data-v151-scroll="missing" type="button"><strong>Ver o que falta</strong><span>Vai diretamente aos Pokémon ainda por completar.</span></button>`;
    }
    heading?.after(homeHero);
  }
  if(homeMetrics){
    homeMetrics.classList.add('m7-v151-portfolio-metrics');
    homeHero?.after(homeMetrics);
  }
  home?.remove();
  portfolio.querySelector('.m7-portfolio-grid')?.remove();

  const generationCard=portfolio.querySelector('.m7-section-card');
  const collectionOverview=document.createElement('section');
  collectionOverview.className='m7-v151-collection-overview';
  collectionOverview.innerHTML=`
    <div class="m7-v151-collection-block" id="v151OwnedBlock">
      <div class="m7-v151-block-head"><div><span class="m7-view-kicker">Na coleção</span><h3>Cartas que tens</h3><p id="v151OwnedMeta">A carregar coleção…</p></div><button type="button" data-v151-refresh="owned">Nova amostra</button></div>
      <div class="m7-v151-card-grid" id="v151OwnedGrid"></div>
    </div>
    <div class="m7-v151-collection-block" id="v151MissingBlock">
      <div class="m7-v151-block-head"><div><span class="m7-view-kicker">Por completar</span><h3>Pokémon em falta</h3><p id="v151MissingMeta">A carregar coleção…</p></div><button type="button" data-v151-nav="search">Procurar</button></div>
      <div class="m7-v151-card-grid" id="v151MissingGrid"></div>
    </div>`;
  if(generationCard)generationCard.before(collectionOverview); else portfolio.appendChild(collectionOverview);

  const searchHeading=search.querySelector('.m7-view-heading');
  if(searchHeading){
    const kicker=searchHeading.querySelector('.m7-view-kicker');
    const title=searchHeading.querySelector('h2');
    const copy=searchHeading.querySelector('p');
    if(kicker)kicker.textContent='Search · Em falta';
    if(title)title.textContent='Que carta saiu no pack?';
    if(copy)copy.textContent='Pesquisa apenas Pokémon que ainda não tens. Em baixo tens sugestões aleatórias com cartas de coleções recentes.';
  }
  const controls=search.querySelector('.controls');
  const stage=search.querySelector('.stage');
  const searchInput=document.getElementById('search');
  if(searchInput)searchInput.placeholder='Pesquisar Pokémon que ainda não tens…';
  const filter=document.getElementById('filterBy');
  if(filter){filter.value='missing';filter.closest('.select-wrap')?.classList.add('m7-v151-hidden-filter')}
  const filterToggle=document.getElementById('mobileFilterToggle');
  if(filterToggle){
    filterToggle.childNodes.forEach(n=>{if(n.nodeType===Node.TEXT_NODE)n.textContent=' Ordenar '});
    filterToggle.setAttribute('aria-label','Ordenar resultados');
  }
  if(stage){const stageTitle=stage.querySelector('.stage-head h2');if(stageTitle)stageTitle.textContent='Pokémon que ainda te faltam'}
  const discovery=document.createElement('section');
  discovery.className='m7-v151-discovery';
  discovery.id='v151Discovery';
  discovery.innerHTML=`<div class="m7-v151-discovery-head"><div><span class="m7-view-kicker">Descobrir</span><h3>Cartas de lançamentos recentes</h3><p>Uma seleção aleatória de Pokémon em falta. Toca numa carta para abrir todas as versões desse Pokémon.</p></div><button id="v151Shuffle" type="button">↻ Nova seleção</button></div><div class="m7-v151-discovery-grid" id="v151DiscoveryGrid"></div>`;
  controls?.before(discovery);

  function maps(){
    if(typeof getOwnedMaps==='function')return getOwnedMaps();
    const data=window.__supabaseData||[];
    return {card:new Map(data.map(x=>[Number(x.pokemon_id),x.card===true])),art:new Map(data.map(x=>[Number(x.pokemon_id),x.full_art===true]))};
  }
  function allPokemon(){return Array.isArray(window.__all)?window.__all:[]}
  function sample(list,n){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a.slice(0,n)}
  function recentPoolIds(){
    const ids=new Set();
    try{if(typeof MEP_RECENT_BY_POKEMON!=='undefined')for(const id of MEP_RECENT_BY_POKEMON.keys())ids.add(Number(id))}catch(_){ }
    try{if(typeof THIRTIETH_BY_POKEMON!=='undefined')for(const id of THIRTIETH_BY_POKEMON.keys())ids.add(Number(id))}catch(_){ }
    [1,4,7,25,39,52,54,133,147,152,155,158,172,175,179,252,255,258,280,387,390,393,447,495,498,501,570,650,653,656,700,722,725,728,778,810,813,816,906,909,912,937,1000].forEach(id=>ids.add(id));
    return ids;
  }
  function recentManualCardFor(p){
    let rows=[];
    try{if(typeof recentMepCardsForPokemon==='function')rows=rows.concat(recentMepCardsForPokemon(p.id)||[])}catch(_){ }
    try{if(typeof preRelease30CardsForPokemon==='function')rows=rows.concat(preRelease30CardsForPokemon(p.id)||[])}catch(_){ }
    try{if(typeof firstPartner30thCardFor==='function'){const c=firstPartner30thCardFor(p.id);if(c)rows.unshift(c)}}catch(_){ }
    return rows.find(c=>c?.images?.small||c?.images?.large)||rows[0]||null;
  }
  function escapeLocal(v){return typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function pokemonName(p){return typeof pretty==='function'?pretty(p.name):String(p.name||`#${p.id}`)}
  function pokemonArtwork(p){try{return typeof artworkUrl==='function'?artworkUrl(p.id):''}catch(_){return ''}}
  function cardImage(card,p){return String(card?.images?.small||card?.images?.large||pokemonArtwork(p)||'')}
  function setName(card){return String(card?.set?.name||card?.setName||'Coleção recente')}
  function releaseDate(card){return String(card?.set?.releaseDate||card?.releaseDate||'')}

  let overviewTimer=0;
  function renderOverview(){
    clearTimeout(overviewTimer);
    overviewTimer=setTimeout(()=>{
      const all=allPokemon(); if(!all.length)return;
      const ownedMaps=maps();
      const owned=all.filter(p=>ownedMaps.card.get(Number(p.id))===true);
      const missing=all.filter(p=>ownedMaps.card.get(Number(p.id))!==true);
      const ownedMeta=document.getElementById('v151OwnedMeta');
      const missingMeta=document.getElementById('v151MissingMeta');
      if(ownedMeta)ownedMeta.textContent=`${owned.length} de 1025 Pokémon já têm carta no teu Master Set.`;
      if(missingMeta)missingMeta.textContent=`Ainda faltam ${missing.length} Pokémon para completar a Pokédex.`;
      const ownedGrid=document.getElementById('v151OwnedGrid');
      const missingGrid=document.getElementById('v151MissingGrid');
      const sampleSize=window.innerWidth<=760?4:8;
      if(ownedGrid){ownedGrid.innerHTML='';sample(owned,sampleSize).forEach(p=>{try{ownedGrid.appendChild(makeCard(p))}catch(_){}})}
      if(missingGrid){missingGrid.innerHTML='';sample(missing,sampleSize).forEach(p=>{try{missingGrid.appendChild(makeCard(p))}catch(_){}})}
      try{if(typeof ensureTypes==='function')ensureTypes([...ownedGrid?.querySelectorAll('.dex-card')||[],...missingGrid?.querySelectorAll('.dex-card')||[]].map(el=>Number(el.dataset.pokemonId)).filter(Boolean))}catch(_){ }
    },80);
  }

  let discoveryToken=0;
  async function renderDiscovery(){
    const grid=document.getElementById('v151DiscoveryGrid'); if(!grid)return;
    const token=++discoveryToken;
    const all=allPokemon(); if(!all.length){grid.innerHTML='<div class="m7-v151-empty">A carregar Pokédex…</div>';return}
    const ownedMaps=maps();
    const missing=all.filter(p=>ownedMaps.card.get(Number(p.id))!==true);
    if(!missing.length){grid.innerHTML='<div class="m7-v151-empty">Master Set completo — não tens Pokémon em falta. ✨</div>';return}
    const recentIds=recentPoolIds();
    const recentMissing=missing.filter(p=>recentIds.has(Number(p.id)));
    const candidates=sample(recentMissing.length>=6?recentMissing:missing,6);
    grid.innerHTML=candidates.map(p=>`<button type="button" class="m7-v151-discovery-card is-loading" data-v151-pokemon="${Number(p.id)}"><div class="m7-v151-discovery-image"><img alt="${escapeLocal(pokemonName(p))}" src="${escapeLocal(pokemonArtwork(p))}"></div><div class="m7-v151-discovery-copy"><span>#${String(p.id).padStart(3,'0')} · EM FALTA</span><strong>${escapeLocal(pokemonName(p))}</strong><small>A procurar carta recente…</small></div></button>`).join('');
    for(const p of candidates){
      if(token!==discoveryToken)return;
      const el=grid.querySelector(`[data-v151-pokemon="${Number(p.id)}"]`); if(!el)continue;
      let card=recentManualCardFor(p);
      if(!card){
        try{const cards=typeof fetchAllCardsForPokemon==='function'?await fetchAllCardsForPokemon(p):[];card=(cards||[]).find(c=>c?.images?.small||c?.images?.large)||cards?.[0]||null}catch(_){card=null}
      }
      if(token!==discoveryToken)return;
      const img=el.querySelector('img'),small=el.querySelector('small');
      if(img&&cardImage(card,p))img.src=cardImage(card,p);
      if(small)small.textContent=card?`${setName(card)}${releaseDate(card)?' · '+releaseDate(card).slice(0,4):''}`:'Última carta disponível';
      el.classList.remove('is-loading');
    }
  }

  function forceSearchMissing(){
    try{
      if(typeof state!=='undefined'){
        state.filter='missing';state.generation=null;state.page=1;
        const q=String(searchInput?.value||'').trim();state.search=q;
      }
      if(filter)filter.value='missing';
      if(typeof renderCurrentPage==='function')renderCurrentPage();
    }catch(_){ }
    renderDiscovery();
  }

  nav.addEventListener('click',e=>{const btn=e.target.closest('[data-app-nav]');if(!btn)return;if(btn.dataset.appNav==='search')setTimeout(forceSearchMissing,0)});
  document.querySelectorAll('[data-v151-nav]').forEach(btn=>btn.addEventListener('click',()=>nav.querySelector(`[data-app-nav="${btn.dataset.v151Nav}"]`)?.click()));
  document.querySelector('[data-v151-action="photo"]')?.addEventListener('click',()=>{nav.querySelector('[data-app-nav="search"]')?.click();setTimeout(()=>document.getElementById('mobileScanBtn')?.click(),100)});
  document.querySelector('[data-v151-scroll="missing"]')?.addEventListener('click',()=>document.getElementById('v151MissingBlock')?.scrollIntoView({behavior:'smooth',block:'start'}));
  document.querySelector('[data-v151-refresh="owned"]')?.addEventListener('click',renderOverview);
  document.getElementById('v151Shuffle')?.addEventListener('click',renderDiscovery);
  document.getElementById('v151DiscoveryGrid')?.addEventListener('click',e=>{const card=e.target.closest('[data-v151-pokemon]');if(!card)return;const p=allPokemon().find(x=>Number(x.id)===Number(card.dataset.v151Pokemon));if(p&&typeof openArtModal==='function')openArtModal(p)});

  const watched=['count','cardsCount','missingCount'].map(id=>document.getElementById(id)).filter(Boolean);
  let changeTimer=0;
  const observer=new MutationObserver(()=>{clearTimeout(changeTimer);changeTimer=setTimeout(()=>{renderOverview();if(search.classList.contains('active'))renderDiscovery()},140)});
  watched.forEach(el=>observer.observe(el,{subtree:true,childList:true,characterData:true}));

  const homeWasVisible=portfolioBtn&&!portfolioBtn.classList.contains('active')&&(!nav.querySelector('.m7-nav-btn.active')||nav.querySelector('.m7-nav-btn.active')?.dataset.appNav==='home');
  if(homeWasVisible||!nav.querySelector('.m7-nav-btn.active'))setTimeout(()=>portfolioBtn?.click(),0);
  else if(nav.querySelector('.m7-nav-btn.active')?.dataset.appNav==='search')setTimeout(forceSearchMissing,0);
  setTimeout(()=>{renderOverview();if(search.classList.contains('active'))renderDiscovery()},500);
})();
