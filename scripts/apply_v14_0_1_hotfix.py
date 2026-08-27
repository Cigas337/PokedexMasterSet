from pathlib import Path

INDEX = Path('index.html')
SW = Path('sw.js')

text = INDEX.read_text(encoding='utf-8')
original = text

# Version/cache refresh.
text = text.replace('v14.0.0 PUSH PHASE 2', 'v14.0.1 PUSH PHASE 2 HOTFIX')
text = text.replace("./sw.js?v=14.0.0", "./sw.js?v=14.0.1")

# Restore the stock collection helpers removed accidentally during Push Phase 2.
marker = "const V130_STOCK_NOTIFY_ENABLED='pokedexm7-stock-notify-enabled-v2';"
helpers = r'''function v130StockCollection(row){
  if(row?.__directory)return 'Lojas';
  const s=v124WorldNorm(`${row?.name||''} ${row?.url||''}`);
  const defs=[
    ['30.º Aniversário / 2026',/30th|30.º|30o aniversario|30 anos|anniversary|first partner|pokemon day 2026|pokémon day 2026|celebration 2026/],
    ['Pitch Black',/pitch black/],['Chaos Rising',/chaos rising/],['Perfect Order',/perfect order/],['Phantasmal Flames',/phantasmal flames/],['Ascended Heroes',/ascended heroes/],
    ['Mega Evolution',/mega evolution|\bmeg\b/],['Destined Rivals',/destined rivals/],['Journey Together',/journey together/],['Prismatic Evolutions',/prismatic evolutions/],
    ['Black Bolt / White Flare',/black bolt|white flare/],['Surging Sparks',/surging sparks/],['Stellar Crown',/stellar crown/],['Shrouded Fable',/shrouded fable/],
    ['Twilight Masquerade',/twilight masquerade/],['Temporal Forces',/temporal forces/],['Paldean Fates',/paldean fates/],['Pokémon 151',/pokemon 151|pokémon 151|scarlet.*violet.*151|\b151\b/],
    ['Paradox Rift',/paradox rift/],['Obsidian Flames',/obsidian flames/],['Paldea Evolved',/paldea evolved/],['Scarlet & Violet',/scarlet.*violet/],
    ['Crown Zenith',/crown zenith/],['Silver Tempest',/silver tempest/],['Lost Origin',/lost origin/],['Pokémon GO',/pokemon go|pokémon go/],['Astral Radiance',/astral radiance/],['Brilliant Stars',/brilliant stars/],['Fusion Strike',/fusion strike/],['Evolving Skies',/evolving skies/]
  ];
  return defs.find(([,re])=>re.test(s))?.[0]||'Outras coleções';
}
function v130PopulateStockCollections(){
  const select=document.getElementById('stockCollection');if(!select)return;
  const current=select.value||'all',order=['30.º Aniversário / 2026','Pitch Black','Chaos Rising','Perfect Order','Phantasmal Flames','Ascended Heroes','Mega Evolution'];
  const values=[...new Set(V124_STOCK_ROWS.filter(r=>!r.__directory).map(v130StockCollection))].sort((a,b)=>{const ai=order.indexOf(a),bi=order.indexOf(b);return (ai<0?999:ai)-(bi<0?999:bi)||a.localeCompare(b,'pt')});
  select.innerHTML='<option value="all">Todas as coleções</option>'+values.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  select.value=values.includes(current)?current:'all';
}
'''
if 'function v130StockCollection(row)' not in text:
    if marker not in text:
        raise SystemExit('Stock hotfix marker not found')
    text = text.replace(marker, helpers + marker, 1)

# Restore By: Cigas in the main hero design.
old_row = '.m7-brand-row{width:100%;grid-template-columns:58px minmax(0,1fr)!important;gap:16px!important}'
new_row = '.m7-brand-row{width:100%;grid-template-columns:58px minmax(0,1fr) auto!important;gap:16px!important}'
text = text.replace(old_row, new_row, 1)

mobile_old = '.m7-brand-row{grid-template-columns:46px 1fr!important;gap:11px!important}'
mobile_new = '.m7-brand-row{grid-template-columns:46px minmax(0,1fr) auto!important;gap:11px!important}'
text = text.replace(mobile_old, mobile_new, 1)

css_anchor = '.m7-brand-panel .brand-sub{margin-top:8px!important;color:#d9e2eb!important;font-size:12px!important;letter-spacing:2.8px!important;text-transform:uppercase!important}'
sig_css = css_anchor + '.m7-brand-signature{justify-self:end!important;align-self:start!important;margin-top:3px!important;padding:7px 9px!important;border-radius:10px!important;background:rgba(226,62,54,.10)!important;border:1px solid rgba(226,62,54,.22)!important;color:#f3d4d1!important;font-size:12px!important;letter-spacing:1.05px!important;text-transform:uppercase!important;box-shadow:0 0 18px rgba(225,46,39,.10)!important}'
if '.m7-brand-signature{' not in text:
    if css_anchor not in text:
        raise SystemExit('Brand CSS anchor not found')
    text = text.replace(css_anchor, sig_css, 1)

mobile_css_anchor = '.m7-brand-panel .brand-sub{font-size:9px!important;letter-spacing:2.1px!important;margin-top:5px!important}'
mobile_sig = mobile_css_anchor + '.m7-brand-signature{margin-top:1px!important;padding:5px 6px!important;font-size:7px!important;letter-spacing:.55px!important;border-radius:8px!important}'
if mobile_sig not in text:
    if mobile_css_anchor not in text:
        raise SystemExit('Mobile brand CSS anchor not found')
    text = text.replace(mobile_css_anchor, mobile_sig, 1)

html_anchor = '''            <div class="brand-sub">Master Set</div>\n          </div>\n        </div>'''
html_new = '''            <div class="brand-sub">Master Set</div>\n          </div>\n          <div class="brand-signature m7-brand-signature">By: Cigas</div>\n        </div>'''
if 'brand-signature m7-brand-signature' not in text:
    if html_anchor not in text:
        raise SystemExit('Brand HTML anchor not found')
    text = text.replace(html_anchor, html_new, 1)

if text == original:
    print('index.html already patched; no changes needed')
else:
    INDEX.write_text(text, encoding='utf-8')
    print('Patched index.html')

if SW.exists():
    sw = SW.read_text(encoding='utf-8')
    sw2 = sw.replace('pokedexm7-shell-v14.0.0', 'pokedexm7-shell-v14.0.1')
    if sw2 != sw:
        SW.write_text(sw2, encoding='utf-8')
        print('Patched sw.js cache version')
    else:
        print('sw.js cache already current')

check = INDEX.read_text(encoding='utf-8')
assert check.count('function v130StockCollection(row)') == 1
assert check.count('function v130PopulateStockCollections()') == 1
assert 'brand-signature m7-brand-signature">By: Cigas<' in check
assert "./sw.js?v=14.0.1" in check
print('v14.0.1 hotfix validation OK')
