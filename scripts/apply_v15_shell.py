from pathlib import Path

INDEX=Path('index.html')
SW=Path('sw.js')

html=INDEX.read_text(encoding='utf-8')
old=html

html=html.replace('v14.0.2 PUSH AUTH HOTFIX','v15.0.0 APP SHELL')
html=html.replace('./sw.js?v=14.0.2','./sw.js?v=15.0.0')

css='<link rel="stylesheet" href="./v15.css?v=15.0.0">'
if css not in html:
    html=html.replace('</head>',css+'\n</head>',1)

scripts='''<script src="./v15.js?v=15.0.0"></script>\n<script src="./v15-fix.js?v=15.0.0"></script>'''
if './v15.js?v=15.0.0' not in html:
    html=html.replace('</body>',scripts+'\n</body>',1)

if html!=old:
    INDEX.write_text(html,encoding='utf-8')
    print('Activated v15 app shell in index.html')
else:
    print('index.html already activated')

sw=SW.read_text(encoding='utf-8')
sw_old=sw
sw=sw.replace("const CACHE_NAME='pokedexm7-shell-v14.0.2';","const CACHE_NAME='pokedexm7-shell-v15.0.0';")
old_core="const CORE=['./','./index.html','./manifest.webmanifest'];"
new_core="const CORE=['./','./index.html','./manifest.webmanifest','./v15.css','./v15.js','./v15-fix.js'];"
if old_core in sw:
    sw=sw.replace(old_core,new_core,1)
if sw!=sw_old:
    SW.write_text(sw,encoding='utf-8')
    print('Updated service worker cache to v15')
else:
    print('sw.js already current')

check=INDEX.read_text(encoding='utf-8')
swcheck=SW.read_text(encoding='utf-8')
assert 'v15.0.0 APP SHELL' in check
assert './v15.css?v=15.0.0' in check
assert './v15.js?v=15.0.0' in check
assert './v15-fix.js?v=15.0.0' in check
assert './sw.js?v=15.0.0' in check
assert 'pokedexm7-shell-v15.0.0' in swcheck
assert "'./v15.css'" in swcheck and "'./v15.js'" in swcheck and "'./v15-fix.js'" in swcheck
print('v15 shell activation validation OK')
