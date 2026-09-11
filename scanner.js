/* M7 scanner 16.0 · camera → perspective crop → local OCR → confirmed print. */
(function () {
  'use strict';
  const C = window.M7ScanCore;
  if (!C || window.m7CardScanner) return;
  const LANGUAGES = { en: ['Inglês', 'eng'], pt: ['Português', 'por'], es: ['Espanhol', 'spa'], fr: ['Francês', 'fra'], de: ['Alemão', 'deu'], it: ['Italiano', 'ita'], ja: ['Japonês', 'jpn'] };
  const API = 'https://api.tcgdex.net/v2/';
  const catalogueCache = new Map(), signatureCache = new Map();
  const state = { epoch: 0, controller: null, stream: null, frame: 0, worker: null, mode: 'ready', source: null, cropped: null, corners: null, results: [], previewURL: '', previous: null, steadySince: 0, busy: false, torch: false };
  let dialog, ui, scriptPromise, databasePromise, savedOverflow = '', returnFocus = null;
  const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const abortError = () => new DOMException('Operação cancelada', 'AbortError');
  const alive = epoch => dialog?.open && epoch === state.epoch;
  function createCanvas(width, height) { const c = document.createElement('canvas'); c.width = width; c.height = height; return c; }
  function setStatus(title, detail = '', kind = '') { ui.status.dataset.kind = kind; ui.statusTitle.textContent = title; ui.statusDetail.textContent = detail; }
  function progress(value) { ui.progress.hidden = value === null; if (value !== null) ui.progress.value = value; }
  function terminateWorker() {
    const entry = state.worker; state.worker = null;
    if (entry) entry.promise.then(worker => worker.terminate()).catch(() => {});
  }
  function newOperation() {
    state.epoch++; state.controller?.abort(); state.controller = new AbortController();
    if (state.busy) terminateWorker();
    state.busy = false; progress(null); ui.primary.disabled = false; ui.manualSubmit.disabled = false;
    return state.epoch;
  }
  function stopCamera() {
    cancelAnimationFrame(state.frame); state.frame = 0;
    state.stream?.getTracks().forEach(track => track.stop()); state.stream = null;
    if (ui) { ui.video.pause(); ui.video.srcObject = null; ui.torch.hidden = true; }
    state.previous = null; state.steadySince = 0; state.torch = false;
  }
  function revokePreview() { if (state.previewURL) URL.revokeObjectURL(state.previewURL); state.previewURL = ''; }
  function setMode(mode) {
    state.mode = mode;
    ui.camera.hidden = mode !== 'camera'; ui.empty.hidden = mode !== 'ready' && !(mode === 'results' && !state.cropped);
    ui.crop.hidden = mode !== 'crop'; ui.preview.hidden = !state.cropped || !['reading', 'results'].includes(mode);
    ui.cropTools.hidden = mode !== 'crop'; ui.cameraTools.hidden = mode !== 'camera';
    ui.quality.hidden = mode !== 'camera'; ui.autoLabel.hidden = mode !== 'camera';
    ui.primary.hidden = mode === 'results';
    ui.editCrop.hidden = !state.source || !['reading', 'results'].includes(mode);
    ui.primary.textContent = ({ ready: 'Abrir câmara', camera: 'Capturar carta', crop: 'Ler esta carta', reading: 'A identificar…' })[mode] || 'Abrir câmara';
    const step = mode === 'ready' || mode === 'camera' ? 0 : mode === 'crop' || mode === 'reading' ? 1 : 2;
    ui.steps.forEach((el, i) => i === step ? el.setAttribute('aria-current', 'step') : el.removeAttribute('aria-current'));
  }
  function clearResults() { state.results = []; ui.results.replaceChildren(); ui.resultSection.hidden = true; ui.review.replaceChildren(); ui.review.hidden = true; }
  function resetPhoto() {
    revokePreview(); state.source = state.cropped = state.corners = null; ui.preview.removeAttribute('src');
    ui.sourceCanvas.width = ui.sourceCanvas.height = 1;
    ui.name.value = ''; ui.number.value = ''; clearResults();
  }
  function build() {
    dialog = document.createElement('dialog'); dialog.id = 'm7Scanner'; dialog.setAttribute('aria-labelledby', 'm7ScanTitle');
    dialog.innerHTML = `<div class="scan-layout">
      <header class="scan-head"><div class="scan-brand" aria-hidden="true">M7</div><div><h2 id="m7ScanTitle">Scanner de cartas</h2><p>Encontra a carta e confirma a edição.</p></div><button type="button" class="scan-close" data-ui="close" aria-label="Fechar scanner">×</button></header>
      <ol class="scan-steps"><li aria-current="step"><b>1</b> Capturar</li><li><b>2</b> Ajustar</li><li><b>3</b> Confirmar</li></ol>
      <div class="scan-content" data-ui="content">
        <section class="scan-workspace" aria-label="Captura da carta">
          <div class="scan-view" data-ui="view">
            <div class="scan-empty" data-ui="empty"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 16v-5a3 3 0 0 1 3-3h5m16 0h5a3 3 0 0 1 3 3v5m0 16v5a3 3 0 0 1-3 3h-5m-16 0h-5a3 3 0 0 1-3-3v-5M16 13h16v22H16z"/></svg><strong>Uma carta de cada vez</strong><p>Coloca-a numa superfície lisa, com boa luz e sem reflexos.</p></div>
            <div class="scan-camera" data-ui="camera" hidden><video data-ui="video" playsinline muted autoplay></video><div class="scan-guide"><span>Inclui os quatro cantos</span></div></div>
            <div class="scan-crop" data-ui="crop" hidden><canvas data-ui="sourceCanvas"></canvas><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path data-ui="shade" fill="#02060999" fill-rule="evenodd"></path><polygon data-ui="outline" fill="none" stroke="#ffce69" stroke-width=".5" vector-effect="non-scaling-stroke"></polygon></svg>${['superior esquerdo', 'superior direito', 'inferior direito', 'inferior esquerdo'].map((s, i) => `<button type="button" class="scan-handle" data-corner="${i}" aria-label="Ajustar canto ${s}. Usa as setas para mover."></button>`).join('')}</div>
            <img class="scan-preview" data-ui="preview" alt="A tua carta, recortada e endireitada" hidden>
          </div>
          <div class="scan-quality" data-ui="quality" aria-label="Qualidade da captura" hidden><span data-ui="light">Luz</span><span data-ui="sharpness">Nitidez</span><span data-ui="motion">Estabilidade</span></div>
          <div class="scan-tools" data-ui="cameraTools" hidden><button type="button" data-ui="switchCamera">Trocar câmara</button><button type="button" data-ui="torch" aria-pressed="false" hidden>Lanterna</button></div>
          <label class="scan-auto" data-ui="autoLabel" hidden><input type="checkbox" data-ui="auto">Capturar quando estiver estável</label>
          <div class="scan-tools" data-ui="cropTools" hidden><button type="button" data-ui="rotate">Rodar 90°</button><button type="button" data-ui="fullImage">Usar foto inteira</button></div>
          <div class="scan-buttons"><button type="button" class="scan-primary" data-ui="primary">Abrir câmara</button><button type="button" data-ui="photo">Escolher foto</button><button type="button" data-ui="newPhoto">Nova captura</button><button type="button" data-ui="editCrop" hidden>Ajustar recorte</button></div>
          <progress data-ui="progress" max="100" value="0" aria-label="Progresso da identificação" hidden></progress>
          <input data-ui="file" type="file" accept="image/*" hidden>
          <p class="scan-note">A fotografia é processada neste dispositivo. O catálogo precisa de internet na primeira utilização e para atualizar as cartas.</p>
        </section>
        <section class="scan-side" aria-label="Identificação da carta">
          <div class="scan-status" data-ui="status" role="status" aria-live="polite" aria-atomic="true"><strong data-ui="statusTitle">Pronto para capturar</strong><p data-ui="statusDetail">Abre a câmara ou escolhe uma fotografia.</p></div>
          <label class="scan-language">Idioma da carta<select data-ui="language">${Object.entries(LANGUAGES).map(([key, value]) => `<option value="${key}">${value[0]}</option>`).join('')}</select></label>
          <details class="scan-manual" data-ui="manual"><summary>Corrigir leitura ou pesquisar à mão</summary><form class="scan-fields" data-ui="manualForm"><label>Nome na carta<input type="text" data-ui="name" placeholder="Ex.: Umbreon VMAX" autocomplete="off" maxlength="100"></label><label>Número / total ou código promo<input type="text" data-ui="number" placeholder="Ex.: 215/203, TG23/TG30, SWSH020" autocomplete="off" maxlength="60"></label><p>O número costuma estar junto à margem inferior.</p><button type="submit" data-ui="manualSubmit">Procurar correspondências</button></form></details>
          <section data-ui="resultSection" hidden><div class="scan-result-head"><h3 tabindex="-1" data-ui="resultTitle">Correspondências</h3><span data-ui="resultCount"></span></div><div class="scan-results" data-ui="results"></div></section>
          <section class="scan-review" data-ui="review" hidden></section>
        </section>
      </div></div>`;
    document.body.appendChild(dialog);
    ui = Object.fromEntries([...dialog.querySelectorAll('[data-ui]')].map(el => [el.dataset.ui, el]));
    ui.steps = [...dialog.querySelectorAll('.scan-steps li')];
    try { const saved = localStorage.getItem('m7-scanner-language'); if (LANGUAGES[saved]) ui.language.value = saved; } catch (_) {}
    ui.close.onclick = close;
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close(); } });
    dialog.addEventListener('close', () => { if (!dialog.open) cleanup(); });
    ui.primary.onclick = () => { if (state.mode === 'ready') startCamera(); else if (state.mode === 'camera') capture(); else if (state.mode === 'crop') analyze(); };
    ui.photo.onclick = () => { if (state.stream) pauseCamera(); ui.file.click(); };
    ui.file.onchange = async () => { const file = ui.file.files?.[0]; ui.file.value = ''; if (file) await loadPhoto(file); };
    ui.newPhoto.onclick = () => startCamera();
    ui.editCrop.onclick = () => { newOperation(); stopCamera(); clearResults(); setMode('crop'); drawSource(); setStatus('Ajusta os quatro cantos', 'Inclui toda a carta e toca em Ler esta carta para repetir a leitura.'); };
    ui.switchCamera.onclick = () => startCamera(state.facing === 'user' ? 'environment' : 'user');
    ui.torch.onclick = toggleTorch;
    ui.auto.onchange = () => { state.steadySince = 0; };
    ui.rotate.onclick = () => { if (!state.source) return; const next = createCanvas(state.source.height, state.source.width), ctx = next.getContext('2d'); ctx.translate(next.width / 2, next.height / 2); ctx.rotate(Math.PI / 2); ctx.drawImage(state.source, -state.source.width / 2, -state.source.height / 2); state.source = next; state.corners = C.defaultQuad(next.width, next.height); drawSource(); };
    ui.fullImage.onclick = () => { state.corners = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]; drawCorners(); };
    ui.manualForm.onsubmit = event => { event.preventDefault(); searchManual(); };
    ui.language.onchange = () => {
      newOperation(); terminateWorker(); clearResults();
      try { localStorage.setItem('m7-scanner-language', ui.language.value); } catch (_) {}
      if (state.source) { setMode('crop'); drawSource(); setStatus('Idioma atualizado', 'Lê novamente a carta ou corrige os campos da pesquisa.'); }
      else if (!state.stream) { setMode('ready'); setStatus('Idioma atualizado', 'Abre a câmara ou pesquisa pelo nome e número.'); }
      else monitorCamera(state.epoch);
    };
    for (const handle of dialog.querySelectorAll('[data-corner]')) {
      let dragging = false;
      const move = event => {
        if (!dragging || !state.corners) return; const r = ui.crop.getBoundingClientRect();
        const q = state.corners.map(p => ({ ...p })); q[Number(handle.dataset.corner)] = { x: Math.max(0, Math.min(1, (event.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (event.clientY - r.top) / r.height)) };
        if (C.validQuad(q)) { state.corners = q; drawCorners(); }
      };
      handle.onpointerdown = event => { event.preventDefault(); dragging = true; handle.setPointerCapture(event.pointerId); };
      handle.onpointermove = move;
      handle.onpointerup = handle.onpointercancel = () => { dragging = false; };
      handle.onkeydown = event => {
        const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
        if (!delta || !state.corners) return; event.preventDefault(); const q = state.corners.map(p => ({ ...p })), p = q[Number(handle.dataset.corner)], step = event.shiftKey ? .025 : .005;
        p.x = Math.max(0, Math.min(1, p.x + delta[0] * step)); p.y = Math.max(0, Math.min(1, p.y + delta[1] * step));
        if (C.validQuad(q)) { state.corners = q; drawCorners(); }
      };
    }
    if (typeof ResizeObserver === 'function') new ResizeObserver(() => { if (state.mode === 'crop') sizeCrop(); }).observe(ui.view);
    document.addEventListener('visibilitychange', () => { if (document.hidden && state.stream) pauseCamera(); });
    window.addEventListener('pagehide', () => { if (dialog.open) close(); });
  }
  function open() {
    if (!dialog) build(); if (dialog.open) return;
    returnFocus = document.activeElement; savedOverflow = document.body.style.overflow;
    state.active = true;
    dialog.showModal(); document.body.style.overflow = 'hidden'; newOperation(); resetPhoto(); setMode('ready');
    setStatus('Pronto para capturar', 'Abre a câmara ou escolhe uma fotografia.'); ui.content.scrollTop = 0; ui.primary.focus(); startCamera();
  }
  function cleanup() {
    if (!state.active) return; state.active = false;
    newOperation(); stopCamera(); terminateWorker(); resetPhoto(); document.body.style.overflow = savedOverflow;
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true }); returnFocus = null;
  }
  function close() { if (dialog?.open) { dialog.close(); cleanup(); } }
  function pauseCamera() { stopCamera(); newOperation(); setMode('ready'); setStatus('Câmara em pausa', 'Toca em Abrir câmara para continuar.'); }
  async function startCamera(facing = 'environment') {
    const epoch = newOperation(); stopCamera(); resetPhoto(); setMode('ready'); state.facing = facing;
    if (!navigator.mediaDevices?.getUserMedia) { setStatus('Câmara não disponível', 'Podes escolher uma fotografia. Para usar a câmara, abre a M7 no Safari ou Chrome por HTTPS.', 'error'); return; }
    ui.primary.disabled = true; setStatus('A abrir a câmara…', 'Autoriza o acesso quando o telemóvel perguntar.');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } } });
      if (!alive(epoch)) { stream.getTracks().forEach(t => t.stop()); return; }
      state.stream = stream; ui.video.srcObject = stream; ui.video.muted = true; setMode('camera');
      await ui.video.play(); if (!alive(epoch)) return;
      const track = stream.getVideoTracks()[0], caps = track.getCapabilities?.() || {}, advanced = {};
      track.addEventListener('ended', () => { if (state.stream === stream) pauseCamera(); }, { once: true });
      for (const mode of ['focusMode', 'exposureMode', 'whiteBalanceMode']) if (caps[mode]?.includes?.('continuous')) advanced[mode] = 'continuous';
      if (Object.keys(advanced).length) await track.applyConstraints({ advanced: [advanced] }).catch(() => {});
      if (!alive(epoch)) return;
      ui.torch.hidden = !caps.torch; ui.torch.setAttribute('aria-pressed', 'false');
      setStatus('Enquadra a carta', 'Inclui os quatro cantos. Inclina ligeiramente o telemóvel se houver reflexos.');
      ui.primary.disabled = false; monitorCamera(epoch);
    } catch (error) {
      if (!alive(epoch)) return; stopCamera(); setMode('ready'); ui.primary.disabled = false;
      const detail = error.name === 'NotAllowedError' ? 'Autoriza a câmara nas definições do navegador ou usa Escolher foto.' : error.name === 'NotFoundError' ? 'Não foi encontrada uma câmara. Podes escolher uma fotografia.' : 'A câmara pode estar ocupada por outra aplicação. Tenta novamente ou escolhe uma fotografia.';
      setStatus('Não consegui abrir a câmara', detail, 'error');
    }
  }
  async function toggleTorch() {
    const track = state.stream?.getVideoTracks()[0]; if (!track) return;
    const enabled = !state.torch;
    try { await track.applyConstraints({ advanced: [{ torch: enabled }] }); state.torch = enabled; ui.torch.setAttribute('aria-pressed', String(enabled)); }
    catch (_) { setStatus('Lanterna indisponível', 'Experimenta uma luz ambiente mais forte.'); }
  }
  function cameraCanvas(width = 1008) {
    const v = ui.video, r = ui.camera.getBoundingClientRect();
    if (!v.videoWidth || !v.videoHeight || v.readyState < 2 || !r.width || !r.height) return null;
    const box = C.coverCrop(v.videoWidth, v.videoHeight, r.width, r.height);
    const c = createCanvas(width, Math.round(width * box.h / box.w)); c.getContext('2d').drawImage(v, box.x, box.y, box.w, box.h, 0, 0, c.width, c.height); return c;
  }
  function monitorCamera(epoch) {
    let last = 0;
    const loop = now => {
      if (!alive(epoch) || state.mode !== 'camera' || !state.stream) return;
      if (now - last > 220) {
        last = now; const c = cameraCanvas(144);
        if (c) {
          const q = C.quality(c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data, c.width, c.height, state.previous); state.previous = q.gray;
          const light = q.light > 48 && q.light < 228 && q.glare < .28, sharp = q.sharpness > 100, stable = q.motion < 5.5;
          ui.light.textContent = q.light <= 48 ? 'Mais luz' : q.light >= 228 || q.glare >= .28 ? 'Reduz os reflexos' : 'Luz suficiente'; ui.light.dataset.good = light;
          ui.sharpness.textContent = sharp ? 'Imagem nítida' : 'Ajusta o foco'; ui.sharpness.dataset.good = sharp;
          ui.motion.textContent = stable ? 'Imagem estável' : 'Mantém a mão quieta'; ui.motion.dataset.good = stable;
          if (light && sharp && stable && ui.auto.checked) { if (!state.steadySince) state.steadySince = now; if (now - state.steadySince > 1250) { capture(); return; } } else state.steadySince = 0;
        }
      }
      state.frame = requestAnimationFrame(loop);
    };
    state.frame = requestAnimationFrame(loop);
  }
  function capture() {
    const c = cameraCanvas(1512); if (!c) { setStatus('A câmara ainda está a focar', 'Aguarda um instante e toca novamente em Capturar carta.'); return; }
    newOperation(); stopCamera(); state.source = c; state.corners = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    setMode('crop'); drawSource(); setStatus('Confirma os quatro cantos', 'Arrasta os pontos para as margens da carta. Inclui o nome e o número; depois toca em Ler esta carta.');
  }
  async function imageSource(blob) {
    if (typeof createImageBitmap === 'function') {
      try { const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' }); return { image: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }; } catch (_) {}
    }
    const url = URL.createObjectURL(blob), image = new Image();
    try { await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Este formato de imagem não abriu. Usa uma fotografia JPEG, PNG ou WebP.')); image.src = url; }); return { image, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(url) }; }
    catch (error) { URL.revokeObjectURL(url); throw error; }
  }
  async function loadPhoto(file) {
    const epoch = newOperation(); stopCamera(); resetPhoto(); setMode('ready');
    if (file.size > 25 * 1024 * 1024) { setStatus('Fotografia demasiado grande', 'Escolhe uma imagem com menos de 25 MB ou tira uma nova fotografia.', 'error'); return; }
    setStatus('A abrir a fotografia…');
    try {
      const source = await imageSource(file);
      try {
        if (!alive(epoch)) return;
        if (Math.min(source.width, source.height) < 180) throw new Error('A imagem é demasiado pequena. Escolhe uma fotografia com maior resolução.');
        const scale = Math.min(1, 2400 / Math.max(source.width, source.height));
        const c = createCanvas(Math.round(source.width * scale), Math.round(source.height * scale)); c.getContext('2d').drawImage(source.image, 0, 0, c.width, c.height);
        state.source = c; state.corners = C.defaultQuad(c.width, c.height); setMode('crop'); drawSource();
        setStatus('Ajusta à tua carta', 'Arrasta os quatro pontos para os cantos da carta. Roda a imagem se o nome não estiver no topo.');
      } finally { source.close(); }
    } catch (error) { if (alive(epoch)) setStatus('Não consegui abrir a fotografia', error.message, 'error'); }
  }
  function sizeCrop() {
    if (!state.source) return;
    const width = ui.view.clientWidth - 38, height = ui.view.clientHeight - 38, scale = Math.min(width / state.source.width, height / state.source.height);
    ui.crop.style.width = state.source.width * scale + 'px'; ui.crop.style.height = state.source.height * scale + 'px';
  }
  function drawSource() {
    ui.sourceCanvas.width = state.source.width; ui.sourceCanvas.height = state.source.height; ui.sourceCanvas.getContext('2d').drawImage(state.source, 0, 0); sizeCrop(); drawCorners();
  }
  function drawCorners() {
    const points = state.corners.map(p => `${p.x * 100},${p.y * 100}`);
    ui.outline.setAttribute('points', points.join(' ')); ui.shade.setAttribute('d', `M0,0 H100 V100 H0Z M${points.join(' L')}Z`);
    dialog.querySelectorAll('[data-corner]').forEach((el, i) => { el.style.left = state.corners[i].x * 100 + '%'; el.style.top = state.corners[i].y * 100 + '%'; });
  }
  function cropCard() {
    const src = state.source, input = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, src.width, src.height);
    const output = createCanvas(1008, 1408), ctx = output.getContext('2d'); const data = ctx.createImageData(1008, 1408);
    data.data.set(C.warpRGBA(input.data, src.width, src.height, state.corners, 1008, 1408)); ctx.putImageData(data, 0, 0); return output;
  }
  function loadOCR() {
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js'; script.async = true;
      const timeout = setTimeout(() => { script.remove(); reject(new Error('O reconhecimento demorou demasiado a carregar. Verifica a ligação e tenta novamente.')); }, 25000);
      script.onload = () => { clearTimeout(timeout); window.Tesseract ? resolve(window.Tesseract) : reject(new Error('Não foi possível preparar o reconhecimento.')); };
      script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error('Não foi possível carregar o reconhecimento. Verifica a ligação à internet.')); };
      document.head.appendChild(script);
    }).catch(error => { scriptPromise = null; throw error; });
    return scriptPromise;
  }
  async function getWorker(lang, epoch) {
    if (state.worker?.lang === lang) return state.worker.promise;
    terminateWorker();
    const entry = { lang, promise: null };
    entry.promise = (async () => {
      const T = await loadOCR(); if (!alive(epoch) || state.worker !== entry) throw abortError();
      const worker = await T.createWorker(LANGUAGES[lang][1], 1, { workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js', corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0', logger: message => { if (alive(epoch) && state.busy && message.status !== 'recognizing text') progress(8 + Math.round((message.progress || 0) * 14)); } }, { load_system_dawg: '0', load_freq_dawg: '0' });
      await worker.setParameters({ tessedit_pageseg_mode: '11', preserve_interword_spaces: '1', user_defined_dpi: '300' }); return worker;
    })();
    state.worker = entry; entry.promise.catch(() => { if (state.worker === entry) state.worker = null; });
    return entry.promise;
  }
  async function setPreview(canvas, epoch) {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .94));
    if (!alive(epoch)) throw abortError(); if (!blob) throw new Error('Não foi possível preparar a fotografia.');
    revokePreview(); state.previewURL = URL.createObjectURL(blob); ui.preview.src = state.previewURL;
  }
  async function analyze() {
    if (!state.source || state.busy) return;
    const epoch = newOperation(), lang = ui.language.value; state.busy = true; ui.primary.disabled = true; ui.manualSubmit.disabled = true; clearResults();
    setStatus('A endireitar a carta…', 'A leitura usa o nome no topo e o número na margem inferior.'); progress(3);
    const watchdog = setTimeout(() => { if (alive(epoch) && state.busy) { newOperation(); setMode('crop'); drawSource(); setStatus('A leitura demorou demasiado', 'Tenta novamente ou pesquisa pelo nome e número nos campos abaixo.', 'error'); ui.manual.open = true; } }, 65000);
    try {
      await new Promise(resolve => requestAnimationFrame(resolve)); if (!alive(epoch)) return;
      state.cropped = cropCard(); await setPreview(state.cropped, epoch); setMode('reading');
      setStatus('A preparar a leitura…', 'Na primeira utilização, o motor de reconhecimento pode demorar alguns segundos.');
      const worker = await getWorker(lang, epoch); if (!alive(epoch)) return;
      const reading = await C.readCard(state.cropped, worker, { makeCanvas: createCanvas, checkpoint: () => { if (!alive(epoch)) throw abortError(); }, onStep: (step, value) => { progress(value); setStatus(step === 'name' ? 'A ler o nome…' : step === 'number' ? 'A ler o número e a edição…' : 'A confirmar os detalhes pequenos…', 'A fotografia permanece no teu dispositivo.'); } });
      const { identity, footer: text } = reading, title = reading.titles;
      ui.name.value = (title[0] || '').slice(0, 100);
      const n = identity.numbers[0]; ui.number.value = n ? (identity.promoSet ? text.match(/\b(?:MEP|SVP|SWSH|SM|XY|BW|DP|HGSS)\s*(?:EN|PT|FR|DE|ES|IT|JP)?\s*[- ]?\s*\d{2,4}\b/i)?.[0] || n.number : n.number + (n.total ? '/' + n.total : '')) : '';
      await findMatches(title, identity, lang, epoch);
    } catch (error) { if (alive(epoch) && error.name !== 'AbortError') { setMode('crop'); drawSource(); setStatus('Não consegui concluir a leitura', error.message || 'Tenta uma fotografia mais nítida ou usa os campos de pesquisa.', 'error'); ui.manual.open = true; } }
    finally { clearTimeout(watchdog); if (alive(epoch)) { state.busy = false; ui.primary.disabled = false; ui.manualSubmit.disabled = false; progress(null); } }
  }
  async function json(url, signal, timeoutMs = 18000) {
    const controller = new AbortController(), abort = () => controller.abort();
    if (signal?.aborted) throw abortError(); signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, timeoutMs);
    try { const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } }); if (!response.ok) throw new Error('O catálogo está temporariamente indisponível. Tenta novamente.'); return await response.json(); }
    catch (error) { if (signal?.aborted) throw abortError(); if (error.name === 'AbortError') throw new Error('O catálogo demorou demasiado a responder. Tenta novamente.'); throw error; }
    finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  }
  function database() {
    if (!databasePromise) databasePromise = new Promise(resolve => {
      let settled = false; const finish = db => { if (settled) { db?.close(); return; } settled = true; clearTimeout(timer); resolve(db); }, timer = setTimeout(() => finish(null), 2000);
      try { const request = indexedDB.open('m7-scanner-catalogue-v1', 1); request.onupgradeneeded = () => request.result.createObjectStore('catalogues', { keyPath: 'lang' }); request.onsuccess = () => finish(request.result); request.onerror = request.onblocked = () => finish(null); } catch (_) { finish(null); }
    }); return databasePromise;
  }
  async function storedCatalogue(lang) {
    const db = await database(); if (!db) return null;
    return new Promise(resolve => { const timer = setTimeout(() => resolve(null), 2000), finish = data => { clearTimeout(timer); resolve(data); }; try { const request = db.transaction('catalogues').objectStore('catalogues').get(lang); request.onsuccess = () => finish(request.result || null); request.onerror = () => finish(null); } catch (_) { finish(null); } });
  }
  async function getCatalogue(lang, signal) {
    let cached = catalogueCache.get(lang) || await storedCatalogue(lang);
    if (cached?.cards?.length && cached?.sets?.length && Date.now() - cached.saved < 24 * 3600000) { catalogueCache.set(lang, cached); return cached; }
    try {
      const [cards, sets] = await Promise.all([json(API + lang + '/cards', signal), json(API + lang + '/sets', signal)]);
      if (!Array.isArray(cards) || !cards.length || !Array.isArray(sets) || !sets.length) throw new Error('Não há catálogo disponível neste idioma. Experimenta outro idioma.');
      cached = { lang, cards: cards.filter(C.isPhysical), sets, saved: Date.now() }; catalogueCache.set(lang, cached);
      database().then(db => { try { db?.transaction('catalogues', 'readwrite').objectStore('catalogues').put(cached); } catch (_) {} }); return cached;
    } catch (error) { if (signal?.aborted) throw abortError(); if (cached?.cards?.length && cached?.sets?.length) { catalogueCache.set(lang, cached); return { ...cached, stale: true }; } throw error; }
  }
  function imageURLs(card, lang) {
    const urls = [];
    if (/^https:\/\//.test(card.image || '')) urls.push(card.image.replace(/\/$/, '') + '/low.webp');
    if (lang === 'en') {
      const set = C.setId(card).replace(/^sv0?(\d+)\.5$/, 'sv$1pt5').replace(/^sv0(\d+)$/, 'sv$1');
      if (/^[a-z0-9.-]+$/i.test(set) && /^[a-z0-9]+$/i.test(card.localId || card.number || '')) urls.push(`https://images.pokemontcg.io/${set}/${card.localId || card.number}.png`);
    }
    return urls;
  }
  function setCardImage(img, card, lang) {
    const urls = imageURLs(card, lang); let i = 0;
    img.alt = card.name || 'Carta do catálogo';
    img.onerror = () => { if (i < urls.length) img.src = urls[i++]; else { img.hidden = true; const note = document.createElement('span'); note.className = 'scan-note'; note.textContent = 'Sem imagem no catálogo'; img.after(note); } };
    if (urls.length) img.src = urls[i++]; else img.onerror();
  }
  async function signature(card, lang, signal) {
    const key = lang + ':' + card.id; if (signatureCache.has(key)) return signatureCache.get(key);
    for (const url of imageURLs(card, lang)) {
      if (signal.aborted) return null;
      const controller = new AbortController(), abort = () => controller.abort(); signal.addEventListener('abort', abort, { once: true }); const timer = setTimeout(abort, 4500);
      try {
        const response = await fetch(url, { signal: controller.signal, cache: 'force-cache' }); if (!response.ok) continue;
        const source = await imageSource(await response.blob());
        try { const c = createCanvas(96, 134); c.getContext('2d').drawImage(source.image, 0, 0, c.width, c.height); const d = C.descriptor(c.getContext('2d').getImageData(0, 0, c.width, c.height).data, c.width, c.height); signatureCache.set(key, d); if (signatureCache.size > 240) signatureCache.delete(signatureCache.keys().next().value); return d; } finally { source.close(); }
      } catch (_) {} finally { clearTimeout(timer); signal.removeEventListener('abort', abort); }
    }
    return null;
  }
  async function findMatches(title, identity, lang, epoch) {
    if (!alive(epoch)) return;
    if (C.norm(Array.isArray(title) ? title.join(' ') : title).length < 3 && !identity.numbers.length) { setMode(state.cropped ? 'results' : 'ready'); setStatus('Ainda não consegui ler a carta', 'Ajusta os cantos e tenta novamente, ou escreve o nome e o número abaixo.'); ui.manual.open = true; return; }
    setStatus('A procurar no catálogo…', 'A cruzar o nome, o número e a edição.'); progress(57);
    const catalog = await getCatalogue(lang, state.controller.signal); if (!alive(epoch)) return;
    let ranked = C.rankCatalogue(catalog.cards, catalog.sets, title, identity);
    if (!ranked.length) { setMode(state.cropped ? 'results' : 'ready'); setStatus('Não encontrei uma correspondência', 'Confirma o idioma e corrige o nome ou número. Cartas muito recentes podem ainda não estar no catálogo.'); ui.manual.open = true; return; }
    const pool = ranked.filter(r => r.score >= ranked[0].score - 65).slice(0, 40);
    let compared = 0;
    if (state.cropped) {
      setStatus('A comparar as imagens…', 'A imagem ajuda a ordenar as hipóteses. A confirmação da carta é tua.'); progress(70);
      const c = createCanvas(96, 134); c.getContext('2d').drawImage(state.cropped, 0, 0, c.width, c.height); const live = C.descriptor(c.getContext('2d').getImageData(0, 0, c.width, c.height).data, c.width, c.height);
      const visualController = new AbortController(), abort = () => visualController.abort(), parent = state.controller.signal;
      parent.addEventListener('abort', abort, { once: true }); const timer = setTimeout(abort, 12000); let i = 0;
      try {
        await Promise.all(Array.from({ length: Math.min(4, pool.length) }, async () => {
          while (i < pool.length && !visualController.signal.aborted) {
            const item = pool[i++], sig = await signature(item.card, lang, visualController.signal);
            if (!alive(epoch)) return;
            if (sig) { item.distance = C.visualDistance(live, sig); item.score += Math.max(-15, (.5 - item.distance) * 100); compared++; if (item.distance < .27) item.evidence.push('Imagem'); }
          }
        }));
      } finally { clearTimeout(timer); parent.removeEventListener('abort', abort); }
      if (!alive(epoch)) return;
      pool.sort((a, b) => b.score - a.score);
    }
    state.results = pool.slice(0, 12); setMode('results'); renderResults(lang);
    const exact = state.results[0].numberMatch && state.results[0].nameScore >= .8;
    setStatus(exact ? 'Encontrei correspondências' : 'Confirma a tua carta', (catalog.stale ? 'A usar o catálogo guardado. ' : '') + (state.cropped && !compared ? 'Não consegui comparar as imagens. ' : '') + 'Toca na imagem correta e confirma a edição e o número.');
    ui.manual.open = !exact; ui.resultTitle.focus({ preventScroll: true }); ui.resultTitle.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }
  function renderResults(lang) {
    ui.review.hidden = true; ui.resultSection.hidden = false; ui.results.replaceChildren(); ui.resultCount.textContent = `${state.results.length} hipótese${state.results.length === 1 ? '' : 's'}`;
    state.results.forEach((item, index) => {
      const card = item.card, button = document.createElement('button'); button.type = 'button'; button.className = 'scan-result';
      const img = document.createElement('img'); img.loading = index < 4 ? 'eager' : 'lazy'; setCardImage(img, card, lang);
      const copy = document.createElement('span'); copy.className = 'scan-result-copy'; copy.innerHTML = `<strong>${escape(card.name)}</strong><small>#${escape(card.localId || card.number)} · ${escape(item.set.name || C.setId(card))}</small><span class="scan-evidence">${escape(item.evidence.length ? item.evidence.join(' + ') : 'Confirmar visualmente')}</span>`;
      button.append(img, copy); button.onclick = () => review(item, lang); ui.results.appendChild(button);
    });
  }
  async function searchManual() {
    const title = ui.name.value.trim(), identity = C.parseIdentity(ui.number.value, true);
    if (title.length < 3 && !identity.numbers.length) { setStatus('Indica o nome ou o número', 'Por exemplo: Umbreon ou 215/203.', 'error'); ui.name.focus(); return; }
    const epoch = newOperation(); stopCamera(); clearResults(); state.busy = true; setMode(state.cropped ? 'reading' : 'ready'); ui.manualSubmit.disabled = true; ui.primary.disabled = true;
    try { await findMatches(title, identity, ui.language.value, epoch); }
    catch (error) { if (alive(epoch) && error.name !== 'AbortError') { setMode(state.cropped ? 'results' : 'ready'); setStatus('Não consegui pesquisar', error.message || 'Verifica a ligação e tenta novamente.', 'error'); } }
    finally { if (alive(epoch)) { state.busy = false; ui.manualSubmit.disabled = false; ui.primary.disabled = false; progress(null); } }
  }
  async function review(item, lang) {
    const epoch = newOperation(); ui.review.hidden = false; ui.resultSection.hidden = true;
    ui.review.innerHTML = '<h3>A abrir os detalhes…</h3><p>A confirmar o número, a edição e as variantes disponíveis.</p>';
    ui.review.scrollIntoView({ block: 'nearest' });
    try {
      const detail = await json(API + lang + '/cards/' + encodeURIComponent(item.card.id), state.controller.signal); if (!alive(epoch)) return;
      if (!detail?.id || detail.id !== item.card.id) throw new Error('Não foi possível confirmar esta impressão.');
      ui.review.innerHTML = `<h3>${escape(detail.name)}</h3><p>${escape(detail.set?.name || item.set.name)} · #${escape(detail.localId)}${detail.set?.cardCount?.official ? '/' + escape(detail.set.cardCount.official) : ''} · ${escape(LANGUAGES[lang][0])}</p><div class="scan-compare">${state.previewURL ? '<figure><img data-photo alt="A tua fotografia"><figcaption>A tua fotografia</figcaption></figure>' : ''}<figure><img data-card><figcaption>Carta do catálogo</figcaption></figure></div><p class="scan-note">Confirma a ilustração, o número e a edição. Holo, Reverse Holo e outros acabamentos são escolhidos no passo seguinte.</p><button type="button" class="scan-primary" data-confirm>Confirmar carta e ver variantes</button><button type="button" data-back>Ver outras correspondências</button>`;
      if (state.previewURL) ui.review.querySelector('[data-photo]').src = state.previewURL;
      setCardImage(ui.review.querySelector('[data-card]'), detail, lang);
      ui.review.querySelector('[data-back]').onclick = () => { newOperation(); renderResults(lang); ui.resultTitle.focus(); };
      ui.review.querySelector('[data-confirm]').onclick = () => confirmCard(detail, lang, epoch);
      setStatus('É esta a tua carta?', 'Confirmar abre as variantes. Só entra na coleção quando a marcares como tua.');
      ui.review.querySelector('[data-confirm]').focus({ preventScroll: true });
    } catch (error) {
      if (!alive(epoch) || error.name === 'AbortError') return;
      ui.review.hidden = true; ui.resultSection.hidden = false; setStatus('Não consegui abrir esta carta', error.message || 'Tenta novamente.', 'error');
    }
  }
  async function confirmCard(detail, lang, epoch) {
    if (!alive(epoch)) return;
    const button = ui.review.querySelector('[data-confirm]'); button.disabled = true;
    try {
      const ids = (detail.dexId || []).map(Number).filter(n => n >= 1 && n <= 1025);
      if (!ids.length) throw new Error('Esta carta não está associada a um Pokémon no catálogo. A coleção M7 organiza as cartas por Pokémon.');
      const pokemon = (window.__all || []).find(p => ids.includes(Number(p.id)));
      if (!pokemon) throw new Error('A Pokédex ainda está a carregar. Aguarda um instante e tenta novamente.');
      if (typeof window.openVariantModal !== 'function' || typeof window.v124DetailToCard !== 'function') throw new Error('Atualiza a página da M7 para abrir as variantes.');
      let card = window.v124DetailToCard(detail, lang);
      // Reuse the collection's existing identity, where the catalogue already knows this print.
      const cached = typeof CARD_BROWSER_CACHE !== 'undefined' ? CARD_BROWSER_CACHE.get(Number(pokemon.id)) || [] : [];
      const saved = typeof pokemonCardDetail === 'function' ? Object.values(pokemonCardDetail(Number(pokemon.id))?.owned || {}) : [];
      const matches = [...cached, ...saved].filter(c => C.samePrint(detail, c, lang));
      const existingIds = [...new Set(matches.map(c => c.id))];
      if (existingIds.length === 1) card.id = existingIds[0];
      // Keep this dialog available if opening the existing variant flow fails.
      await window.openVariantModal(card, pokemon); if (alive(epoch)) close();
    } catch (error) { if (dialog.open && alive(epoch)) { setStatus('Não consegui abrir as variantes', error.message || 'Tenta novamente.', 'error'); button.disabled = false; } }
  }
  function init() {
    const trigger = document.getElementById('mobileScanBtn');
    if (trigger) { trigger.addEventListener('click', open); trigger.setAttribute('aria-haspopup', 'dialog'); trigger.setAttribute('aria-controls', 'm7Scanner'); trigger.setAttribute('aria-label', 'Abrir scanner de cartas Pokémon'); }
    window.openScanner = open; window.closeScanner = close;
    window.m7CardScanner = { open, close, version: '16.0.0' };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
