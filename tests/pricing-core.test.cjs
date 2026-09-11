const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../pricing-core.js');

const now = new Date().toISOString();
const normal = {key: 'normal-key', label: 'Normal', type: 'normal', cardmarketId: 100};
const holo = {key: 'holo-key', label: 'Holo', type: 'holo', cardmarketId: 100};
const reverse = {key: 'reverse-key', label: 'Reverse Holo', type: 'reverse', cardmarketId: 100};

function marketCard(prices = {'trend': 0.12, 'trend-holo': 0.36}) {
  return {
    id: 'sv03.5-001',
    __language: 'en',
    __tcgdexOriginalId: 'sv03.5-001',
    __tcgdexCardmarket: {unit: 'EUR', updated: now, ...prices}
  };
}

test('seleciona Normal como base e altera para Holo', () => {
  const variants = [normal, holo, reverse];
  const unknown = {key: 'default', label: 'Variante por confirmar', type: 'normal'};
  const base = core.referenceFor(marketCard(), unknown, variants);
  const foil = core.referenceFor(marketCard(), holo, variants);

  assert.equal(base.value, 0.12);
  assert.equal(base.base, true);
  assert.equal(base.variantKey, 'normal-key');
  assert.equal(foil.value, 0.36);
  assert.equal(foil.base, false);
  assert.match(base.label, /NM não filtrado/);
});

test('uma única variante usa o valor dessa variante', () => {
  const onlyReverse = core.referenceFor(
    marketCard({'trend': 0.42}),
    reverse,
    [reverse]
  );
  assert.equal(onlyReverse.value, 0.42);
  assert.equal(onlyReverse.variantKey, 'reverse-key');

  const onlyHolo = core.referenceFor(
    marketCard({'trend-holo': 1.08}),
    holo,
    [holo]
  );
  assert.equal(onlyHolo.value, 1.08);
});

test('usa a base Normal quando a variante especial é ambígua', () => {
  const normalProduct = {...normal, cardmarketId: 200};
  const masterball = {key: 'masterball-key', label: 'Master Ball', type: 'normal', foil: 'masterball', cardmarketId: 200};
  const result = core.referenceFor(
    marketCard({'trend': 2.5}),
    masterball,
    [normalProduct, masterball]
  );
  assert.equal(result.value, 2.5);
  assert.equal(result.base, true);
});

test('valida apenas ofertas Cardmarket EUR em Near Mint', () => {
  const valid = core.validateQuote({
    card_id: 'sv03.5-001', variant_key: 'normal-key', language: 'en', cardmarket_id: 100,
    source: 'Cardmarket', condition: 'NM', currency: 'EUR', price: 1.23,
    observed_at: now, offer_count: 4, method: 'direct_offer_nm',
    source_url: 'https://www.cardmarket.com/en/Pokemon/Products?idProduct=100'
  });
  assert.equal(valid.price, 1.23);
  assert.equal(core.validateQuote({...valid, method: 'cardmarket_trend'}), null);
  assert.equal(core.validateQuote({...valid, condition: 'Excellent'}), null);
  assert.equal(core.validateQuote({...valid, currency: 'USD'}), null);
});

test('usa a cotação NM exata e rejeita prova de variante diferente', () => {
  const card = marketCard();
  const quote = {
    card_id: 'sv03.5-001', variant_key: 'normal-key', language: 'en', cardmarket_id: 100,
    source: 'Cardmarket', condition: 'NM', currency: 'EUR', price: 0.88,
    observed_at: now, offer_count: 2, method: 'direct_offer_nm',
    source_url: 'https://www.cardmarket.com/en/Pokemon/Products?idProduct=100'
  };
  const selected = core.quoteFor(card, normal, [normal, holo], [quote]);
  assert.equal(selected.value, 0.88);

  const saved = {
    ...card, variantKey: 'holo-key', variantType: 'holo', variantLabel: 'Holo',
    variantCardmarketId: 100, priceVerification: core.VERSION,
    marketPrice: 0.88, marketPriceSource: 'Cardmarket', marketQuote: quote,
    marketPriceBase: false
  };
  assert.equal(core.snapshotPrice(saved).value, Infinity);
});

test('soma referências/preços e não conta uma carta sem cotação', () => {
  const entries = [
    {key: 'a', card: {...marketCard(), variantKey: 'normal-key', marketPrice: 1, marketPriceSource: 'Cardmarket', priceModelId: 'cardmarket-reference-eur-v2', priceVerification: core.ESTIMATE_VERSION, marketPriceSelectedVariantKey: 'normal-key', marketReference: {estimate: true, source: 'Cardmarket', currency: 'EUR', value: 1}}},
    {key: 'duplicate', card: {...marketCard(), variantKey: 'normal-key', marketPrice: 9, marketPriceSource: 'Cardmarket', priceModelId: 'cardmarket-reference-eur-v2', priceVerification: core.ESTIMATE_VERSION, marketPriceSelectedVariantKey: 'normal-key', marketReference: {estimate: true, source: 'Cardmarket', currency: 'EUR', value: 9}}},
    {key: 'b', card: {id: 'missing', variantKey: 'normal-key', marketPrice: null}}
  ];
  const result = core.stats(entries);
  assert.equal(result.cards, 2);
  assert.equal(result.priced, 1);
  assert.equal(result.total, 1);
});
