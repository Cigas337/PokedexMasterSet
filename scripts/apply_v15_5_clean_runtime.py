from pathlib import Path
import re

INDEX=Path('index.html')
SW=Path('sw.js')
text=INDEX.read_text(encoding='utf-8')

# Remove the broken runtime AND its overrides entirely. They must not execute
# beside v15.5 because their capture listeners cannot be safely undone later.
for asset in ('v15.4.css','v15.4.1.css'):
    text=re.sub(r'\s*<link\b[^>]*href=["\'][^"\']*'+re.escape(asset)+r'[^"\']*["\'][^>]*>\s*','\n',text,flags=re.I)
for asset in ('v15.4.js','v15.4.1.js'):
    text=re.sub(r'\s*<script\b[^>]*src=["\'][^"\']*'+re.escape(asset)+r'[^"\']*["\'][^>]*>\s*</script>\s*','\n',text,flags=re.I)

# Idempotently activate only the clean replacement.
if 'v15.5.css' not in text:
    if '</head>' not in text: raise SystemExit('Missing </head>')
    text=text.replace('</head>','  <link rel="stylesheet" href="./v15.5.css?v=15.5.0">\n</head>',1)
if 'v15.5.js' not in text:
    if '</body>' not in text: raise SystemExit('Missing </body>')
    text=text.replace('</body>','  <script src="./v15.5.js?v=15.5.0"></script>\n</body>',1)

# Force a fresh service worker URL even on aggressively cached iOS PWAs.
text=re.sub(r'\.\/sw\.js\?v=[^"\']+', './sw.js?v=15.5.0', text)
text=text.replace('v15.4.1','v15.5.0')
INDEX.write_text(text,encoding='utf-8')

sw=SW.read_text(encoding='utf-8')
sw=re.sub(r"const CACHE_NAME='pokedexm7-shell-v[^']+';", "const CACHE_NAME='pokedexm7-shell-v15.5.0';", sw, count=1)
# Cache the clean shell assets as well.
old="const CORE=['./','./index.html','./manifest.webmanifest','./v15.css','./v15.js','./v15-fix.js'];"
new="const CORE=['./','./index.html','./manifest.webmanifest','./v15.css','./v15.js','./v15-fix.js','./v15.5.css','./v15.5.js'];"
if old in sw: sw=sw.replace(old,new,1)
SW.write_text(sw,encoding='utf-8')

check=INDEX.read_text(encoding='utf-8')
assert check.count('v15.5.css?v=15.5.0') == 1
assert check.count('v15.5.js?v=15.5.0') == 1
assert 'src="./v15.4.js' not in check and "src='./v15.4.js" not in check
assert 'src="./v15.4.1.js' not in check and "src='./v15.4.1.js" not in check
assert 'v15.4.css' not in check and 'v15.4.1.css' not in check
assert './sw.js?v=15.5.0' in check
swc=SW.read_text(encoding='utf-8')
assert "pokedexm7-shell-v15.5.0" in swc
assert './v15.5.js' in swc and './v15.5.css' in swc
print('v15.5 clean runtime activation OK')
