/* Pokédex M7 v15.9.0 RC1 · visual polish + regression guards */
(function(){
  const VERSION='15.9.0-rc1';
  const VIEW_IDS={
    portfolio:'m7PortfolioView',
    search:'m7SearchView',
    shop:'m7ShopView',
    expansions:'m7ExpansionsView',
    profile:'m7ProfileView'
  };
  const once=(fn)=>document.readyState==='loading'
    ?document.addEventListener('DOMContentLoaded',fn,{once:true})
    :fn();

  once(()=>{
    document.body.classList.add('m7-v159');
    document.body.dataset.m7RcPolish=VERSION;
    installNavigationGuard();
    installImageHints();
    installViewportGuard();
    installDiagnostics();
    audit('boot');
    setTimeout(()=>audit('settled'),350);
    setTimeout(()=>audit('late'),1200);
  });

  function nav(){
    return document.getElementById('m7AppNav');
  }
  function buttons(){
    return [...(nav()?.querySelectorAll('[data-app-nav]')||[])];
  }
  function viewFor(key){
    return document.getElementById(VIEW_IDS[key]||'');
  }
  function visibleViews(){
    return Object.entries(VIEW_IDS)
      .map(([key,id])=>({key,el:document.getElementById(id)}))
      .filter(x=>x.el?.classList.contains('active'));
  }
  function preferredKey(hint=''){
    if(VIEW_IDS[hint])return hint;
    const active=buttons().find(b=>b.classList.contains('active'))?.dataset.appNav;
    if(VIEW_IDS[active])return active;
    const bodyKey=document.body.dataset.m7View;
    if(VIEW_IDS[bodyKey])return bodyKey;
    return visibleViews()[0]?.key||'';
  }

  let repairing=false;
  function normalizeNavigation(hint=''){
    if(repairing)return;
    const n=nav();
    if(!n)return;
    repairing=true;
    try{
      const key=preferredKey(hint);
      if(!key)return;
      const targetBtn=n.querySelector(`[data-app-nav="${key}"]`);
      const targetView=viewFor(key);

      /* Only repair contradictory states; never invent a new page while auth is locked. */
      const activeBtns=buttons().filter(b=>b.classList.contains('active'));
      if(activeBtns.length>1&&targetBtn){
        activeBtns.forEach(b=>b.classList.toggle('active',b===targetBtn));
      }
      const activeViews=visibleViews();
      if(activeViews.length>1&&targetView){
        activeViews.forEach(v=>v.el.classList.toggle('active',v.el===targetView));
      }

      buttons().forEach(b=>{
        const active=b.classList.contains('active');
        if(active)b.setAttribute('aria-current','page');
        else b.removeAttribute('aria-current');
      });

      if(targetView?.classList.contains('active')){
        document.body.dataset.m7View=key;
      }
    }finally{
      repairing=false;
    }
  }

  function installNavigationGuard(){
    const n=nav();
    if(!n)return;
    let lastHint='';
    n.addEventListener('click',e=>{
      const btn=e.target.closest?.('[data-app-nav]');
      if(!btn)return;
      lastHint=btn.dataset.appNav||'';
      setTimeout(()=>normalizeNavigation(lastHint),0);
      setTimeout(()=>normalizeNavigation(lastHint),120);
      setTimeout(()=>audit('nav:'+lastHint),420);
    },true);

    const observer=new MutationObserver(muts=>{
      if(repairing)return;
      if(!muts.some(m=>m.type==='attributes'&&m.attributeName==='class'))return;
      clearTimeout(observer._t);
      observer._t=setTimeout(()=>normalizeNavigation(lastHint),40);
    });
    buttons().forEach(b=>observer.observe(b,{attributes:true,attributeFilter:['class']}));
    Object.values(VIEW_IDS).forEach(id=>{
      const el=document.getElementById(id);
      if(el)observer.observe(el,{attributes:true,attributeFilter:['class']});
    });

    addEventListener('pageshow',()=>setTimeout(()=>normalizeNavigation(lastHint),30));
    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden)setTimeout(()=>normalizeNavigation(lastHint),50);
    });
  }

  function installImageHints(){
    const mark=(root=document)=>{
      root.querySelectorAll?.(
        '.m7-global-card-image img,.m7-v155-set-image img,.m7-v155-card-img img,.m7-v151-card-grid .card-image img'
      ).forEach(img=>{
        if(!img.hasAttribute('decoding'))img.decoding='async';
        if(!img.hasAttribute('loading'))img.loading='lazy';
      });
    };
    mark();
    const observer=new MutationObserver(muts=>{
      for(const m of muts){
        m.addedNodes.forEach(node=>{
          if(node.nodeType!==1)return;
          if(node.matches?.('img'))mark(node.parentElement||document);
          else mark(node);
        });
      }
    });
    observer.observe(document.body,{subtree:true,childList:true});
  }

  function installViewportGuard(){
    const set=()=>{
      const h=window.visualViewport?.height||window.innerHeight||0;
      if(h)document.documentElement.style.setProperty('--m7-v159-vh',`${h}px`);
      document.body.classList.toggle('m7-v159-mobile',matchMedia('(max-width:760px)').matches);
    };
    set();
    addEventListener('resize',set,{passive:true});
    window.visualViewport?.addEventListener('resize',set,{passive:true});
    window.visualViewport?.addEventListener('scroll',set,{passive:true});
  }

  function diagnostics(){
    const activeBtns=buttons().filter(b=>b.classList.contains('active')).map(b=>b.dataset.appNav);
    const actViews=visibleViews().map(v=>v.key);
    const critical=['m7AppNav',...Object.values(VIEW_IDS)];
    const missingCritical=critical.filter(id=>!document.getElementById(id));
    return {
      version:VERSION,
      bodyView:document.body.dataset.m7View||'',
      activeNav:activeBtns,
      activeViews:actViews,
      duplicateActiveNav:activeBtns.length>1,
      duplicateActiveViews:actViews.length>1,
      missingCritical,
      stockCards:document.querySelectorAll('#m7ShopHost .stock-card').length,
      expansionSets:document.querySelectorAll('.m7-v155-set').length,
      expansionCards:document.querySelectorAll('.m7-v155-card').length,
      pokedexCards:document.querySelectorAll('#m7PortfolioView .dex-card').length,
      searchCards:document.querySelectorAll('.m7-global-card').length,
      profileAvatar:!!document.getElementById('v15Avatar')?.getAttribute('src'),
      viewport:{width:innerWidth,height:innerHeight},
      authLocked:document.body.classList.contains('auth-locked')
    };
  }

  function installDiagnostics(){
    window.m7RcDiagnostics=diagnostics;
    window.m7RcAudit=()=>audit('manual',true);
  }

  function audit(reason='runtime',verbose=false){
    normalizeNavigation();
    const d=diagnostics();
    const bad=d.missingCritical.length||d.duplicateActiveNav||d.duplicateActiveViews;
    document.body.dataset.m7RcStatus=bad?'check':'ok';
    if(verbose||bad){
      const log=bad?'warn':'info';
      console[log](`[M7 ${VERSION}] RC audit · ${reason}`,d);
    }
    return d;
  }
})();
