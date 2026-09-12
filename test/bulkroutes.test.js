const test = require('node:test');
const assert = require('node:assert');
const bulk = require('../src/bulkroutes.js');
const store = require('../src/store.js');

test('홀수는 한국발, 짝수는 한국행으로 구간을 정한다', () => {
  assert.deepStrictEqual(bulk.routeFor('KE2011', 'HKG'), { from: 'ICN', to: 'HKG' });
  assert.deepStrictEqual(bulk.routeFor('KE2012', 'HKG'), { from: 'HKG', to: 'ICN' });
  assert.deepStrictEqual(bulk.routeFor('KE0727', '오사카'), { from: 'ICN', to: 'KIX' });
  assert.deepStrictEqual(bulk.routeFor('KE1807', 'PUS', 'GMP'), { from: 'GMP', to: 'PUS' });
  assert.strictEqual(bulk.routeFor('KE2011', '없는곳'), null);
});

test('한쪽만 넣으면 짝이 되는 편을 거꾸로 제안한다', () => {
  assert.strictEqual(bulk.pairOf('KE2011'), 'KE2012');
  assert.strictEqual(bulk.pairOf('KE2012'), 'KE2011');
  assert.deepStrictEqual(bulk.pairSuggestion('KE2011', 'HKG'),
    { code: 'KE2012', from: 'HKG', to: 'ICN' });
  assert.deepStrictEqual(bulk.pairSuggestion('KE0728', 'KIX'),
    { code: 'KE0727', from: 'ICN', to: 'KIX' });
});

test('ke-routes.json 모양으로 도시·나라·국기를 채운다', () => {
  assert.deepStrictEqual(bulk.toRouteRow(bulk.routeFor('KE2012', 'HKG')), {
    from: 'HKG', to: 'ICN', city: '홍콩', country: 'HK', flag: '🇭🇰',
    start: null, end: null, endOffset: 0
  });
});

test('구간을 모르는 편명만 모은다', () => {
  const byDate = {
    '2026-01-11': [store.enrich(store.decorate({ date: '2026-01-11', code: 'KE0006' }))],
    '2026-01-15': [store.decorate({ date: '2026-01-15', code: 'KE9901' }),
      store.decorate({ date: '2026-01-15', code: 'LO' })],
    '2026-01-17': [store.decorate({ date: '2026-01-17', code: 'KE9901' }),
      store.decorate({ date: '2026-01-17', code: 'AS0016' })]
  };
  const missing = bulk.missingFlights(byDate, store.recallFlight);
  assert.deepStrictEqual(missing.map((m) => m.code), ['KE9901'], '아는 편과 근무 코드는 뺀다');
  assert.strictEqual(missing[0].count, 2);
  assert.deepStrictEqual(missing[0].dates, ['2026-01-15', '2026-01-17']);
  assert.strictEqual(missing[0].pair, 'KE9902');
});
