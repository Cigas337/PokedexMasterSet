/* Compact collection panel. Preserve the app's live counter and wallet nodes. */
(function(){
'use strict';
function init(){
 const panel=document.querySelector('.m7-stats-panel');
 if(!panel||panel.id==='m7CollectionPanel')return;
 const count=panel.querySelector('#count'),value=panel.querySelector('#collectionValue'),progress=panel.querySelector('.progress-track'),percent=panel.querySelector('#m7VisiblePercent');
 if(!count||!value||!progress||!percent)return;
 const row=panel.querySelector('.m7-stats-row');if(!row)return;
 panel.id='m7CollectionPanel';
 const metric=(label,node,cls)=>{
  const box=document.createElement('div');box.className=cls;
  const caption=document.createElement('span');caption.className='m7-panel-caption';caption.textContent=label;
  box.append(caption,node);return box;
 };
 const countBox=metric('Pokémon na coleção',count,'m7-panel-count');
 const valueBox=metric('Valor estimado',value,'m7-panel-value');
 const walletLine=document.createElement('div');walletLine.style.cssText='display:flex;align-items:center;justify-content:flex-end;gap:10px;min-width:0;max-width:100%';
 const icon=document.createElement('span');icon.className='poke-wallet-icon';icon.setAttribute('aria-hidden','true');icon.innerHTML='<span class="poke-wallet-ball"></span>';
 value.before(walletLine);walletLine.append(icon,value);
 const status=document.createElement('span');status.className='m7-panel-status';status.setAttribute('role','status');valueBox.appendChild(status);
 const trackBox=document.createElement('div');trackBox.className='m7-panel-progress';
 const heading=document.createElement('div');heading.className='m7-panel-progress-heading';
 const caption=document.createElement('span');caption.textContent='Master Set';heading.append(caption,percent);
 trackBox.append(heading,progress);row.replaceChildren(countBox,valueBox,trackBox);
 const style=document.createElement('style');style.textContent=`
 #m7CollectionPanel{box-sizing:border-box!important;min-height:0!important;height:auto!important;padding:22px 26px!important;border-radius:22px!important;border:1px solid #ffffff16!important;background:linear-gradient(115deg,#651711 0%,#8c1c16 55%,#65140f 100%)!important;box-shadow:0 8px 28px #0002,inset 0 1px 0 #ffffff08!important;overflow:hidden!important}
 #m7CollectionPanel .m7-stats-row{width:100%!important;display:grid!important;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)!important;gap:18px 24px!important;align-items:start!important}
 #m7CollectionPanel .m7-panel-count,#m7CollectionPanel .m7-panel-value{min-width:0;display:flex;flex-direction:column;gap:7px}
 #m7CollectionPanel .m7-panel-value{text-align:right;align-items:flex-end;border-left:1px solid #ffffff18;padding-left:18px}
 #m7CollectionPanel .m7-panel-caption{font:600 10px/1.3 system-ui!important;letter-spacing:.8px;text-transform:uppercase;color:#ecc4be}
 #m7CollectionPanel #count{font:750 clamp(26px,3.5vw,44px)/1.1 system-ui!important;letter-spacing:-1.4px!important;color:#fff8f5!important;white-space:nowrap!important;margin:0!important;padding:0!important;min-width:0!important;text-shadow:none!important}
 #m7CollectionPanel #collectionValue{font:700 clamp(22px,2.7vw,34px)/1.2 system-ui!important;letter-spacing:-.8px!important;color:#fff8f5!important;white-space:normal!important;overflow-wrap:anywhere;text-shadow:none!important;font-variant-numeric:tabular-nums}
 #m7CollectionPanel .m7-panel-status{color:#e7b5ad;font:500 10px/1.3 system-ui;min-height:13px;max-width:100%}
 #m7CollectionPanel .m7-panel-progress{grid-column:1/-1;min-width:0;width:100%}
 #m7CollectionPanel .m7-panel-progress-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;color:#ecc4be;font:550 11px/1.3 system-ui}
 #m7CollectionPanel #m7VisiblePercent{font:700 12px/1.2 system-ui!important;color:#fff8f5!important;letter-spacing:0!important;min-width:0!important;text-shadow:none!important}
 #m7CollectionPanel .progress-track{box-sizing:border-box;width:100%!important;height:8px!important;margin:0!important;padding:0!important;border:0!important;border-radius:99px!important;background:#300b0870!important;box-shadow:none!important;overflow:hidden!important}
 #m7CollectionPanel .progress-fill{height:100%!important;border-radius:99px!important;background:linear-gradient(90deg,#ff9383,#ff5b4e)!important;box-shadow:none!important}
 @media(max-width:760px){#m7CollectionPanel{padding:16px!important;border-radius:17px!important}#m7CollectionPanel .m7-stats-row{gap:15px 12px!important}#m7CollectionPanel #count{font-size:26px!important;letter-spacing:-1px!important}#m7CollectionPanel #collectionValue{font-size:23px!important}#m7CollectionPanel .m7-panel-caption{font-size:8px!important;letter-spacing:.5px}#m7CollectionPanel .m7-panel-value{padding-left:10px}}
 @media(max-width:360px){#m7CollectionPanel{padding:12px!important}#m7CollectionPanel #count{font-size:22px!important}#m7CollectionPanel #collectionValue{font-size:20px!important}}
 `;document.head.appendChild(style);
 let updating=false;
 const setText=(el,text)=>{if(el.textContent!==text)el.textContent=text;};
 function sync(){
  const s=collectionValueStats();
  if(!s.priced)setText(value,updating?'A atualizar…':s.cards?'Sem cotação':'0,00 €');
  setText(status,updating?'A atualizar preços…':s.cards?`${s.priced} / ${s.cards} cartas avaliadas`:'Sem cartas escolhidas');
  const pct=Number(percent.textContent.replace(',','.').replace('%',''));
  progress.setAttribute('role','progressbar');progress.setAttribute('aria-label','Progresso do Master Set');
  progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax','100');progress.setAttribute('aria-valuenow',String(Number.isFinite(pct)?pct:0));
 }
 const oldUpdate=updateCollectionValueUI;
 updateCollectionValueUI=function(...args){const result=oldUpdate(...args);sync();return result;};
 const oldRefresh=refreshOwnedCardPriceCache;
 let pending=null;
 refreshOwnedCardPriceCache=function(...args){
  if(pending)return pending;
  updating=true;sync();
  pending=Promise.resolve().then(()=>oldRefresh(...args)).finally(()=>{pending=null;updating=false;updateCollectionValueUI();});
  return pending;
 };
 new MutationObserver(sync).observe(percent,{childList:true,characterData:true,subtree:true});
 updateCollectionValueUI();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
