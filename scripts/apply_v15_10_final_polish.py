from pathlib import Path
import re

root=Path('.')
html_path=root/'index.html'
sw_path=root/'sw.js'
html=html_path.read_text(encoding='utf-8')
sw=sw_path.read_text(encoding='utf-8')

ASSET_VERSION='15.10.0'
CACHE_VERSION='pokedexm7-shell-v15.10.0-rc1'

# v15.10 is an isolated final-polish layer loaded after v15.9.
if 'v15.10.css' not in html:
    anchor=re.search(r'(<link rel="stylesheet" href="\./v15\.9\.css\?v=[^"]+">)',html)
    if anchor:
        html=html[:anchor.end()]+f'\n<link rel="stylesheet" href="./v15.10.css?v={ASSET_VERSION}">'+html[anchor.end():]
    else:
        html=html.replace('</head>',f'<link rel="stylesheet" href="./v15.10.css?v={ASSET_VERSION}">\n</head>',1)
else:
    html=re.sub(r'v15\.10\.css\?v=[0-9.]+',f'v15.10.css?v={ASSET_VERSION}',html)

if 'v15.10.js' not in html:
    anchor=re.search(r'(<script src="\./v15\.9\.js\?v=[^"]+"></script>)',html)
    if anchor:
        html=html[:anchor.end()]+f'\n<script src="./v15.10.js?v={ASSET_VERSION}"></script>'+html[anchor.end():]
    else:
        html=html.replace('</body>',f'<script src="./v15.10.js?v={ASSET_VERSION}"></script>\n</body>',1)
else:
    html=re.sub(r'v15\.10\.js\?v=[0-9.]+',f'v15.10.js?v={ASSET_VERSION}',html)

html_path.write_text(html,encoding='utf-8')

sw=re.sub(r"const CACHE_NAME='pokedexm7-shell-v[^']+';",f"const CACHE_NAME='{CACHE_VERSION}';",sw,count=1)
core_match=re.search(r"const CORE=\[(.*?)\];",sw,flags=re.S)
if not core_match:
    raise SystemExit('SW CORE not found')
items=core_match.group(1)
for asset in ("'./v15.10.css'","'./v15.10.js'"):
    if asset not in items:
        items=items.rstrip()+','+asset
sw=sw[:core_match.start(1)]+items+sw[core_match.end(1):]
sw_path.write_text(sw,encoding='utf-8')

print('v15.10 final polish activation applied')
