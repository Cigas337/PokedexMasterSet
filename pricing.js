/* Restore the published M7 price loader without changing its interface or ownership. */
(function(){
 'use strict';
 if(window.M7Prices)return;
 const core=window.M7PricingCore;
 if(!core)throw new Error('O módulo de preços Cardmarket não foi carregado.');
 const quotes=new Map(),checked=new Map(),inflight=new Map();
 const loadedCards=new Map();
 const TTL=5*60*1000;
 const PAGE=500;
 let refreshing=null,lastError=null;
 const originalCardVariants=cardVariants;
 cardVariants=function(card){
  const variants=originalCardVariants(card)||[];
  if(variants.length===1&&variants[0]?.type==='normal'&&!card?.__v123ManualVariants?.length){
   const tcg=card?.tcgplayer?.prices||{},cm=card?.cardmarket?.prices||{},fallback=card?.__tcgdexCardmarket||{};
   const hasExplicitNormal=!!tcg.normal;
   const hasHolo=!!tcg.holofoil||!!tcg.holo||Number(cm.holoTrend)>0||Number(cm.holoAvg7)>0||
    Number(fallback['trend-holo'])>0||Number(fallback['avg-holo'])>0;
   const rarity=String(card?.rarity||'').toLowerCase();
   if((!hasExplicitNormal&&hasHolo)||(!hasExplicitNormal&&/(holo|radiant|amazing|shining|prism star|shiny|legend)/.test(rarity))){
    const variant={...variants[0],type:'holo',foil:''};
    variant.label='Holo';
    return [variant];
   }
  }
  return variants;
 };
 function variantsFor(card,selected){
  const variants=cardVariants(card)||[];
  const detailed=card.__tcgdexVariantsChecked||card.__tcgdexVariantsDetailed?.length||
   card.__tcgdexVariantsLegacy||card.__v123ManualVariants?.length;
  if(!detailed&&!core.unknown(selected)&&!variants.some(v=>core.shape(v)===core.shape(selected)))return [...variants,selected];
  return variants;
 }
 function remember(card){
  for(const id of core.cardIdentity(card).ids)loadedCards.set(core.cardIdentity(card).language+'|'+id,card);
 }
 function catalogCard(snapshot){
  const identity=core.cardIdentity(snapshot);
  for(const id of identity.ids){
   const card=loadedCards.get(identity.language+'|'+id);
   if(card)return card;
  }
  if(typeof CARD_BROWSER_CACHE!=='undefined'){
   for(const cards of CARD_BROWSER_CACHE.values()){
    const card=cards?.find(c=>core.cardIdentity(c).language===identity.language&&core.cardIdentity(c).ids.some(id=>identity.ids.includes(id)));
    if(card){remember(card);return card;}
   }
  }
  return pseudoCardFromSnapshot(snapshot);
 }
 function selectedFrom(snapshot){
  return {...variantFromSnapshot(snapshot),legacyVariantUnknown:snapshot.legacyVariantUnknown,size:snapshot.variantSize||'standard'};
 }
 function price(card,selected){
  const variants=variantsFor(card,selected);
  const rows=core.cardIdentity(card).ids.flatMap(id=>quotes.get(id)||[]);
  const confirmed=core.quoteFor(card,selected,variants,rows);
  return confirmed.verified?confirmed:core.referenceFor(card,selected,variants);
 }
 async function fetchBatch(ids){
  const rows=[];
  for(let offset=0;;offset+=PAGE){
   const {data,error}=await supabaseClient.from('cardmarket_nm_quotes')
    .select('card_id,variant_key,language,cardmarket_id,source,condition,currency,price,observed_at,offer_count,method,source_url')
    .in('card_id',ids).order('card_id').order('variant_key').order('language').range(offset,offset+PAGE-1);
   if(error)throw error;
   rows.push(...(data||[]));
   if((data||[]).length<PAGE)break;
  }
  for(const id of ids)quotes.set(id,[]);
  for(const row of rows){
   const quote=core.validateQuote(row);
   if(quote&&quotes.has(quote.card_id))quotes.get(quote.card_id).push(quote);
  }
  for(const id of ids)checked.set(id,Date.now());
 }
 async function loadCards(cards,{force=false}={}){
  const list=(cards||[]).filter(Boolean);
  list.forEach(remember);
  const ids=[...new Set(list.flatMap(card=>core.cardIdentity(card).ids))];
  const waiting=[...new Set(ids.map(id=>inflight.get(id)).filter(Boolean))];
  const pending=ids.filter(id=>!inflight.has(id)&&(force||!checked.has(id)||Date.now()-checked.get(id)>TTL));
  for(let i=0;i<pending.length;i+=60){
   const batch=pending.slice(i,i+60);
   const job=fetchBatch(batch).finally(()=>batch.forEach(id=>inflight.delete(id)));
   batch.forEach(id=>inflight.set(id,job));waiting.push(job);
  }
  const settled=await Promise.allSettled(waiting);
  const failed=settled.find(result=>result.status==='rejected');
  lastError=failed?failed.reason:null;
  updateCollectionValueUI();
  if(failed)throw failed.reason;
  return list;
 }
 function entries(){
  const items=[];
  for(const raw of Object.values(loadCardDetailStore()||{})){
   for(const [key,card] of Object.entries(normalizeCardDetails(raw).owned||{}))items.push({key,card});
  }
  return items;
 }
 function priceForSnapshot(snapshot){
  const current=price(catalogCard(snapshot),selectedFrom(snapshot));
  return current.verified||current.estimate?current:core.snapshotPrice(snapshot);
 }
 function collectionStats(){return core.stats(entries(),priceForSnapshot);}
 function statusMessage(){
  const stats=collectionStats();
  if(lastError)return 'Não foi possível consultar a fonte Cardmarket. Os dados da coleção foram mantidos.';
  if(stats.cards&&stats.confirmed===0&&stats.estimated>0)return 'Valor baseado em referências Cardmarket; NM não filtrado.';
  if(stats.confirmed<stats.cards)return stats.confirmed+' / '+stats.cards+' cartas com cotação NM; restante usa referência Cardmarket.';
  return stats.cards?'Cotações Cardmarket NM atualizadas.':'Escolhe as cartas físicas para calcular o valor.';
}
function applyPrice(snapshot,quote,variant){
  if(!quote.verified&&!quote.estimate)return snapshot;
  const confirmed=quote.verified===true;
  return {...snapshot,marketPrice:quote.value,marketPriceSource:'Cardmarket',marketPriceLabel:quote.label,
   marketPriceUpdated:quote.updated,priceCheckedAt:new Date().toISOString(),
   priceVerification:confirmed?core.VERSION:core.ESTIMATE_VERSION,
   marketQuote:confirmed?quote.quote:null,marketReference:confirmed?null:quote,
   marketPriceBase:quote.base===true,
   marketPriceVariantKey:quote.variantKey,marketPriceSelectedVariantKey:variant?.key||snapshot.variantKey,
   priceModelId:confirmed?'cardmarket-nm-offers-eur-v1':'cardmarket-reference-eur-v2',priceModelVersion:4,
   priceModelLabel:confirmed?'Cardmarket · Near Mint · EUR':'Cardmarket · referência EUR · NM não filtrado'};
 }
 async function refresh(force=false){
  if(refreshing)return refreshing;
 refreshing=(async()=>{
   await loadCards(entries().map(({card})=>catalogCard(card)),{force});
   await hydrateMissingReferences();
   // Never persist an old full binder to Supabase during a background price refresh:
   // that would risk resurrecting a concurrently removed card.
   for(const raw of Object.values(loadCardDetailStore()||{})){
    for(const [key,snapshot] of Object.entries(raw?.owned||{})){
     const quote=price(catalogCard(snapshot),selectedFrom(snapshot));
     if(quote.verified||quote.estimate)raw.owned[key]=applyPrice(snapshot,quote,selectedFrom(snapshot));
    }
   }
   saveCardDetailStore();
   return collectionStats();
  })().finally(()=>{refreshing=null;updateCollectionValueUI();});
  return refreshing;
 }
 const originalSnapshot=cardSnapshot;
 cardSnapshot=function(card,variant){
  const selected=variant||defaultVariantForCard(card);
  const snapshot=originalSnapshot(card,selected);
  return applyPrice(snapshot,price(card,selected),selected);
 };
 const originalMerge=mergeSnapshotWithCard;
 mergeSnapshotWithCard=function(previous,card,variant){
  const selected=variant||selectedFrom(previous);
  const snapshot=originalMerge(previous,card,selected);
  const quote=price(card,selected);
  if(quote.verified||quote.estimate)return applyPrice(snapshot,quote,selected);
  const previousPrice=core.snapshotPrice(previous);
  if(textKey(selected?.key)===textKey(previous?.variantKey)&&(previousPrice.verified||previousPrice.estimate)){
   return {...snapshot,marketPrice:previous.marketPrice,marketQuote:previous.marketQuote,
    marketReference:previous.marketReference,
    priceVerification:previous.priceVerification,marketPriceBase:previous.marketPriceBase,
    marketPriceSelectedVariantKey:previous.marketPriceSelectedVariantKey,
    marketPriceLabel:previous.marketPriceLabel,marketPriceSource:previous.marketPriceSource,
    marketPriceUpdated:previous.marketPriceUpdated};
  }
  delete snapshot.marketQuote;delete snapshot.marketReference;delete snapshot.priceVerification;
  snapshot.marketPrice=null;snapshot.marketPriceSource=null;snapshot.marketPriceLabel=null;
  return snapshot;
 };
 async function hydrateMissingReferences(){
  const targets=entries().filter(({card})=>{
   const saved=core.snapshotPrice(card);
   return !(saved.verified||saved.estimate);
  });
  let cursor=0;
  const workers=Array.from({length:Math.min(4,targets.length)},async()=>{
   while(cursor<targets.length){
    const item=targets[cursor++],card=catalogCard(item.card);
    try{await enrichCardmarketPriceFromTcgdex(card);}catch(error){console.warn('Referência Cardmarket indisponível:',error);}
   }
  });
  await Promise.all(workers);
 }
 function textKey(value){return String(value||'default');}
 const originalUrl=variantCardmarketUrl;
 variantCardmarketUrl=function(card,variant){
  const choice=core.chooseVariant(variantsFor(card,variant),variant).variant||variant;
  const raw=originalUrl(card,choice);
  try{
   const url=new URL(raw);
   if(!/(^|\.)cardmarket\.com$/i.test(url.hostname))return raw;
   url.searchParams.set('minCondition','2');
   url.searchParams.set('isReverseHolo',core.typeOf(choice)==='reverse'?'Y':'N');
   return url.href;
  }catch(_){return raw;}
 };
 collectionValueStats=collectionStats;
 updateCollectionValueUI=function(){
  const stats=collectionStats(),el=document.getElementById('collectionValue'),meta=document.getElementById('collectionValueMeta');
  if(el){
   el.textContent=stats.priced?'~ '+euro(stats.total):stats.cards?'Sem cotação':'0,00 €';
   el.title=statusMessage();
  }
  const caption=stats.cards
   ?stats.confirmed===stats.cards
    ?stats.priced+'/'+stats.cards+' com preço · Cardmarket · Near Mint'
    :stats.priced+'/'+stats.cards+' com referência · Cardmarket · NM não filtrado'
   :'Escolhe cartas para calcular o valor';
  if(meta)meta.textContent=caption;
  const coverage=document.getElementById('m7PriceCoverage');if(coverage)coverage.textContent=caption;
 };
 snapshotNeedsPriceRefresh=function(snapshot){
  const last=Date.parse(snapshot?.priceCheckedAt||'');
  return !!snapshot?.id&&(!core.snapshotPrice(snapshot).verified||!Number.isFinite(last)||Date.now()-last>86400000);
 };
 refreshOwnedCardPriceCache=refresh;
 const originalEnrich=enrichCardmarketPriceFromTcgdex;
 enrichCardmarketPriceFromTcgdex=async function(card,options){
  const result=await originalEnrich(card,options);
  try{await loadCards([result||card],options);}catch(error){console.warn('Cotação NM indisponível:',error);}
  return result;
 };
 window.M7Prices={version:core.VERSION,price,loadCards,refresh,stats:collectionStats,statusMessage};
 function init(){
  updateCollectionValueUI();
  const host=document.getElementById('m7PortfolioView');
  if(host&&!document.getElementById('m7RefreshPrices')){
   const button=document.createElement('button');button.id='m7RefreshPrices';button.type='button';button.textContent='Atualizar preços';
   button.style.cssText='display:block;margin-top:5px;padding:5px 8px;border:1px solid #ffffff40;border-radius:8px;background:#182633;color:white;font:700 10px system-ui;cursor:pointer';
   const panel=document.createElement('section');panel.className='m7-section-card';
   const note=document.createElement('p');
   note.textContent='Cardmarket em euros · usa cotações Near Mint confirmadas quando disponíveis e referência de mercado como base quando necessário. Variante Normal por defeito; se existir uma só variante, usa-se essa.';
   const coverage=document.createElement('p');coverage.id='m7PriceCoverage';
   panel.append(note,coverage,button);host.appendChild(panel);updateCollectionValueUI();
   button.onclick=async()=>{
    button.disabled=true;button.textContent='A atualizar…';
    try{await refreshOwnedCardPriceCache(true);}catch(_){button.title=statusMessage();}
    finally{button.disabled=false;button.textContent='Atualizar preços';}
   };
  }
  if(window.__supabaseData?.length)refresh().catch(error=>console.warn('Preços NM:',error));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
