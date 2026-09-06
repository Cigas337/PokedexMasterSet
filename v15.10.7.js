/* Cardmarket pricing audit: exact identity, variant channels and honest estimates. */
(function(){
'use strict';
const AUDIT='cardmarket-identity-20260906';
const DAY=86400000;
const missing=()=>({value:Infinity,label:'Sem preço confirmado',key:null,source:null});
function dateMs(x){return typeof x==='number'? (x<1e12?x*1000:x):Date.parse(String(x||'').replace(/^(\d{4})\/(\d{2})\/(\d{2})/,'$1-$2-$3'));}
function usableDate(x){const t=dateMs(x);return Number.isFinite(t)&&Date.now()-t<=7*DAY&&t<=Date.now()+DAY;}
function price(p,reverse,source,updated){
 if(!p||!usableDate(updated)||p.unit&&p.unit!=='EUR')return missing();
 const fields=reverse?[['reverseHoloTrend','trend-holo'],['reverseHoloAvg7','avg7-holo'],['reverseHoloAvg30','avg30-holo']]:[['trendPrice','trend'],['avg7','avg7'],['avg30','avg30']];
 for(let i=0;i<fields.length;i++){
  const [a,b]=fields[i],value=Number(p[a]??p[b]);
  if(Number.isFinite(value)&&value>0)return {value,key:b,label:['Trend Cardmarket','Média Cardmarket 7d','Média Cardmarket 30d'][i],source,updated:new Date(dateMs(updated)).toISOString()};
 }
 return missing();
}
function choose(rows){return rows.filter(x=>Number.isFinite(x.value)).sort((a,b)=>dateMs(b.updated)-dateMs(a.updated))[0]||missing();}
primaryCardmarketPrice=function(card){return price(card.cardmarket?.prices,false,'Cardmarket via Pokémon TCG API',card.cardmarket?.updatedAt);};
tcgdexCardmarketPrice=function(card){return price(card.__tcgdexCardmarket,false,'Cardmarket via TCGdex',card.__tcgdexCardmarket?.updated||card.__tcgdexPriceUpdated);};
cardmarketPrice=function(card){return choose([primaryCardmarketPrice(card),tcgdexCardmarketPrice(card)]);};
cardmarketReversePrice=function(card){return choose([
 price(card.cardmarket?.prices,true,'Cardmarket via Pokémon TCG API',card.cardmarket?.updatedAt),
 price(card.__tcgdexCardmarket,true,'Cardmarket via TCGdex',card.__tcgdexCardmarket?.updated||card.__tcgdexPriceUpdated)
]);};
variantExplicitCardmarketPrice=function(v){const p=v?.pricing?.cardmarket||v?.pricing?.cardMarket;return price(p,v?.type==='reverse','Cardmarket via TCGdex · variante',p?.updated);};
function special(v){return !!(v.foil||v.stamps?.length||(v.subtype&&v.subtype!=='unlimited')||(v.size&&v.size!=='standard'));}
variantCardmarketPrice=function(card,variant){
 const v=variant||defaultVariantForCard(card);
 if(v.key==='default'&&/confirmar/i.test(v.label||''))return missing();
 const candidates=cardVariants(card);
 const exact=candidates.find(x=>x.key===v.key)||candidates.find(x=>x.type===v.type&&String(x.foil||'')===String(v.foil||'')&&String(x.subtype||'')===String(v.subtype||'')&&JSON.stringify(x.stamps||[])===JSON.stringify(v.stamps||[])&&(!v.cardmarketId||x.cardmarketId===v.cardmarketId));
 const resolved=exact||v;
 const p=resolved.pricing?.cardmarket||resolved.pricing?.cardMarket;
 const wanted=Number(v.cardmarketId||resolved.cardmarketId)||null;
 if(wanted&&p?.idProduct&&wanted!==Number(p.idProduct))return missing();
 // If normal and holo coexist under one product, the base price cannot tell them apart.
 const detailed=card.__tcgdexVariantsDetailed;
 if(Array.isArray(detailed)&&detailed.length){
  if(!candidates.some(x=>x.type===v.type))return missing();
  const baseVariants=candidates.filter(x=>x.type!=='reverse'&&!special(x));
  if(v.type!=='reverse'&&baseVariants.some(x=>x.type!==v.type&&(!wanted||!x.cardmarketId||x.cardmarketId===wanted)))return missing();
 }
 // A shared product ID cannot distinguish two special printings.
 if(special(v)){
   if(!exact||!wanted)return missing();
   const aliases=candidates.filter(x=>x.cardmarketId===wanted);
   if(aliases.some(x=>String(x.subtype||'')!==String(resolved.subtype||'')||JSON.stringify(x.stamps||[])!==JSON.stringify(resolved.stamps||[])||String(x.foil||'')!==String(resolved.foil||'')))return missing();
   return variantExplicitCardmarketPrice(resolved);
 }
 const mapped=Number(card.__tcgdexCardmarket?.idProduct)||null;
 if(wanted&&mapped&&wanted!==mapped)return variantExplicitCardmarketPrice(resolved);
 // Holo is the base printing; the extra holo channel represents Reverse.
 return choose([variantExplicitCardmarketPrice(resolved),v.type==='reverse'?cardmarketReversePrice(card):cardmarketPrice(card)]);
};
const oldScore=scoreTcgdexMatch;
scoreTcgdexMatch=function(card,detail){
 if(!detail||!card.number||normalizeLocalCardNumber(card.number)!==normalizeLocalCardNumber(detail.localId))return -1;
 if(normalizeMarketSetName(card.name)!==normalizeMarketSetName(detail.name))return -1;
 const canonical=id=>tcgdexSetCandidates(id).map(x=>x.toLowerCase());
 const a=canonical(card.set?.id||''),b=String(detail.set?.id||'').toLowerCase();
 if(a.includes(b))return 110;
 return oldScore(card,detail);
};
const oldCandidates=tcgdexCardIdCandidates;
tcgdexCardIdCandidates=function(card){
 const ids=oldCandidates(card),num=String(card.number||'');
 if(/^\d+$/.test(num))tcgdexSetCandidates(card.set?.id).forEach(set=>ids.push(set+'-'+num.padStart(3,'0')));
 return [...new Set(ids)];
};
const oldSnapshot=cardSnapshot;
cardSnapshot=function(card,variant){
 const out=oldSnapshot(card,variant),p=variantCardmarketPrice(card,variant);
 out.priceAudit=AUDIT;out.priceAuditUpdated=p.updated||null;
 out.marketPriceUpdated=p.updated||'';
 out.priceModelLabel='Cardmarket · estimativa de mercado; NM não filtrado';
 return out;
};
const oldMerge=mergeSnapshotWithCard;
mergeSnapshotWithCard=function(old,card,variant){
 const out=oldMerge(old,card,variant),p=variantCardmarketPrice(card,variant);
 // Never resurrect an old value when the current variant cannot be priced.
 out.marketPrice=Number.isFinite(p.value)?p.value:null;
 out.marketPriceSource=p.source;out.marketPriceLabel=p.label;
 return out;
};
let forceRefresh=false;
const oldNeeds=snapshotNeedsPriceRefresh;
snapshotNeedsPriceRefresh=function(snap){return forceRefresh||snap?.priceAudit!==AUDIT||oldNeeds(snap);};
collectionValueStats=function(){
 const unique=new Map();
 Object.values(loadCardDetailStore()||{}).forEach(raw=>Object.values(normalizeCardDetails(raw).owned||{}).forEach(s=>{
  const k=variantItemKey(s.id,s.variantKey);if(s.id&&!unique.has(k))unique.set(k,s);
 }));
 let total=0,priced=0;
 unique.forEach(s=>{if(s.priceAudit===AUDIT&&usableDate(s.priceAuditUpdated)&&hasMarketPriceValue(s.marketPrice)){total+=Number(s.marketPrice);priced++;}});
 return {total,priced,cards:unique.size};
};
updateCollectionValueUI=function(){
 const el=document.getElementById('collectionValue'),meta=document.getElementById('collectionValueMeta');
 if(!el||!meta)return;
 const s=collectionValueStats();el.textContent=s.priced?'~ '+euro(s.total):'—';
 meta.textContent=s.cards?`${s.priced}/${s.cards} com preço · Cardmarket · estimativa`:'Escolhe cartas para calcular o valor';
 const coverage=document.getElementById('m7PriceCoverage');if(coverage)coverage.textContent=meta.textContent;
 el.title='Só preços Cardmarket com até 7 dias. Sem filtro Near Mint; valores em falta excluídos.';
};
const oldResult=renderPokemonCardResult;
renderPokemonCardResult=function(...args){return oldResult(...args).replaceAll(' · raw NM',' · estado não filtrado');};
const oldRenderVariant=renderVariantModal;
renderVariantModal=function(...args){
 const out=oldRenderVariant(...args);
 const grid=document.getElementById('variantMarketGrid');
 if(grid){for(const el of grid.querySelectorAll('.market-copy span')){
  if(el.textContent.includes('raw NM'))el.textContent=el.textContent.replace('estimativa raw NM','estimativa de mercado · estado não filtrado');
 }}
 const market=grid?.querySelector('.cardmarket a');
 if(market){const url=new URL(market.href);url.searchParams.set('minCondition','2');if(currentVariantSelectedKey&&selectedVariantForModal()?.type==='reverse')url.searchParams.set('isReverseHolo','Y');market.href=url.href;market.textContent='Ver ofertas NM ↗';}
 return out;
};
// A single refresh per session; the existing routine persists only price snapshots.
const oldRefresh=refreshOwnedCardPriceCache;
let refreshing=null;
refreshOwnedCardPriceCache=function(force=false){
 if(refreshing)return refreshing;
 forceRefresh=force;
 if(force&&typeof TCGDEX_PRICE_CACHE!=='undefined')TCGDEX_PRICE_CACHE.clear();
 refreshing=Promise.resolve().then(()=>oldRefresh()).finally(()=>{refreshing=null;forceRefresh=false;updateCollectionValueUI();});
 return refreshing;
};
function init(){
 updateCollectionValueUI();
 const host=document.getElementById('m7PortfolioView');
 if(host&& !document.getElementById('m7RefreshPrices')){
  const button=document.createElement('button');button.id='m7RefreshPrices';button.type='button';button.textContent='Atualizar preços';
  button.style.cssText='display:block;margin-top:5px;padding:5px 8px;border:1px solid #ffffff40;border-radius:8px;background:#182633;color:white;font:700 10px system-ui;cursor:pointer';
  const panel=document.createElement('section');panel.className='m7-section-card';
  const note=document.createElement('p');note.textContent='Cardmarket em euros · estimativa de mercado. O feed não filtra Near Mint nem idioma das ofertas. Preços sem correspondência segura ou com mais de 7 dias ficam fora do total. Nas cartas, usa “Ver ofertas NM” para confirmar o preço nesse estado.';
  const coverage=document.createElement('p');coverage.id='m7PriceCoverage';
  panel.append(note,coverage,button);host.appendChild(panel);updateCollectionValueUI();
  button.onclick=async()=>{
   button.disabled=true;button.textContent='A atualizar…';
   try{await refreshOwnedCardPriceCache(true);}catch(_){button.title='Falha na atualização. Tenta novamente.';}finally{button.disabled=false;button.textContent='Atualizar preços';}
  };
 }
 if(window.__supabaseData?.length)refreshOwnedCardPriceCache().catch(console.warn);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
