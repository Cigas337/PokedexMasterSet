/* Pokédex M7 v15.3.0 · Global TCG card search */
(function(){
  const nav=document.getElementById('m7AppNav');
  const searchView=document.getElementById('m7SearchView');
  if(!nav||!searchView)return;
  document.body.classList.add('m7-v153');

  const legacyControls=searchView.querySelector('.controls');
  const legacyStage=searchView.querySelector('.stage');
  const searchBtn=nav.querySelector('[data-app-nav="search"]');
  if(searchBtn){
    searchBtn.setAttribute('aria-label','Pesquisa global de cartas');
    const label=searchBtn.querySelector('span:last-child');
    if(label)label.textContent='Search';
  }

  let lastQuery='';
  let lastSet='all';
  let lastSort='newest';
  let page=1;
  let totalCount=0;
  let cards=[];
  let currentCard=null;
  let searchToken=0;

  const shell=document.createElement('section');
  shell.className='m7-global-search';
  shell.id='m7GlobalSearch';
  shell.innerHTML=`
    <div class="m7-global-searchbar">
      <div class="m7-global-searchbox"><input id="m7GlobalQuery" autocomplete="off" placeholder="Pesquisar qualquer carta, coleção ou número…"><button id="m7GlobalSubmit" type="button" aria-label="Pesquisar">⌕</button></div>
      <select id="m7GlobalSet"><option value="all">Todas as coleções</option></select>
      <select id="m7GlobalSort"><option value="newest">Mais recentes</option><option value="oldest">Mais antigas</option><option value="name">Nome A–Z</option><option value="number">Número</option></select>
      <button class="m7-global-search-action" id="m7GlobalPhoto" type="button" aria-label="Pesquisar por foto">⌑</button>
    </div>
    <div class="m7-global-search-meta" id="m7GlobalMeta"><span>Pesquisa global de cartas TCG.</span><span></span></div>
    <div id="m7GlobalResults"><div class="m7-global-search-hint"><strong>Pesquisa qualquer carta Pokémon TCG</strong><span>Ex.: Charizard · MEP 079 · Pikachu 151 · Prismatic Evolutions</span></div></div>
  `;
  searchView.prepend(shell);

  const detail=document.createElement('div');
  detail.className='m7-global-detail';
  detail.id='m7GlobalDetail';
  detail.setAttribute('aria-hidden','true');
  detail.innerHTML='<div class="m7-global-detail-panel"><button class="m7-global-detail-close" id="m7GlobalDetailClose" type="button" aria-label="Fechar">×</button><div class="m7-global-detail-image"><img id="m7GlobalDetailImage" alt=""></div><div class="m7-global-detail-copy"><span class="m7-global-detail-kicker" id="m7GlobalDetailKicker"></span><h2 id="m7GlobalDetailName"></h2><p id="m7GlobalDetailSub"></p><div class="m7-global-detail-meta" id="m7GlobalDetailMeta"></div><div class="m7-global-detail-actions" id="m7GlobalDetailActions"></div></div></div>';
  document.body.appendChild(detail);

  const qEl=document.getElementById('m7GlobalQuery');
  const setEl=document.getElementById('m7GlobalSet');
  const sortEl=document.getElementById('m7GlobalSort');
  const resultsEl=document.getElementById('m7GlobalResults');
  const metaEl=document.getElementById('m7GlobalMeta');

  function esc(v){return typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function euroSafe(v){try{return typeof euro==='function'?euro(v):`${Number(v).toFixed(2)} €`}catch(_){return `${Number(v).toFixed(2)} €`}}
  function cmPrice(card){try{return typeof cardmarketPrice==='function'?cardmarketPrice(card):{value:NaN}}catch(_){return {value:NaN}}}
  function cardImage(card){return String(card?.images?.small||card?.images?.large||'')}
  function marketUrl(card){try{return card?.cardmarket?.url||card?.__marketUrl||(typeof cardmarketFallbackUrl==='function'?cardmarketFallbackUrl(card):'')}catch(_){return card?.cardmarket?.url||''}}
  function normalizeText(v){return String(v||'').trim().replace(/\s+/g,' ')}
  function luceneTerm(v){return String(v||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"')}
  function isProbablySetCode(token){return /^[a-z0-9]{2,8}$/i.test(token)&&/\d/.test(token)}
  function buildQuery(raw){
    const q=normalizeText(raw);
    if(!q)return '';
    const exactNum=q.match(/^([a-z]{2,8})\s*[- ]?\s*(\d{1,4}[a-z]?)$/i);
    if(exactNum)return `(set.ptcgoCode:${luceneTerm(exactNum[1])} OR set.id:${luceneTerm(exactNum[1])}) AND number:${luceneTerm(exactNum[2])}`;
    const parts=q.split(' ');
    const numeric=parts.find(x=>/^\d{1,4}[a-z]?$/i.test(x));
    const words=parts.filter(x=>x!==numeric);
    const clauses=[];
    if(words.length){const phrase=luceneTerm(words.join(' '));clauses.push(`(name:"${phrase}" OR set.name:"${phrase}")`)}
    if(numeric)clauses.push(`number:${luceneTerm(numeric)}`);
    if(!clauses.length)clauses.push(`name:"${luceneTerm(q)}"`);
    return clauses.join(' AND ');
  }
  function setClause(){
    const v=String(setEl?.value||'all');
    return v==='all'?'':`set.id:${luceneTerm(v)}`;
  }
  function orderBy(){const v=String(sortEl?.value||'newest');if(v==='oldest')return 'set.releaseDate';if(v==='name')return 'name';if(v==='number')return 'number';return '-set.releaseDate'}

  async function fetchSets(){
    try{
      const r=await fetch('https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate&select=id,name,ptcgoCode,releaseDate',{cache:'no-store'});
      if(!r.ok)return;
      const data=await r.json();
      const rows=Array.isArray(data?.data)?data.data:[];
      setEl.innerHTML='<option value="all">Todas as coleções</option>'+rows.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}${s.ptcgoCode?` · ${esc(s.ptcgoCode)}`:''}</option>`).join('');
      if([...setEl.options].some(o=>o.value===lastSet))setEl.value=lastSet;
    }catch(_){ }
  }

  async function performSearch({append=false}={}){
    const raw=normalizeText(qEl?.value||'');
    const setFilter=setClause();
    if(!raw&&!setFilter){
      cards=[];totalCount=0;page=1;
      resultsEl.innerHTML='<div class="m7-global-search-hint"><strong>Pesquisa qualquer carta Pokémon TCG</strong><span>Ex.: Charizard · MEP 079 · Pikachu 151 · Prismatic Evolutions</span></div>';
      metaEl.innerHTML='<span>Pesquisa global de cartas TCG.</span><span></span>';
      return;
    }
    if(!append)page=1;
    const token=++searchToken;
    if(!append)resultsEl.innerHTML='<div class="m7-global-search-loading">A procurar cartas em todas as coleções…</div>';
    const query=[buildQuery(raw),setFilter].filter(Boolean).join(' AND ');
    const select=encodeURIComponent('id,name,supertype,subtypes,rarity,number,artist,set,images,cardmarket,tcgplayer,nationalPokedexNumbers');
    const url=`https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}&page=${page}&pageSize=48&orderBy=${encodeURIComponent(orderBy())}&select=${select}`;
    try{
      const res=await fetch(url,{cache:'no-store'});
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      const payload=await res.json();
      if(token!==searchToken)return;
      const rows=Array.isArray(payload?.data)?payload.data:[];
      rows.forEach(c=>c.__source='Pokémon TCG API · pesquisa global');
      cards=append?cards.concat(rows):rows;
      totalCount=Number(payload?.totalCount||cards.length);
      renderResults();
      lastQuery=raw;lastSet=String(setEl?.value||'all');lastSort=String(sortEl?.value||'newest');
    }catch(err){
      if(token!==searchToken)return;
      resultsEl.innerHTML=`<div class="m7-global-search-hint"><strong>Não foi possível pesquisar agora</strong><span>${esc(err?.message||'Erro de ligação')}</span></div>`;
      metaEl.innerHTML='<span>Erro na pesquisa global.</span><span></span>';
    }
  }

  function renderResults(){
    const visible=cards;
    metaEl.innerHTML=`<span><strong>${visible.length}</strong> de ${totalCount} resultados carregados</span><span>${lastQuery?`Pesquisa: ${esc(lastQuery)}`:'Todas as cartas'}</span>`;
    if(!visible.length){resultsEl.innerHTML='<div class="m7-global-search-hint"><strong>Nenhuma carta encontrada</strong><span>Tenta apenas o nome do Pokémon, o nome da coleção ou o número da carta.</span></div>';return}
    resultsEl.innerHTML=`<div class="m7-global-card-grid">${visible.map((card,i)=>{
      const p=cmPrice(card);const price=Number.isFinite(p?.value)?euroSafe(p.value):'—';
      const subtype=(card?.subtypes||[]).join(' · ')||card?.supertype||'Carta';
      return `<article class="m7-global-card" data-global-index="${i}" tabindex="0"><div class="m7-global-card-image"><img loading="lazy" src="${esc(cardImage(card))}" alt="${esc(card.name||'Carta')}"></div><div class="m7-global-card-copy"><span class="set">${esc(card?.set?.name||'Coleção')}</span><strong>${esc(card?.name||'Carta')}</strong><small>${esc(card?.set?.ptcgoCode||card?.set?.id||'')} #${esc(card?.number||'—')} · ${esc(card?.rarity||subtype)}</small><div class="m7-global-card-foot"><span class="m7-global-card-price">${esc(price)}</span><span class="m7-global-card-type">${esc(subtype)}</span></div></div></article>`;
    }).join('')}</div>${cards.length<totalCount?'<button class="m7-global-loadmore" id="m7GlobalMore" type="button">Carregar mais cartas</button>':''}`;
    document.getElementById('m7GlobalMore')?.addEventListener('click',()=>{page++;performSearch({append:true})});
  }

  function pokemonForCard(card){
    const ids=(card?.nationalPokedexNumbers||[]).map(Number).filter(Boolean);
    const all=Array.isArray(window.__all)?window.__all:[];
    return all.find(p=>ids.includes(Number(p.id)))||all.find(p=>String(p?.name||'').toLowerCase()===String(card?.name||'').toLowerCase())||null;
  }

  function openDetail(card){
    currentCard=card;
    const img=document.getElementById('m7GlobalDetailImage');
    img.src=card?.images?.large||card?.images?.small||'';img.alt=card?.name||'Carta';
    document.getElementById('m7GlobalDetailKicker').textContent=card?.set?.name||'Pokémon TCG';
    document.getElementById('m7GlobalDetailName').textContent=card?.name||'Carta';
    document.getElementById('m7GlobalDetailSub').textContent=`${card?.set?.ptcgoCode||card?.set?.id||''} #${card?.number||'—'} · ${card?.rarity||card?.supertype||'Carta'}`;
    const price=cmPrice(card);const pokemon=pokemonForCard(card);
    document.getElementById('m7GlobalDetailMeta').innerHTML=`<div><span>Tipo</span><strong>${esc(card?.supertype||'Carta')}</strong></div><div><span>Raridade</span><strong>${esc(card?.rarity||'—')}</strong></div><div><span>Lançamento</span><strong>${esc(card?.set?.releaseDate||'—')}</strong></div><div><span>Cardmarket</span><strong>${Number.isFinite(price?.value)?esc(euroSafe(price.value)):'—'}</strong></div>`;
    const market=marketUrl(card);
    const actions=[];
    if(pokemon)actions.push('<button id="m7GlobalVariants" type="button">Ver variantes / adicionar</button>');
    if(market)actions.push(`<a class="secondary" href="${esc(market)}" target="_blank" rel="noopener">Cardmarket</a>`);
    actions.push('<button class="secondary" id="m7GlobalClose2" type="button">Fechar</button>');
    document.getElementById('m7GlobalDetailActions').innerHTML=actions.join('');
    document.getElementById('m7GlobalVariants')?.addEventListener('click',async()=>{
      if(!pokemon)return;
      closeDetail();
      try{if(typeof openVariantModal==='function')await openVariantModal(card,pokemon);else if(typeof openArtModal==='function')await openArtModal(pokemon)}catch(_){if(typeof openArtModal==='function')openArtModal(pokemon)}
    });
    document.getElementById('m7GlobalClose2')?.addEventListener('click',closeDetail);
    detail.classList.add('open');detail.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');
  }
  function closeDetail(){detail.classList.remove('open');detail.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');currentCard=null}

  resultsEl.addEventListener('click',e=>{const el=e.target.closest('[data-global-index]');if(el)openDetail(cards[Number(el.dataset.globalIndex)])});
  resultsEl.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const el=e.target.closest('[data-global-index]');if(el){e.preventDefault();openDetail(cards[Number(el.dataset.globalIndex)])}});
  document.getElementById('m7GlobalDetailClose')?.addEventListener('click',closeDetail);
  detail.addEventListener('click',e=>{if(e.target===detail)closeDetail()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&detail.classList.contains('open'))closeDetail()});

  document.getElementById('m7GlobalSubmit')?.addEventListener('click',()=>performSearch());
  qEl?.addEventListener('keydown',e=>{if(e.key==='Enter')performSearch()});
  setEl?.addEventListener('change',()=>{lastSet=setEl.value;performSearch()});
  sortEl?.addEventListener('change',()=>{lastSort=sortEl.value;performSearch()});
  document.getElementById('m7GlobalPhoto')?.addEventListener('click',()=>document.getElementById('mobileScanBtn')?.click());

  nav.addEventListener('click',e=>{
    const btn=e.target.closest('[data-app-nav]');if(!btn)return;
    if(btn.dataset.appNav==='search')setTimeout(()=>{
      if(qEl)qEl.value=lastQuery;
      if(setEl&&[...setEl.options].some(o=>o.value===lastSet))setEl.value=lastSet;
      if(sortEl)sortEl.value=lastSort;
      if(!lastQuery&&lastSet==='all')qEl?.focus({preventScroll:true});
    },20);
  });

  fetchSets();
  void legacyControls;void legacyStage;
})();
