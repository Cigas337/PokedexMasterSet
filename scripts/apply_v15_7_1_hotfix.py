from pathlib import Path
import re

index=Path('index.html')
sw=Path('sw.js')

html=index.read_text(encoding='utf-8')
html,n_js=re.subn(r'(v15\.7\.js\?v=)15\.7\.0',r'\g<1>15.7.1',html,count=1)
html,n_css=re.subn(r'(v15\.7\.css\?v=)15\.7\.0',r'\g<1>15.7.1',html,count=1)
if n_js!=1:
    raise SystemExit(f'Expected one v15.7.js version ref, changed {n_js}')
if n_css!=1:
    raise SystemExit(f'Expected one v15.7.css version ref, changed {n_css}')
index.write_text(html,encoding='utf-8')

text=sw.read_text(encoding='utf-8')
text,n_cache=re.subn(r"const CACHE_NAME='pokedexm7-shell-v15\.7\.0';","const CACHE_NAME='pokedexm7-shell-v15.7.1';",text,count=1)
if n_cache!=1:
    raise SystemExit(f'Expected v15.7.0 cache, changed {n_cache}')
sw.write_text(text,encoding='utf-8')
print('v15.7.1 hotfix activation applied')
