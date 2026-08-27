from pathlib import Path

INDEX=Path('index.html')
SW=Path('sw.js')
text=INDEX.read_text(encoding='utf-8')
original=text

css_tag='<link rel="stylesheet" href="./v15.3.css?v=15.3.0">'
if css_tag not in text:
    anchor='<link rel="stylesheet" href="./v15.2.css?v=15.2.0">'
    if anchor not in text:
        raise SystemExit('v15.2.css anchor not found')
    text=text.replace(anchor,anchor+'\n'+css_tag,1)

js_tag='<script src="./v15.3.js?v=15.3.0"></script>'
if js_tag not in text:
    anchor='<script src="./v15.2.js?v=15.2.0"></script>'
    if anchor not in text:
        raise SystemExit('v15.2.js anchor not found')
    text=text.replace(anchor,anchor+'\n'+js_tag,1)

text=text.replace('v15.2.0 CLASSIC POKEDEX','v15.3.0 GLOBAL CARD SEARCH')
text=text.replace('./sw.js?v=15.2.0','./sw.js?v=15.3.0')

if text!=original:
    INDEX.write_text(text,encoding='utf-8')
    print('Activated v15.3 global search')

if SW.exists():
    sw=SW.read_text(encoding='utf-8')
    sw2=sw.replace('pokedexm7-shell-v15.2.0','pokedexm7-shell-v15.3.0')
    if sw2!=sw:
        SW.write_text(sw2,encoding='utf-8')
        print('Updated service worker cache to v15.3.0')

check=INDEX.read_text(encoding='utf-8')
assert css_tag in check
assert js_tag in check
assert check.index('v15.3.css')>check.index('v15.2.css')
assert check.index('v15.3.js')>check.index('v15.2.js')
print('v15.3 activation validation OK')
