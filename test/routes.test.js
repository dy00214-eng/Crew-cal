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
  const seed = routes.fromSeed('KE2011');
  assert.deepStrictEqual([seed.from, seed.to], ['ICN', 'HKG']);
});

test('2단계 — 국내선 대역은 홀수 하행, 짝수 상행', () => {
  assert.deepStrictEqual(routes.fromDomesticRange('KE1807'), { from: 'GMP', to: 'PUS' });
  assert.deepStrictEqual(routes.fromDomesticRange('KE1810'), { from: 'PUS', to: 'GMP' });
  assert.deepStrictEqual(routes.fromDomesticRange('KE1121'), { from: 'GMP', to: 'CJU' });
  // 제주-부산 대역은 노선 파일이 제주를 앞에 둔다
  assert.deepStrictEqual(routes.fromDomesticRange('KE1505'), { from: 'CJU', to: 'PUS' });

  assert.strictEqual(routes.resolve(flight('KE1810')).source, 'db');
});

test('3단계로 넘길 편명만 askable 로 표시한다', () => {
  const out = routes.resolve(flight('KE9994'));
  assert.strictEqual(out.source, null);
  assert.strictEqual(out.askable, true);
});

test('조회해 둔 값은 다음부터 2단계에서 바로 풀린다', () => {
  assert.strictEqual(routes.resolve(flight('KE9994')).source, null);
  routes.remember('KE9994', 'ICN', 'PVG', 'lookup');
  const out = routes.resolve(flight('KE9994'));
  assert.deepStrictEqual([out.from, out.to, out.source], ['ICN', 'PVG', 'lookup']);
});

test('사용자가 고친 값이 조회 결과와 시드를 모두 이긴다', () => {
  routes.remember('KE9994', 'ICN', 'PVG', 'lookup');
  routes.remember('KE9994', 'ICN', 'NRT', 'user');
  assert.deepStrictEqual(
    [routes.resolve(flight('KE9994')).to, routes.resolve(flight('KE9994')).source],
    ['NRT', 'db'], '직접 넣은 값은 DB 로 본다');

  // 시드에 있는 편도 손으로 고치면 그쪽을 쓴다
  routes.remember('KE0727', 'ICN', 'FUK', 'user');
  assert.strictEqual(routes.resolve(flight('KE0727')).to, 'FUK');
});

test('못 찾은 편명은 이레 동안 다시 묻지 않는다', () => {
  routes.rememberFailure('KE9994');
  assert.strictEqual(routes.resolve(flight('KE9994')).askable, false);

  // 이레가 지나면 다시 물어봐도 된다
  const old = new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString();
  assert.strictEqual(routes.staleFailure({ fail: true, at: old }), true);
  assert.strictEqual(routes.staleFailure({ fail: true, at: new Date().toISOString() }), false);
});

test('못 찾음 기록이 직접 넣은 값을 지우지 않는다', () => {
  routes.remember('KE9994', 'ICN', 'NRT', 'user');
  routes.rememberFailure('KE9994');
  assert.strictEqual(routes.resolve(flight('KE9994')).to, 'NRT');
});

test('한 달치를 훑어 못 푼 편명만 모아 준다', () => {
  const byDate = {
    '2026-01-07': [flight('KE0727', 'ICN/KIX'), flight('KE0728')],
    '2026-01-09': [flight('KE9994'), flight('KE9994'), store.decorate({ date: '2026-01-09', code: 'LO' })],
    '2026-01-10': [flight('KE1810')]
  };
  const left = routes.apply(byDate);
  assert.deepStrictEqual(left, ['KE9994'], '중복은 하나로');
  assert.strictEqual(byDate['2026-01-07'][0].routeSource, 'original');
  assert.strictEqual(byDate['2026-01-07'][1].routeSource, 'db');
  assert.strictEqual(byDate['2026-01-10'][0].route, 'PUS/GMP');
  assert.strictEqual(byDate['2026-01-09'][0].routeSource, null);
});

test('캐시 목록에 어디서 온 값인지 남는다', () => {
  routes.remember('KE9994', 'ICN', 'PVG', 'lookup');
  routes.remember('KE9996', 'ICN', 'NRT', 'user');
  routes.rememberFailure('KE9998');
  assert.deepStrictEqual(routes.cacheList().map((r) => [r.code, r.source]),
    [['KE9994', 'lookup'], ['KE9996', 'user'], ['KE9998', 'fail']]);
});

test('공동운항편은 운항사를 함께 알려 준다', () => {
  const out = routes.resolve(flight('KE5749'));
  assert.deepStrictEqual([out.from, out.to, out.source], ['ICN', 'KKJ', 'db']);
  assert.strictEqual(out.codeshare, true);
  assert.strictEqual(out.operator, 'LJ');
  assert.strictEqual(out.operatorName, '진에어');

  // 자체 운항편에는 붙지 않는다
  const own = routes.resolve(flight('KE0005'));
  assert.strictEqual(own.codeshare, false);
  assert.strictEqual(own.operatorName, null);
});

test('시즌 덧말을 전하고, 미심쩍은 것은 따로 표시한다', () => {
  assert.strictEqual(routes.resolve(flight('KE0727')).note, '동계');
  assert.strictEqual(routes.resolve(flight('KE0727')).noteWarn, false);
  assert.strictEqual(routes.resolve(flight('KE0951')).note, '운휴');

  const warn = routes.resolve(flight('KE5679'));
  assert.match(warn.note, /확인 필요/);
  assert.strictEqual(warn.noteWarn, true, '출처가 미심쩍다고 적은 것은 다른 색으로');
});

test('노선 파일을 갈아 끼워도 편명·공항 수가 맞는다', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'ke-routes.json'), 'utf8'));
  const codes = Object.keys(seed.routes);
  const share = codes.filter((c) => seed.routes[c].codeshare);
  assert.strictEqual(codes.length, 496);
  assert.strictEqual(share.length, 186);
  assert.strictEqual(codes.length - share.length, 310);
  assert.strictEqual(Object.keys(seed.airports).length, 116);

  // 시각은 일부러 넣지 않았다. 스케줄은 시즌마다 바뀐다.
  codes.forEach((code) => {
    assert.ok(!('start' in seed.routes[code]) && !('end' in seed.routes[code]),
      code + ' 에 시각이 들어 있다 — 노선 파일에는 시각을 두지 않는다');
  });
});
