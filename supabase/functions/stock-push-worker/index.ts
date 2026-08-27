import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const FEED="https://www.pokestockpt.com/seen_products.json";
const PAGE=1000;
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const norm=(v:unknown)=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const collectionOf=(row:any)=>{
  const s=norm(`${row?.name||""} ${row?.url||""}`);
  const defs:[string,RegExp][]=[
    ["30.º Aniversário / 2026",/30th|30.º|30o aniversario|30 anos|anniversary|first partner|pokemon day 2026|celebration 2026/],
    ["Pitch Black",/pitch black/],["Chaos Rising",/chaos rising/],["Perfect Order",/perfect order/],["Phantasmal Flames",/phantasmal flames/],["Ascended Heroes",/ascended heroes/],
    ["Mega Evolution",/mega evolution|\bmeg\b/],["Destined Rivals",/destined rivals/],["Journey Together",/journey together/],["Prismatic Evolutions",/prismatic evolutions/],
    ["Black Bolt / White Flare",/black bolt|white flare/],["Surging Sparks",/surging sparks/],["Stellar Crown",/stellar crown/],["Shrouded Fable",/shrouded fable/],
    ["Twilight Masquerade",/twilight masquerade/],["Temporal Forces",/temporal forces/],["Paldean Fates",/paldean fates/],["Pokémon 151",/pokemon 151|scarlet.*violet.*151|\b151\b/],
    ["Paradox Rift",/paradox rift/],["Obsidian Flames",/obsidian flames/],["Paldea Evolved",/paldea evolved/],["Scarlet & Violet",/scarlet.*violet/],
    ["Crown Zenith",/crown zenith/],["Silver Tempest",/silver tempest/],["Lost Origin",/lost origin/],["Pokémon GO",/pokemon go/],["Astral Radiance",/astral radiance/],["Brilliant Stars",/brilliant stars/],["Fusion Strike",/fusion strike/],["Evolving Skies",/evolving skies/]
  ];
  return defs.find(([,re])=>re.test(s))?.[0]||"Outras coleções";
};
const stockState=(row:any)=>{
  const s=norm(`${row?.name||""} ${row?.url||""}`);
  const preorder=/pre.?order|pre.?venda|reserva|pre lancamento/.test(s);
  return row?.in_stock ? (preorder?"pre":"in") : "out";
};
const sha256=async(input:string)=>{
  const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,"0")).join("");
};
const matches=(filter:string[]|null,value:string)=>!filter?.length||filter.includes("*")||filter.includes(value);
const serviceRoleKey=()=>{
  try{
    const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
    if(keys.default)return String(keys.default);
  }catch(_){}
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
};
async function readAll(db:any,table:string,columns:string,activeOnly=false){
  const all:any[]=[];
  for(let from=0;;from+=PAGE){
    let q=db.from(table).select(columns).range(from,from+PAGE-1);
    if(activeOnly)q=q.eq("active",true);
    const {data,error}=await q;if(error)throw error;
    all.push(...(data||[]));if(!data||data.length<PAGE)break;
  }
  return all;
}

Deno.serve(async(req:Request)=>{
  const url=Deno.env.get("SUPABASE_URL")||"",service=serviceRoleKey();
  if(!url||!service)return json({ok:false,error:"Push service unavailable"},503);
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:cfg,error:cfgErr}=await db.from("push_config").select("vapid_public_key,vapid_private_key,vapid_subject,cron_secret").eq("singleton",true).maybeSingle();
  if(cfgErr||!cfg)return json({ok:false,error:"Push config missing"},503);
  if(req.headers.get("x-cron-secret")!==cfg.cron_secret)return json({ok:false,error:"Unauthorized"},401);
  if(req.method!=="POST")return json({ok:false,error:"Method not allowed"},405);
  webpush.setVapidDetails(cfg.vapid_subject,cfg.vapid_public_key,cfg.vapid_private_key);

  let requestBody:any={};
  try{requestBody=await req.json()}catch(_){}
  if(requestBody?.mode==="test"){
    let subs:any[]=[];
    try{subs=await readAll(db,"push_subscriptions","id,endpoint,p256dh,auth",true)}catch(_){return json({ok:false,error:"Could not read subscriptions"},500)}
    const now=new Date().toISOString();
    let sent=0,disabled=0,failed=0;
    for(const sub of subs){
      const payload=JSON.stringify({
        title:"Pokédex M7 · Teste Push",
        body:"Notificações 24/7 confirmadas. O iPhone/PC receberá alertas quando houver stock Pokémon real.",
        tag:"pokedexm7-push-test",
        url:"https://cigas337.github.io/PokedexMasterSet/",
        eventType:"test",
        timestamp:Date.now()
      });
      try{
        await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},payload,{TTL:300,urgency:"high",topic:"pokedexm7-test"});
        sent++;await db.from("push_subscriptions").update({last_success_at:now,last_error:null}).eq("id",sub.id);
      }catch(err:any){
        const status=Number(err?.statusCode||err?.status||0),msg=String(err?.message||err).slice(0,1000);failed++;
        if(status===404||status===410){disabled++;await db.from("push_subscriptions").update({active:false,last_error:msg}).eq("id",sub.id)}
        else await db.from("push_subscriptions").update({last_error:msg}).eq("id",sub.id);
      }
    }
    return json({ok:true,mode:"test",subscriptions:subs.length,sent,failed,disabled});
  }

  const feedRes=await fetch(`${FEED}?t=${Date.now()}`,{headers:{"User-Agent":"PokedexM7-StockPush/2.0"}});
  if(!feedRes.ok)return json({ok:false,error:`Feed HTTP ${feedRes.status}`},502);
  const feed=await feedRes.json();
  const sourceRows=Object.values(feed||{}).filter((x:any)=>x?.name&&x?.url);
  let oldRows:any[]=[];
  try{oldRows=await readAll(db,"stock_push_state","product_key,stock_state");}catch(_){return json({ok:false,error:"Could not read previous stock state"},500)}
  const firstRun=!oldRows.length;
  const old=new Map(oldRows.map((r:any)=>[r.product_key,r]));
  const now=new Date().toISOString();
  const states:any[]=[];const events:any[]=[];
  for(const row of sourceRows as any[]){
    const store=String(row.store_name||"Loja").trim(),url=String(row.url||"").trim(),key=await sha256(`${store}|${url}`),state=stockState(row),previous=old.get(key)?.stock_state,collection=collectionOf(row);
    const base={product_key:key,store_name:store,product_name:String(row.name||"Produto Pokémon"),url,image_url:String(row.img||"")||null,price:String(row.price||"")||null,collection_name:collection,in_stock:!!row.in_stock,stock_state:state,last_checked:row.last_checked?new Date(Number(row.last_checked)*1000).toISOString():now,raw:row,updated_at:now};
    states.push(base);
    if(!firstRun){
      let event_type:string|null=null;
      if(!previous&&(state==="in"||state==="pre"))event_type=state==="pre"?"preorder":"new_stock";
      else if(previous==="out"&&(state==="in"||state==="pre"))event_type=state==="pre"?"preorder":"restock";
      else if(previous!=="pre"&&state==="pre")event_type="preorder";
      if(event_type)events.push({...base,event_type,created_at:now});
    }
  }
  if(states.length){const {error}=await db.from("stock_push_state").upsert(states,{onConflict:"product_key"});if(error)return json({ok:false,error:"Could not persist stock state"},500)}
  if(firstRun)return json({ok:true,baseline:true,products:states.length,previous:oldRows.length,events:0,sent:0});
  if(!events.length)return json({ok:true,baseline:false,products:states.length,previous:oldRows.length,events:0,sent:0});

  await db.from("stock_push_events").insert(events.map(({raw,in_stock,stock_state,last_checked,updated_at,...e})=>e));
  let subs:any[]=[];
  try{subs=await readAll(db,"push_subscriptions","id,endpoint,p256dh,auth,collections,stores",true);}catch(_){return json({ok:false,error:"Could not read subscriptions"},500)}
  let sent=0,disabled=0,failed=0;
  for(const sub of subs){
    const relevant=events.filter(e=>matches(sub.collections,e.collection_name)&&matches(sub.stores,e.store_name));if(!relevant.length)continue;
    const first=relevant[0],extra=relevant.length-1,title=first.event_type==="preorder"?"Nova pré-venda Pokémon":"Stock Pokémon disponível",body=extra>0?`${first.product_name} · ${first.store_name} + ${extra} novidade${extra===1?"":"s"}`:`${first.product_name} · ${first.store_name}${first.price?` · ${first.price}`:""}`;
    const payload=JSON.stringify({title,body,tag:`stock-${first.product_key}`,url:first.url,image:first.image_url||null,store:first.store_name,collection:first.collection_name,price:first.price,eventType:first.event_type,count:relevant.length,timestamp:Date.now()});
    try{
      await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},payload,{TTL:3600,urgency:"high",topic:"pokemon-stock"});
      sent++;await db.from("push_subscriptions").update({last_success_at:now,last_error:null}).eq("id",sub.id);
    }catch(err:any){
      const status=Number(err?.statusCode||err?.status||0),msg=String(err?.message||err).slice(0,1000);failed++;
      if(status===404||status===410){disabled++;await db.from("push_subscriptions").update({active:false,last_error:msg}).eq("id",sub.id)}else await db.from("push_subscriptions").update({last_error:msg}).eq("id",sub.id);
    }
  }
  return json({ok:true,baseline:false,products:states.length,previous:oldRows.length,events:events.length,subscriptions:subs.length,sent,failed,disabled});
});
