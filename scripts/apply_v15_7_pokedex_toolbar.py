from pathlib import Path
import re

index = Path('index.html')
sw = Path('sw.js')

html = index.read_text(encoding='utf-8')
css_ref = '<link rel="stylesheet" href="./v15.7.css?v=15.7.0">'
js_ref = '<script src="./v15.7.js?v=15.7.0"></script>'

if 'v15.7.css' not in html:
    if '</head>' not in html:
        raise SystemExit('index.html: </head> not found')
    html = html.replace('</head>', css_ref + '</head>', 1)

if 'v15.7.js' not in html:
    if '</body>' not in html:
        raise SystemExit('index.html: </body> not found')
    html = html.replace('</body>', js_ref + '</body>', 1)

index.write_text(html, encoding='utf-8')

text = sw.read_text(encoding='utf-8')
text = re.sub(r"const CACHE_NAME='pokedexm7-shell-v[^']+';", "const CACHE_NAME='pokedexm7-shell-v15.7.0';", text, count=1)

m = re.search(r"const CORE=\[(.*?)\];", text, flags=re.S)
if not m:
    raise SystemExit('sw.js: CORE list not found')
items = m.group(1)
for asset in ("'./v15.7.css'", "'./v15.7.js'"):
    if asset not in items:
        items = items.rstrip() + ',' + asset
text = text[:m.start(1)] + items + text[m.end(1):]
sw.write_text(text, encoding='utf-8')

print('v15.7 activation applied')
