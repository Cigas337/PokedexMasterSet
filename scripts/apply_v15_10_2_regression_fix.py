from pathlib import Path
import re

root=Path('.')
html_path=root/'index.html'
sw_path=root/'sw.js'
html=html_path.read_text(encoding='utf-8')
sw=sw_path.read_text(encoding='utf-8')

ASSET_VERSION='15.10.2'
CACHE_VERSION='pokedexm7-shell-v15.10.2-rc1'

if 'v15.10.2.js' not in html:
    anchor=re.search(r'(<script src="\./v15\.10\.1\.js\?v=[^"]+"></script>)',html)
    if anchor:
        html=html[:anchor.end()]+f'\n<script src="./v15.10.2.js?v={ASSET_VERSION}"></script>'+html[anchor.end():]
    else:
        html=html.replace('</body>',f'<script src="./v15.10.2.js?v={ASSET_VERSION}"></script>\n</body>',1)
else:
    html=re.sub(r'v15\.10\.2\.js\?v=[0-9.]+',f'v15.10.2.js?v={ASSET_VERSION}',html)
html_path.write_text(html,encoding='utf-8')

sw=re.sub(r"const CACHE_NAME='pokedexm7-shell-v[^']+';",f"const CACHE_NAME='{CACHE_VERSION}';",sw,count=1)
core=re.search(r"const CORE=\[(.*?)\];",sw,flags=re.S)
if not core:
    raise SystemExit('SW CORE not found')
items=core.group(1)
asset="'./v15.10.2.js'"
if asset not in items:
    items=items.rstrip()+','+asset
    sw=sw[:core.start(1)]+items+sw[core.end(1):]
sw_path.write_text(sw,encoding='utf-8')
print('v15.10.2 regression fix activated')
