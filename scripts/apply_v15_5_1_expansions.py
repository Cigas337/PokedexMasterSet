from pathlib import Path

js_path = Path('v15.5.js')
sw_path = Path('sw.js')
js = js_path.read_text(encoding='utf-8')
sw = sw_path.read_text(encoding='utf-8')

js = js.replace('/* Pokédex M7 v15.5.0 · clean Shop + Expansions runtime', '/* Pokédex M7 v15.5.1 · newest-first expansions + resilient images', 1)

start = js.index('  /* ---------- IMAGE FALLBACKS ---------- */')
end = js.index('  /* ---------- EXPANSIONS / TCGDEX ---------- */', start)
image_block = r'''  /* ---------- IMAGE FALLBACKS ---------- */
  function uniq(a){return [...new Set(a.filter(Boolean))]}
  function imageCandidates(bases,kind){
    const source=Array.isArray(bases)?bases:[bases],out=[];
    for(const raw of source){
      const s=String(raw||'').trim();if(!s)continue;
      const clean=s.replace(/[?#].*$/,'');
      const hasExt=/\.(?:webp|png|jpe?g)$/i.test(clean);
      if(kind==='card'){
        const base=clean.replace(/\/(?:high|low)\.(?:webp|png|jpe?g)$/i,'').replace(/\.(?:webp|png|jpe?g)$/i,'');
        if(hasExt)out.push(s);
        out.push(`${base}/high.webp`,`${base}/high.png`,`${base}/high.jpg`,`${base}/low.webp`,`${base}/low.png`,`${base}/low.jpg`,`${base}.webp`,`${base}.png`,`${base}.jpg`,base);
      }else{
        const base=clean.replace(/\.(?:webp|png|jpe?g)$/i,'');
        if(hasExt)out.push(s);
        out.push(`${base}.webp`,`${base}.png`,`${base}.jpg`,base);
      }
    }
    return uniq(out);
  }
  function setImg(img,bases,kind,fallbackText){
    const list=imageCandidates(bases,kind);let i=0;
    const holder=img?.parentElement;
    holder?.querySelector('.fallback-name')?.remove();
    const fail=()=>{i++;if(i<list.length){img.src=list[i]}else{img.removeAttribute('src');img.style.display='none';if(holder&&fallbackText&&!holder.querySelector('.fallback-name'))holder.insertAdjacentHTML('beforeend',`<span class="fallback-name">${esc(fallbackText)}</span>`)}};
    img.onerror=fail;
    if(list.length){img.style.display='';img.src=list[0]}else fail();
  }
  function hydrateImages(root=document){
    root.querySelectorAll('img[data-v155-image]').forEach(img=>{if(img.dataset.v155Hydrated)return;img.dataset.v155Hydrated='1';setImg(img,[img.dataset.v155Image,img.dataset.v155ImageAlt],img.dataset.v155Kind||'set',img.dataset.v155Fallback||'')});
  }

'''
js = js[:start] + image_block + js[end:]

js = js.replace("const SET_CACHE='pokedexm7-v155-sets-cache';", "const SET_CACHE='pokedexm7-v1551-sets-cache';", 1)

old_normalize = """  function normalizeSet(raw){\n    const series=typeof raw?.serie==='object'?raw.serie?.name:(raw?.serie||raw?.series||'Outras expansões');\n    return {id:String(raw?.id||''),name:String(raw?.name||raw?.id||'Expansão'),series:String(series||'Outras expansões'),logo:raw?.logo||raw?.symbol||raw?.image||'',symbol:raw?.symbol||'',total:Number(raw?.cardCount?.official||raw?.cardCount?.total||raw?.total||0),releaseDate:String(raw?.releaseDate||raw?.release_date||'')};\n  }\n"""
new_normalize = """  function normalizeSet(raw){\n    const series=typeof raw?.serie==='object'?raw.serie?.name:(raw?.serie||raw?.series||'Outras expansões');\n    return {id:String(raw?.id||''),name:String(raw?.name||raw?.id||'Expansão'),series:String(series||'Outras expansões'),logo:raw?.logo||raw?.image||'',symbol:raw?.symbol||'',total:Number(raw?.cardCount?.official||raw?.cardCount?.total||raw?.total||0),releaseDate:String(raw?.releaseDate||raw?.release_date||'')};\n  }\n"""
if old_normalize not in js:
    raise SystemExit('normalizeSet block not found')
js = js.replace(old_normalize, new_normalize, 1)

old_fetch = "const raw=await jsonFetch(`${TDX}/sets`);"
new_fetch = "const raw=await jsonFetch(`${TDX}/sets?sort:field=releaseDate&sort:order=DESC`);"
if old_fetch not in js:
    raise SystemExit('sets fetch not found')
js = js.replace(old_fetch, new_fetch, 1)

old_img = 'data-v155-image="${esc(s.logo)}" data-v155-kind="set" data-v155-fallback="${esc(s.name)}"'
new_img = 'data-v155-image="${esc(s.logo)}" data-v155-image-alt="${esc(s.symbol)}" data-v155-kind="set" data-v155-fallback="${esc(s.name)}"'
if old_img not in js:
    raise SystemExit('set image markup not found')
js = js.replace(old_img, new_img, 1)

old_detail = "setImg(document.getElementById('v155DetailLogo'),set.logo,'set',set.name);updateDetailCount();"
new_detail = "setImg(document.getElementById('v155DetailLogo'),[set.logo,set.symbol],'set',set.name);updateDetailCount();"
if old_detail not in js:
    raise SystemExit('detail image call not found')
js = js.replace(old_detail, new_detail, 1)

old_refresh = "if(raw?.logo)set.logo=raw.logo;if(raw?.cardCount)set.total=Number(raw.cardCount.official||raw.cardCount.total||set.total||0);"
new_refresh = "if(raw?.logo)set.logo=raw.logo;if(raw?.symbol)set.symbol=raw.symbol;if(raw?.releaseDate){set.releaseDate=String(raw.releaseDate);document.getElementById('v155DetailMeta').textContent=[set.id,set.releaseDate].filter(Boolean).join(' · ')}setImg(document.getElementById('v155DetailLogo'),[set.logo,set.symbol],'set',set.name);if(raw?.cardCount)set.total=Number(raw.cardCount.official||raw.cardCount.total||set.total||0);"
if old_refresh not in js:
    raise SystemExit('set refresh block not found')
js = js.replace(old_refresh, new_refresh, 1)

if "sort:field=releaseDate&sort:order=DESC" not in js:
    raise SystemExit('newest-first sort missing')
if 'data-v155-image-alt' not in js:
    raise SystemExit('alternate image source missing')

sw = sw.replace("const CACHE_NAME='pokedexm7-shell-v15.5.0';", "const CACHE_NAME='pokedexm7-shell-v15.5.1';", 1)
if "pokedexm7-shell-v15.5.1" not in sw:
    raise SystemExit('service worker cache bump failed')

js_path.write_text(js, encoding='utf-8')
sw_path.write_text(sw, encoding='utf-8')
print('v15.5.1 expansions update OK')
