/* Pokédex M7 v15.2.0 · Classic Pokédex + clean Search */
(function(){
  const nav=document.getElementById('m7AppNav');
  const pokedexView=document.getElementById('m7PortfolioView');
  const searchView=document.getElementById('m7SearchView');
  if(!nav||!pokedexView||!searchView)return;

  document.body.classList.add('m7-v152');

  const pokedexBtn=nav.querySelector('[data-app-nav="portfolio"]');
  const searchBtn=nav.querySelector('[data-app-nav="search"]');
  const shopBtn=nav.querySelector('[data-app-nav="shop"]');
  const profileBtn=nav.querySelector('[data-app-nav="profile"]');

  // Portfolio is now simply Pokédex.
  if(pokedexBtn){
    pokedexBtn.setAttribute('aria-label','Pokédex');
    const label=pokedexBtn.querySelector('span:last-child');
    if(label)label.textContent='Pokédex';
  }

  // Remove every v15/v15.1 dashboard/portfolio block from this view.
  pokedexView.innerHTML='';
  pokedexView.setAttribute('aria-label','Pokédex');

  // Search should be a tool, not a landing/discovery page.
  searchView.querySelector('.m7-view-heading')?.remove();
  searchView.querySelector('#v151Discovery')?.remove();
  searchView.querySelectorAll('.m7-v151-discovery').forEach(el=>el.remove());

  const controls=searchView.querySelector('.controls')||document.querySelector('.controls');
  const stage=searchView.querySelector('.stage')||document.querySelector('.stage');
  if(!controls||!stage)return;

  const searchInput=document.getElementById('search');
  const filterBy=document.getElementById('filterBy');
  const filterWrap=filterBy?.closest('.select-wrap');
  const stageTitle=()=>stage.querySelector('.stage-head h2');

  let pokedexSnapshot={search:'',filter:'all',generation:null,page:1};
  let searchText='';

  function getState(){
    try{
      if(typeof state!=='undefined'){
        return {
          search:String(state.search||''),
          filter:String(state.filter||'all'),
          generation:state.generation??null,
          page:Number(state.page||1)
        };
      }
    }catch(_){ }
    return {
      search:String(searchInput?.value||''),
      filter:String(filterBy?.value||'all'),
      generation:null,
      page:1
    };
  }

  function capturePokedex(){
    if(controls.parentElement!==pokedexView)return;
    pokedexSnapshot=getState();
    if(searchInput)pokedexSnapshot.search=String(searchInput.value||'');
  }

  function applyState(next){
    try{
      if(typeof state!=='undefined'){
        state.search=String(next.search||'');
        state.filter=String(next.filter||'all');
        state.generation=next.generation??null;
        state.page=Math.max(1,Number(next.page||1));
      }
    }catch(_){ }
    if(searchInput)searchInput.value=String(next.search||'');
    if(filterBy)filterBy.value=String(next.filter||'all');
    try{if(typeof renderCurrentPage==='function')renderCurrentPage()}catch(_){ }
  }

  function showClassicPokedex(){
    pokedexView.append(controls,stage);
    filterWrap?.classList.remove('m7-v151-hidden-filter');
    if(searchInput)searchInput.placeholder='Pesquisar por nome ou número…';
    const title=stageTitle();
    if(title)title.textContent='Pokédex Nacional · 1–1025';
    applyState(pokedexSnapshot);
    try{localStorage.setItem('pokedexm7-v15-view','portfolio')}catch(_){ }
  }

  function showCleanSearch(){
    searchView.append(controls,stage);
    filterWrap?.classList.add('m7-v151-hidden-filter');
    if(searchInput){
      searchInput.placeholder='Pesquisar Pokémon que ainda não tens…';
      searchInput.value=searchText;
    }
    const title=stageTitle();
    if(title)title.textContent='Pesquisa de cartas em falta';
    applyState({search:searchText,filter:'missing',generation:null,page:1});
    try{localStorage.setItem('pokedexm7-v15-view','search')}catch(_){ }
  }

  // Capture the Pokédex state before leaving it.
  nav.addEventListener('click',e=>{
    const btn=e.target.closest('[data-app-nav]');
    if(!btn)return;
    if(btn.dataset.appNav!=='portfolio')capturePokedex();
    if(btn.dataset.appNav==='portfolio')setTimeout(showClassicPokedex,0);
    if(btn.dataset.appNav==='search')setTimeout(showCleanSearch,0);
  });

  searchInput?.addEventListener('input',()=>{
    if(controls.parentElement===searchView)searchText=String(searchInput.value||'');
  });

  // When Shop closes, v15 may restore the previous section. Re-attach the
  // shared classic controls to whichever section is active afterwards.
  const restoreAfterShop=()=>setTimeout(()=>{
    const active=nav.querySelector('[data-app-nav].active')?.dataset.appNav;
    if(active==='search')showCleanSearch();
    else if(active==='portfolio')showClassicPokedex();
  },20);
  document.getElementById('stockClose')?.addEventListener('click',restoreAfterShop);
  document.getElementById('stockModal')?.addEventListener('click',e=>{if(e.target?.id==='stockModal')restoreAfterShop()});

  // v15.1 used Portfolio as the saved default. Keep that route, but show the
  // original Pokédex instead of the dashboard.
  let initial='portfolio';
  try{initial=localStorage.getItem('pokedexm7-v15-view')||'portfolio'}catch(_){ }
  if(initial==='search')setTimeout(()=>searchBtn?.click(),0);
  else setTimeout(()=>pokedexBtn?.click(),0);

  // Profile/Shop retain their existing v15 behaviour untouched.
  void shopBtn; void profileBtn;
})();
