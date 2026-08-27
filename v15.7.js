/* Pokédex M7 v15.7.0 · Professional Pokédex toolbar */
(function(){
  const once=(fn)=>{if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});else fn()};
  once(()=>setTimeout(init,120));

  function init(){
    const controls=document.querySelector('.controls');
    const searchWrap=controls?.querySelector('.search-wrap');
    const filterBy=document.getElementById('filterBy');
    const sortBy=document.getElementById('sortBy');
    const scanBtn=document.getElementById('mobileScanBtn');
    const nav=document.getElementById('m7AppNav');
    if(!controls||!searchWrap||!filterBy||!sortBy)return;
    if(document.getElementById('m7PokedexOptionsBtn'))return;

    document.body.classList.add('m7-v157');
    controls.classList.add('m7-v157-toolbar');

    const optionsBtn=document.createElement('button');
    optionsBtn.id='m7PokedexOptionsBtn';
    optionsBtn.type='button';
    optionsBtn.setAttribute('aria-haspopup','dialog');
    optionsBtn.setAttribute('aria-expanded','false');
    optionsBtn.setAttribute('aria-controls','m7PokedexOptionsPanel');
    optionsBtn.innerHTML=`
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M8 14v6"/></svg>
      <span>Opções</span>
      <span class="m7-v157-options-count" hidden>0</span>`;
    searchWrap.insertAdjacentElement('afterend',optionsBtn);

    const backdrop=document.createElement('div');
    backdrop.className='m7-v157-options-backdrop';
    backdrop.id='m7PokedexOptionsBackdrop';
    backdrop.hidden=true;

    const panel=document.createElement('section');
    panel.className='m7-v157-options-panel';
    panel.id='m7PokedexOptionsPanel';
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-modal','true');
    panel.setAttribute('aria-label','Opções da Pokédex');
    panel.hidden=true;
    panel.innerHTML=`
      <div class="m7-v157-options-head">
        <div><span>Pokédex M7</span><strong>Opções da Pokédex</strong></div>
        <button class="m7-v157-options-close" id="m7PokedexOptionsClose" type="button" aria-label="Fechar opções">×</button>
      </div>

      <div class="m7-v157-section">
        <div class="m7-v157-section-title">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h10M4 17h7"/></svg>
          Encontrar e organizar
        </div>
        <button class="m7-v157-photo-action" id="m7V157Photo" type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l1.5-2h7L17 7h3v12H4z"/><circle cx="12" cy="13" r="3.5"/></svg>
          Pesquisar por foto
        </button>
        <div class="m7-v157-fields" style="margin-top:9px">
          <div class="m7-v157-field"><label for="m7V157Filter">Estado da coleção</label><select id="m7V157Filter"></select></div>
          <div class="m7-v157-field"><label for="m7V157Sort">Ordenar por</label><select id="m7V157Sort"></select></div>
        </div>
      </div>

      <div class="m7-v157-section">
        <div class="m7-v157-section-title">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v14H5zM8 9h8M8 13h8"/></svg>
          Gestão da coleção
        </div>
        <div class="m7-v157-collection-grid">
          <button class="m7-v157-action" type="button" data-v157-proxy="[data-collection-action='mark-all-card']"><span class="m7-v157-action-icon">✓</span><span>Marcar todos como CARTA</span></button>
          <button class="m7-v157-action" type="button" data-v157-proxy="[data-collection-action='clear-art']"><span class="m7-v157-action-icon">☆</span><span>Limpar todas as ART</span></button>
          <button class="m7-v157-action" type="button" data-v157-proxy="[data-collection-action='clear-featured']"><span class="m7-v157-action-icon">▧</span><span>Remover cartas principais</span></button>
          <button class="m7-v157-action" type="button" data-v157-proxy="[data-collection-action='clear-wishlist']"><span class="m7-v157-action-icon">♡</span><span>Limpar wishlist</span></button>
        </div>
        <details class="m7-v157-details">
          <summary>Dados e ações avançadas</summary>
          <div class="m7-v157-data-actions">
            <button class="m7-v157-action" type="button" data-v157-proxy="#exportBtn"><span>↓ Exportar backup</span></button>
            <button class="m7-v157-action" type="button" data-v157-proxy="#importBtn"><span>↑ Importar backup</span></button>
            <button class="m7-v157-action danger wide" type="button" data-v157-proxy="[data-collection-action='clear-collection']"><span class="m7-v157-action-icon">×</span><span>Limpar coleção</span></button>
          </div>
        </details>
      </div>`;

    document.body.append(backdrop,panel);

    const filterProxy=panel.querySelector('#m7V157Filter');
    const sortProxy=panel.querySelector('#m7V157Sort');
    const closeBtn=panel.querySelector('#m7PokedexOptionsClose');
    const count=optionsBtn.querySelector('.m7-v157-options-count');

    filterProxy.innerHTML=filterBy.innerHTML;
    sortProxy.innerHTML=sortBy.innerHTML;

    function sync(){
      filterProxy.value=filterBy.value;
      sortProxy.value=sortBy.value;
      const active=(filterBy.value!=='all'?1:0)+(sortBy.value!=='number-asc'?1:0);
      count.textContent=String(active);
      count.hidden=active===0;
    }

    function setSelect(original,proxy){
      original.value=proxy.value;
      original.dispatchEvent(new Event('input',{bubbles:true}));
      original.dispatchEvent(new Event('change',{bubbles:true}));
      sync();
    }
    filterProxy.addEventListener('change',()=>setSelect(filterBy,filterProxy));
    sortProxy.addEventListener('change',()=>setSelect(sortBy,sortProxy));
    filterBy.addEventListener('change',sync);
    sortBy.addEventListener('change',sync);

    function placeDesktop(){
      if(innerWidth<=760)return;
      const r=optionsBtn.getBoundingClientRect();
      const right=Math.max(12,innerWidth-r.right);
      const top=Math.min(innerHeight-40,Math.max(12,r.bottom+8));
      panel.style.setProperty('--m7-v157-popover-right',right+'px');
      panel.style.setProperty('--m7-v157-popover-top',top+'px');
    }

    function open(){
      if(document.body.dataset.m7View!=='portfolio')return;
      sync();
      placeDesktop();
      backdrop.hidden=false;
      panel.hidden=false;
      requestAnimationFrame(()=>{
        backdrop.classList.add('open');
        panel.classList.add('open');
        document.body.classList.add('m7-v157-options-open');
        optionsBtn.setAttribute('aria-expanded','true');
        closeBtn.focus({preventScroll:true});
      });
    }

    function close(returnFocus=false){
      backdrop.classList.remove('open');
      panel.classList.remove('open');
      document.body.classList.remove('m7-v157-options-open');
      optionsBtn.setAttribute('aria-expanded','false');
      setTimeout(()=>{backdrop.hidden=true;panel.hidden=true},180);
      if(returnFocus)optionsBtn.focus({preventScroll:true});
    }

    optionsBtn.addEventListener('click',()=>panel.hidden?open():close(true));
    closeBtn.addEventListener('click',()=>close(true));
    backdrop.addEventListener('click',()=>close(true));
    addEventListener('resize',()=>{if(!panel.hidden)placeDesktop()},{passive:true});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)close(true)});

    panel.querySelector('#m7V157Photo')?.addEventListener('click',()=>{
      if(scanBtn){scanBtn.click();close(false)}
    });

    panel.querySelectorAll('[data-v157-proxy]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const target=document.querySelector(btn.dataset.v157Proxy);
        if(!target)return;
        target.click();
        if(!btn.closest('details')||!btn.classList.contains('danger'))close(false);
      });
    });

    nav?.addEventListener('click',e=>{
      const btn=e.target.closest('[data-app-nav]');
      if(btn&&btn.dataset.appNav!=='portfolio'&&!panel.hidden)close(false);
    },true);

    // Keep toolbar state correct when v15.2 moves the shared controls between views.
    const observer=new MutationObserver(()=>{
      const inPortfolio=controls.parentElement?.id==='m7PortfolioView';
      if(!inPortfolio&&!panel.hidden)close(false);
      sync();
    });
    observer.observe(document.body,{childList:true,subtree:true});
    sync();
  }
})();
