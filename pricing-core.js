/* Cardmarket EUR: verified NM offers first; market references are explicitly estimates. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.M7PricingCore=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const VERSION='cardmarket-nm-verified-v2';
 const ESTIMATE_VERSION='cardmarket-reference-eur-v2';
 const text=value=>String(value??'').trim();
 const missing=()=>({value:Infinity,source:null,label:'Sem cotação Cardmarket NM',condition:'NM',currency:'EUR',verified:false});
 const token=value=>text(value).toLowerCase().replace(/[\s_-]+/g,'');
 function typeOf(variant){
  const type=token(variant?.type||variant?.variantType||variant);
  if(['reverse','reverseholo','reverseholofoil'].includes(type))return 'reverse';
  if(['holo','holofoil'].includes(type))return 'holo';
  return type||'normal';
 }
 function special(variant){
  return !!(variant?.foil||(variant?.stamps||variant?.stamp||[]).length||
   (variant?.subtype&&!['unlimited','none'].includes(variant.subtype))||
   (variant?.size&&variant.size!=='standard'));
 }
 function shape(variant){
  return [typeOf(variant),token(variant?.foil),token(variant?.subtype),
   token(variant?.size||'standard'),[...(variant?.stamps||variant?.stamp||[])].map(token).sort().join(',')].join('|');
 }
 function productId(variant){
  const id=Number(variant?.cardmarketId||variant?.thirdParty?.cardmarket||variant?.pricing?.cardmarket?.idProduct);
  return Number.isSafeInteger(id)&&id>0?id:null;
 }
 function cardIdentity(card){
  const raw=text(card?.id);
  const prefix=raw.match(/^([a-z]{2}(?:-[a-z]{2})?)::(.+)$/i);
  return {
   language:text(card?.__language||card?.language||prefix?.[1]||'en').toLowerCase(),
   ids:[...new Set([raw,card?.__tcgdexOriginalId,card?.tcgdexOriginalId,card?.__tcgdexMatchedId,prefix?.[2]].map(text).filter(Boolean))]
  };
 }
 function unknown(variant){
  return !variant||variant.legacyVariantUnknown||variant.legacyUnknown||
   !variant.key||variant.key==='default'||/confirmar|não definida|not defined/i.test(text(variant.label));
 }
 function chooseVariant(variants,selected){
  const choices=Array.isArray(variants)?variants:[];
  const normal=choices.find(v=>typeOf(v)==='normal'&&!special(v));
  if(!unknown(selected)){
   const exact=choices.find(v=>text(v.key)===text(selected.key));
   if(exact)return {variant:exact,base:false};
   const equivalent=choices.filter(v=>shape(v)===shape(selected)&&
    (!productId(v)||!productId(selected)||productId(v)===productId(selected)));
   if(equivalent.length===1)return {variant:equivalent[0],base:false};
   if(choices.length===1&&typeOf(selected)==='normal'&&!special(selected))return {variant:choices[0],base:true};
   return {variant:selected,base:false};
  }
  if(normal)return {variant:normal,base:true};
  if(choices.length===1)return {variant:choices[0],base:true};
  const main=choices.filter(v=>typeOf(v)==='holo'&&!special(v));
  if(main.length===1)return {variant:main[0],base:true};
  return {variant:null,base:true};
 }
 function validateQuote(row,now=Date.now()){
  if(!row||token(row.source)!=='cardmarket'||token(row.currency)!=='eur'||
    !['nm','nearmint','nearmint(nm)'].includes(token(row.condition)))return null;
  if(row.price===null||row.price===undefined||text(row.price)==='')return null;
  const value=Number(row.price);
  if(!Number.isFinite(value)||value<0)return null;
  const observed=Date.parse(text(row.observed_at));
  if(!Number.isFinite(observed)||observed>now+300000)return null;
  const method=text(row.method);
  if(!method||/trend|avg|average|reference|estimate|explus/i.test(method))return null;
  const offers=Number(row.offer_count);
  if(!Number.isSafeInteger(offers)||offers<1)return null;
  let url;
  try{url=new URL(text(row.source_url));}catch(_){return null;}
  if(url.protocol!=='https:'||!/(^|\.)cardmarket\.com$/i.test(url.hostname))return null;
  const key=text(row.variant_key);
  const cardId=text(row.card_id);
  if(!key||!cardId)return null;
  return {
   ...row,card_id:cardId,variant_key:key,language:text(row.language||'en').toLowerCase(),
   cardmarket_id:Number(row.cardmarket_id)||null,price:value,offer_count:offers,
   source:'Cardmarket',condition:'NM',currency:'EUR',observed_at:new Date(observed).toISOString(),
   source_url:url.href,method
  };
 }
 function variantMatchesQuote(quote,variant){
  if(!variant)return false;
  const wanted=productId(variant);
  if(wanted&&quote.cardmarket_id&&wanted!==quote.cardmarket_id)return false;
  if(quote.variant_key===text(variant.key))return true;
  return !special(variant)&&['normal','holo','reverse','reverseholo'].includes(token(quote.variant_key))&&
   typeOf(quote.variant_key)===typeOf(variant);
 }
 function quoteFor(card,selected,variants,rows){
  const choice=chooseVariant(variants,selected);
  if(!choice.variant)return missing();
  const identity=cardIdentity(card);
  const quotes=(rows||[]).map(row=>validateQuote(row)).filter(Boolean).filter(row=>
   identity.ids.includes(row.card_id)&&row.language===identity.language&&variantMatchesQuote(row,choice.variant)
  ).sort((a,b)=>Date.parse(b.observed_at)-Date.parse(a.observed_at));
  const row=quotes[0];
  if(!row)return missing();
  return {
   value:row.price,source:'Cardmarket',condition:'NM',currency:'EUR',verified:true,
   label:'Cardmarket · Near Mint'+(choice.base?' · base '+(choice.variant.label||typeOf(choice.variant)):''),
   updated:row.observed_at,url:row.source_url,variantKey:text(choice.variant.key),base:choice.base,quote:row
  };
 }
 function referenceFor(card,selected,variants){
  const choice=chooseVariant(variants,selected);
  if(!choice.variant)return missing();
  function read(variant,base){
   const reverse=typeOf(variant)==='reverse';
   const wanted=productId(variant);
   const peers=(variants||[]).filter(v=>productId(v)===wanted&&typeOf(v)===typeOf(variant));
   if(special(variant)&&peers.some(v=>shape(v)!==shape(variant)))return missing();
   const direct=variant.pricing?.cardmarket||variant.pricing?.cardMarket;
   const nodes=[direct,card.__tcgdexCardmarket,card.cardmarket?.prices,card.pricing?.cardmarket].filter(Boolean);
   for(const node of nodes){
    if(node.unit&&token(node.unit)!=='eur')continue;
    if(wanted&&node.idProduct&&wanted!==Number(node.idProduct))continue;
    const soleVariant=(variants||[]).length===1;
    if(special(variant)&&node!==direct&&!soleVariant&&wanted!==Number(node.idProduct))continue;
    const finish=typeOf(variant);
    const fields=finish==='normal'
     ?['trendPrice','trend','avg7','avg30','averageSellPrice','avg','avg1']
     :['trend-'+finish,'avg7-'+finish,'avg30-'+finish,'avg-'+finish,'avg1-'+finish,
       ...(finish==='reverse'?['reverseHoloTrend','reverseTrend','reverseHoloAvg7','reverseHoloAvg30','reverseHoloAvg1']:[]),
       ...(soleVariant?['trend','avg7','avg30','avg','avg1']:[])];
    for(const field of fields){
     const value=Number(node[field]);
     if(node[field]==null||!Number.isFinite(value)||value<=0)continue;
     const updated=node.updated||card.__tcgdexPriceUpdated||card.cardmarket?.updatedAt||null;
     return {value,source:'Cardmarket',currency:'EUR',condition:null,verified:false,estimate:true,
      label:'Cardmarket · estimativa de mercado; NM não filtrado'+(base?' · base '+(variant.label||typeOf(variant)):''),
      updated,variantKey:text(variant.key),base,field,cardmarketId:wanted||Number(node.idProduct)||null};
    }
   }
   return missing();
  }
  const exact=read(choice.variant,choice.base);
  if(Number.isFinite(exact.value))return exact;
  // An unavailable finish uses the ordinary printing as the visible base, never a rare special printing.
  const base=(variants||[]).find(v=>typeOf(v)==='normal'&&!special(v));
  return base&&base.key!==choice.variant.key?read(base,true):missing();
 }
 function verifiedSnapshotPrice(snapshot){
  const quote=validateQuote(snapshot?.marketQuote);
  if(!quote||snapshot.priceVerification!==VERSION)return missing();
  const identity=cardIdentity(snapshot);
  if(!identity.ids.includes(quote.card_id)||identity.language!==quote.language)return missing();
  const selected={
   key:snapshot.variantKey,type:snapshot.variantType,foil:snapshot.variantFoil,
   subtype:snapshot.variantSubtype,stamps:snapshot.variantStamps,size:snapshot.variantSize,
   label:snapshot.variantLabel,legacyVariantUnknown:snapshot.legacyVariantUnknown,
   cardmarketId:snapshot.variantCardmarketId
  };
  const base=snapshot.marketPriceBase===true;
  if(!unknown(selected)&&!base&&!variantMatchesQuote(quote,selected))return missing();
  if(base&&!unknown(selected)&&!variantMatchesQuote(quote,selected)&&
    text(snapshot.marketPriceSelectedVariantKey)!==text(snapshot.variantKey))return missing();
  return {value:quote.price,source:'Cardmarket',condition:'NM',currency:'EUR',verified:true,
   updated:quote.observed_at,url:quote.source_url,label:text(snapshot.marketPriceLabel)||'Cardmarket · Near Mint',quote};
 }
 function snapshotPrice(snapshot){
  const confirmed=verifiedSnapshotPrice(snapshot);
  if(confirmed.verified)return confirmed;
  const value=Number(snapshot?.marketPrice);
  if(snapshot?.marketPrice==null||!Number.isFinite(value)||value<=0||!token(snapshot.marketPriceSource).startsWith('cardmarket'))return missing();
  if(snapshot.priceVerification===VERSION)return missing();
  const reference=snapshot.marketReference;
  if(snapshot.priceVerification===ESTIMATE_VERSION){
   if(!reference?.estimate||reference.currency!=='EUR'||reference.source!=='Cardmarket'||
    text(snapshot.marketPriceSelectedVariantKey)!==text(snapshot.variantKey))return missing();
   return {...reference,value,label:reference.label||'Cardmarket · estimativa de mercado; NM não filtrado'};
  }
  // Keep old Cardmarket EUR references visible while they refresh. Never promote old audit labels to NM proof.
  if(!text(snapshot.priceModelId).startsWith('cardmarket-'))return missing();
  return {value,source:'Cardmarket',currency:'EUR',condition:null,verified:false,estimate:true,cached:true,
   updated:snapshot.marketPriceUpdated||snapshot.priceCheckedAt||null,label:'Cardmarket · estimativa guardada; NM não filtrado'};
 }
 function stats(entries,resolve){
  const unique=new Map();
  for(const {key,card} of entries||[]){
   if(!card?.id)continue;
   const identity=cardIdentity(card);
   const id=[identity.language,card.id,card.variantKey||'default'].join('@@');
   if(!unique.has(id))unique.set(id,{key,card});
  }
  let cents=0,priced=0,estimated=0,confirmed=0;
  const items=[...unique.values()].map(item=>{
   const result=resolve?resolve(item.card):snapshotPrice(item.card);
   const value=(result?.verified||result?.estimate)&&Number.isFinite(result.value)?result.value:null;
   if(value!==null){cents+=Math.round(value*100);priced++;}
   if(value!==null){if(result.verified)confirmed++;else estimated++;}
   return {...item,value,price:result};
  }).sort((a,b)=>(b.value??-1)-(a.value??-1)||text(a.card.name||a.card.id).localeCompare(text(b.card.name||b.card.id),'pt-PT',{numeric:true}));
  return {total:cents/100,priced,cards:unique.size,estimated,confirmed,items};
 }
 return {VERSION,ESTIMATE_VERSION,missing,typeOf,special,shape,productId,cardIdentity,unknown,chooseVariant,validateQuote,quoteFor,referenceFor,snapshotPrice,stats};
});
