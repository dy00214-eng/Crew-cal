const test = require('node:test');
const assert = require('node:assert');
const store = require('../src/store.js');
const parser = require('../src/parser.js');

test.beforeEach(() => store.clearAll());

test('개별 입력으로 추가하고 날짜별로 읽는다', () => {
  store.addEntry({ date: '2026-09-06', code: 'ke0035', route: 'ICN/JFK' });
  const list = store.getByDate('2026-09-06');
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].code, 'KE0035');
  assert.strictEqual(list[0].category, 'flight');
  assert.strictEqual(list[0].label, 'KE 0035편');
});

test('날짜나 코드가 없으면 거절한다', () => {
  assert.throws(() => store.addEntry({ code: 'LO' }), /날짜/);
  assert.throws(() => store.addEntry({ date: '2026-09-06' }), /코드/);
});

test('삭제하면 목록에서 빠지고, 비면 날짜 키도 사라진다', () => {
  const e = store.addEntry({ date: '2026-09-06', code: 'LO' });
  assert.strictEqual(store.removeEntry('2026-09-06', e.id), true);
  assert.deepStrictEqual(store.getByDate('2026-09-06'), []);
  assert.strictEqual(Object.keys(store.getAll()).length, 0);
  assert.strictEqual(store.removeEntry('2026-09-06', e.id), false);
});

test('replace 모드는 해당 날짜 기존 일정을 교체한다', () => {
  store.addEntry({ date: '2026-09-06', code: 'DO' });
  const parsed = parser.parse('2026-09-06 KE0035\n2026-09-07 LO', { year: 2026, month: 9 });
  const res = store.applyEntries(parsed.entries, 'replace');
  assert.strictEqual(res.added, 2);
  assert.strictEqual(res.removed, 1);
  assert.deepStrictEqual(store.getByDate('2026-09-06').map(e => e.code), ['KE0035']);
});

test('merge 모드는 기존에 이어 붙이되 같은 일정은 중복 저장하지 않는다', () => {
  store.addEntry({ date: '2026-09-06', code: 'DO' });
  const parsed = parser.parse('2026-09-06 DO\n2026-09-06 STBY', { year: 2026, month: 9 });
  const res = store.applyEntries(parsed.entries, 'merge');
  assert.strictEqual(res.added, 1);
  assert.deepStrictEqual(store.getByDate('2026-09-06').map(e => e.code), ['DO', 'STBY']);
});

test('반영 전에 덮어쓸 기존 건수를 셀 수 있다', () => {
  store.addEntry({ date: '2026-09-06', code: 'DO' });
  store.addEntry({ date: '2026-09-06', code: 'LO' });
  store.addEntry({ date: '2026-09-09', code: 'LO' });
  const parsed = parser.parse('2026-09-06 STBY', { year: 2026, month: 9 });
  assert.strictEqual(store.countExisting(parsed.entries), 2);
});

test('기간 조회는 범위 안의 날짜만 돌려준다', () => {
  store.addEntry({ date: '2026-08-31', code: 'LO' });
  store.addEntry({ date: '2026-09-01', code: 'LO' });
  store.addEntry({ date: '2026-09-30', code: 'LO' });
  store.addEntry({ date: '2026-10-01', code: 'LO' });
  const range = store.getRange('2026-09-01', '2026-09-30');
  assert.deepStrictEqual(Object.keys(range).sort(), ['2026-09-01', '2026-09-30']);
});

test('내보내기와 불러오기가 왕복한다', () => {
  store.addEntry({ date: '2026-09-06', code: 'KE0035' });
  const json = store.exportJson();
  store.clearAll();
  assert.strictEqual(Object.keys(store.getAll()).length, 0);
  store.importJson(json);
  assert.deepStrictEqual(store.getByDate('2026-09-06').map(e => e.code), ['KE0035']);
  assert.throws(() => store.importJson('{"nope":1}'), /백업/);
});

test('출발·도착 시각과 익일 도착 표시를 저장한다', () => {
  const e = store.addEntry({ date: '2026-09-06', code: 'KE0036', start: '23:50', end: '06:20', endOffset: 1 });
  assert.strictEqual(e.start, '23:50');
  assert.strictEqual(e.end, '06:20');
  assert.strictEqual(e.endOffset, 1);
});

test('dep/arr 이름으로 넣어도 출발·도착으로 받는다', () => {
  const e = store.addEntry({ date: '2026-09-06', code: 'KE0035', dep: '10:30', arr: '14:20' });
  assert.strictEqual(e.start, '10:30');
  assert.strictEqual(e.end, '14:20');
});

test('도착 시각이 없으면 익일 표시는 지운다', () => {
  const e = store.addEntry({ date: '2026-09-06', code: 'STBY', start: '09:00', endOffset: 1 });
  assert.strictEqual(e.endOffset, 0);
});

test('하루치 일정은 출발 시각 순으로, 시각 없는 건은 뒤로 보낸다', () => {
  store.addEntry({ date: '2026-09-06', code: 'LO' });
  store.addEntry({ date: '2026-09-06', code: 'KE0036', start: '23:50' });
  store.addEntry({ date: '2026-09-06', code: 'KE0035', start: '10:30' });
  assert.deepStrictEqual(
    store.getByDate('2026-09-06').map(e => e.code),
    ['KE0035', 'KE0036', 'LO']
  );
  assert.deepStrictEqual(
    store.getAll()['2026-09-06'].map(e => e.code),
    ['KE0035', 'KE0036', 'LO']
  );
});


test('편명 숫자를 네 자리로 맞춰 같은 편을 하나로 본다', () => {
  assert.strictEqual(store.normalizeCode('KE704'), 'KE0704');
  assert.strictEqual(store.normalizeCode('ke35'), 'KE0035');
  assert.strictEqual(store.normalizeCode('KE0704'), 'KE0704');
  assert.strictEqual(store.normalizeCode('LO'), 'LO');
  assert.strictEqual(store.normalizeCode('STBY'), 'STBY');
  const e = store.addEntry({ date: '2026-08-13', code: 'KE704' });
  assert.strictEqual(e.code, 'KE0704');
  assert.strictEqual(e.route, null, '구간은 원본이 알려 줄 때만 붙는다');
});

test('사전에서 이름이 바뀌면 예전에 넣어둔 일정도 새 이름으로 읽는다', () => {
  // 예전 이름표가 그대로 남아 있는 상태를 흉내낸다
  const saved = store.addEntry({ date: '2026-09-06', code: 'ATDO', label: '추가 휴무', category: 'off' });
  assert.strictEqual(saved.label, '추가 휴무');

  assert.strictEqual(store.getByDate('2026-09-06')[0].label, '휴무');
  assert.strictEqual(store.getAll()['2026-09-06'][0].label, '휴무');

  // 사전에 없는 코드는 그대로 둔다
  store.addEntry({ date: '2026-09-07', code: 'ZZZZ', label: '내가 적은 것', category: 'other' });
  assert.strictEqual(store.getByDate('2026-09-07')[0].label, '내가 적은 것');
});
