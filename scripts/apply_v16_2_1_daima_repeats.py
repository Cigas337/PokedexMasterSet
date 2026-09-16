from pathlib import Path

VERSION = '16.2.1'


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise RuntimeError(f'Marker not found for {label}')
    return text.replace(old, new, 1)


js = read('daima.js')
js = replace_once(js,
    '/* Pokédex M7 v16.2.0 · Dragon Ball DAIMA checklist */',
    '/* Pokédex M7 v16.2.1 · Dragon Ball DAIMA checklist + repetidas */',
    'daima header')
js = replace_once(js, "var VERSION = '16.2.0';", "var VERSION = '16.2.1';", 'daima version')
js = replace_once(js,
    '  var allowedKeys = new Set();',
    '  var allowedKeys = new Set();\n  var allowedRepeatKeys = new Set();',
    'repeat key set')
js = replace_once(js,
    '  allItems.forEach(function(item){ item.variants.forEach(function(variant){ allowedKeys.add(variant.key); }); });',
    '  allItems.forEach(function(item){\n    allowedRepeatKeys.add(item.id);\n    item.variants.forEach(function(variant){ allowedKeys.add(variant.key); });\n  });',
    'repeat key registration')

old_state = """  var state = {owned:{}};
  function loadState(){
    var source = {};
    try{
      var raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      source = raw && raw.owned && typeof raw.owned === 'object' ? raw.owned : raw;
    }catch(_){}
    var cleaned = {};
    if(source && typeof source === 'object'){
      Object.keys(source).forEach(function(key){ if(allowedKeys.has(key) && source[key] === true)cleaned[key] = true; });
    }
    state.owned = cleaned;
  }
  function saveState(){
    try{ localStorage.setItem(STORE_KEY,JSON.stringify({version:VERSION,updatedAt:new Date().toISOString(),owned:state.owned})); }catch(_){}
    try{ window.dispatchEvent(new CustomEvent('m7-daima-change',{detail:{owned:state.owned}})); }catch(_){}
  }
"""
new_state = """  var state = {owned:{},repeats:{}};
  function loadState(){
    var source = {};
    var repeatSource = {};
    try{
      var raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      source = raw && raw.owned && typeof raw.owned === 'object' ? raw.owned : raw;
      repeatSource = raw && raw.repeats && typeof raw.repeats === 'object' ? raw.repeats : {};
    }catch(_){}
    var cleaned = {};
    if(source && typeof source === 'object'){
      Object.keys(source).forEach(function(key){ if(allowedKeys.has(key) && source[key] === true)cleaned[key] = true; });
    }
    var cleanedRepeats = {};
    if(repeatSource && typeof repeatSource === 'object'){
      Object.keys(repeatSource).forEach(function(key){
        var count = Math.max(0,Math.min(99,parseInt(repeatSource[key],10) || 0));
        if(allowedRepeatKeys.has(key) && count > 0)cleanedRepeats[key] = count;
      });
    }
    state.owned = cleaned;
    state.repeats = cleanedRepeats;
  }
  function saveState(){
    try{ localStorage.setItem(STORE_KEY,JSON.stringify({version:VERSION,updatedAt:new Date().toISOString(),owned:state.owned,repeats:state.repeats})); }catch(_){}
    try{ window.dispatchEvent(new CustomEvent('m7-daima-change',{detail:{owned:state.owned,repeats:state.repeats}})); }catch(_){}
  }
"""
js = replace_once(js, old_state, new_state, 'state persistence')

helper_marker = """  function stats(){
"""
helpers = """  function repeatCount(item){
    return Math.max(0,parseInt(state.repeats[item.id],10) || 0);
  }
  function repeatedItems(){
    return allItems.filter(function(item){ return repeatCount(item) > 0; });
  }
  function repeatedNumberText(){
    return repeatedItems().filter(function(item){ return item.number !== null; }).map(function(item){ return String(item.number); }).join(' ');
  }
  function setRepeatCount(itemId,nextCount){
    if(!allowedRepeatKeys.has(itemId))return;
    var count = Math.max(0,Math.min(99,parseInt(nextCount,10) || 0));
    if(count > 0)state.repeats[itemId] = count;
    else delete state.repeats[itemId];
  }
  function stats(){
"""
js = replace_once(js, helper_marker, helpers, 'repeat helpers')

js = replace_once(js,
    "    if(statusFilter === 'complete' && !status.complete)return false;\n    if(!query)return true;",
    "    if(statusFilter === 'complete' && !status.complete)return false;\n    if(statusFilter === 'repeated' && repeatCount(item) === 0)return false;\n    if(!query)return true;",
    'repeated filter')

js = replace_once(js,
    "    var stateLabel = status.owned === 0 ? 'Em falta' : (status.complete ? 'Completa' : status.owned + ' de ' + status.total);\n    var variantsMarkup",
    "    var stateLabel = status.owned === 0 ? 'Em falta' : (status.complete ? 'Completa' : status.owned + ' de ' + status.total);\n    var repeats = repeatCount(item);\n    var variantsMarkup",
    'repeat count render')

js = replace_once(js,
    "        '<div class=\"m7-daima-variants\" aria-label=\"Variantes de ' + escapeHtml(item.numberLabel) + '\">' + variantsMarkup + '</div>' +\n      '</div>' +",
    "        '<div class=\"m7-daima-variants\" aria-label=\"Variantes de ' + escapeHtml(item.numberLabel) + '\">' + variantsMarkup + '</div>' +\n        '<div class=\"m7-daima-repeat-row\"><span><b>Repetidas</b><small>cópias extra desta carta</small></span><div class=\"m7-daima-repeat-stepper\" aria-label=\"Repetidas de ' + escapeHtml(item.numberLabel) + '\"><button type=\"button\" data-daima-repeat=\"-1\" data-daima-repeat-item=\"' + escapeHtml(item.id) + '\" aria-label=\"Retirar uma repetida\"' + (repeats === 0 ? ' disabled' : '') + '>−</button><strong>' + repeats + '</strong><button type=\"button\" data-daima-repeat=\"1\" data-daima-repeat-item=\"' + escapeHtml(item.id) + '\" aria-label=\"Adicionar uma repetida\">+</button></div></div>' +\n      '</div>' +",
    'repeat stepper markup')

js = replace_once(js,
    "    renderStats();\n    text('daimaVisibleCount',visible.length + ' de ' + allItems.length + ' cartões visíveis');",
    "    renderStats();\n    renderRepeatsPanel();\n    text('daimaVisibleCount',visible.length + ' de ' + allItems.length + ' cartões visíveis');",
    'repeat panel render hook')

js = replace_once(js,
    "<option value=\"complete\">Completas</option></select>',",
    "<option value=\"complete\">Completas</option><option value=\"repeated\">Com repetidas</option></select>',",
    'repeated status option')

js = replace_once(js,
    "<span id=\"daimaMessage\" role=\"status\"></span><button type=\"button\" data-daima-export>Exportar checklist</button>",
    "<span id=\"daimaMessage\" role=\"status\"></span><button type=\"button\" class=\"m7-daima-repeats-menu-btn\" data-daima-repeats-toggle>Repetidas <b id=\"daimaRepeatsButtonCount\">0</b></button><button type=\"button\" data-daima-export>Exportar checklist</button>",
    'repeats menu button')

js = replace_once(js,
    "        '<div class=\"m7-daima-info\"><strong>Como contar:</strong><span>os 207 números são a coleção principal; as 9 Limited Edition ficam fora da numeração. As variantes ocupam marcações próprias.</span></div>',\n        '<div id=\"daimaList\" class=\"m7-daima-grid\"></div>',",
    "        '<div class=\"m7-daima-info\"><strong>Como contar:</strong><span>os 207 números são a coleção principal; as 9 Limited Edition ficam fora da numeração. As variantes ocupam marcações próprias.</span></div>',\n        '<section id=\"daimaRepeatsPanel\" class=\"m7-daima-repeats-panel\" hidden aria-labelledby=\"daimaRepeatsTitle\">',\n          '<div class=\"m7-daima-repeats-head\"><div><span>LISTA PARA TROCAS</span><h2 id=\"daimaRepeatsTitle\">Cartas repetidas</h2><p id=\"daimaRepeatsSummary\">Ainda não tens repetidas marcadas.</p></div><button type=\"button\" data-daima-repeats-toggle aria-label=\"Fechar repetidas\">×</button></div>',\n          '<div class=\"m7-daima-repeats-copybox\"><label for=\"daimaRepeatsText\">Números prontos para copiar</label><textarea id=\"daimaRepeatsText\" rows=\"3\" readonly placeholder=\"Ex.: 2 3 5 7 22 23\"></textarea><div><button type=\"button\" data-daima-repeats-copy>Copiar números</button><button type=\"button\" class=\"danger\" data-daima-repeats-clear>Limpar repetidas</button></div></div>',\n          '<div id=\"daimaRepeatsLimited\" class=\"m7-daima-repeats-limited\"></div>',\n          '<div id=\"daimaRepeatsList\" class=\"m7-daima-repeats-list\"></div>',\n        '</section>',\n        '<div id=\"daimaList\" class=\"m7-daima-grid\"></div>',",
    'repeats panel markup')

panel_marker = """  function exportChecklist(){
"""
panel_code = """  function renderRepeatsPanel(){
    var repeated = repeatedItems();
    var totalExtras = repeated.reduce(function(total,item){ return total + repeatCount(item); },0);
    var numbered = repeated.filter(function(item){ return item.number !== null; });
    var limitedRepeated = repeated.filter(function(item){ return item.number === null; });
    text('daimaRepeatsButtonCount',String(repeated.length));
    text('daimaRepeatsSummary',repeated.length ? repeated.length + ' números/cartas com ' + totalExtras + ' cópias extra no total.' : 'Ainda não tens repetidas marcadas.');
    var textArea = document.getElementById('daimaRepeatsText');
    if(textArea)textArea.value = numbered.map(function(item){ return String(item.number); }).join(' ');
    var limitedElement = document.getElementById('daimaRepeatsLimited');
    if(limitedElement){
      limitedElement.innerHTML = limitedRepeated.length ? '<strong>Limited Edition repetidas:</strong> ' + limitedRepeated.map(function(item){ return escapeHtml(item.numberLabel) + ' ×' + repeatCount(item); }).join(' · ') : '';
    }
    var list = document.getElementById('daimaRepeatsList');
    if(!list)return;
    list.innerHTML = repeated.length ? repeated.map(function(item){
      return '<div class=\"m7-daima-repeat-chip\"><strong>' + escapeHtml(item.numberLabel) + '</strong><span>' + escapeHtml(item.name) + '</span><b>×' + repeatCount(item) + '</b></div>';
    }).join('') : '<div class=\"m7-daima-repeats-empty\">Usa o botão <b>+</b> em qualquer carta para a adicionar aqui.</div>';
  }
  function toggleRepeatsPanel(force){
    var panel = document.getElementById('daimaRepeatsPanel');
    if(!panel)return;
    var shouldOpen = typeof force === 'boolean' ? force : panel.hidden;
    panel.hidden = !shouldOpen;
    if(shouldOpen){
      renderRepeatsPanel();
      panel.scrollIntoView({behavior:'smooth',block:'nearest'});
    }
  }
  function copyFallback(value){
    var input = document.createElement('textarea');
    input.value = value;
    input.setAttribute('readonly','');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    var ok = false;
    try{ ok = document.execCommand('copy'); }catch(_){}
    input.remove();
    return ok;
  }
  async function copyRepeatNumbers(){
    var value = repeatedNumberText();
    if(!value){ showMessage('Ainda não tens números repetidos para copiar.',true); return; }
    try{
      if(navigator.clipboard && navigator.clipboard.writeText)await navigator.clipboard.writeText(value);
      else if(!copyFallback(value))throw new Error('copy unavailable');
      showMessage('Números repetidos copiados.');
    }catch(_){
      var field = document.getElementById('daimaRepeatsText');
      if(field){ field.focus(); field.select(); }
      showMessage('Seleciona os números e escolhe Copiar.',true);
    }
  }

  function exportChecklist(){
"""
js = replace_once(js, panel_marker, panel_code, 'repeat panel functions')

js = replace_once(js,
    "var payload = JSON.stringify({app:'Pokédex M7',collection:'Dragon Ball DAIMA',version:VERSION,exportedAt:new Date().toISOString(),owned:state.owned},null,2);",
    "var payload = JSON.stringify({app:'Pokédex M7',collection:'Dragon Ball DAIMA',version:VERSION,exportedAt:new Date().toISOString(),owned:state.owned,repeats:state.repeats},null,2);",
    'export repeats')

old_import = """        var cleaned = {};
        if(source && typeof source === 'object')Object.keys(source).forEach(function(key){ if(allowedKeys.has(key) && source[key] === true)cleaned[key] = true; });
        state.owned = cleaned;
        saveState();
"""
new_import = """        var cleaned = {};
        if(source && typeof source === 'object')Object.keys(source).forEach(function(key){ if(allowedKeys.has(key) && source[key] === true)cleaned[key] = true; });
        var repeatSource = raw && raw.repeats && typeof raw.repeats === 'object' ? raw.repeats : {};
        var cleanedRepeats = {};
        Object.keys(repeatSource).forEach(function(key){
          var count = Math.max(0,Math.min(99,parseInt(repeatSource[key],10) || 0));
          if(allowedRepeatKeys.has(key) && count > 0)cleanedRepeats[key] = count;
        });
        state.owned = cleaned;
        state.repeats = cleanedRepeats;
        saveState();
"""
js = replace_once(js, old_import, new_import, 'import repeats')

js = replace_once(js,
    "    view.addEventListener('click',function(event){\n      var variantButton",
    "    view.addEventListener('click',function(event){\n      var repeatButton = event.target.closest && event.target.closest('[data-daima-repeat]');\n      if(repeatButton){\n        var itemId = repeatButton.getAttribute('data-daima-repeat-item');\n        var delta = parseInt(repeatButton.getAttribute('data-daima-repeat'),10) || 0;\n        var item = allItems.find(function(candidate){ return candidate.id === itemId; });\n        if(!item || !delta)return;\n        setRepeatCount(itemId,repeatCount(item) + delta);\n        saveState();\n        render();\n        return;\n      }\n      var variantButton",
    'repeat click event')

js = replace_once(js,
    "      if(event.target.closest('[data-daima-export]')){ exportChecklist(); return; }",
    "      if(event.target.closest('[data-daima-repeats-toggle]')){ toggleRepeatsPanel(); return; }\n      if(event.target.closest('[data-daima-repeats-copy]')){ copyRepeatNumbers(); return; }\n      if(event.target.closest('[data-daima-repeats-clear]')){\n        if(!repeatedItems().length){ showMessage('Não há repetidas para limpar.'); return; }\n        if(!window.confirm('Queres limpar apenas as quantidades de cartas repetidas?'))return;\n        state.repeats = {};\n        saveState();\n        render();\n        showMessage('Repetidas limpas.');\n        return;\n      }\n      if(event.target.closest('[data-daima-export]')){ exportChecklist(); return; }",
    'repeat panel events')

js = replace_once(js,
    "      getState:function(){ return JSON.parse(JSON.stringify(state.owned)); },\n      getStats:stats",
    "      getState:function(){ return JSON.parse(JSON.stringify(state.owned)); },\n      getRepeats:function(){ return JSON.parse(JSON.stringify(state.repeats)); },\n      getRepeatedNumbers:function(){ return repeatedNumberText(); },\n      getStats:stats",
    'public repeats api')
write('daima.js', js)

css = read('daima.css')
css = replace_once(css,
    '/* Pokédex M7 v16.2.0 · Dragon Ball DAIMA checklist */',
    '/* Pokédex M7 v16.2.1 · Dragon Ball DAIMA checklist + repetidas */',
    'css header')
css_marker = '/* v16.2.1 repeats */'
if css_marker not in css:
    css += """

/* v16.2.1 repeats */
.m7-daima-repeat-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08)}
.m7-daima-repeat-row>span{display:grid;gap:1px;color:#d8d5de;font-size:10px}
.m7-daima-repeat-row>span small{color:#817f8a;font-size:8px}
.m7-daima-repeat-stepper{display:grid;grid-template-columns:34px 38px 34px;align-items:center;overflow:hidden;border:1px solid rgba(240,189,67,.3);border-radius:10px;background:rgba(240,189,67,.06)}
.m7-daima-repeat-stepper button{width:34px;height:32px;border:0;background:transparent;color:#f4d789;font-size:19px;font-weight:800;cursor:pointer}
.m7-daima-repeat-stepper button:hover:not(:disabled){background:rgba(240,189,67,.14)}
.m7-daima-repeat-stepper button:disabled{color:#55535e;cursor:default}
.m7-daima-repeat-stepper strong{display:grid;height:32px;place-items:center;border-right:1px solid rgba(240,189,67,.2);border-left:1px solid rgba(240,189,67,.2);color:#fff;font-size:12px}
.m7-daima-repeats-menu-btn b{display:inline-grid;min-width:18px;height:18px;margin-left:4px;place-items:center;border-radius:99px;background:rgba(240,189,67,.18);font-size:9px}
.m7-daima-repeats-panel{margin:14px 0 18px;padding:16px;border:1px solid rgba(240,189,67,.28);border-radius:16px;background:linear-gradient(145deg,rgba(240,189,67,.07),rgba(239,90,70,.045)),#171821}
.m7-daima-repeats-panel[hidden]{display:none!important}
.m7-daima-repeats-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
.m7-daima-repeats-head span{color:#f0bd43;font-size:9px;font-weight:800;letter-spacing:.14em}
.m7-daima-repeats-head h2{margin:3px 0 2px;color:#fff;font-size:22px}
.m7-daima-repeats-head p{margin:0;color:#97949f;font-size:11px}
.m7-daima-repeats-head>button{width:36px;height:36px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:rgba(255,255,255,.05);color:#d9d6df;font-size:22px;cursor:pointer}
.m7-daima-repeats-copybox{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px 10px;margin-top:14px}
.m7-daima-repeats-copybox label{grid-column:1/-1;color:#c8c5ce;font-size:10px;font-weight:700}
.m7-daima-repeats-copybox textarea{min-width:0;resize:vertical;min-height:68px;padding:10px 11px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:#11121a;color:#f5f2f7;font:600 13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}
.m7-daima-repeats-copybox>div{display:grid;align-content:start;gap:6px}
.m7-daima-repeats-copybox button{min-width:128px;height:32px;padding:0 10px;border:1px solid rgba(240,189,67,.34);border-radius:9px;background:rgba(240,189,67,.09);color:#f4d789;font:inherit;font-size:10px;font-weight:700;cursor:pointer}
.m7-daima-repeats-copybox button.danger{border-color:rgba(239,90,70,.36);background:rgba(239,90,70,.07);color:#ff9b8d}
.m7-daima-repeats-limited{margin-top:10px;color:#aaa7b1;font-size:10px}
.m7-daima-repeats-limited strong{color:#f4d789}
.m7-daima-repeats-list{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.m7-daima-repeat-chip{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:6px;max-width:260px;padding:6px 8px;border:1px solid rgba(255,255,255,.09);border-radius:9px;background:rgba(255,255,255,.035)}
.m7-daima-repeat-chip strong{color:#f4d789;font-size:10px}
.m7-daima-repeat-chip span{overflow:hidden;color:#9d9aa5;font-size:9px;text-overflow:ellipsis;white-space:nowrap}
.m7-daima-repeat-chip b{color:#8fe0ae;font-size:10px}
.m7-daima-repeats-empty{width:100%;padding:12px;border:1px dashed rgba(255,255,255,.12);border-radius:10px;color:#8e8c98;font-size:10px;text-align:center}
@media (max-width:700px){
  .m7-daima-repeat-row{gap:6px}
  .m7-daima-repeat-stepper{grid-template-columns:32px 34px 32px}
  .m7-daima-repeat-stepper button{width:32px}
  .m7-daima-repeats-copybox{grid-template-columns:1fr}
  .m7-daima-repeats-copybox label{grid-column:auto}
  .m7-daima-repeats-copybox>div{grid-template-columns:1fr 1fr}
  .m7-daima-repeats-copybox button{min-width:0}
  .m7-daima-repeat-chip{max-width:100%;flex:1 1 145px}
}
"""
write('daima.css', css)

html = read('index.html')
html = replace_once(html,
    '<title>Pokédex M7 — Master Set · v16.2.0 DAIMA + CARDMARKET NM + CARTEIRA</title>',
    '<title>Pokédex M7 — Master Set · v16.2.1 DAIMA REPETIDAS + CARDMARKET NM + CARTEIRA</title>',
    'index title')
html = replace_once(html, './daima.css?v=16.2.0', './daima.css?v=16.2.1', 'daima css query')
html = replace_once(html, './daima.js?v=16.2.0', './daima.js?v=16.2.1', 'daima js query')
write('index.html', html)

sw = read('sw.js')
sw = replace_once(sw,
    "const CACHE_NAME='pokedexm7-shell-v16.1.4-cardmarket-nm-loader';",
    "const CACHE_NAME='pokedexm7-shell-v16.2.1-daima-repeats';",
    'service worker cache')
if "'./daima.css?v=16.2.1'" not in sw:
    anchor = " './scanner.js?v=16.0.0',\n"
    if anchor not in sw:
        raise RuntimeError('Service worker CORE insertion marker missing')
    sw = sw.replace(anchor, anchor + " './daima.css?v=16.2.1',\n './daima.js?v=16.2.1',\n", 1)
write('sw.js', sw)

print('Applied Pokédex M7 v16.2.1 DAIMA repeats patch')
