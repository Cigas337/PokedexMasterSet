from pathlib import Path

INDEX=Path('index.html')
SW=Path('sw.js')
text=INDEX.read_text(encoding='utf-8')
original=text

css='<link rel="stylesheet" href="./v15.4.css?v=15.4.0">'
if css not in text:
    anchor='<link rel="stylesheet" href="./v15.3.css?v=15.3.0">'
    if anchor not in text: raise SystemExit('v15.3 css anchor missing')
    text=text.replace(anchor,anchor+'\n'+css,1)

js='<script src="./v15.4.js?v=15.4.0"></script>'
if js not in text:
    anchor='<script src="./v15.3.js?v=15.3.0"></script>'
    if anchor not in text: raise SystemExit('v15.3 js anchor missing')
    text=text.replace(anchor,anchor+'\n'+js,1)

text=text.replace('v15.3.0 GLOBAL SEARCH','v15.4.0 SHOP EXPANSIONS')
text=text.replace('./sw.js?v=15.3.0','./sw.js?v=15.4.0')

if text!=original:
    INDEX.write_text(text,encoding='utf-8')
    print('Activated v15.4')

if SW.exists():
    sw=SW.read_text(encoding='utf-8')
    sw2=sw.replace('pokedexm7-shell-v15.3.0','pokedexm7-shell-v15.4.0')
    if sw2!=sw: SW.write_text(sw2,encoding='utf-8')

check=INDEX.read_text(encoding='utf-8')
assert css in check and js in check
assert check.index('v15.4.css')>check.index('v15.3.css')
assert check.index('v15.4.js')>check.index('v15.3.js')
print('v15.4 activation validation OK')