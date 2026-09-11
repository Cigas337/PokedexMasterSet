const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../scanner-core.js');

test('collector numbers keep gallery prefixes and both sides of the fraction', () => {
  for (const [input, number, total] of [['215/203', '215', '203'], ['TG23/TG30', 'TG23', 'TG30'], ['R623/7G30', 'TG23', 'TG30'], ['23/TG30', 'TG23', 'TG30'], ['GG70 / GG70', 'GG70', 'GG70'], ['SV107/SV122', 'SV107', 'SV122'], ['025/025', '25', '25'], ['2I5/2O3', '215', '203']]) {
    assert.deepEqual(C.parseIdentity(input).numbers[0], { number, total });
  }
  assert.notEqual(C.numberKey('TG23'), C.numberKey('23'));
  assert.deepEqual(C.parseIdentity('HP 310\nMax Darkness 160').numbers, []);
});

test('modern and old promos resolve without stripping their physical identity', () => {
  for (const [input, number, promoSet] of [['SWSH020', 'SWSH20', 'swshp'], ['SVP EN 085', '85', 'svp'], ['MEP EN 057', '57', 'mep'], ['XY123', 'XY123', 'xyp'], ['SM228', 'SM228', 'smp']]) {
    const parsed = C.parseIdentity(input);
    assert.equal(parsed.numbers[0].number, number); assert.equal(parsed.promoSet, promoSet);
  }
  assert.equal(C.parseIdentity('007', true).numbers[0].number, '7');
  assert.equal(C.parseIdentity('007').numbers.length, 0, 'OCR does not treat arbitrary isolated digits as a collector number');
});

test('the evolved-from name is not mistaken for the title', () => {
  const text = 'STAGE 1\nUmbreon VMAX HP 310\nEvolves from Eevee';
  assert.ok(C.nameScore('Umbreon VMAX', text) > .9);
  assert.equal(C.nameScore('Eevee', text), 0);
  assert.ok(C.nameScore('Umbreon VMAX', 'Umbreon VMAK') > .7);
  assert.ok(C.nameScore('Flabébé', 'Flabebe') > .9);
});

test('print matching distinguishes the set total, promos, galleries and digital cards', () => {
  const cards = [
    { id: 'swsh7-215', localId: '215', name: 'Umbreon VMAX' },
    { id: 'other-215', localId: '215', name: 'Umbreon VMAX' },
    { id: 'swsh9tg-TG23', localId: 'TG23', name: 'Umbreon VMAX' },
    { id: 'other-23', localId: '23', name: 'Umbreon VMAX' },
    { id: 'A4-215', localId: '215', name: 'Umbreon VMAX' },
    { id: 'swshp-SWSH020', localId: 'SWSH020', name: 'Pikachu' },
    { id: 'base1-20', localId: '20', name: 'Pikachu' },
  ];
  const sets = [{ id: 'swsh7', cardCount: { official: 203 } }, { id: 'other', cardCount: { official: 189 } }, { id: 'swsh9tg', cardCount: { official: 30 } }];
  const ranked = C.rankCatalogue(cards, sets, 'Umbreon VMAX', C.parseIdentity('215/203'));
  assert.equal(ranked[0].card.id, 'swsh7-215'); assert.ok(ranked[0].editionMatch);
  assert.ok(!ranked.find(r => r.card.id === 'A4-215'));
  assert.equal(C.rankCatalogue(cards, sets, '', C.parseIdentity('TG23/TG30'))[0].card.id, 'swsh9tg-TG23');
  assert.equal(C.rankCatalogue(cards, sets, 'Pikachu', C.parseIdentity('SWSH020'))[0].card.id, 'swshp-SWSH020');
});

test('perspective transform maps all four corners and rejects a crossed crop', () => {
  const q = [{ x: .2, y: .05 }, { x: .85, y: .12 }, { x: .95, y: .9 }, { x: .05, y: .95 }], h = C.homography(q);
  [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(([u, v], i) => { const p = C.project(h, u, v); assert.ok(Math.abs(p.x - q[i].x) < 1e-8); assert.ok(Math.abs(p.y - q[i].y) < 1e-8); });
  assert.equal(C.validQuad([q[0], q[2], q[1], q[3]]), false);
  const pixels = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]);
  const full = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
  assert.deepEqual(C.warpRGBA(pixels, 2, 2, full, 2, 2), pixels);
  assert.deepEqual(C.defaultQuad(630, 880), full, 'an already cropped card keeps its footer');
});

test('scanned prints reuse saved identities without crossing languages or editions', () => {
  const card = { id: 'sv03.5-199', localId: '199', name: 'Charizard ex', set: { id: 'sv03.5' } };
  assert.ok(C.samePrint(card, { id: 'sv3pt5-199', number: '199', name: 'Charizard ex', language: 'en' }, 'en'));
  assert.ok(!C.samePrint(card, { id: 'sv3pt5-199', number: '199', name: 'Charizard ex', language: 'pt' }, 'en'));
  assert.ok(!C.samePrint(card, { id: 'sv3-199', number: '199', name: 'Charizard ex', language: 'en' }, 'en'));
});

test('the camera capture uses the exact visible guide on portrait and landscape video', () => {
  const c = C.coverCrop(1920, 1080, 315, 440);
  assert.ok(Math.abs(c.w / c.h - 63 / 88) < .00001);
  assert.ok(Math.abs(c.x + c.w / 2 - 960) < .00001);
  assert.ok(Math.abs(c.y + c.h / 2 - 540) < .00001);
  const p = C.coverCrop(1080, 1920, 315, 440);
  assert.ok(Math.abs(p.x + p.w / 2 - 540) < .00001);
  assert.ok(Math.abs(p.y + p.h / 2 - 960) < .00001);
});

test('flat or dark frames cannot pass sharpness checks and identical images have zero visual distance', () => {
  const data = new Uint8ClampedArray(96 * 134 * 4).fill(15);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  const q = C.quality(data, 96, 134);
  assert.equal(q.sharpness, 0); assert.ok(q.light < 48);
  const d = C.descriptor(data, 96, 134); assert.equal(C.visualDistance(d, d), 0);
});

test('cancelled recognition stops before reading another region', async () => {
  let active = true, reads = 0;
  const makeCanvas = (width, height) => ({ width, height, getContext: () => ({ drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(width * height * 4).fill(255) }), putImageData() {} }) });
  await assert.rejects(C.readCard({ width: 1008, height: 1408 }, { recognize: async () => { reads++; active = false; return { data: { text: 'Umbreon' } }; } }, { makeCanvas, checkpoint: () => { if (!active) throw new Error('cancelled'); } }), /cancelled/);
  assert.equal(reads, 1);
});
