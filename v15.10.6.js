/* Pokédex M7 · escolha rápida por número, usando o catálogo existente. */
(function(){
  'use strict';
  if(window.__m7QuickNumbers)return;
  window.__m7QuickNumbers=true;
  const busy=new Set();
  const numberKey=value=>String(value??'').trim().toUpperCase().replace(/^0+(?=\d)/,'');
  function groupNumbers(cards){
    const groups=new Map();
    for(const card of cards){
      const key=numberKey(card.number);
      if(!key||!card.id)continue;
      if(!groups.has(key))groups.set(key,card);
    }
    return [...groups.entries()].sort(([a],[b])=>a.localeCompare(b,'en',{numeric:true}));
  }
  function announce(text){
    let status=document.getElementById('m7QuickNumberStatus');
    if(!status){
      status=document.createElement('div');status.id='m7QuickNumberStatus';
      status.setAttribute('role','status');document.body.appendChild(status);
    }
    status.textContent=text;status.hidden=false;
    clearTimeout(status.timer);status.timer=setTimeout(()=>{status.hidden=true},3500);
  }
  function decorate(tile){
    if(tile.querySelector('.m7-quick-number'))return;
    const id=Number(tile.dataset.pokemonId);
    if(!id)return;
    const wrap=document.createElement('div');wrap.className='m7-quick-number';
    const toggle=document.createElement('button');toggle.type='button';
    toggle.className='m7-number-toggle';toggle.textContent='Nº da carta ▾';
    const panel=document.createElement('div');panel.id='m7-number-list-'+id;
    panel.className='m7-number-panel';panel.hidden=true;
    toggle.setAttribute('aria-controls',panel.id);toggle.setAttribute('aria-expanded','false');
    toggle.disabled=busy.has(id);
    wrap.append(toggle,panel);tile.appendChild(wrap);
    wrap.addEventListener('click',e=>e.stopPropagation());
    let loaded=false,loading=false;
    panel.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.stopPropagation();panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();}
    });
    toggle.addEventListener('click',async()=>{
      panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));
      if(panel.hidden||loaded||loading)return;
      const pokemon=(window.__all||[]).find(p=>Number(p.id)===id);
      if(!pokemon){panel.textContent='Pokémon ainda a carregar. Volta a tentar.';return;}
      loading=true;panel.textContent='A carregar números…';
      try{
        const cards=await fetchAllCardsForPokemon(pokemon);
        if(!wrap.isConnected)return;
        const groups=groupNumbers(cards);
        panel.replaceChildren();
        if(!groups.length){panel.textContent='Nenhum número disponível. Volta a tentar.';return;}
        for(const [key,card] of groups){
          const option=document.createElement('button');option.type='button';
          option.textContent=/^\d+$/.test(key)?key.padStart(3,'0'):key;
          option.title=card.name+' / '+(card.set?.ptcgoCode||card.set?.id||'')+' / '+option.textContent;
          option.setAttribute('aria-label','Escolher '+option.title);
          option.addEventListener('click',async()=>{
            if(busy.has(id))return;
            busy.add(id);toggle.disabled=true;
            panel.querySelectorAll('button').forEach(b=>{b.disabled=true});
            announce('A guardar '+option.title+'…');
            try{
              const owned=await ensurePokemonOwnedFromSpecificCard(id);
              if(!owned)throw new Error('owned');
              const saved=await setFeaturedSpecificVariant(id,card,defaultVariantForCard(card));
              renderCurrentPage();updateCollectionValueUI();
              announce(saved?'Carta alterada: '+option.title:'Carta alterada neste dispositivo; sincronização pendente.');
            }catch(_){announce('Não foi possível guardar a carta. Tenta novamente.');}
            finally{
              busy.delete(id);toggle.disabled=false;
              panel.querySelectorAll('button').forEach(b=>{b.disabled=false});
              const next=document.querySelector('[data-pokemon-id="'+id+'"] .m7-number-toggle');
              if(next)next.disabled=false;
            }
          });
          panel.appendChild(option);
        }
        loaded=true;
      }catch(_){panel.textContent='Não foi possível carregar. Fecha e volta a tentar.';}
      finally{loading=false;}
    });
  }
  function init(){
    const style=document.createElement('style');
    style.textContent=`
      #list .dex-card .m7-quick-number{order:3;flex:0 0 auto;width:100%;min-width:0;margin:0 0 6px;position:relative;z-index:2}
      #list .m7-number-toggle{display:block;width:100%;min-height:32px;padding:6px 8px;border:1px solid #adc2d2;border-radius:9px;background:#e2edf5;color:#174f78;font:800 10px/1.3 system-ui;cursor:pointer}
      #list .m7-number-panel:not([hidden]){display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;margin-top:5px;padding:5px;max-height:180px;overflow:auto;border-radius:9px;background:#edf3f8;color:#174f78;font:500 11px/1.4 system-ui}
      #list .m7-number-panel button{min-width:0;min-height:34px;padding:4px 2px;border:1px solid #b9cbd9;border-radius:6px;background:white;color:#174f78;font:700 11px/1.2 system-ui;overflow-wrap:anywhere;cursor:pointer}
      #list .m7-quick-number button:focus-visible{outline:3px solid #318ac9;outline-offset:1px}
      #list .m7-quick-number button:disabled{opacity:.55;cursor:wait}
      #m7QuickNumberStatus{position:fixed;z-index:10060;bottom:calc(85px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);width:max-content;max-width:calc(100vw - 30px);padding:12px 16px;border-radius:12px;background:#101923;color:white;box-shadow:0 5px 25px #0005;font:600 12px/1.4 system-ui;text-align:center;pointer-events:none}
      @media print{.m7-quick-number,#m7QuickNumberStatus{display:none!important}}
    `;
    document.head.appendChild(style);
    const list=document.getElementById('list');if(!list)return;
    const all=()=>list.querySelectorAll('.dex-card').forEach(decorate);
    all();
    // Only full tile replacement needs decorating; changes inside the list are ignored.
    new MutationObserver(all).observe(list,{childList:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
