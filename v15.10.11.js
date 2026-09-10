/* Remove saved ownership by its stored key, independently of catalog enrichment. */
(function(){
'use strict';
if(window.m7RemoveOwnedVariant)return;
let operations=Promise.resolve();
function enqueue(operation){
 const result=operations.then(operation);operations=result.catch(()=>{});return result;
}
window.m7QueueOwnershipWrite=enqueue;
function acceptRow(row,id){
 const next=row||{pokemon_id:id,card:false,full_art:false,card_details:emptyCardDetails()};
 const existing=supaFor(id);
 if(existing)Object.assign(existing,next);
 else{window.__supabaseData=window.__supabaseData||[];window.__supabaseData.push(next);}
 applyCloudCardDetailsRow(next);
}
function refreshViews(){
 updateCounts();renderCurrentPage(false);updateCollectionValueUI();
 if(currentModalPokemon&&document.getElementById('artModal')?.classList.contains('open'))renderModalCards(false,true);
 if(currentVariantCard&&document.getElementById('variantModal')?.classList.contains('open'))renderVariantModal();
}
async function removeKeys(itemKeys,pokemonId=null){
 const keys=[...new Set(itemKeys.map(String))];
 const ids=pokemonId!==null?[Number(pokemonId)]:Object.entries(loadCardDetailStore()).filter(([,raw])=>{
  const owned=normalizeCardDetails(raw).owned;return keys.some(key=>Object.prototype.hasOwnProperty.call(owned,key));
 }).map(([id])=>Number(id));
 if(!ids.length)return true;
 setSyncStatus('saving','A remover carta…');
 try{
  // Send only the selected identities; the server removes them in one transaction.
  const {data,error}=await supabaseClient.rpc('m7_remove_owned_variants',{p_pokemon_ids:ids,p_item_keys:keys});
  if(error)throw error;
  if(!Array.isArray(data)||data.length!==new Set(ids).size)throw new Error('A remoção não foi confirmada.');
  data.forEach(row=>acceptRow(row,Number(row.pokemon_id)));
  setSyncStatus('synced','Carta removida e sincronizada');
  return true;
 }catch(error){
  setSyncStatus('error','Não foi possível remover. Tenta novamente.');throw error;
 }finally{refreshViews();}
}
window.m7RemoveOwnedVariant=(itemKey,pokemonId=null)=>enqueue(()=>removeKeys([itemKey],pokemonId));

function shape(variant){
 return [String(variant.type||''),String(variant.foil||''),String(variant.subtype||''),String(variant.size||'standard'),[...(variant.stamps||[])].map(String).sort().join('|')].join('::');
}
function storedVariant(snap){
 const variant=variantFromSnapshot(snap);
 const parts=String(snap.variantKey||'').split('|');
 variant.size=snap.variantSize||(parts.length===8&&parts[3]!=='none'?parts[3]:'standard');
 return variant;
}
function matches(pokemonId,cardId,variant){
 const entries=ownedVariantEntriesForCard(pokemonId,cardId);
 const exact=entries.filter(([,snap])=>String(snap.variantKey||'default')===String(variant.key));
 if(exact.length)return exact;
 // Only bridge an unambiguous physical match. Legacy/unknown variants remain explicitly removable below.
 const equivalent=entries.filter(([,snap])=>{
  if(snap.legacyVariantUnknown||!snap.variantType)return false;
  const old=storedVariant(snap);
  return shape(old)===shape(variant)&&(!old.cardmarketId||!variant.cardmarketId||old.cardmarketId===variant.cardmarketId)&&(!old.tcgplayerId||!variant.tcgplayerId||old.tcgplayerId===variant.tcgplayerId);
 });
 return equivalent.length===1?equivalent:[];
}
const originalIsOwned=isSpecificCardOwned;
isSpecificCardOwned=function(pokemonId,cardId,variantKey=null){
 const exact=originalIsOwned(pokemonId,cardId,variantKey);
 if(variantKey===null||exact)return exact;
 if(currentVariantCard&&String(currentVariantCard.id)===String(cardId)){
  const variant=cardVariants(currentVariantCard).find(v=>String(v.key)===String(variantKey));
  if(variant)return matches(pokemonId,cardId,variant).length>0;
 }
 return false;
};
const originalSetOwned=setSpecificVariantOwned;
setSpecificVariantOwned=function(pokemonId,card,variant,owned,options){
 return enqueue(async()=>{
  const v=variant||defaultVariantForCard(card);
  if(!owned){
   const saved=matches(pokemonId,card.id,v);
   return removeKeys(saved.length?saved.map(([key])=>key):[variantItemKey(card.id,v.key)],pokemonId);
  }
  const saved=matches(pokemonId,card.id,v);
  // Keep the saved identity when enrichment has only changed a catalog/product ID.
  const exact=saved.length?{...v,key:saved[0][1].variantKey}:v;
  return originalSetOwned(pokemonId,card,exact,true,options);
 });
};
const originalFeatured=setFeaturedSpecificVariant;
setFeaturedSpecificVariant=function(pokemonId,card,variant){
 return enqueue(()=>{
  const v=variant||defaultVariantForCard(card),saved=matches(pokemonId,card.id,v);
  return originalFeatured(pokemonId,card,saved.length?{...v,key:saved[0][1].variantKey}:v);
 });
};

function message(text,error=false){
 const status=document.getElementById('m7OwnedStatus');
 if(status){status.textContent=text;status.classList.toggle('error',error);}
}
const originalRender=renderVariantModal;
renderVariantModal=function(...args){
 const result=originalRender(...args);
 const card=currentVariantCard,pokemon=currentVariantPokemon;
 if(!card||!pokemon)return result;
 const primary=document.getElementById('variantOwnBig');
 if(!primary)return result;
 const variant=selectedVariantForModal();
 const owned=isSpecificCardOwned(pokemon.id,card.id,variant.key);
 primary.textContent=owned?'× REMOVER DA COLEÇÃO':'＋ ADICIONAR À COLEÇÃO';
 primary.setAttribute('aria-pressed',String(owned));
 primary.onclick=async()=>{
  if(primary.disabled)return;
  primary.disabled=true;primary.textContent='A guardar…';message('A guardar…');
  try{
   const wasOwned=matches(pokemon.id,card.id,variant).length>0;
   if(!wasOwned&&!(await ensurePokemonOwnedFromSpecificCard(pokemon.id)))throw new Error('Falha ao guardar');
   const saved=await setSpecificVariantOwned(pokemon.id,card,variant,!wasOwned,{makeFeatured:!wasOwned});
   if(!saved)throw new Error('Falha ao sincronizar');
   refreshViews();message(wasOwned?'Carta removida.':'Carta adicionada.');
  }catch(_){message('Não foi possível guardar. Verifica a ligação e tenta novamente.',true);}
  finally{primary.disabled=false;if(currentVariantCard===card)renderVariantModal();}
 };
 let section=document.getElementById('m7OwnedVariants');
 if(!section){
  section=document.createElement('section');section.id='m7OwnedVariants';
  section.innerHTML='<h3>Na tua coleção</h3><div class="m7-owned-list"></div><p id="m7OwnedStatus" role="status"></p>';
  primary.parentElement.after(section);
 }
 const list=section.querySelector('.m7-owned-list');list.replaceChildren();
 const entries=ownedVariantEntriesForCard(pokemon.id,card.id);
 if(!entries.length){const empty=document.createElement('p');empty.textContent='Nenhuma variante marcada.';list.appendChild(empty);}
 entries.forEach(([key,snap])=>{
  const row=document.createElement('div');row.className='m7-owned-row';
  const label=document.createElement('span');label.textContent=snap.variantLabel||'Variante por confirmar';
  const remove=document.createElement('button');remove.type='button';remove.textContent='×';
  remove.title='Remover esta variante';remove.setAttribute('aria-label',`Remover ${snap.name||card.name} · ${label.textContent} da coleção`);
  remove.onclick=async()=>{
   if(remove.disabled)return;remove.disabled=true;remove.textContent='…';message('A remover…');
   try{await window.m7RemoveOwnedVariant(key,pokemon.id);message('Carta removida.');}
   catch(_){remove.disabled=false;remove.textContent='×';message('Não foi possível remover. Verifica a ligação e tenta novamente.',true);}
  };
  row.append(label,remove);list.appendChild(row);
 });
 return result;
};
const style=document.createElement('style');style.textContent=`
 #m7OwnedVariants{margin:14px 0;padding:14px;border:1px solid #ffffff24;border-radius:12px;background:#111e29;color:#eaf2f8}
 #m7OwnedVariants h3{margin:0 0 8px;font:650 16px/1.4 system-ui}
 #m7OwnedVariants p{margin:6px 0;font:400 14px/1.4 system-ui;color:#afc1ce}
 #m7OwnedVariants .m7-owned-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid #ffffff12;font:500 14px/1.4 system-ui}
 #m7OwnedVariants .m7-owned-row span{min-width:0;overflow-wrap:anywhere}
 #m7OwnedVariants button{flex-shrink:0;width:44px;height:44px;border:1px solid #ff938344;border-radius:10px;background:#68181044;color:#ffb2a7;font:400 24px/1 system-ui;cursor:pointer}
 #m7OwnedVariants button:disabled{opacity:.55;cursor:wait}
 #m7OwnedVariants button:focus-visible{outline:2px solid #ffb2a7;outline-offset:2px}
 #m7OwnedVariants #m7OwnedStatus:empty{display:none}
 #m7OwnedVariants #m7OwnedStatus.error{color:#ffb2a7}
`;document.head.appendChild(style);
})();
