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

test('같은 날 같은 코드가 두 번 들어오면 하나만 남는다', () => {
  const out = resolve.resolve([entry('2026-04-12', 'DO'), entry('2026-04-12', 'DO')]);
  assert.deepStrictEqual(codesOn(out, '2026-04-12'), ['DO']);
});

test('휴무 계열은 하루에 하나로 합친다 (ATDO > ADO > DO)', () => {
  const out = resolve.resolve([
    entry('2026-04-12', 'ADO'), entry('2026-04-12', 'DO'), entry('2026-04-12', 'ATDO')
  ]);
  assert.deepStrictEqual(codesOn(out, '2026-04-12'), ['ATDO']);
  assert.deepStrictEqual(out.dropped.map((d) => d.code).sort(), ['ADO', 'DO']);

  const two = resolve.resolve([entry('2026-04-12', 'DO'), entry('2026-04-12', 'ADO')]);
  assert.deepStrictEqual(codesOn(two, '2026-04-12'), ['ADO']);
});

test('앞에 해외 도착 비행이 없으면 체류를 버린다', () => {
  const out = resolve.resolve([
    entry('2026-04-11', 'DO'),
    entry('2026-04-12', 'ADO'), entry('2026-04-12', 'LO'), entry('2026-04-12', 'ATDO')
  ]);
  assert.deepStrictEqual(codesOn(out, '2026-04-12'), ['ATDO']);
  assert.ok(out.dropped.some((d) => d.code === 'LO' && d.reason === 'layover-without-arrival'));
});

test('앞에 해외 도착 비행이 있으면 체류를 남기고 휴무를 버린다', () => {
  const out = resolve.resolve([
    entry('2026-04-11', 'KE0035', 'ICN/ATL'),
    entry('2026-04-12', 'LO'), entry('2026-04-12', 'ATDO')
  ]);
  assert.deepStrictEqual(codesOn(out, '2026-04-12'), ['LO']);
  assert.ok(out.dropped.some((d) => d.code === 'ATDO' && d.reason === 'off-with-layover'));
});

test('체류가 며칠 이어져도 그 앞의 비행까지 거슬러 본다', () => {
  const out = resolve.resolve([
    entry('2026-04-11', 'KE0035', 'ICN/ATL'),
    entry('2026-04-12', 'LO'),
    entry('2026-04-13', 'LO'), entry('2026-04-13', 'DO')
  ]);
  assert.deepStrictEqual(codesOn(out, '2026-04-13'), ['LO']);
});

test('국내선으로 끝난 다음 날의 체류는 휴무에 진다', () => {
  const out = resolve.resolve([
    entry('2026-04-11', 'KE1201', 'ICN/CJU'),
    entry('2026-04-12', 'LO'), entry('2026-04-12', 'DO')
  ]);
  assert.deepStrictEqual(codesOn(out, '2026-04-12'), ['DO']);
});

test('구간을 모르는 비행 뒤라면 지레 체류를 버리지 않는다', () => {
  const out = resolve.resolve([
    entry('2026-04-11', 'KE9999'),
    entry('2026-04-12', 'LO'), entry('2026-04-12', 'DO')
  ]);
  assert.deepStrictEqual(codesOn(out, '2026-04-12'), ['LO']);
});

test('한 칸에 셋 이상이면 둘만 남기고 콘솔에 알린다', () => {
  const warned = [];
  const real = console.warn;
  console.warn = (msg) => warned.push(String(msg));
  try {
    var out = resolve.resolve([
      entry('2026-04-24', 'KE2179', 'ICN/KOJ'),
      entry('2026-04-24', 'KE2180', 'KOJ/ICN'),
      entry('2026-04-24', 'STBY'),
      entry('2026-04-24', 'TRN')
    ]);
  } finally {
    console.warn = real;
  }
  assert.deepStrictEqual(codesOn(out, '2026-04-24'), ['KE2179', 'KE2180']);
  assert.strictEqual(warned.length, 1, warned.join(' / '));
  assert.ok(/2026-04-24/.test(warned[0]) && /STBY/.test(warned[0]), warned[0]);
  assert.deepStrictEqual(out.dropped.map((d) => d.reason), ['overflow', 'overflow']);
});

test('비행 두 편이 있는 날은 그대로 둔다', () => {
  const out = resolve.resolve([
    entry('2026-04-24', 'KE2179', 'ICN/KOJ'), entry('2026-04-24', 'KE2180', 'KOJ/ICN')
  ]);
  assert.deepStrictEqual(codesOn(out, '2026-04-24'), ['KE2179', 'KE2180']);
  assert.deepStrictEqual(out.dropped, []);
});

test('날짜별 표를 그대로 받아 정리한다', () => {
  const out = resolve.resolveByDate({
    '2026-04-11': [entry('2026-04-11', 'KE0035', 'ICN/ATL')],
    '2026-04-12': [entry('2026-04-12', 'LO'), entry('2026-04-12', 'ADO'), entry('2026-04-12', 'ATDO')]
  });
  assert.deepStrictEqual(out.entriesByDate['2026-04-12'].map((e) => e.code), ['LO']);
});
