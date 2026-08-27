from pathlib import Path

INDEX = Path('index.html')
SW = Path('sw.js')
PUBLISHABLE_KEY = 'sb_publishable_MslRW16TUUxlAEnUNiQ2sQ_3FrG4sLy'

text = INDEX.read_text(encoding='utf-8')
original = text

# Version/cache refresh.
text = text.replace('v14.0.1 PUSH PHASE 2 HOTFIX', 'v14.0.2 PUSH AUTH HOTFIX')
text = text.replace("./sw.js?v=14.0.1", "./sw.js?v=14.0.2")

api_line = "const V140_PUSH_API='https://wdljzuqoftrontqhhatr.supabase.co/functions/v1/push-subscriptions';"
key_line = f"const V140_SUPABASE_PUBLISHABLE_KEY='{PUBLISHABLE_KEY}';"
if key_line not in text:
    if api_line not in text:
        raise SystemExit('Push API constant not found')
    text = text.replace(api_line, api_line + '\n' + key_line, 1)

old_get = "const r=await fetch(V140_PUSH_API,{method:'GET',cache:'no-store'});"
new_get = "const r=await fetch(V140_PUSH_API,{method:'GET',headers:{'apikey':V140_SUPABASE_PUBLISHABLE_KEY},cache:'no-store'});"
if new_get not in text:
    if old_get not in text:
        raise SystemExit('Push config GET call not found')
    text = text.replace(old_get, new_get, 1)

old_post = "const r=await fetch(V140_PUSH_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store'});"
new_post = "const r=await fetch(V140_PUSH_API,{method:'POST',headers:{'Content-Type':'application/json','apikey':V140_SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify(payload),cache:'no-store'});"
if new_post not in text:
    if old_post not in text:
        raise SystemExit('Push subscription POST call not found')
    text = text.replace(old_post, new_post, 1)

if text != original:
    INDEX.write_text(text, encoding='utf-8')
    print('Patched index.html Push auth headers')
else:
    print('index.html already patched')

sw = SW.read_text(encoding='utf-8')
sw_original = sw
sw = sw.replace("const CACHE_NAME='pokedexm7-shell-v14.0.1';", "const CACHE_NAME='pokedexm7-shell-v14.0.2';")

sw_api_line = "const PUSH_API='https://wdljzuqoftrontqhhatr.supabase.co/functions/v1/push-subscriptions';"
sw_key_line = f"const PUSH_API_KEY='{PUBLISHABLE_KEY}';"
if sw_key_line not in sw:
    if sw_api_line not in sw:
        raise SystemExit('Service Worker Push API constant not found')
    sw = sw.replace(sw_api_line, sw_api_line + '\n' + sw_key_line, 1)

old_sw_post = "headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'subscribe'"
new_sw_post = "headers:{'Content-Type':'application/json','apikey':PUSH_API_KEY},body:JSON.stringify({action:'subscribe'"
if new_sw_post not in sw:
    if old_sw_post not in sw:
        raise SystemExit('Service Worker subscription POST call not found')
    sw = sw.replace(old_sw_post, new_sw_post, 1)

if sw != sw_original:
    SW.write_text(sw, encoding='utf-8')
    print('Patched sw.js Push auth headers/cache')
else:
    print('sw.js already patched')

check = INDEX.read_text(encoding='utf-8')
sw_check = SW.read_text(encoding='utf-8')
assert key_line in check
assert "headers:{'apikey':V140_SUPABASE_PUBLISHABLE_KEY}" in check
assert "'Content-Type':'application/json','apikey':V140_SUPABASE_PUBLISHABLE_KEY" in check
assert "./sw.js?v=14.0.2" in check
assert sw_key_line in sw_check
assert "'Content-Type':'application/json','apikey':PUSH_API_KEY" in sw_check
assert "pokedexm7-shell-v14.0.2" in sw_check
print('v14.0.2 Push auth hotfix validation OK')
