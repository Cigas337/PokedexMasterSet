from pathlib import Path
import re

root=Path('.')
html_path=root/'index.html'
sw_path=root/'sw.js'
html=html_path.read_text(encoding='utf-8')
sw=sw_path.read_text(encoding='utf-8')

ASSET_VERSION='15.9.0'
CACHE_VERSION='pokedexm7-shell-v15.9.0-rc1'

# Add the RC polish layer after v15.8. Existing layers stay untouched.
if 'v15.9.css' not in html:
    html=html.replace('</head>',f'<link rel="stylesheet" href="./v15.9.css?v={ASSET_VERSION}">\n</head>',1)
else:
    html=re.sub(r'v15\.9\.css\?v=[0-9.]+',f'v15.9.css?v={ASSET_VERSION}',html)

if 'v15.9.js' not in html:
    html=html.replace('</body>',f'<script src="./v15.9.js?v={ASSET_VERSION}"></script>\n</body>',1)
else:
    html=re.sub(r'v15\.9\.js\?v=[0-9.]+',f'v15.9.js?v={ASSET_VERSION}',html)

if html.count('v15.9.css') != 1 or html.count('v15.9.js') != 1:
    raise SystemExit('v15.9 asset duplication detected')

html_path.write_text(html,encoding='utf-8')

sw=re.sub(
    r"const CACHE_NAME='pokedexm7-shell-v[^']+';",
    f"const CACHE_NAME='{CACHE_VERSION}';",
    sw,
    count=1
)
core_match=re.search(r"const CORE=\[(.*?)\];",sw,flags=re.S)
if not core_match:
    raise SystemExit('SW CORE not found')
items=core_match.group(1)
for asset in ("'./v15.9.css'","'./v15.9.js'"):
    if asset not in items:
        items=items.rstrip()+','+asset
sw=sw[:core_match.start(1)]+items+sw[core_match.end(1):]
sw_path.write_text(sw,encoding='utf-8')

print('v15.9.0 RC visual polish activation applied')
