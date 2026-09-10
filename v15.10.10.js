/* Wallet breakdown: the exact owned variants and prices used in the total. */
(function(){
'use strict';
function init(){
 const valueBox=document.querySelector('#m7CollectionPanel .m7-panel-value');
 if(!valueBox||document.getElementById('m7WalletDialog'))return;
 const button=document.createElement('button');
 button.type='button';button.id='m7WalletButton';button.className=valueBox.className;
 button.append(...valueBox.childNodes);valueBox.replaceWith(button);
 const style=document.createElement('style');
 style.textContent=`
 #m7CollectionPanel #m7WalletButton{border:0;border-left:1px solid #ffffff18;padding-top:0;padding-right:0;padding-bottom:0;background:transparent;color:inherit;cursor:pointer;min-height:44px}
 #m7CollectionPanel #m7WalletButton:focus-visible{outline:2px solid #fff8f5;outline-offset:4px;border-radius:4px}
 @media(hover:hover){#m7CollectionPanel #m7WalletButton:hover #collectionValue{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:5px}}
 #m7WalletDialog{box-sizing:border-box;width:min(880px,calc(100% - 32px));max-width:none;max-height:calc(100vh - 40px);max-height:calc(100dvh - 40px);margin:auto;padding:0;border:1px solid #ffffff24;border-radius:20px;background:#0d1721;color:#eef4fa;box-shadow:0 24px 90px #0009;font:400 16px/1.45 system-ui;overflow:hidden;color-scheme:dark}
 #m7WalletDialog[open]{display:flex;flex-direction:column}
 #m7WalletDialog::backdrop{background:#02070dcc;backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
 #m7WalletDialog .m7-wallet-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 22px 12px;flex-shrink:0}
 #m7WalletDialog h2{margin:0;color:#fff8f5;font:700 24px/1.2 system-ui;letter-spacing:-.4px}
 #m7WalletDialog .m7-wallet-subtitle{margin:6px 0 0;color:#afbecd;font-size:14px}
 #m7WalletDialog .m7-wallet-close{flex-shrink:0;display:grid;place-items:center;min-width:44px;min-height:44px;padding:0;border:1px solid #ffffff26;border-radius:12px;background:#192835;color:#fff;font:400 26px/1 system-ui}
 #m7WalletDialog .m7-wallet-close:focus-visible,#m7WalletDialog .m7-wallet-scroll:focus-visible{outline:2px solid #ff9383;outline-offset:-3px}
 #m7WalletDialog .m7-wallet-summary{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:6px 16px;margin:0 22px 16px;padding:12px 14px;border:1px solid #ff938330;border-radius:12px;background:#6a181133;flex-shrink:0}
 #m7WalletDialog .m7-wallet-total{font-size:22px;font-weight:700;color:#fff8f5;font-variant-numeric:tabular-nums}
 #m7WalletDialog .m7-wallet-coverage{font-size:14px;color:#d4bcb8}
 #m7WalletDialog .m7-wallet-scroll{min-height:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
 #m7WalletDialog table{width:100%;border-collapse:collapse;table-layout:fixed}
 #m7WalletDialog th,#m7WalletDialog td{padding:12px 16px;text-align:left;overflow-wrap:anywhere;vertical-align:middle;border-bottom:1px solid #ffffff10}
 #m7WalletDialog th{position:sticky;top:0;background:#15232f;color:#bdccda;font-size:14px;font-weight:600;z-index:1}
 #m7WalletDialog .m7-wallet-card-column{width:34%}
 #m7WalletDialog .m7-wallet-set-column{width:28%}
 #m7WalletDialog .m7-wallet-variant-column{width:20%}
 #m7WalletDialog .m7-wallet-price-column{width:18%;text-align:right}
 #m7WalletDialog td.m7-wallet-price-column{font-weight:650;font-variant-numeric:tabular-nums}
 #m7WalletDialog .m7-wallet-price-tools{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
 #m7WalletDialog .m7-wallet-remove{display:grid;place-items:center;width:44px;height:44px;padding:0;border:1px solid #ff938344;border-radius:10px;background:#68181044;color:#ffb2a7;font:400 24px/1 system-ui;cursor:pointer}
 #m7WalletDialog .m7-wallet-remove:disabled{opacity:.55;cursor:wait}
 #m7WalletDialog .m7-wallet-remove:focus-visible{outline:2px solid #ffb2a7;outline-offset:2px}
 #m7WalletDialog .m7-wallet-message{margin:0;padding:0 22px 12px;color:#bfdacb;font-size:14px;flex-shrink:0}
 #m7WalletDialog .m7-wallet-message:empty{display:none}
 #m7WalletDialog .m7-wallet-message.error{color:#ffb2a7}
 #m7WalletDialog .m7-wallet-card{display:flex;align-items:center;gap:12px;min-width:0}
 #m7WalletDialog .m7-wallet-card img{width:40px;height:56px;flex:0 0 40px;object-fit:contain;border-radius:4px;background:#15232f}
 #m7WalletDialog .m7-wallet-card-copy{min-width:0}
 #m7WalletDialog .m7-wallet-card-name{display:block;font-size:16px;font-weight:650}
 #m7WalletDialog .m7-wallet-set-name{display:block;font-size:14px}
 #m7WalletDialog .m7-wallet-number{display:block;margin-top:3px;font-size:13px;color:#aebdcc}
 #m7WalletDialog .m7-wallet-variant{font-size:14px;color:#d1dde7}
 #m7WalletDialog .m7-wallet-mobile-details{display:none}
 #m7WalletDialog .m7-wallet-unpriced{color:#aebdcc;font-size:13px;font-weight:400}
 #m7WalletDialog .m7-wallet-empty{padding:32px 22px;text-align:center;color:#bdccda}
 #m7WalletDialog .m7-wallet-note{margin:0;padding:12px 22px 16px;border-top:1px solid #ffffff18;color:#aebdcc;font-size:13px;flex-shrink:0}
 @media(max-width:600px){
  #m7WalletDialog{width:calc(100% - 16px);max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom));border-radius:16px}
  #m7WalletDialog .m7-wallet-header{padding:16px 14px 12px;gap:10px}
  #m7WalletDialog h2{font-size:22px}
  #m7WalletDialog .m7-wallet-summary{margin:0 14px 12px}
  #m7WalletDialog th,#m7WalletDialog td{padding:12px 10px}
  #m7WalletDialog .m7-wallet-card-column{width:70%}
  #m7WalletDialog .m7-wallet-price-column{width:30%}
  #m7WalletDialog .m7-wallet-set-column,#m7WalletDialog .m7-wallet-variant-column{display:none}
  #m7WalletDialog .m7-wallet-card{gap:9px}
  #m7WalletDialog .m7-wallet-mobile-details{display:block;margin-top:4px;color:#aebdcc;font-size:13px;line-height:1.4}
  #m7WalletDialog .m7-wallet-note{padding:12px 14px}
 }
 `;
 document.head.appendChild(style);
 const dialog=document.createElement('dialog');
 dialog.id='m7WalletDialog';
 dialog.setAttribute('aria-labelledby','m7WalletTitle');
 dialog.setAttribute('aria-describedby','m7WalletSubtitle');
 dialog.innerHTML=`
  <div class="m7-wallet-header">
   <div><h2 id="m7WalletTitle">Carteira</h2><p class="m7-wallet-subtitle" id="m7WalletSubtitle">Da mais cara para a mais barata</p></div>
   <button type="button" class="m7-wallet-close" aria-label="Fechar carteira" autofocus>×</button>
  </div>
  <div class="m7-wallet-summary" role="status"><strong class="m7-wallet-total"></strong><span class="m7-wallet-coverage"></span></div>
  <p class="m7-wallet-message" role="status"></p>
  <div class="m7-wallet-scroll" tabindex="0" role="region" aria-label="Cartas da carteira">
   <table aria-label="Cartas da coleção por valor estimado">
    <thead><tr><th scope="col" class="m7-wallet-card-column">Carta</th><th scope="col" class="m7-wallet-set-column">Coleção / n.º</th><th scope="col" class="m7-wallet-variant-column">Variante</th><th scope="col" class="m7-wallet-price-column" aria-sort="descending">Valor ↓</th></tr></thead>
    <tbody></tbody>
   </table>
  </div>
  <p class="m7-wallet-note">Estimativas Cardmarket, com os mesmos critérios da carteira. As cartas sem cotação válida ficam no fim e não entram no total.</p>
 `;
 document.body.appendChild(dialog);
 const tbody=dialog.querySelector('tbody');
 const total=dialog.querySelector('.m7-wallet-total');
 const coverage=dialog.querySelector('.m7-wallet-coverage');
 const scroll=dialog.querySelector('.m7-wallet-scroll');
 const message=dialog.querySelector('.m7-wallet-message');
 const pending=new Set();
 let lastRows='';
 function element(tag,className,text){
  const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;
 }
 function render(){
  const stats=collectionValueStats();
  total.textContent=stats.priced?'~ '+euro(stats.total):stats.cards?'Sem cotação':'0,00 €';
  coverage.textContent=`${stats.priced} / ${stats.cards} cartas avaliadas`;
  const rows=stats.items.map(({key,card,value})=>({key,value,name:String(card.name||card.id),set:String(card.setName||card.setCode||'Coleção não indicada'),number:String(card.number||'—'),variant:String(card.variantLabel||'Variante por confirmar'),image:String(card.variantImage||card.imageSmall||card.imageLarge||'')}));
  const signature=JSON.stringify([rows,[...pending]]);
  if(signature===lastRows)return;
  lastRows=signature;
  const focused=document.activeElement;
  const focusedKey=tbody.contains(focused)?focused.dataset?.removeKey:null;
  const focusedIndex=focusedKey?Array.from(tbody.querySelectorAll('.m7-wallet-remove')).indexOf(focused):-1;
  const fragment=document.createDocumentFragment();
  rows.forEach(card=>{
   const tr=document.createElement('tr');
   const nameCell=element('td','m7-wallet-card-column');
   const cardLine=element('div','m7-wallet-card');
   if(/^https?:\/\//i.test(card.image)){
    const img=document.createElement('img');img.src=card.image;img.alt='';img.loading='lazy';img.decoding='async';img.width=40;img.height=56;
    img.addEventListener('error',()=>img.remove(),{once:true});cardLine.appendChild(img);
   }
   const copy=element('div','m7-wallet-card-copy');
   copy.append(element('span','m7-wallet-card-name',card.name),element('span','m7-wallet-mobile-details',`${card.set} · #${card.number} · ${card.variant}`));
   cardLine.appendChild(copy);nameCell.appendChild(cardLine);
   const setCell=element('td','m7-wallet-set-column');
   setCell.append(element('span','m7-wallet-set-name',card.set),element('span','m7-wallet-number','#'+card.number));
   const variantCell=element('td','m7-wallet-variant-column');
   variantCell.appendChild(element('span','m7-wallet-variant',card.variant));
   const priceCell=element('td','m7-wallet-price-column');
   const priceTools=element('div','m7-wallet-price-tools');
   priceTools.appendChild(element('span',card.value===null?'m7-wallet-unpriced':'',card.value===null?'Sem cotação':euro(card.value)));
   const remove=element('button','m7-wallet-remove',pending.has(card.key)?'…':'×');
   remove.type='button';remove.dataset.removeKey=card.key;remove.disabled=pending.has(card.key);
   remove.title='Remover da coleção';
   remove.setAttribute('aria-label',`Remover ${card.name} · ${card.set} #${card.number} · ${card.variant} da coleção`);
   remove.addEventListener('click',async event=>{
    event.stopPropagation();if(pending.has(card.key))return;
    pending.add(card.key);remove.disabled=true;remove.textContent='…';message.classList.remove('error');message.textContent='A remover carta…';
    try{await window.m7RemoveOwnedVariant(card.key);message.textContent='Carta removida da coleção.';}
    catch(_){message.textContent='Não foi possível remover. Verifica a ligação e tenta novamente.';message.classList.add('error');}
    finally{pending.delete(card.key);render();}
   });
   priceTools.appendChild(remove);priceCell.appendChild(priceTools);
   tr.append(nameCell,setCell,variantCell,priceCell);fragment.appendChild(tr);
  });
  if(!rows.length){
   const tr=document.createElement('tr'),cell=element('td','m7-wallet-empty','Ainda não tens cartas escolhidas. Escolhe as tuas cartas na Pokédex para as veres aqui.');
   cell.colSpan=4;tr.appendChild(cell);fragment.appendChild(tr);
  }
  tbody.replaceChildren(fragment);
  if(focusedKey&&dialog.open){
   const controls=Array.from(tbody.querySelectorAll('.m7-wallet-remove'));
   const next=controls.find(el=>el.dataset.removeKey===focusedKey)||controls[Math.min(focusedIndex,controls.length-1)]||dialog.querySelector('.m7-wallet-close');
   next?.focus({preventScroll:true});
  }
 }
 button.title='Ver cartas da mais cara para a mais barata';
 button.setAttribute('aria-haspopup','dialog');
 button.setAttribute('aria-controls',dialog.id);
 let previousOverflow='';
 button.addEventListener('click',()=>{
  if(dialog.open)return;
  message.textContent='';message.classList.remove('error');
  // Refresh the header too, so a price that has just expired is excluded everywhere.
  updateCollectionValueUI();render();
  previousOverflow=document.body.style.overflow;
  dialog.showModal();document.body.style.overflow='hidden';scroll.scrollTop=0;
 });
 dialog.querySelector('.m7-wallet-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 dialog.addEventListener('close',()=>{document.body.style.overflow=previousOverflow;button.focus({preventScroll:true});});
 const oldUpdate=updateCollectionValueUI;
 updateCollectionValueUI=function(...args){const result=oldUpdate(...args);if(dialog.open)render();return result;};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
