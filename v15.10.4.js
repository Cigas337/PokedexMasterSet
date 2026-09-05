/* Pokédex M7 v15.10.4 · copiar identificação da carta principal */
(function(){
  'use strict';

  const VERSION='15.10.4';

  function pokemonId(card){
    const value=Number(card?.dataset?.pokemonId||card?.dataset?.id||0);
    return Number.isInteger(value)&&value>=1&&value<=1025?value:null;
  }

  function collectorNumber(value){
    const raw=String(value||'').trim();
    if(!raw)return '—';
    return /^\d+$/.test(raw)?raw.padStart(3,'0'):raw.toUpperCase();
  }

  function cardCopyText(snapshot){
    const name=String(snapshot?.name||'').trim();
    const setCode=String(snapshot?.setCode||'').trim().toUpperCase();
    const number=collectorNumber(snapshot?.number);
    if(!name||!setCode||number==='—')return '';
    return `${name} / ${setCode} / ${number}`;
  }

  async function copyText(text){
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(text);
      return;
    }
    const area=document.createElement('textarea');
    area.value=text;
    area.setAttribute('readonly','');
    area.style.position='fixed';
    area.style.left='-9999px';
    area.style.opacity='0';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0,area.value.length);
    const copied=document.execCommand('copy');
    area.remove();
    if(!copied)throw new Error('copy_failed');
  }

  function toast(message,mode='ok'){
    let el=document.getElementById('m7CardCopyToast');
    if(!el){
      el=document.createElement('div');
      el.id='m7CardCopyToast';
      el.className='m7-card-copy-toast';
      el.setAttribute('role','status');
      el.setAttribute('aria-live','polite');
      document.body.appendChild(el);
    }
    clearTimeout(el.__hideTimer);
    el.textContent=message;
    el.dataset.mode=mode;
    el.classList.remove('show');
    requestAnimationFrame(()=>el.classList.add('show'));
    el.__hideTimer=setTimeout(()=>el.classList.remove('show'),2200);
  }

  function refreshButton(button,id){
    const snapshot=typeof featuredCardFor==='function'?featuredCardFor(id):null;
    const text=cardCopyText(snapshot);
    button.classList.toggle('has-copy-data',!!text);
    button.setAttribute('aria-disabled',text?'false':'true');
    button.title=text?`Copiar: ${text}`:'Escolhe primeiro uma carta para a Pokédex';
    button.setAttribute('aria-label',text?`Copiar ${text}`:'Sem carta escolhida para copiar');
    return text;
  }

  function decorateCard(card){
    const id=pokemonId(card);
    const tools=card.querySelector('.m7-card-top-tools');
    if(!id||!tools)return;

    let button=tools.querySelector('[data-copy-card-id]');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='m7-copy-card-btn';
      button.dataset.copyCardId=String(id);
      button.innerHTML='<span aria-hidden="true">⧉</span>';
      tools.insertBefore(button,tools.firstChild);
      button.addEventListener('click',async event=>{
        event.preventDefault();
        event.stopPropagation();
        const text=refreshButton(button,id);
        if(!text){
          toast('Escolhe primeiro uma carta para a Pokédex.','warn');
          return;
        }
        try{
          await copyText(text);
          const icon=button.querySelector('span');
          if(icon)icon.textContent='✓';
          button.classList.add('copied');
          toast(`${text} · copiado`);
          setTimeout(()=>{
            if(icon?.isConnected)icon.textContent='⧉';
            if(button.isConnected)button.classList.remove('copied');
          },1500);
        }catch(_){
          toast('Não foi possível copiar. Experimenta novamente.','error');
        }
      });
    }
    refreshButton(button,id);
  }

  function decorateAll(){
    document.querySelectorAll('#list .dex-card').forEach(decorateCard);
  }

  function addStyles(){
    if(document.getElementById('m7-v15104-copy-style'))return;
    const style=document.createElement('style');
    style.id='m7-v15104-copy-style';
    style.textContent=`
      body.m7-v15104 .m7-copy-card-btn{
        position:relative!important;inset:auto!important;display:inline-flex!important;
        align-items:center!important;justify-content:center!important;flex:0 0 auto!important;
        width:27px!important;height:27px!important;margin:0!important;padding:0!important;
        border:1px solid rgba(11,47,81,.22)!important;border-radius:50%!important;
        background:linear-gradient(180deg,#eef5fa,#d7e4ed)!important;color:#63717e!important;
        box-shadow:0 4px 10px rgba(11,47,81,.16)!important;cursor:pointer!important;
        font:1000 15px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
        transition:transform .14s ease,background .14s ease,color .14s ease,box-shadow .14s ease!important;
      }
      body.m7-v15104 .m7-copy-card-btn.has-copy-data{background:linear-gradient(180deg,#e8f4fc,#c8dfef)!important;color:#174f78!important}
      body.m7-v15104 .m7-copy-card-btn:hover{transform:translateY(-1px)}
      body.m7-v15104 .m7-copy-card-btn:active{transform:translateY(0) scale(.94)}
      body.m7-v15104 .m7-copy-card-btn:focus-visible{outline:3px solid rgba(28,113,172,.28)!important;outline-offset:2px!important}
      body.m7-v15104 .m7-copy-card-btn.copied{background:linear-gradient(180deg,#dcf7e8,#b7e7cb)!important;color:#08703d!important;box-shadow:0 4px 11px rgba(8,112,61,.20)!important}
      .m7-card-copy-toast{position:fixed;z-index:10050;left:50%;bottom:calc(22px + env(safe-area-inset-bottom));max-width:min(520px,calc(100vw - 28px));padding:11px 15px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:#101923;color:#f3f7fa;box-shadow:0 12px 35px rgba(0,0,0,.34);font-size:11px;font-weight:850;line-height:1.35;text-align:center;opacity:0;transform:translate(-50%,12px);pointer-events:none;transition:opacity .18s ease,transform .18s ease}
      .m7-card-copy-toast.show{opacity:1;transform:translate(-50%,0)}
      .m7-card-copy-toast[data-mode="warn"]{background:#5b3d0b;color:#fff0c2}.m7-card-copy-toast[data-mode="error"]{background:#671d19;color:#ffd8d5}
      @media(max-width:760px){body.m7-v15104 .m7-copy-card-btn{width:24px!important;height:24px!important;font-size:13px!important}.m7-card-copy-toast{bottom:calc(76px + env(safe-area-inset-bottom));font-size:10px}}
      @media print{body.m7-v15104 .m7-copy-card-btn,.m7-card-copy-toast{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function init(){
    addStyles();
    document.body.classList.add('m7-v15104');
    document.body.dataset.m7CardCopy=VERSION;
    decorateAll();
    const list=document.getElementById('list');
    if(!list)return;
    let frame=0;
    const observer=new MutationObserver(()=>{
      if(frame)return;
      frame=requestAnimationFrame(()=>{frame=0;decorateAll()});
    });
    observer.observe(list,{childList:true,subtree:true});
    setTimeout(decorateAll,250);
    setTimeout(decorateAll,900);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
