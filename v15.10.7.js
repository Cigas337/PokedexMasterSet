/* Cardmarket NM pricing audit v16.1.3: all available NM prices, normal-base fallback and exact variant channels. */
(function(){
'use strict';
const AUDIT='cardmarket-nm-base-20260911-v2';
const DAY=86400000;
const missing=()=>({value:Infinity,label:'Preço NM indisponível',key:null,source:null,condition:'Near Mint (NM)'});
function dateMs(x){return typeof x==='number'? (x<1e12?x*1000:x):Date.parse(String(x||'').replace(/^(\d{4})\/(\d{2})\/(\d{2})/,'$1-$2-$3'));}
function usableDate(x){const t=dateMs(x);return Number.isFinite(t)&&Date.now()-t<=7*DAY&&t<=Date.now()+DAY;}
function price(p,reverse,source,updated){
 // Cardmarket's public feeds may expose a valid last-known price with an older
 // updatedAt (or without a timestamp). A price is still a Cardmarket NM price;
 // freshness must not turn every card into "Sem cotação".
 if(!p||p.unit&&String(p.unit).toUpperCase()!=='EUR')return missing();
 const updatedMs=dateMs(updated);
 const stamp=Number.isFinite(updatedMs)?new Date(updatedMs).toISOString():null;
 const finish=(value,key,label)=>({value,key,label:'Cardmarket · Near Mint (NM) · '+label,source:'Cardmarket',updated:stamp,condition:'Near Mint (NM)'});
 const read=(node,fields)=>{
  if(node==null)return null;
  if(typeof node==='number'||typeof node==='string'){
   const value=Number(node);
   return Number.isFinite(value)&&value>0?finish(value,'nm','oferta'):null;
  }
  if(typeof node!=='object'||Array.isArray(node))return null;
  const nested=node.prices||node.market||node.price;
  if(nested&&nested!==node){
   const nestedFound=read(nested,fields);
   if(nestedFound)return nestedFound;
  }
  for(const [a,b,label] of fields){
   const value=Number(node[a]??node[b]);
   if(Number.isFinite(value)&&value>0)return finish(value,b,label);
  }
  return null;
 };
 const nmFields=reverse
  ?[['trend','trend-reverse','Trend'],['avg7','avg7-reverse','Média 7d'],['avg30','avg30-reverse','Média 30d'],['avg1','avg1-reverse','Média 24h'],['low','low-reverse','Mínimo']]
  :[['trend','trend','Trend'],['avg7','avg7','Média 7d'],['avg30','avg30','Média 30d'],['avg1','avg1','Média 24h'],['low','low','Mínimo']];
 const conditionNodes=[
  p.nearMint,p.near_mint,p.nm,p.NM,
  p.conditions?.nearMint,p.conditions?.near_mint,p.conditions?.NM,p.conditions?.reverseHolo,
  p.condition?.nearMint,p.condition?.near_mint,p.condition?.NM
 ];
 for(const node of conditionNodes){
  const selected=node&&typeof node==='object'&&!Array.isArray(node)
   ?(node[reverse?'reverseHolo':'normal']||node):node;
  const found=read(selected,nmFields);
  if(found)return found;
 }
 const flatFields=reverse
  ?[['reverseHoloNearMintTrend','trend-reverse','Trend'],['nearMintReverseHoloTrend','trend-reverse','Trend'],['reverseNearMintTrend','trend-reverse','Trend'],['reverseTrend','trend-reverse','Trend'],['reverseHoloTrend','trend-reverse','Trend'],['reverseHoloAvg7','avg7-reverse','Média 7d'],['reverseHoloAvg30','avg30-reverse','Média 30d'],['reverseHoloAvg1','avg1-reverse','Média 24h']]
  :[['trendPrice','trend','Trend'],['trend','trend','Trend'],['nearMintTrend','nearMint-trend','Trend'],['nmTrend','nm-trend','Trend'],['averageSellPrice','average','Média de vendas'],['average','average','Média de vendas'],['avg','avg','Média de vendas'],['nearMintAvg7','nearMint-avg7','Média 7d'],['avg7','avg7','Média 7d'],['nearMintAvg30','nearMint-avg30','Média 30d'],['avg30','avg30','Média 30d'],['nearMintAvg1','nearMint-avg1','Média 24h'],['avg1','avg1','Média 24h'],['lowPrice','low','Mínimo'],['nearMintLow','nearMint-low','Mínimo'],['low','low','Mínimo']];
 const flat=read(p,flatFields);
 if(flat)return flat;
 return missing();
}
function choose(rows){return rows.filter(x=>Number.isFinite(x.value)).sort((a,b)=>dateMs(b.updated)-dateMs(a.updated))[0]||missing();}
primaryCardmarketPrice=function(card){return price(card.cardmarket?.prices,false,'Cardmarket',card.cardmarket?.updatedAt);};
tcgdexCardmarketPrice=function(card){return price(card.__tcgdexCardmarket,false,'Cardmarket',card.__tcgdexCardmarket?.updated||card.__tcgdexPriceUpdated);};
cardmarketPrice=function(card){return choose([primaryCardmarketPrice(card),tcgdexCardmarketPrice(card)]);};
cardmarketReversePrice=function(card){return choose([
 price(card.cardmarket?.prices,true,'Cardmarket',card.cardmarket?.updatedAt),
 price(card.__tcgdexCardmarket,true,'Cardmarket',card.__tcgdexCardmarket?.updated||card.__tcgdexPriceUpdated)
]);};
variantExplicitCardmarketPrice=function(v){const p=v?.pricing?.cardmarket||v?.pricing?.cardMarket;return price(p,v?.type==='reverse','Cardmarket',p?.updated);};
function special(v){return !!(v.foil||v.stamps?.length||(v.subtype&&v.subtype!=='unlimited')||(v.size&&v.size!=='standard'));}
function usablePrice(p){return p&&Number.isFinite(Number(p.value))&&Number(p.value)>0?p:null;}
function firstUsable(rows){return rows.map(usablePrice).find(Boolean)||missing();}
function markedNormalBase(p){
 const usable=usablePrice(p);
 return usable?{...usable,label:'Cardmarket · Near Mint (NM) · base normal',baseVariant:'normal'}:null;
}
function normalBaseCardmarketPrice(card,candidates){
 const vars=Array.isArray(candidates)?candidates:cardVariants(card);
 const normals=vars.filter(v=>v.type==='normal'&&!special(v));
 for(const normal of normals){
  const direct=usablePrice(variantExplicitCardmarketPrice(normal));
  if(direct)return direct;
 }
 const generic=usablePrice(cardmarketPrice(card));
 if(normals.length&&generic)return markedNormalBase(generic);
 if(vars.length===1){
  const only=usablePrice(variantExplicitCardmarketPrice(vars[0]));
  if(only)return only;
  const channel=usablePrice(vars[0].type==='reverse'?cardmarketReversePrice(card):cardmarketPrice(card));
  if(channel)return vars[0].type==='normal'?markedNormalBase(channel):channel;
 }
 if(generic)return markedNormalBase(generic);
 for(const candidate of vars){
  const direct=usablePrice(variantExplicitCardmarketPrice(candidate));
  if(direct)return direct;
 }
 return missing();
}
variantCardmarketPrice=function(card,variant){
 const candidates=cardVariants(card);
 const v=variant||defaultVariantForCard(card);
 const base=()=>normalBaseCardmarketPrice(card,candidates);
 if(v.key==='default'&&/confirmar/i.test(v.label||''))return base();
 const exact=candidates.find(x=>x.key===v.key)||candidates.find(x=>x.type===v.type&&String(x.foil||'')===String(v.foil||'')&&String(x.subtype||'')===String(v.subtype||'')&&JSON.stringify(x.stamps||[])===JSON.stringify(v.stamps||[])&&(!v.cardmarketId||x.cardmarketId===v.cardmarketId));
 const resolved=exact||v;
 const p=resolved.pricing?.cardmarket||resolved.pricing?.cardMarket;
 const wanted=Number(v.cardmarketId||resolved.cardmarketId)||null;
 if(wanted&&p?.idProduct&&wanted!==Number(p.idProduct))return base();
 // If normal and holo coexist under one product, the base price is still a usable normal reference.
 const detailed=card.__tcgdexVariantsDetailed;
 if(Array.isArray(detailed)&&detailed.length){
  if(!candidates.some(x=>x.type===v.type))return base();
  const baseVariants=candidates.filter(x=>x.type!=='reverse'&&!special(x));
  if(v.type!=='reverse'&&baseVariants.some(x=>x.type!==v.type&&(!wanted||!x.cardmarketId||x.cardmarketId===wanted)))return base();
 }
 // A shared product ID cannot distinguish two special printings; use the normal base until corrected.
 if(special(v)){
  if(!exact)return base();
  const aliases=wanted?candidates.filter(x=>x.cardmarketId===wanted):[];
  if(aliases.some(x=>String(x.subtype||'')!==String(resolved.subtype||'')||JSON.stringify(x.stamps||[])!==JSON.stringify(resolved.stamps||[])||String(x.foil||'')!==String(resolved.foil||'')))return base();
  const direct=usablePrice(variantExplicitCardmarketPrice(resolved));
  return direct||base();
 }
 const mapped=Number(card.__tcgdexCardmarket?.idProduct)||null;
 if(wanted&&mapped&&wanted!==mapped)return base();
 const direct=usablePrice(variantExplicitCardmarketPrice(resolved));
 if(direct)return direct;
 const channel=usablePrice(v.type==='reverse'?cardmarketReversePrice(card):cardmarketPrice(card));
 if(channel)return channel;
 return base();
};
const originalCardVariants=cardVariants;
cardVariants=function(card){
 const vars=originalCardVariants(card)||[];
 if(vars.length===1&&vars[0]?.type==='normal'&&!card?.__v123ManualVariants?.length){
  const tp=card?.tcgplayer?.prices||{},cm=card?.cardmarket?.prices||{};
  const hasExplicitNormal=!!tp.normal;
  const hasHolo=!!tp.holofoil||!!tp.holo||Number(cm.holoTrend)>0||Number(cm.holoAvg7)>0;
  const rarity=String(card?.rarity||'').toLowerCase();
  if((!hasExplicitNormal&&hasHolo)||(!hasExplicitNormal&&/(holo|radiant|amazing|shining|prism star|shiny|legend)/.test(rarity))){
   const v={...vars[0],type:'holo',foil:''};
   v.label='Holo';
   return [v];
  }
 }
 return vars;
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
 out.priceModelLabel='Cardmarket · Near Mint (NM) · base normal quando a variante é incerta · EUR';
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
 const items=Array.from(unique,([key,card])=>{
  const value=card.priceAudit===AUDIT&&hasMarketPriceValue(card.marketPrice)?Number(card.marketPrice):null;
  if(value!==null){total+=value;priced++;}
  return {key,card,value};
 });
 items.sort((a,b)=>(b.value??-1)-(a.value??-1)||String(a.card.name||a.card.id).localeCompare(String(b.card.name||b.card.id),'pt-PT',{numeric:true})||a.key.localeCompare(b.key));
 return {total,priced,cards:unique.size,items};
};
updateCollectionValueUI=function(){
 const el=document.getElementById('collectionValue'),meta=document.getElementById('collectionValueMeta');
 if(!el||!meta)return;
 const s=collectionValueStats();el.textContent=s.priced?'~ '+euro(s.total):'—';
 meta.textContent=s.cards?`${s.priced}/${s.cards} com preço · Cardmarket · Near Mint (NM) · base normal quando necessário`:'Escolhe cartas para calcular o valor';
 const coverage=document.getElementById('m7PriceCoverage');if(coverage)coverage.textContent=meta.textContent;
 el.title='Cardmarket em euros e Near Mint (NM). Variante normal como base quando a variante física é incerta; valores sem cotação ficam fora.';
};
const oldResult=renderPokemonCardResult;
renderPokemonCardResult=function(...args){
 const html=oldResult(...args);
 return html.replaceAll(' · raw NM',' · Cardmarket · Near Mint (NM)').replaceAll('raw NM','Cardmarket · Near Mint (NM)').replaceAll('Cardmarket · Near Mint','Cardmarket · Near Mint (NM)').replaceAll('Near Mint (NM) (NM)','Near Mint (NM)');
};
const oldVariantUrl=variantCardmarketUrl;
variantCardmarketUrl=function(card,variant){
 const raw=oldVariantUrl(card,variant);
 try{
  const url=new URL(raw,location.href);
  if(/(^|\.)cardmarket\.com$/i.test(url.hostname)){
   url.searchParams.set('minCondition','2');
   if(variant?.type==='reverse')url.searchParams.set('isReverseHolo','Y');
   return url.href;
  }
 }catch(_){}
 return raw;
};
const oldRenderVariant=renderVariantModal;
renderVariantModal=function(...args){
 const out=oldRenderVariant(...args);
 const grid=document.getElementById('variantMarketGrid');
 if(grid){for(const el of grid.querySelectorAll('.market-copy span')){
  if(el.textContent.includes('raw NM'))el.textContent=el.textContent.replace('estimativa raw NM','Cardmarket · Near Mint (NM)');
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
  const note=document.createElement('p');note.textContent='Cardmarket em euros · referência Near Mint (NM). Enquanto a variante não estiver confirmada, o total usa a base normal; se a carta só tiver uma variante, usa essa variante. O botão Cardmarket abre as ofertas filtradas para NM.';
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

(function(){
 const s=document.createElement('script');s.src='./v15.10.8.js?v=15.10.8';
 s.addEventListener('load',()=>{
  const ownership=document.createElement('script');ownership.src='./v15.10.11.js?v=16.1.2';
  ownership.addEventListener('load',()=>{
   const wallet=document.createElement('script');wallet.src='./v15.10.10.js?v=16.1.2';document.head.appendChild(wallet);
  },{once:true});
  document.head.appendChild(ownership);
 },{once:true});
 document.head.appendChild(s);
})();
