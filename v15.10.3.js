/* Pokédex M7 v15.10.3 · geração visível nos cartões da Pokédex */
(function(){
  'use strict';

  const VERSION='15.10.3';
  const GENERATIONS=[
    {max:151,value:1},
    {max:251,value:2},
    {max:386,value:3},
    {max:493,value:4},
    {max:649,value:5},
    {max:721,value:6},
    {max:809,value:7},
    {max:905,value:8},
    {max:1025,value:9}
  ];

  function generationFor(id){
    const row=GENERATIONS.find(item=>id<=item.max);
    return row?.value||null;
  }

  function pokemonId(card){
    const match=String(card.querySelector('.dex-number')?.textContent||'').match(/\d+/);
    const id=match?Number(match[0]):0;
    return Number.isInteger(id)&&id>=1&&id<=1025?id:null;
  }

  function decorateCard(card){
    const top=card.querySelector('.card-top');
    const id=pokemonId(card);
    if(!top||!id)return;

    const generation=generationFor(id);
    if(!generation)return;

    let badge=top.querySelector('.m7-card-generation');
    if(!badge){
      badge=document.createElement('span');
      badge.className='pokemon-generation-badge visible m7-card-generation';
      badge.setAttribute('aria-label',`Geração ${generation}`);
      const tools=top.querySelector('.m7-card-top-tools');
      top.insertBefore(badge,tools||null);
    }
    badge.textContent=`GEN ${generation}`;
    badge.dataset.generation=String(generation);
  }

  function decorateAll(){
    document.querySelectorAll('#list .dex-card').forEach(decorateCard);
  }

  function addStyles(){
    if(document.getElementById('m7-v15103-generation-style'))return;
    const style=document.createElement('style');
    style.id='m7-v15103-generation-style';
    style.textContent=`
      body.m7-v15103 .dex-card .card-top{gap:5px!important}
      body.m7-v15103 .dex-card .pokemon-generation-badge.m7-card-generation{
        display:inline-flex!important;
        flex:0 0 auto!important;
        align-self:center!important;
        min-height:21px!important;
        margin:0 0 0 2px!important;
        padding:3px 7px!important;
        border:1px solid rgba(10,17,24,.12)!important;
        border-radius:999px!important;
        background:rgba(10,17,24,.075)!important;
        color:#48596b!important;
        font-size:7px!important;
        font-weight:1000!important;
        line-height:1!important;
        letter-spacing:.65px!important;
        text-transform:uppercase!important;
        white-space:nowrap!important;
        pointer-events:none!important;
      }
      @media(max-width:430px){
        body.m7-v15103 .dex-card .card-top{gap:3px!important}
        body.m7-v15103 .dex-card .pokemon-generation-badge.m7-card-generation{
          min-height:19px!important;
          margin-left:1px!important;
          padding:3px 5px!important;
          font-size:6.2px!important;
          letter-spacing:.4px!important;
        }
      }
      @media(max-width:350px){
        body.m7-v15103 .dex-card .pokemon-generation-badge.m7-card-generation{
          padding-inline:4px!important;
          font-size:5.8px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function init(){
    addStyles();
    document.body.classList.add('m7-v15103');
    document.body.dataset.m7GenerationBadges=VERSION;
    decorateAll();

    const list=document.getElementById('list');
    if(!list)return;

    let frame=0;
    const observer=new MutationObserver(()=>{
      if(frame)return;
      frame=requestAnimationFrame(()=>{
        frame=0;
        decorateAll();
      });
    });
    observer.observe(list,{childList:true,subtree:true});
    setTimeout(decorateAll,250);
    setTimeout(decorateAll,900);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init,{once:true});
  }else{
    init();
  }
})();

/* Carrega a função de cópia da identificação da carta (v15.10.4). */
(function(){
  const script=document.createElement('script');
  script.src='./v15.10.4.js?v=15.10.4';
  script.async=true;
  document.head.appendChild(script);
})();
