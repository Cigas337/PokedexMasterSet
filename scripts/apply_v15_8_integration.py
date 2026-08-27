from pathlib import Path
import re

root=Path('.')
js_path=root/'v15.5.js'
html_path=root/'index.html'
sw_path=root/'sw.js'

js=js_path.read_text(encoding='utf-8')
html=html_path.read_text(encoding='utf-8')
sw=sw_path.read_text(encoding='utf-8')

owned_block=r'''  /* ---------- OWNED CARD INDEX ---------- */
  function ownedRecords(){
    const rows=[];
    const mons=Array.isArray(window.__all)?window.__all:[];
    for(const p of mons){
      let d=null;try{d=typeof getCardDetails==='function'?getCardDetails(p.id):null}catch(_){}
      const owned=d?.owned;if(!owned||typeof owned!=='object')continue;
      for(const c of Object.values(owned)){
        if(!c||typeof c!=='object')continue;
        rows.push({id:String(c.id||''),tdx:String(c.tcgdexOriginalId||''),name:String(c.name||''),number:String(c.number||''),setCode:String(c.setCode||''),setName:String(c.setName||'')});
      }
    }
    return rows;
  }
  function numKey(v){
    const raw=String(v??'').trim().toLowerCase();
    if(!raw)return '';
    if(/^\d+$/.test(raw))return String(parseInt(raw,10));
    return norm(raw).replace(/^([a-z]+)0+(\d+)$/,'$1$2');
  }
  function idKey(v){
    return norm(v).replace(/([a-z])0+(\d+)$/,'$1$2');
  }
  function nameTokens(v){
    const stop=new Set(['pokemon','tcg','set','series','expansion','black','star','promo','promos','the','and']);
    return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(x=>x&&!stop.has(x));
  }
  function sameSetName(a,b){
    const na=norm(a),nb=norm(b);if(!na||!nb)return false;if(na===nb)return true;
    const aa=nameTokens(a),bb=nameTokens(b);if(!aa.length||!bb.length)return false;
    const A=new Set(aa),B=new Set(bb),common=[...A].filter(x=>B.has(x));
    const min=Math.min(A.size,B.size);
    return min>=2&&common.length===min;
  }
  function recordSetId(r){
    const direct=idKey(r?.setCode);if(direct)return direct;
    const raw=String(r?.tdx||r?.id||'');
    const m=raw.match(/^(.+?)[-_][^\-_]+$/);return m?idKey(m[1]):'';
  }
  function sameSetRecord(r,set){
    const sid=idKey(set?.id),rid=recordSetId(r);
    if(sid&&rid&&(sid===rid||sid.replace(/bsp$/,'')===rid.replace(/bsp$/,'')))return true;
    if(r?.setName&&set?.name&&sameSetName(r.setName,set.name))return true;
    return false;
  }
  function cardOwned(card,set,records){
    const recs=records||ownedRecords();
    const cid=idKey(card?.id),num=numKey(card?.localId||card?.number);
    return recs.some(r=>{
      const rid=idKey(r.id),rtdx=idKey(r.tdx);
      if(cid&&(rid===cid||rtdx===cid))return true;
      return sameSetRecord(r,set)&&num&&numKey(r.number)===num;
    });
  }
  function ownedForSet(set,cards){
    const recs=ownedRecords();
    return (cards||[]).filter(c=>cardOwned(c,set,recs)).length;
  }
  function ownedCountForSetSummary(set){
    const seen=new Set();
    for(const r of ownedRecords()){
      if(!sameSetRecord(r,set))continue;
      const n=numKey(r.number),rid=idKey(r.tdx||r.id),name=norm(r.name);
      const key=n?`${numKey(n)}|${name}`:(rid||name);
      if(key)seen.add(key);
    }
    return seen.size;
  }

'''

pattern=r"  /\* ---------- OWNED CARD INDEX ---------- \*/.*?  /\* ---------- IMAGE FALLBACKS ---------- \*/"
match=re.search(pattern,js,flags=re.S)
if not match:
    raise SystemExit('OWNED CARD INDEX block not found')
js=js[:match.start()]+owned_block+'  /* ---------- IMAGE FALLBACKS ---------- */'+js[match.end():]
js=js.replace('const owned=ownedForSet(s,[]);','const owned=ownedCountForSetSummary(s);')
if 'ownedForSet(s,[])' in js:
    raise SystemExit('empty expansion ownership call remains')
js_path.write_text(js,encoding='utf-8')

# Activate v15.8 RC assets once, after the existing v15.7 layer.
ASSET_VERSION='15.8.2'
CACHE_VERSION='pokedexm7-shell-v15.8.2-rc1'
if 'v15.8.css' not in html:
    html=html.replace('</head>',f'<link rel="stylesheet" href="./v15.8.css?v={ASSET_VERSION}">\n</head>',1)
else:
    html=re.sub(r'v15\.8\.css\?v=[0-9.]+',f'v15.8.css?v={ASSET_VERSION}',html)
if 'v15.8.js' not in html:
    html=html.replace('</body>',f'<script src="./v15.8.js?v={ASSET_VERSION}"></script>\n</body>',1)
else:
    html=re.sub(r'v15\.8\.js\?v=[0-9.]+',f'v15.8.js?v={ASSET_VERSION}',html)
html_path.write_text(html,encoding='utf-8')

sw=re.sub(r"const CACHE_NAME='pokedexm7-shell-v[^']+';",f"const CACHE_NAME='{CACHE_VERSION}';",sw,count=1)
core_match=re.search(r"const CORE=\[(.*?)\];",sw,flags=re.S)
if not core_match: raise SystemExit('SW CORE not found')
items=core_match.group(1)
for asset in ("'./v15.8.css'","'./v15.8.js'"):
    if asset not in items:
        items=items.rstrip()+','+asset
sw=sw[:core_match.start(1)]+items+sw[core_match.end(1):]
sw_path.write_text(sw,encoding='utf-8')
print('v15.8 release-candidate integration activation applied')