const test = require('node:test');
const assert = require('node:assert');
const resolve = require('../src/resolve.js');
const store = require('../src/store.js');

/** 날짜·코드만 주면 나머지는 저장소 규칙대로 채워 준다. */
function entry(date, code, route) {
  return store.decorate({ date: date, code: code, route: route || null });
}

function codesOn(result, date) {
  return result.entries.filter((e) => e.date === date).map((e) => e.code);
}

/** 콘솔 경고를 가로채 모은다. */
function quiet(run) {
  const warned = [];
  const real = console.warn;
  console.warn = (m) => warned.push(String(m));
  try { return { out: run(), warned: warned }; } finally { console.warn = real; }
}

test('읽어 들인 근무는 지우지 않는다 — 하루 네 편도 그대로', () => {
  // 3월 1일 김포-부산 네 편. 예전에는 '한 칸 최대 둘' 규칙이 두 편을 지웠다.
  const list = ['KE1807', 'KE1810', 'KE1815', 'KE1820'].map((c) => entry('2026-03-01', c));
  const { out } = quiet(() => resolve.resolve(list));
  assert.deepStrictEqual(codesOn(out, '2026-03-01'), ['KE1807', 'KE1810', 'KE1815', 'KE1820']);
  assert.deepStrictEqual(out.dropped, []);
  assert.deepStrictEqual(out.conflicts, []);
});

test('휴무와 비행이 겹쳐도 비행을 지우지 않고 알리기만 한다', () => {
  // 3월 1일에 없던 휴무가 끼어들어 비행 네 편이 통째로 사라진 일이 있었다.
  const list = ['KE1807', 'KE1810', 'KE1815', 'KE1820', 'ADO'].map((c) => entry('2026-03-01', c));
  const { out, warned } = quiet(() => resolve.resolve(list));
  assert.strictEqual(codesOn(out, '2026-03-01').length, 5, '다섯 건 모두 남는다');
  assert.deepStrictEqual(out.dropped, []);
  assert.deepStrictEqual(out.conflicts.map((c) => c.kind), ['off-with-flight']);
  assert.ok(warned.some((m) => /지우지 않고/.test(m)), warned.join(' / '));
});

test('휴무가 여럿이어도 지우지 않고 대표만 골라 준다', () => {
  const list = ['ADO', 'DO', 'ATDO'].map((c) => entry('2026-04-12', c));
  const { out } = quiet(() => resolve.resolve(list));
  assert.deepStrictEqual(codesOn(out, '2026-04-12'), ['ADO', 'DO', 'ATDO']);
  assert.deepStrictEqual(out.conflicts.map((c) => c.kind), ['off-duplicate']);
  assert.strictEqual(resolve.primaryOff(list).code, 'ATDO', 'ATDO > ADO > DO');
});

test('휴무와 체류가 겹쳐도 지우지 않고 알린다', () => {
  const list = [entry('2026-04-12', 'LO'), entry('2026-04-12', 'ATDO')];
  const { out } = quiet(() => resolve.resolve(list));
  assert.deepStrictEqual(codesOn(out, '2026-04-12'), ['LO', 'ATDO']);
  assert.ok(out.conflicts.some((c) => c.kind === 'off-with-layover'));
});

test('글자까지 똑같은 중복만 하나로 합친다', () => {
  const { out } = quiet(() => resolve.resolve([entry('2026-04-12', 'DO'), entry('2026-04-12', 'DO')]));
  assert.deepStrictEqual(codesOn(out, '2026-04-12'), ['DO']);
  assert.deepStrictEqual(out.dropped.map((d) => d.reason), ['duplicate']);
});

test('국내선 뒤의 체류는 알리기만 하고 빼지 않는다', () => {
  // 부산에서 하룻밤 자는 일정이 실제로 있어, 지우면 진짜 일정이 사라진다.
  const list = [entry('2026-09-29', 'KE1401', 'ICN/PUS'), entry('2026-09-29', 'LO')];
  const { out } = quiet(() => resolve.resolve(list));
  assert.deepStrictEqual(codesOn(out, '2026-09-29'), ['KE1401', 'LO']);
  assert.ok(out.conflicts.some((c) => c.kind === 'domestic-layover'));
});

test('해외 도착 비행을 앞뒤로 짚어 낸다', () => {
  const byDate = {
    '2026-04-11': [entry('2026-04-11', 'KE0035', 'ICN/ATL')],
    '2026-04-12': [entry('2026-04-12', 'LO')],
    '2026-04-13': [entry('2026-04-13', 'LO')]
  };
  assert.strictEqual(resolve.arrivedOverseasBefore(byDate, '2026-04-13'), true, '체류를 거슬러 올라간다');
  assert.strictEqual(resolve.arrivedOverseasBefore({
    '2026-04-11': [entry('2026-04-11', 'KE1201', 'ICN/CJU')]
  }, '2026-04-12'), false);
  assert.strictEqual(resolve.arrivedOverseasBefore({
    '2026-04-11': [entry('2026-04-11', 'KE9999')]
  }, '2026-04-12'), null, '구간을 모르면 판단하지 않는다');
});

test('국내선인지 대역으로도 구간으로도 알아본다', () => {
  assert.strictEqual(resolve.isDomesticFlight(entry('2026-03-01', 'KE1810')), true);
  assert.strictEqual(resolve.isDomesticFlight(entry('2026-03-01', 'KE2179', 'ICN/KOJ')), false);
  assert.strictEqual(resolve.isDomesticFlight(entry('2026-03-01', 'LO')), false);
  assert.strictEqual(resolve.routeOf(entry('2026-03-01', 'KE1810')), 'PUS/GMP',
    '구간이 안 붙어 있으면 시간표에서 찾는다');
});

test('날짜별 표를 그대로 받아도 지우지 않는다', () => {
  const { out } = quiet(() => resolve.resolveByDate({
    '2026-03-01': ['KE1807', 'KE1810', 'KE1815', 'KE1820'].map((c) => entry('2026-03-01', c)),
    '2026-03-08': [entry('2026-03-08', 'KE0125'), entry('2026-03-08', 'KE0126')]
  }));
  assert.strictEqual(out.entriesByDate['2026-03-01'].length, 4);
  assert.strictEqual(out.entriesByDate['2026-03-08'].length, 2);
});
