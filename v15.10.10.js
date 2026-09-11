/* Wallet breakdown v16.1.3: exact owned variants and Cardmarket NM prices. */
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
 #m7WalletDialog .m7-wallet-variant-select{box-sizing:border-box;width:100%;max-width:220px;min-height:42px;padding:7px 28px 7px 9px;border:1px solid #ffffff26;border-radius:9px;background:#0b1824;color:#eaf2f8;font:600 13px/1.25 system-ui;color-scheme:dark;cursor:pointer}
 #m7WalletDialog .m7-wallet-variant-select:focus-visible{outline:2px solid #ff9383;outline-offset:2px}
 #m7WalletDialog .m7-wallet-variant-select:disabled{opacity:.55;cursor:wait}
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
  #m7WalletDialog .m7-wallet-card-column{width:50%}
  #m7WalletDialog .m7-wallet-variant-column{display:table-cell;width:30%}
  #m7WalletDialog .m7-wallet-price-column{width:20%}
  #m7WalletDialog .m7-wallet-variant-select{max-width:100%;min-height:44px;font-size:12px;padding-inline:7px}
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
   <div><h2 id="m7WalletTitle">Carteira · Cardmarket NM</h2><p class="m7-wallet-subtitle" id="m7WalletSubtitle">Cada carta física guardada, com variante selecionável e preço em Near Mint.</p></div>
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
  <p class="m7-wallet-note">Fonte única: Cardmarket · Near Mint (NM). Enquanto a variante não for confirmada, usa-se a base normal; se só existir uma variante, usa-se essa variante. A seleção continua disponível para corrigir a carta.</p>
 `;
 document.body.appendChild(dialog);
 const tbody=dialog.querySelector('tbody');
 const total=dialog.querySelector('.m7-wallet-total');
 const coverage=dialog.querySelector('.m7-wallet-coverage');
 const scroll=dialog.querySelector('.m7-wallet-scroll');
 const message=dialog.querySelector('.m7-wallet-message');
 const pending=new Set();
 const catalogCache=new Map();
 const loading=new Set();
 let lastRows='';
 function element(tag,className,text){
  const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;
 }
 function ownerMap(){
  const map=new Map();
  Object.entries(loadCardDetailStore()||{}).forEach(([pokemonId,raw])=>{
   const details=normalizeCardDetails(raw);
   Object.entries(details.owned||{}).forEach(([key,snapshot])=>{
    const id=Number(pokemonId);
    const pokemon=(window.__all||[]).find(item=>Number(item.id)===id)||{id,name:String(snapshot.name||'')};
    map.set(String(key),{pokemonId:id,details,snapshot,pokemon});
   });
  });
  return map;
 }
 function ownerForKey(key){return ownerMap().get(String(key))||null;}
 function stateFor(key,owner){
  let catalog=null;
  try{catalog=typeof CARD_BROWSER_CACHE!=='undefined'?CARD_BROWSER_CACHE.get(owner.pokemonId):null}catch(_){}
  const found=Array.isArray(catalog)?catalog.find(card=>String(card?.id||'')===String(owner.snapshot?.id||'')):null;
  if(found){const state={card:found,loaded:true};catalogCache.set(String(key),state);return state;}
  const cached=catalogCache.get(String(key));if(cached)return cached;
  const card=typeof pseudoCardFromSnapshot==='function'?pseudoCardFromSnapshot(owner.snapshot):owner.snapshot;
  const state={card,loaded:false};catalogCache.set(String(key),state);return state;
 }
 function variantsFor(state,snapshot){
  let vars=[];
  try{vars=typeof cardVariants==='function'?cardVariants(state.card):[]}catch(_){vars=[]}
  const saved=typeof variantFromSnapshot==='function'?variantFromSnapshot(snapshot):null;
  if(saved&&!vars.some(v=>String(v.key||'')===String(saved.key||'default'))){
   vars.unshift({...saved,key:String(saved.key||'default'),label:String(saved.label||'Variante por confirmar')});
  }
  return vars;
 }
 async function loadCatalog(key,select){
  const rowKey=String(key);if(loading.has(rowKey))return;
  const owner=ownerForKey(rowKey);if(!owner){message.textContent='Carta já não está na carteira.';message.classList.add('error');return;}
  loading.add(rowKey);if(select)select.disabled=true;message.classList.remove('error');message.textContent='A carregar variantes da carta…';render();
  try{
   const cards=await fetchAllCardsForPokemon(owner.pokemon);
   const card=cards.find(item=>String(item?.id||'')===String(owner.snapshot?.id||''));
   if(!card)throw new Error('Carta não encontrada no catálogo');
   try{await enrichCardmarketPriceFromTcgdex(card)}catch(_){}
   catalogCache.set(rowKey,{card,loaded:true});
   const details=pokemonCardDetail(owner.pokemonId,true),current=details.owned[rowKey]||owner.snapshot;
   const variant=variantFromSnapshot(current)||defaultVariantForCard(card);
   details.owned[rowKey]=mergeSnapshotWithCard(current,card,variant);
   saveCardDetailStore();updateCollectionValueUI();
   try{await persistCardDetails(owner.pokemonId)}catch(_){}
   message.textContent='Variantes carregadas. Escolhe a versão da carta.';
  }catch(error){
   console.warn('Não foi possível carregar variantes da carteira:',error);
   message.textContent='Não foi possível carregar variantes agora. Tenta novamente.';message.classList.add('error');
  }finally{loading.delete(rowKey);render();}
 }
 async function changeVariant(key,variantKey,select){
  const rowKey=String(key);
  if(variantKey==='__load'){await loadCatalog(rowKey,select);return;}
  const owner=ownerForKey(rowKey);if(!owner){message.textContent='Carta já não está na carteira.';message.classList.add('error');return;}
  const state=stateFor(rowKey,owner),variants=variantsFor(state,owner.snapshot);
  const variant=variants.find(item=>String(item.key||'')===String(variantKey));
  if(!variant)return;
  pending.add(rowKey);if(select)select.disabled=true;message.classList.remove('error');message.textContent='A atualizar variante e preço Cardmarket NM…';render();
  const write=async()=>{
   const details=pokemonCardDetail(owner.pokemonId,true),current=details.owned[rowKey]||owner.snapshot;
   const fresh=mergeSnapshotWithCard(current,state.card,variant);
   const nextKey=variantItemKey(current.id,variant.key||'default');
   if(nextKey!==rowKey){
    delete details.owned[rowKey];details.owned[nextKey]=fresh;
    if(details.featured===rowKey)details.featured=nextKey;
   }else details.owned[rowKey]=fresh;
   saveCardDetailStore();updateCollectionValueUI();
   const ok=await persistCardDetails(owner.pokemonId);if(ok===false)throw new Error('Falha ao sincronizar');
  };
  try{
   const queue=window.m7QueueOwnershipWrite;
   await (typeof queue==='function'?queue(write):write());
   message.textContent='Variante atualizada e preço Cardmarket NM recalculado.';
  }catch(error){
   console.warn('Não foi possível atualizar variante da carteira:',error);
   message.textContent='Não foi possível guardar a variante. Verifica a ligação e tenta novamente.';message.classList.add('error');
  }finally{pending.delete(rowKey);render();}
 }
 function render(){
  const stats=collectionValueStats();
  total.textContent=stats.priced?'~ '+euro(stats.total):stats.cards?'Sem cotação':'0,00 €';
  coverage.textContent=stats.cards?stats.priced+' / '+stats.cards+' cartas avaliadas':'Nenhuma carta escolhida';
  const owners=ownerMap();
  const rows=stats.items.map(({key,card,value})=>{
   const owner=owners.get(String(key));
   const fallback=typeof pseudoCardFromSnapshot==='function'?pseudoCardFromSnapshot(card):card;
   const state=owner?stateFor(String(key),owner):{card:fallback,loaded:false};
   const variants=variantsFor(state,card);
   return {
    key:String(key),value,name:String(card.name||card.id),set:String(card.setName||card.setCode||'Coleção não indicada'),
    number:String(card.number||'—'),variant:String(card.variantLabel||'Variante por confirmar'),
    variantKey:String(card.variantKey||'default'),image:String(card.variantImage||card.imageSmall||card.imageLarge||''),
    owner,state,variants
   };
  });
  const signature=JSON.stringify(rows.map(row=>[row.key,row.value,row.variantKey,row.variant,row.state.loaded,row.variants.map(v=>[v.key,v.label])]).concat([[...pending],[...loading]]));
  if(signature===lastRows)return;
  lastRows=signature;
  const focused=document.activeElement;
  const focusedKey=tbody.contains(focused)?String(focused.dataset?.walletVariantKey||focused.dataset?.removeKey||''):'';
  const focusedKind=tbody.contains(focused)?(focused.dataset?.walletVariantKey?'variant':focused.dataset?.removeKey?'remove':''):'';
  const focusedIndex=focusedKey?rows.findIndex(row=>row.key===focusedKey):-1;
  const fragment=document.createDocumentFragment();
  rows.forEach(row=>{
   const tr=document.createElement('tr');
   const nameCell=element('td','m7-wallet-card-column');
   const cardLine=element('div','m7-wallet-card');
   if(/^https?:\/\//i.test(row.image)){
    const img=document.createElement('img');img.src=row.image;img.alt='';img.loading='lazy';img.decoding='async';img.width=40;img.height=56;
    img.addEventListener('error',()=>img.remove(),{once:true});cardLine.appendChild(img);
   }
   const copy=element('div','m7-wallet-card-copy');
   copy.append(element('span','m7-wallet-card-name',row.name),element('span','m7-wallet-mobile-details',row.set+' · #'+row.number+' · '+row.variant));
   cardLine.appendChild(copy);nameCell.appendChild(cardLine);
   const setCell=element('td','m7-wallet-set-column');
   setCell.append(element('span','m7-wallet-set-name',row.set),element('span','m7-wallet-number','#'+row.number));
   const variantCell=element('td','m7-wallet-variant-column');
   const select=document.createElement('select');select.className='m7-wallet-variant-select';select.dataset.walletVariantKey=row.key;
   select.setAttribute('aria-label','Escolher variante de '+row.name);
   select.disabled=pending.has(row.key)||loading.has(row.key);
   row.variants.forEach(v=>{
    const option=document.createElement('option');option.value=String(v.key||'default');option.textContent=String(v.label||'Variante');
    option.selected=String(v.key||'default')===row.variantKey;select.appendChild(option);
   });
   if(!row.state.loaded){
    const option=document.createElement('option');option.value='__load';option.textContent='＋ Carregar outras variantes…';select.appendChild(option);
   }
   if(!row.variants.length){
    const option=document.createElement('option');option.value='';option.textContent='Variantes indisponíveis';option.selected=true;option.disabled=true;select.appendChild(option);
   }
   select.addEventListener('change',()=>changeVariant(row.key,select.value,select));
   variantCell.appendChild(select);
   const priceCell=element('td','m7-wallet-price-column');
   const priceTools=element('div','m7-wallet-price-tools');
   priceTools.appendChild(element('span',row.value===null?'m7-wallet-unpriced':'',row.value===null?'Sem cotação':euro(row.value)));
   const remove=element('button','m7-wallet-remove',pending.has(row.key)?'…':'×');
   remove.type='button';remove.dataset.removeKey=row.key;remove.disabled=pending.has(row.key)||loading.has(row.key);
   remove.title='Remover da coleção';
   remove.setAttribute('aria-label','Remover '+row.name+' · '+row.set+' #'+row.number+' · '+row.variant+' da coleção');
   remove.addEventListener('click',async event=>{
    event.stopPropagation();if(pending.has(row.key)||loading.has(row.key))return;
    pending.add(row.key);message.classList.remove('error');message.textContent='A remover carta…';render();
    try{await window.m7RemoveOwnedVariant(row.key);message.textContent='Carta removida da coleção.';}
    catch(_){message.textContent='Não foi possível remover. Verifica a ligação e tenta novamente.';message.classList.add('error');}
    finally{pending.delete(row.key);render();}
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
   const controls=Array.from(tbody.querySelectorAll('[data-wallet-variant-key],[data-remove-key]'));
   const next=focusedKind==='variant'
    ?controls.find(el=>el.dataset.walletVariantKey===focusedKey)
    :controls.find(el=>el.dataset.removeKey===focusedKey);
   (next||controls[Math.min(Math.max(focusedIndex,0),controls.length-1)]||dialog.querySelector('.m7-wallet-close'))?.focus({preventScroll:true});
  }
 }
 button.title='Ver cartas da mais cara para a mais barata';
 button.setAttribute('aria-haspopup','dialog');
 button.setAttribute('aria-controls',dialog.id);
 let previousOverflow='';
 button.addEventListener('click',()=>{
  if(dialog.open)return;
  message.textContent='';message.classList.remove('error');
  // Refresh the header and retry missing Cardmarket NM prices when the wallet opens.
  updateCollectionValueUI();render();
  previousOverflow=document.body.style.overflow;
  dialog.showModal();document.body.style.overflow='hidden';scroll.scrollTop=0;
  if(typeof refreshOwnedCardPriceCache==='function'){
   const refresh=refreshOwnedCardPriceCache();
   if(refresh&&typeof refresh.then==='function'){
    refresh.then(()=>{if(dialog.open){message.textContent='';message.classList.remove('error');render();}})
      .catch(error=>{console.warn('Atualização Cardmarket da carteira falhou:',error);if(dialog.open){message.textContent='Não foi possível atualizar todos os preços agora.';message.classList.add('error');render();}});
   }
  }
 });
 dialog.querySelector('.m7-wallet-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 dialog.addEventListener('close',()=>{document.body.style.overflow=previousOverflow;button.focus({preventScroll:true});});
 const oldUpdate=updateCollectionValueUI;
 updateCollectionValueUI=function(...args){const result=oldUpdate(...args);if(dialog.open)render();return result;};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
