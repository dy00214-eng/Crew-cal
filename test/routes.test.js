const test = require('node:test');
const assert = require('node:assert');
const routes = require('../src/routes.js');
const store = require('../src/store.js');

test.beforeEach(() => routes.forgetAll());

function flight(code, route) {
  return store.decorate({ date: '2026-01-07', code: code, route: route || null });
}

test('1단계 — 크루넷 원본이 시드를 이긴다', () => {
  // 시드에는 KE0727 이 ICN/KIX 지만, 원본이 다르면 원본이 맞다. 스케줄은 바뀐다.
  const out = routes.resolve(flight('KE0727', 'ICN/NRT'));
  assert.deepStrictEqual([out.from, out.to, out.source], ['ICN', 'NRT', 'original']);

  // 구간이 from/to 로만 들어와도 원본으로 본다
  const split = store.decorate({ date: '2026-01-07', code: 'KE0005', from: 'ICN', to: 'LAS' });
  assert.strictEqual(routes.resolve(split).source, 'original');
});

test('2단계 — 시드 JSON 에서 찾는다', () => {
  const out = routes.resolve(flight('KE0727'));
  assert.deepStrictEqual([out.from, out.to, out.source], ['ICN', 'KIX', 'db']);
  assert.deepStrictEqual(routes.fromSeed('KE2011'), { from: 'ICN', to: 'HKG' });
});

test('2단계 — 국내선 대역은 홀수 하행, 짝수 상행', () => {
  assert.deepStrictEqual(routes.fromDomesticRange('KE1807'), { from: 'GMP', to: 'PUS' });
  assert.deepStrictEqual(routes.fromDomesticRange('KE1810'), { from: 'PUS', to: 'GMP' });
  assert.deepStrictEqual(routes.fromDomesticRange('KE1121'), { from: 'GMP', to: 'CJU' });
  assert.strictEqual(routes.fromDomesticRange('KE1564'), null, '확인 못 한 대역은 비워 둔다');
  assert.strictEqual(routes.resolve(flight('KE1810')).source, 'db');
});

test('3단계로 넘길 편명만 askable 로 표시한다', () => {
  const out = routes.resolve(flight('KE5901'));
  assert.strictEqual(out.source, null);
  assert.strictEqual(out.askable, true);
});

test('조회해 둔 값은 다음부터 2단계에서 바로 풀린다', () => {
  assert.strictEqual(routes.resolve(flight('KE5901')).source, null);
  routes.remember('KE5901', 'ICN', 'PVG', 'lookup');
  const out = routes.resolve(flight('KE5901'));
  assert.deepStrictEqual([out.from, out.to, out.source], ['ICN', 'PVG', 'lookup']);
});

test('사용자가 고친 값이 조회 결과와 시드를 모두 이긴다', () => {
  routes.remember('KE5901', 'ICN', 'PVG', 'lookup');
  routes.remember('KE5901', 'ICN', 'NRT', 'user');
  assert.deepStrictEqual(
    [routes.resolve(flight('KE5901')).to, routes.resolve(flight('KE5901')).source],
    ['NRT', 'db'], '직접 넣은 값은 DB 로 본다');

  // 시드에 있는 편도 손으로 고치면 그쪽을 쓴다
  routes.remember('KE0727', 'ICN', 'FUK', 'user');
  assert.strictEqual(routes.resolve(flight('KE0727')).to, 'FUK');
});

test('못 찾은 편명은 이레 동안 다시 묻지 않는다', () => {
  routes.rememberFailure('KE5901');
  assert.strictEqual(routes.resolve(flight('KE5901')).askable, false);

  // 이레가 지나면 다시 물어봐도 된다
  const old = new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString();
  assert.strictEqual(routes.staleFailure({ fail: true, at: old }), true);
  assert.strictEqual(routes.staleFailure({ fail: true, at: new Date().toISOString() }), false);
});

test('못 찾음 기록이 직접 넣은 값을 지우지 않는다', () => {
  routes.remember('KE5901', 'ICN', 'NRT', 'user');
  routes.rememberFailure('KE5901');
  assert.strictEqual(routes.resolve(flight('KE5901')).to, 'NRT');
});

test('한 달치를 훑어 못 푼 편명만 모아 준다', () => {
  const byDate = {
    '2026-01-07': [flight('KE0727', 'ICN/KIX'), flight('KE0728')],
    '2026-01-09': [flight('KE5901'), flight('KE5901'), store.decorate({ date: '2026-01-09', code: 'LO' })],
    '2026-01-10': [flight('KE1810')]
  };
  const left = routes.apply(byDate);
  assert.deepStrictEqual(left, ['KE5901'], '중복은 하나로');
  assert.strictEqual(byDate['2026-01-07'][0].routeSource, 'original');
  assert.strictEqual(byDate['2026-01-07'][1].routeSource, 'db');
  assert.strictEqual(byDate['2026-01-10'][0].route, 'PUS/GMP');
  assert.strictEqual(byDate['2026-01-09'][0].routeSource, null);
});

test('캐시 목록에 어디서 온 값인지 남는다', () => {
  routes.remember('KE5901', 'ICN', 'PVG', 'lookup');
  routes.remember('KE5903', 'ICN', 'NRT', 'user');
  routes.rememberFailure('KE5905');
  assert.deepStrictEqual(routes.cacheList().map((r) => [r.code, r.source]),
    [['KE5901', 'lookup'], ['KE5903', 'user'], ['KE5905', 'fail']]);
});
