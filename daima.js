/* Pokédex M7 v16.2.0 · Dragon Ball DAIMA checklist */
(function(){
  'use strict';

  var VERSION = '16.2.0';
  var STORE_KEY = 'pokedexm7-daima-v1';
  var MAIN_TOTAL = 207;
  var mainNames = [
    'Son Goku','Super Saiyan Goku','Super Saiyan 2 Goku','Super Saiyan 3 Goku','Super Saiyan 4 Goku',
    'Son Goku (Mini)','Super Saiyan Goku (Mini)','Super Saiyan 2 Goku (Mini)','Super Saiyan 3 Goku (Mini)','Super Saiyan 4 Goku (Mini)',
    'Vegeta','Super Saiyan Vegeta','Super Saiyan 3 Vegeta','Vegeta (Mini)','Super Saiyan Vegeta (Mini)','Super Saiyan 2 Vegeta (Mini)','Super Saiyan 3 Vegeta (Mini)',
    'Shenron','Porunga','Piccolo','Piccolo (Mini)','Supreme Kai','Supreme Kai (Mini)','Kibito','Kibito (Mini)',
    'Bulma','Bulma (Mini)','Krillin','Krillin (Mini)','Android 18','Android 18 (Mini)','Maaron','Mr. Satan','Mr. Satan (Mini)',
    'Yamcha & Puar','Yamcha (Mini) & Puar (Mini)','Majin Buu','Majin Buu (Mini)','Gyumao','Gyumao (Mini)','Chichi','Chichi (Mini)',
    'Son Goten','Trunks','Son Goten (Mini) / Trunks (Mini) / Maaron (Mini)','Oolong','Oolong (Mini)','Kamesennin','Kamesennin (Mini)',
    'Dende','Dende (Mini)','Mr. Popo','Mr. Popo (Mini)','Karin','Glorio','Glorio','Panzy','Masked Majin','Hybis','Neva',
    'Tamagami Number One','Tamagami Number Two','Tamagami Number Three','Kadan','Kadan Army','Minotaur','Megath Child',
    'Supreme Demon King Abura','Third Eye Abura','Dabura','Gomah','Third Eye Gomah','Degesu','Gendarmerie Officer','Gendarmerie Force',
    'Dr. Arinsu','Marba','Majin Kuu','King Kuu','Majin Duu','Powered-up Majin Duu','Mecha 1','Mecha 2','Mecha 3','Mecha 4','Mecha 5','Mecha 6','Mecha 7','Mecha 8','Mecha 9',
    'Son Goku (Mini)','Vegeta (Mini)','Piccolo (Mini)','Supreme Kai (Mini)','Glorio','Panzy','Bulma (Mini)','Third Eye Gomah','Degesu','Dragon Balls and Shenron'
  ];
  var limitedNames = [
    'Super Saiyan 4 Goku (Mini)',
    'Son Goku (Mini) and Vegeta (Mini)',
    'Super Saiyan Goku (Mini) / Super Saiyan Vegeta (Mini)',
    'Super Saiyan 4 Goku / Super Saiyan Vegeta',
    'Marba / Dr. Arinsu / King Kuu / Powered-up Majin Duu',
    'Son Goku (Mini) / Supreme Kai (Mini) / Panzy (Mini) / Glorio (Mini)',
    'Piccolo (Mini) / Bulma (Mini) / Vegeta (Mini)',
    'Degesu and Gomah',
    'Tamagami Number One / Tamagami Number Two / Tamagami Number Three'
  ];
  var cards = [];
  var limited = [];
  var allItems = [];
  var allowedKeys = new Set();

  function pad(n, size){
    var s = String(n);
    while(s.length < size)s = '0' + s;
    return s;
  }
  function normalise(value){
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  }
  function escapeHtml(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }
  function itemStatus(item){
    var ownedCount = item.variants.reduce(function(total, variant){ return total + (state.owned[variant.key] ? 1 : 0); },0);
    return {owned:ownedCount, total:item.variants.length, complete:ownedCount === item.variants.length, partial:ownedCount > 0 && ownedCount < item.variants.length};
  }

  for(var n=1;n<=MAIN_TOTAL;n++){
    var category = 'special';
    var categoryLabel = 'Episode / Highlight';
    var name = '';
    var variants = [];
    if(n <= 100){
      category = 'base';
      categoryLabel = 'Carta base';
      name = mainNames[n-1] || 'Carta base';
      variants = [
        {key:'d' + pad(n,3) + '-normal',label:'Normal',short:'Normal',kind:'normal'},
        {key:'d' + pad(n,3) + '-crystal-shard',label:'Crystal Shard',short:'Crystal Shard',kind:'crystal'},
        {key:'d' + pad(n,3) + '-rainbow-spoke',label:'Rainbow Spoke',short:'Rainbow Spoke',kind:'rainbow'}
      ];
    }else if(n <= 135){
      category = 'puzzle';
      categoryLabel = 'Puzzle';
      name = 'Puzzle ' + pad(n-100,2);
      variants = [{key:'d' + pad(n,3) + '-normal',label:'Carta normal',short:'Normal',kind:'normal'}];
    }else if(n <= 198){
      var episodeSlot = n - 136;
      var episode = Math.floor(episodeSlot / 3) + 1;
      var position = (episodeSlot % 3) + 1;
      var isEpisode = position === 1;
      categoryLabel = isEpisode ? 'Episode Card' : 'Highlight Card';
      name = 'Episode ' + episode + (isEpisode ? '' : ' · Highlight ' + (position - 1));
      variants = [{key:'d' + pad(n,3) + '-normal',label:categoryLabel,short:categoryLabel,kind:isEpisode ? 'episode' : 'highlight'}];
    }else{
      category = 'lenticular';
      categoryLabel = 'Lenticular';
      name = 'Lenticular ' + pad(n,3);
      variants = [{key:'d' + pad(n,3) + '-normal',label:'Lenticular',short:'Lenticular',kind:'lenticular'}];
    }
    var item = {id:'d' + pad(n,3),number:n,numberLabel:'#' + pad(n,3),name:name,category:category,categoryLabel:categoryLabel,variants:variants};
    cards.push(item);
    allItems.push(item);
  }
  limitedNames.forEach(function(name,index){
    var number = index + 1;
    var item = {
      id:'le' + number,
      number:null,
      numberLabel:'LE' + number,
      name:name,
      category:'limited',
      categoryLabel:'Limited Edition',
      variants:[{key:'le' + number,label:'Limited Edition',short:'LE',kind:'limited'}]
    };
    limited.push(item);
    allItems.push(item);
  });
  allItems.forEach(function(item){ item.variants.forEach(function(variant){ allowedKeys.add(variant.key); }); });

  var state = {owned:{}};
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

  var nav = null;
  var navButton = null;
  var view = null;
  var listElement = null;
  var messageElement = null;
  var booted = false;

  function text(id,value){
    var element = document.getElementById(id);
    if(element)element.textContent = value;
  }
  function showMessage(value,isError){
    if(!messageElement)return;
    messageElement.textContent = value || '';
    messageElement.classList.toggle('is-error',!!isError);
    clearTimeout(showMessage.timer);
    if(value)showMessage.timer = setTimeout(function(){ if(messageElement)messageElement.textContent = ''; },3200);
  }
  function stats(){
    var mainVariants = cards.reduce(function(total,item){ return total + item.variants.length; },0);
    var ownedMain = cards.reduce(function(total,item){ return total + item.variants.reduce(function(sum,variant){ return sum + (state.owned[variant.key] ? 1 : 0); },0); },0);
    var ownedNumbers = cards.reduce(function(total,item){ return total + (item.variants.some(function(variant){ return state.owned[variant.key]; }) ? 1 : 0); },0);
    var ownedLimited = limited.reduce(function(total,item){ return total + (state.owned[item.variants[0].key] ? 1 : 0); },0);
    return {
      mainVariants:mainVariants,
      ownedMain:ownedMain,
      ownedNumbers:ownedNumbers,
      ownedLimited:ownedLimited,
      total:mainVariants + limited.length,
      owned:ownedMain + ownedLimited,
      numberTotal:cards.length,
      limitedTotal:limited.length
    };
  }
  function renderStats(){
    var s = stats();
    var overallPercent = s.total ? (s.owned / s.total) * 100 : 0;
    var mainPercent = s.mainVariants ? (s.ownedMain / s.mainVariants) * 100 : 0;
    text('daimaNumbersCount',s.ownedNumbers + ' / ' + s.numberTotal);
    text('daimaVariantsCount',s.ownedMain + ' / ' + s.mainVariants);
    text('daimaLimitedCount',s.ownedLimited + ' / ' + s.limitedTotal);
    text('daimaOverallCount',s.owned + ' / ' + s.total);
    text('daimaOverallPercent',overallPercent.toFixed(1) + '%');
    text('daimaNumbersMeta',s.ownedNumbers + ' números com pelo menos uma marcação');
    text('daimaVariantsMeta',s.ownedMain + ' variantes assinaladas');
    text('daimaLimitedMeta',s.ownedLimited + ' cartões extra assinalados');
    text('daimaMainPercent',mainPercent.toFixed(1) + '% das marcações principais');
    var bar = document.getElementById('daimaOverallBar');
    if(bar)bar.style.width = overallPercent.toFixed(2) + '%';
  }
  function cardMatches(item,query,category,statusFilter){
    var status = itemStatus(item);
    if(category !== 'all' && item.category !== category)return false;
    if(statusFilter === 'missing' && status.owned > 0)return false;
    if(statusFilter === 'owned' && status.owned === 0)return false;
    if(statusFilter === 'partial' && !status.partial)return false;
    if(statusFilter === 'complete' && !status.complete)return false;
    if(!query)return true;
    return normalise(item.numberLabel + ' ' + item.name + ' ' + item.categoryLabel).indexOf(query) >= 0;
  }
  function visualClass(item){
    if(item.category === 'base')return 'base';
    if(item.category === 'puzzle')return 'puzzle';
    if(item.category === 'limited')return 'limited';
    if(item.category === 'lenticular')return 'lenticular';
    return item.variants[0].kind;
  }
  function renderItem(item){
    var status = itemStatus(item);
    var stateLabel = status.owned === 0 ? 'Em falta' : (status.complete ? 'Completa' : status.owned + ' de ' + status.total);
    var variantsMarkup = item.variants.map(function(variant){
      var isOwned = !!state.owned[variant.key];
      return '<button type="button" class="m7-daima-variant daima-foil-' + escapeHtml(variant.kind) + (isOwned ? ' is-owned' : '') + '" data-daima-key="' + escapeHtml(variant.key) + '" aria-pressed="' + String(isOwned) + '" title="' + escapeHtml(variant.label) + '">' +
        '<span class="m7-daima-checkbox" aria-hidden="true">' + (isOwned ? '✓' : '') + '</span>' +
        '<span class="m7-daima-variant-copy"><strong>' + escapeHtml(variant.short) + '</strong><small>' + (isOwned ? 'Marcada' : 'Marcar') + '</small></span>' +
      '</button>';
    }).join('');
    return '<article class="m7-daima-card ' + (status.owned ? (status.complete ? 'is-complete' : 'is-partial') : 'is-missing') + '" data-daima-item="' + escapeHtml(item.id) + '">' +
      '<div class="m7-daima-card-art daima-art-' + visualClass(item) + '">' +
        '<span class="m7-daima-art-brand">DRAGON BALL</span>' +
        '<strong class="m7-daima-art-number">' + escapeHtml(item.numberLabel) + '</strong>' +
        '<span class="m7-daima-art-star" aria-hidden="true">★</span>' +
        '<span class="m7-daima-art-title">' + escapeHtml(item.name) + '</span>' +
        '<span class="m7-daima-art-sub">' + escapeHtml(item.categoryLabel) + '</span>' +
      '</div>' +
      '<div class="m7-daima-card-body">' +
        '<div class="m7-daima-card-heading"><div><span class="m7-daima-kicker">' + escapeHtml(item.categoryLabel) + '</span><h3>' + escapeHtml(item.numberLabel) + ' · ' + escapeHtml(item.name) + '</h3></div><span class="m7-daima-state">' + escapeHtml(stateLabel) + '</span></div>' +
        '<div class="m7-daima-variants" aria-label="Variantes de ' + escapeHtml(item.numberLabel) + '">' + variantsMarkup + '</div>' +
      '</div>' +
    '</article>';
  }
  function render(){
    if(!listElement)return;
    var query = normalise(document.getElementById('daimaSearch') ? document.getElementById('daimaSearch').value : '');
    var category = document.getElementById('daimaCategory') ? document.getElementById('daimaCategory').value : 'all';
    var statusFilter = document.getElementById('daimaStatus') ? document.getElementById('daimaStatus').value : 'all';
    var visible = allItems.filter(function(item){ return cardMatches(item,query,category,statusFilter); });
    listElement.innerHTML = visible.length ? visible.map(renderItem).join('') : '<div class="m7-daima-empty"><strong>Nenhuma carta encontrada</strong><span>Altera a pesquisa ou limpa os filtros.</span></div>';
    renderStats();
    text('daimaVisibleCount',visible.length + ' de ' + allItems.length + ' cartões visíveis');
  }

  function closeLegacyOverlays(){
    document.body.classList.remove('modal-open','stock-open','m7-v155-shop-open','m7-stock-detached');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';
  }
  function activateDaima(){
    if(!view)return;
    closeLegacyOverlays();
    document.querySelectorAll('.m7-v15-view').forEach(function(element){ element.classList.remove('active'); });
    nav && nav.querySelectorAll('[data-app-nav]').forEach(function(button){ button.classList.remove('active'); button.removeAttribute('aria-current'); });
    view.hidden = false;
    view.classList.add('active');
    document.body.classList.add('m7-daima-open');
    document.body.dataset.m7View = 'daima';
    if(navButton){ navButton.classList.add('active'); navButton.setAttribute('aria-current','page'); }
    try{ localStorage.setItem('pokedexm7-v15-view','daima'); }catch(_){}
    render();
    window.scrollTo({top:0,behavior:'auto'});
  }
  function deactivateDaima(){
    if(!view)return;
    view.hidden = true;
    view.classList.remove('active');
    document.body.classList.remove('m7-daima-open');
    if(navButton){ navButton.classList.remove('active'); navButton.removeAttribute('aria-current'); }
    if(document.body.dataset.m7View === 'daima')document.body.dataset.m7View = 'home';
  }

  function installNavigation(){
    nav = document.getElementById('m7AppNav');
    if(!nav)return false;
    document.body.classList.add('m7-daima-installed');
    navButton = nav.querySelector('[data-m7-daima-nav]');
    if(!navButton){
      navButton = document.createElement('button');
      navButton.type = 'button';
      navButton.className = 'm7-nav-btn m7-daima-nav';
      navButton.setAttribute('aria-label','Dragon Ball DAIMA');
      navButton.setAttribute('data-m7-daima-nav','true');
      navButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="M12 6.1l1.55 3.85 4.1.3-3.15 2.55 1 4-3.5-2.2-3.5 2.2 1-4-3.15-2.55 4.1-.3z"></path></svg><span>Daima</span>';
      var expansionButton = nav.querySelector('[data-app-nav="expansions"]');
      if(expansionButton)nav.insertBefore(navButton,expansionButton);
      else nav.appendChild(navButton);
    }
    return true;
  }
  function installView(){
    if(document.getElementById('m7DaimaView')){
      view = document.getElementById('m7DaimaView');
      listElement = document.getElementById('daimaList');
      messageElement = document.getElementById('daimaMessage');
      return true;
    }
    var wrap = document.querySelector('.wrap');
    if(!wrap)return false;
    view = document.createElement('section');
    view.id = 'm7DaimaView';
    view.className = 'm7-daima-view';
    view.hidden = true;
    view.setAttribute('aria-labelledby','daimaTitle');
    view.innerHTML = [
      '<div class="m7-daima-shell">',
        '<header class="m7-daima-header">',
          '<div class="m7-daima-heading-row"><div><span class="m7-daima-eyebrow">M7 EXTRA COLLECTION</span><h1 id="daimaTitle">Dragon Ball <em>DAIMA</em></h1><p>Checklist independente para a coleção Panini europeia. Marca cada carta e cada acabamento separadamente.</p></div><div class="m7-daima-mark"><span>★</span><strong>DAIMA</strong><small>COLLECTION</small></div></div>',
          '<div class="m7-daima-stat-grid">',
            '<div class="m7-daima-stat"><span>Números</span><strong id="daimaNumbersCount">0 / 207</strong><small id="daimaNumbersMeta">0 números com pelo menos uma marcação</small></div>',
            '<div class="m7-daima-stat"><span>Variantes</span><strong id="daimaVariantsCount">0 / 407</strong><small id="daimaVariantsMeta">0 variantes assinaladas</small></div>',
            '<div class="m7-daima-stat"><span>Limited Edition</span><strong id="daimaLimitedCount">0 / 9</strong><small id="daimaLimitedMeta">0 cartões extra assinalados</small></div>',
            '<div class="m7-daima-stat m7-daima-stat-total"><span>Progresso total</span><strong id="daimaOverallPercent">0.0%</strong><small><b id="daimaOverallCount">0 / 416</b> marcações</small></div>',
          '</div>',
          '<div class="m7-daima-progress"><div class="m7-daima-progress-copy"><span>Checklist completa</span><b id="daimaMainPercent">0.0% das marcações principais</b></div><div class="m7-daima-progress-track"><i id="daimaOverallBar"></i></div></div>',
        '</header>',
        '<div class="m7-daima-toolbar">',
          '<label class="m7-daima-search"><span aria-hidden="true">⌕</span><input id="daimaSearch" type="search" autocomplete="off" placeholder="Pesquisar por número, personagem ou categoria"></label>',
          '<select id="daimaCategory" aria-label="Filtrar por categoria"><option value="all">Todas as categorias</option><option value="base">Base · 001–100</option><option value="puzzle">Puzzle · 101–135</option><option value="special">Episode / Highlight · 136–198</option><option value="lenticular">Lenticular · 199–207</option><option value="limited">Limited Edition · LE1–LE9</option></select>',
          '<select id="daimaStatus" aria-label="Filtrar por estado"><option value="all">Todos os estados</option><option value="missing">Em falta</option><option value="owned">Com marcação</option><option value="partial">Parcial</option><option value="complete">Completas</option></select>',
          '<div class="m7-daima-bulk"><button type="button" data-daima-bulk="base">Marcar base normal</button><button type="button" data-daima-bulk="all">Marcar tudo</button><button type="button" class="danger" data-daima-bulk="clear">Limpar</button></div>',
        '</div>',
        '<div class="m7-daima-toolbar-foot"><span id="daimaVisibleCount">216 de 216 cartões visíveis</span><span>Base 001–100: Normal · Crystal Shard · Rainbow Spoke</span><span id="daimaMessage" role="status"></span><button type="button" data-daima-export>Exportar checklist</button><button type="button" data-daima-import>Importar checklist</button><input id="daimaImportFile" type="file" accept="application/json,.json" hidden></div>',
        '<div class="m7-daima-info"><strong>Como contar:</strong><span>os 207 números são a coleção principal; as 9 Limited Edition ficam fora da numeração. As variantes ocupam marcações próprias.</span></div>',
        '<div id="daimaList" class="m7-daima-grid"></div>',
      '</div>'
    ].join('');
    var footer = wrap.querySelector(':scope > .footer');
    if(footer)footer.before(view); else wrap.appendChild(view);
    listElement = document.getElementById('daimaList');
    messageElement = document.getElementById('daimaMessage');
    return true;
  }

  function exportChecklist(){
    var payload = JSON.stringify({app:'Pokédex M7',collection:'Dragon Ball DAIMA',version:VERSION,exportedAt:new Date().toISOString(),owned:state.owned},null,2);
    var blob = new Blob([payload],{type:'application/json'});
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'pokedex-m7-dragon-ball-daima-checklist.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); },1000);
    showMessage('Checklist exportada.');
  }
  function importChecklist(file){
    if(!file)return;
    var reader = new FileReader();
    reader.onload = function(){
      try{
        var raw = JSON.parse(String(reader.result || '{}'));
        var source = Array.isArray(raw) ? raw.reduce(function(map,key){ map[key] = true; return map; },{}) : (raw.owned || raw);
        var cleaned = {};
        if(source && typeof source === 'object')Object.keys(source).forEach(function(key){ if(allowedKeys.has(key) && source[key] === true)cleaned[key] = true; });
        state.owned = cleaned;
        saveState();
        render();
        showMessage('Checklist importada.');
      }catch(_){ showMessage('Ficheiro inválido.',true); }
    };
    reader.readAsText(file);
  }

  function installEvents(){
    document.addEventListener('click',function(event){
      var daimaNav = event.target.closest && event.target.closest('[data-m7-daima-nav]');
      if(daimaNav){
        event.preventDefault();
        event.stopImmediatePropagation();
        activateDaima();
        return;
      }
      var normalNav = event.target.closest && event.target.closest('#m7AppNav [data-app-nav]');
      if(normalNav && view && view.classList.contains('active'))deactivateDaima();
    },true);

    view.addEventListener('click',function(event){
      var variantButton = event.target.closest && event.target.closest('[data-daima-key]');
      if(variantButton){
        var key = variantButton.getAttribute('data-daima-key');
        if(!allowedKeys.has(key))return;
        state.owned[key] = !state.owned[key];
        saveState();
        render();
        return;
      }
      var bulkButton = event.target.closest && event.target.closest('[data-daima-bulk]');
      if(bulkButton){
        var action = bulkButton.getAttribute('data-daima-bulk');
        if(action === 'clear'){
          if(!window.confirm('Queres limpar todas as marcações Dragon Ball DAIMA?'))return;
          state.owned = {};
        }else if(action === 'base'){
          cards.slice(0,100).forEach(function(item){ var normal = item.variants[0]; state.owned[normal.key] = true; });
        }else if(action === 'all'){
          allItems.forEach(function(item){ item.variants.forEach(function(variant){ state.owned[variant.key] = true; }); });
        }
        saveState();
        render();
        return;
      }
      if(event.target.closest('[data-daima-export]')){ exportChecklist(); return; }
      if(event.target.closest('[data-daima-import]')){ document.getElementById('daimaImportFile') && document.getElementById('daimaImportFile').click(); return; }
    });
    ['daimaSearch','daimaCategory','daimaStatus'].forEach(function(id){
      document.getElementById(id).addEventListener(id === 'daimaSearch' ? 'input' : 'change',render);
    });
    document.getElementById('daimaImportFile').addEventListener('change',function(event){
      importChecklist(event.target.files && event.target.files[0]);
      event.target.value = '';
    });
    window.addEventListener('storage',function(event){
      if(event.key !== STORE_KEY)return;
      loadState();
      render();
    });
    var observer = new MutationObserver(function(){
      var current = document.body.dataset.m7View || '';
      if(current && current !== 'daima' && view && view.classList.contains('active'))deactivateDaima();
    });
    observer.observe(document.body,{attributes:true,attributeFilter:['data-m7-view']});
  }

  function boot(){
    if(booted)return;
    if(!installNavigation() || !installView()){
      setTimeout(boot,80);
      return;
    }
    booted = true;
    loadState();
    installEvents();
    render();
    try{
      if(localStorage.getItem('pokedexm7-v15-view') === 'daima')setTimeout(activateDaima,180);
    }catch(_){}
    window.m7Daima = {
      version:VERSION,
      show:activateDaima,
      hide:deactivateDaima,
      export:exportChecklist,
      getState:function(){ return JSON.parse(JSON.stringify(state.owned)); },
      getStats:stats
    };
  }

  if(document.readyState === 'loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();