/* M7 scanner · image geometry and catalogue matching. No collection writes. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.M7ScanCore = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}♀♂]+/gu, ' ').trim();
  const compact = value => norm(value).replace(/\s/g, '');
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  function numberKey(value) {
    const text = String(value || '').toUpperCase().replace(/[\s.#-]/g, '');
    const m = text.match(/^([A-Z]*)(\d+)$/);
    return m ? m[1] + String(Number(m[2])) : text;
  }
  function digits(value) {
    return String(value).toUpperCase().replace(/[OQ]/g, '0').replace(/[IL]/g, '1').replace(/S/g, '5').replace(/B/g, '8').replace(/Z/g, '2');
  }
  function readNumber(value) {
    const m = String(value).replace(/\s/g, '').match(/^(TG|GG|SV|SH|RC)?([0-9OQILSBZ]{1,4})$/i);
    return m ? numberKey((m[1] || '') + digits(m[2])) : '';
  }
  function parseIdentity(value, manual = false) {
    const text = String(value || '').toUpperCase().replace(/[⁄∕]/g, '/')
      .replace(/\b(?:[TR7]6|[R7]G|1IG)(?=\s*\d{1,3}\b)/g, 'TG');
    const numbers = [];
    const seen = new Set();
    for (const m of text.matchAll(/\b((?:TG|GG|SV|SH|RC)?\s*[0-9OQILSBZ]{1,4})\s*[/|\\]\s*((?:TG|GG|SV|SH|RC)?\s*[0-9OQILSBZ]{1,4})\b/g)) {
      let number = readNumber(m[1]); const total = readNumber(m[2]);
      const gallery = total.match(/^(TG|GG|SV|SH|RC)/)?.[1];
      if (gallery && /^\d+$/.test(number)) number = gallery + number;
      if (!number || !total || !/[0-9]/.test(m[0]) || Number(total) === 0) continue;
      const key = number + '/' + total;
      if (!seen.has(key)) { seen.add(key); numbers.push({ number, total }); }
    }
    const promoMatch = text.match(/\b(MEP|SVP|SWSH|SM|XY|BW|DP|HGSS)\s*(?:EN|PT|FR|DE|ES|IT|JP)?\s*[- ]?\s*([0-9OQILSBZ]{2,4})\b/);
    let promoSet = '';
    if (promoMatch) {
      const prefix = promoMatch[1], n = String(Number(digits(promoMatch[2])));
      promoSet = ({ MEP: 'mep', SVP: 'svp', SWSH: 'swshp', SM: 'smp', XY: 'xyp', BW: 'bwp', DP: 'dpp', HGSS: 'hgssp' })[prefix];
      const number = /^(MEP|SVP)$/.test(prefix) ? n : prefix + n;
      numbers.unshift({ number, total: '' });
    }
    if (manual && !numbers.length) {
      const simple = text.trim().match(/^(?:#\s*)?([A-Z]{0,5}\s*\d{1,4})$/);
      if (simple) numbers.push({ number: numberKey(simple[1]), total: '' });
    }
    const codes = [...new Set((text.match(/\b[A-Z][A-Z0-9]{2,5}\b/g) || []).filter(s => !/^(?:POKEMON|NINTENDO|ENERGY|BASIC|STAGE|TRAINER|HP|MEP|SVP|SWSH)$/.test(s)))];
    return { numbers, promoSet, codes };
  }
  function editDistance(a, b) {
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let prev = row[0]; row[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const old = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] !== b[j - 1])); prev = old;
      }
    }
    return row[b.length];
  }
  function cleanTitle(text) {
    return String(text || '').split('\n').filter(line => !/evolves? from|evolui de|evolution de|entwickelt aus/i.test(line))
      .join(' ').replace(/\b(?:BASIC|BÁSICO|BASICO|STAGE\s*\d|ESTÁGIO\s*\d|NIVEAU\s*\d|POKÉMON)\b/gi, ' ')
      .replace(/\b(?:HP|PS|PV|KP)\s*\d{1,3}|\b\d{1,3}\s*(?:HP|PS|PV|KP)\b/gi, ' ').trim();
  }
  function nameScore(name, title) {
    const n = norm(name), t = norm(cleanTitle(title));
    if (!n || !t) return 0;
    if (n === t) return 1;
    if ((' ' + t + ' ').includes(' ' + n + ' ')) return .94;
    if (compact(t).includes(compact(n))) return .90;
    const base = n.replace(/\s+(?:vmax|vstar|v|ex|gx|lv x)$/i, '');
    if (base !== n && compact(base).length >= 4 && compact(t).includes(compact(base))) return .78;
    const nw = n.split(' '), tw = t.split(' ');
    let best = 0;
    for (let i = 0; i < tw.length; i++) {
      const candidate = tw.slice(i, i + nw.length).join(' ');
      if (Math.abs(candidate.length - n.length) > Math.max(2, n.length * .3)) continue;
      const d = editDistance(n, candidate);
      const score = 1 - d / Math.max(n.length, candidate.length);
      if (d <= (n.length < 5 ? 0 : Math.max(1, Math.floor(n.length * .22)))) best = Math.max(best, score * .86);
    }
    return best;
  }
  function setId(card) { return card.set?.id || String(card.id || '').slice(0, String(card.id || '').lastIndexOf('-')); }
  function samePrint(card, saved, language) {
    const rawId = String(saved.id || ''), prefix = rawId.match(/^([a-z]{2})::/i)?.[1];
    if (String(saved.language || saved.__language || prefix || 'en').toLowerCase() !== language) return false;
    if (String(saved.tcgdexOriginalId || saved.__tcgdexOriginalId || saved.__tcgdexMatchedId || rawId.replace(/^[a-z]{2}::/i, '')) === card.id) return true;
    const canonical = s => String(s || '').toLowerCase().replace(/^[a-z]{2}::/, '').replace(/^sv0?(\d+)pt5$/, 'sv$1.5').replace(/^sv0(\d+)/, 'sv$1');
    return canonical(setId(saved)) === canonical(setId(card)) && numberKey(saved.localId || saved.number) === numberKey(card.localId || card.number) && compact(saved.name) === compact(card.name);
  }
  function isPhysical(card) { return !String(card.image || '').includes('/tcgp/') && !/^(?:[A-Z]\d+[a-z]?|P-[A-Z])-/.test(card.id || ''); }
  function rankCatalogue(cards, sets, title, identity) {
    const setMap = sets instanceof Map ? sets : new Map((sets || []).map(s => [s.id, s]));
    const titles = Array.isArray(title) ? title : [title];
    const scores = new Map();
    const entries = [];
    for (const card of cards) {
      if (!isPhysical(card)) continue;
      const sid = setId(card), set = setMap.get(sid) || card.set || {};
      let ns = scores.get(card.name);
      if (ns === undefined) { ns = Math.max(0, ...titles.map(t => nameScore(card.name, t))); scores.set(card.name, ns); }
      const number = numberKey(card.localId || card.number);
      const exact = identity.numbers.filter(n => n.number === number);
      const numberMatch = exact.length > 0;
      const totalMatch = exact.some(n => n.total && numberKey(n.total) === numberKey(set.cardCount?.official || set.printedTotal));
      // Gallery denominators include TG/GG/SV prefixes. The set count itself is numeric.
      const galleryTotal = exact.some(n => /^(TG|GG|SV|RC|SH)/.test(n.total) && Number(n.total.replace(/^[A-Z]+/, '')) === Number(set.cardCount?.official));
      const promoMatch = !!identity.promoSet && sid.toLowerCase() === identity.promoSet;
      const code = String(set.tcgOnline || set.ptcgoCode || '').toUpperCase();
      const codeMatch = !!code && identity.codes.includes(code);
      if (ns < .56 && !numberMatch) continue;
      const evidence = [];
      if (ns >= .8) evidence.push('Nome');
      if (numberMatch) evidence.push('Número');
      if (totalMatch || galleryTotal || codeMatch || promoMatch) evidence.push('Edição');
      const conflict = identity.numbers.length > 0 && !numberMatch;
      const score = ns * 65 + (numberMatch ? 90 : 0) + (totalMatch || galleryTotal ? 42 : 0) + (promoMatch ? 55 : 0) + (codeMatch ? 38 : 0) - (conflict ? 40 : 0) - (identity.promoSet && !promoMatch ? 45 : 0);
      entries.push({ card, set, score, nameScore: ns, numberMatch, editionMatch: totalMatch || galleryTotal || codeMatch || promoMatch, evidence });
    }
    return entries.sort((a, b) => b.score - a.score || String(a.card.id).localeCompare(String(b.card.id)));
  }
  function validQuad(q) {
    if (!q || q.length !== 4 || q.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1)) return false;
    let area = 0;
    for (let i = 0; i < 4; i++) {
      const a = q[i], b = q[(i + 1) % 4], c = q[(i + 2) % 4];
      if ((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x) <= .0001) return false;
      area += a.x * b.y - b.x * a.y;
    }
    return area / 2 > .025;
  }
  function homography(q) {
    if (!validQuad(q)) throw new Error('Ajusta os quatro cantos sem cruzar as linhas.');
    const src = [[0, 0], [1, 0], [1, 1], [0, 1]], rows = [];
    for (let i = 0; i < 4; i++) {
      const [u, v] = src[i], { x, y } = q[i];
      rows.push([u, v, 1, 0, 0, 0, -u * x, -v * x, x], [0, 0, 0, u, v, 1, -u * y, -v * y, y]);
    }
    for (let col = 0; col < 8; col++) {
      let pivot = col;
      for (let row = col + 1; row < 8; row++) if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row;
      [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
      const div = rows[col][col];
      if (Math.abs(div) < 1e-10) throw new Error('Os cantos estão demasiado próximos.');
      for (let j = col; j <= 8; j++) rows[col][j] /= div;
      for (let row = 0; row < 8; row++) if (row !== col) {
        const factor = rows[row][col]; for (let j = col; j <= 8; j++) rows[row][j] -= factor * rows[col][j];
      }
    }
    return rows.map(row => row[8]);
  }
  function project(h, u, v) {
    const d = h[6] * u + h[7] * v + 1;
    return { x: (h[0] * u + h[1] * v + h[2]) / d, y: (h[3] * u + h[4] * v + h[5]) / d };
  }
  function warpRGBA(source, sw, sh, q, width = 1008, height = 1408) {
    const h = homography(q), out = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const p = project(h, x / (width - 1), y / (height - 1));
      const px = clamp(p.x * (sw - 1), 0, sw - 1), py = clamp(p.y * (sh - 1), 0, sh - 1);
      const x0 = Math.floor(px), y0 = Math.floor(py), x1 = Math.min(x0 + 1, sw - 1), y1 = Math.min(y0 + 1, sh - 1);
      const fx = px - x0, fy = py - y0, dest = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) out[dest + c] = (source[(y0 * sw + x0) * 4 + c] * (1 - fx) + source[(y0 * sw + x1) * 4 + c] * fx) * (1 - fy) + (source[(y1 * sw + x0) * 4 + c] * (1 - fx) + source[(y1 * sw + x1) * 4 + c] * fx) * fy;
      out[dest + 3] = 255;
    }
    return out;
  }
  function defaultQuad(width, height) {
    const aspect = 63 / 88, ratio = width / height;
    let x = .025, y = .025;
    if (Math.abs(ratio - aspect) < .035) return [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    if (ratio > aspect) x = (1 - .9 * aspect / ratio) / 2;
    else y = (1 - .9 * ratio / aspect) / 2;
    return [{ x, y }, { x: 1 - x, y }, { x: 1 - x, y: 1 - y }, { x, y: 1 - y }];
  }
  function coverCrop(sw, sh, viewWidth, viewHeight, guide = { x: .08, y: .08, w: .84, h: .84 }) {
    const scale = Math.max(viewWidth / sw, viewHeight / sh);
    return { x: (sw - viewWidth / scale) / 2 + viewWidth * guide.x / scale, y: (sh - viewHeight / scale) / 2 + viewHeight * guide.y / scale, w: viewWidth * guide.w / scale, h: viewHeight * guide.h / scale };
  }
  function quality(data, width, height, previous) {
    const gray = new Float32Array(width * height);
    let sum = 0, bright = 0, lap = 0, lap2 = 0, motion = 0, count = 0;
    for (let i = 0; i < gray.length; i++) { const j = i * 4; const g = .299 * data[j] + .587 * data[j + 1] + .114 * data[j + 2]; gray[i] = g; sum += g; if (data[j] > 250 && data[j + 1] > 250 && data[j + 2] > 250) bright++; }
    for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
      const i = y * width + x, v = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width];
      lap += v; lap2 += v * v; count++; if (previous?.length === gray.length) motion += Math.abs(gray[i] - previous[i]);
    }
    return { gray, light: sum / gray.length, glare: bright / gray.length, sharpness: Math.max(0, lap2 / count - (lap / count) ** 2), motion: previous?.length === gray.length ? motion / count : Infinity };
  }
  function outlinedText(data, width, height, threshold = 145) {
    // White outlines separate dark glyphs from a dark illustrated background.
    // Remove only dark regions connected to the crop boundary; retain enclosed glyphs.
    const size = width * height, mask = new Uint8Array(size), queue = new Int32Array(size);
    for (let i = 0; i < size; i++) mask[i] = data[i * 4] < threshold ? 1 : 0;
    let head = 0, tail = 0;
    function push(i) { if (mask[i] === 1) { mask[i] = 2; queue[tail++] = i; } }
    for (let x = 0; x < width; x++) { push(x); push((height - 1) * width + x); }
    for (let y = 0; y < height; y++) { push(y * width); push(y * width + width - 1); }
    while (head < tail) { const i = queue[head++], x = i % width; if (x) push(i - 1); if (x < width - 1) push(i + 1); if (i >= width) push(i - width); if (i < size - width) push(i + width); }
    const out = new Uint8ClampedArray(data.length);
    for (let i = 0; i < size; i++) { const v = mask[i] === 1 ? 0 : 255; out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = v; out[i * 4 + 3] = 255; }
    return out;
  }
  function ocrRegion(canvas, region, width, mode, makeCanvas) {
    const [x, y, w, h] = region, c = makeCanvas(width, Math.round(width * canvas.height * h / (canvas.width * w)));
    const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(canvas, canvas.width * x, canvas.height * y, canvas.width * w, canvas.height * h, 0, 0, c.width, c.height);
    const id = ctx.getImageData(0, 0, c.width, c.height), d = id.data, hist = new Uint32Array(256);
    for (let i = 0; i < d.length; i += 4) hist[Math.round(.299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2])]++;
    let low = 0, high = 255, acc = 0; const count = d.length / 4;
    for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= count * .02) { low = i; break; } }
    acc = 0; for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= count * .02) { high = i; break; } }
    const range = Math.max(45, high - low);
    for (let i = 0; i < d.length; i += 4) { let v = clamp(((.299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2]) - low) * 255 / range, 0, 255); if (mode === 'binary') v = v < 138 ? 0 : 255; d[i] = d[i + 1] = d[i + 2] = v; }
    if (mode === 'outline') d.set(outlinedText(d, c.width, c.height));
    ctx.putImageData(id, 0, 0); return c;
  }
  async function readCard(canvas, worker, { makeCanvas, encode = c => c, checkpoint = () => {}, onStep = () => {} }) {
    const titles = [], footers = [];
    async function read(region, width, mode, psm) {
      checkpoint(); const result = await worker.recognize(encode(ocrRegion(canvas, region, width, mode, makeCanvas)), { tessedit_pageseg_mode: String(psm) }); checkpoint(); return result.data || {};
    }
    onStep('name', 26);
    titles.push(await read([.018, .018, .964, .115], 1300, 'gray', 11));
    // Outlined letters on full-art cards often need their background removed.
    titles.push(await read([.10, .026, .67, .065], 900, 'outline', 7));
    onStep('number', 40);
    footers.push((await read([.012, .855, .976, .14], 1700, 'gray', 11)).text || '');
    let identity = parseIdentity(footers.join('\n'));
    if (!identity.numbers.length) {
      onStep('detail', 47);
      footers.push((await read([.07, .935, .25, .038], 750, 'outline', 7)).text || '');
      footers.push((await read([.68, .915, .30, .072], 900, 'gray', 11)).text || '');
      identity = parseIdentity(footers.join('\n'));
    }
    const readings = titles.sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0)).map(d => cleanTitle(d.text)).filter(Boolean);
    return { titles: [...new Set(readings)], footer: footers.join('\n'), identity };
  }
  function descriptor(data, width, height) {
    function region(x0, y0, rw, rh, w, h) {
      const g = [], color = [0, 0, 0]; let mean = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const sx = clamp(Math.floor((x0 + (x + .5) / w * rw) * width), 0, width - 1), sy = clamp(Math.floor((y0 + (y + .5) / h * rh) * height), 0, height - 1), i = (sy * width + sx) * 4;
        const v = .299 * data[i] + .587 * data[i + 1] + .114 * data[i + 2]; g.push(v); mean += v; for (let c = 0; c < 3; c++) color[c] += data[i + c];
      }
      mean /= g.length; const sd = Math.sqrt(g.reduce((s, v) => s + (v - mean) ** 2, 0) / g.length) || 1;
      const values = g.map(v => clamp((v - mean) / sd, -3, 3));
      const bits = []; for (let y = 0; y < h; y++) for (let x = 0; x < w - 1; x++) bits.push(g[y * w + x] > g[y * w + x + 1] ? 1 : 0);
      const total = color.reduce((s, v) => s + v, 0) || 1;
      return { values, bits, color: color.map(v => v / total) };
    }
    return { full: region(.035, .025, .93, .95, 32, 44), art: region(.08, .18, .84, .39, 32, 24) };
  }
  function visualDistance(a, b) {
    function distance(x, y) {
      let corr = 0, bits = 0, color = 0;
      for (let i = 0; i < x.values.length; i++) corr += Math.abs(x.values[i] - y.values[i]);
      for (let i = 0; i < x.bits.length; i++) bits += x.bits[i] !== y.bits[i];
      for (let i = 0; i < 3; i++) color += Math.abs(x.color[i] - y.color[i]);
      return .58 * Math.min(1, corr / x.values.length / 2) + .32 * bits / x.bits.length + .1 * color;
    }
    return distance(a.full, b.full) * .55 + distance(a.art, b.art) * .45;
  }
  return { norm, compact, numberKey, parseIdentity, cleanTitle, nameScore, setId, samePrint, isPhysical, rankCatalogue, validQuad, homography, project, warpRGBA, defaultQuad, coverCrop, quality, outlinedText, ocrRegion, readCard, descriptor, visualDistance };
});
