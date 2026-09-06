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

test('알려진 근무 코드는 라벨과 분류가 채워진다', () => {
  const e = store.addEntry({ date: '2026-09-07', code: 'ATDO' });
  assert.strictEqual(e.category, 'off');
  assert.strictEqual(e.label, '추가 휴무');
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
  const parsed = parser.parse('2026-09-06 DO\n2026-09-06 LO', { year: 2026, month: 9 });
  const res = store.applyEntries(parsed.entries, 'merge');
  assert.strictEqual(res.added, 1);
  assert.deepStrictEqual(store.getByDate('2026-09-06').map(e => e.code), ['DO', 'LO']);
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

test.beforeEach(() => store.forgetFlights());

test('구간·시각을 넣은 편명은 기억했다가 코드만 들어와도 채운다', () => {
  store.addEntry({ date: '2026-09-02', code: 'KE0035', route: 'ICN/JFK', start: '10:30', end: '14:20' });
  const later = store.addEntry({ date: '2026-09-16', code: 'KE0035' });
  assert.strictEqual(later.route, 'ICN/JFK');
  assert.strictEqual(later.start, '10:30');
  assert.strictEqual(later.end, '14:20');
  assert.deepStrictEqual(later.autoFilled, ['route', 'start', 'end']);
});

test('직접 넣은 값이 기억한 값보다 우선한다', () => {
  store.addEntry({ date: '2026-09-02', code: 'KE0035', route: 'ICN/JFK', start: '10:30', end: '14:20' });
  const e = store.addEntry({ date: '2026-09-16', code: 'KE0035', start: '11:00' });
  assert.strictEqual(e.start, '11:00');
  assert.strictEqual(e.end, '14:20');
  assert.deepStrictEqual(e.autoFilled, ['route', 'end']);
});

test('익일 도착 표시도 함께 기억한다', () => {
  store.addEntry({ date: '2026-09-04', code: 'KE0036', route: 'JFK/ICN', start: '23:50', end: '06:20', endOffset: 1 });
  const e = store.addEntry({ date: '2026-09-21', code: 'KE0036' });
  assert.strictEqual(e.endOffset, 1);
});

test('근무 코드는 기억하지 않는다', () => {
  store.addEntry({ date: '2026-09-08', code: 'STBY', start: '09:00', end: '17:00' });
  assert.deepStrictEqual(store.flightList(), []);
  const e = store.addEntry({ date: '2026-09-26', code: 'STBY' });
  assert.strictEqual(e.start, null);
});

test('기억할 정보가 없으면 아무것도 채우지 않는다', () => {
  const e = store.addEntry({ date: '2026-09-02', code: 'KE9999' });
  assert.strictEqual(e.route, null);
  assert.strictEqual(e.autoFilled, null);
  assert.deepStrictEqual(store.flightList(), []);
});

test('일괄 반영에서도 기억한 값을 채운다', () => {
  store.addEntry({ date: '2026-09-02', code: 'KE0054', route: 'ICN/HNL', start: '20:00', end: '09:30' });
  store.applyEntries([{ date: '2026-09-12', code: 'KE0054', type: 'flight' }], 'merge');
  const [entry] = store.getByDate('2026-09-12');
  assert.strictEqual(entry.route, 'ICN/HNL');
  assert.strictEqual(entry.start, '20:00');
});

test('편명 기억은 따로 지울 수 있다', () => {
  store.addEntry({ date: '2026-09-02', code: 'KE0035', route: 'ICN/JFK' });
  assert.strictEqual(store.flightList().length, 1);
  store.forgetFlights();
  assert.deepStrictEqual(store.flightList(), []);
  assert.strictEqual(store.getByDate('2026-09-02').length, 1);
});

test('이미 저장된 일정에도 기억한 값을 소급해서 채운다', () => {
  // 기본 시간표에 없는 편명이라야 소급 적용을 제대로 확인할 수 있다
  store.applyEntries([
    { date: '2026-09-02', code: 'KE7701', type: 'flight' },
    { date: '2026-09-16', code: 'KE7701', type: 'flight' },
    { date: '2026-09-03', code: 'LO', type: 'duty' }
  ], 'replace');
  assert.strictEqual(store.getByDate('2026-09-02')[0].start, null);

  store.learnFlight({ code: 'KE7701', type: 'flight', route: 'ICN/ATL', start: '09:45', end: '10:20' });

  assert.strictEqual(store.enrichAll(), 2);
  assert.strictEqual(store.getByDate('2026-09-02')[0].start, '09:45');
  assert.strictEqual(store.getByDate('2026-09-16')[0].route, 'ICN/ATL');
  assert.strictEqual(store.getByDate('2026-09-03')[0].start, null);
  assert.strictEqual(store.enrichAll(), 0);   // 다시 돌려도 바뀌는 게 없다
});

test('기본 시간표에 있는 편은 등록 없이도 채워진다', () => {
  const e = store.addEntry({ date: '2026-09-19', code: 'KE0901' });
  assert.strictEqual(e.route, 'ICN/CDG');
  assert.strictEqual(e.start, '12:05');
  assert.strictEqual(e.end, '18:30');
});

test('직접 등록한 값이 기본 시간표를 이긴다', () => {
  store.learnFlight({ code: 'KE0901', type: 'flight', route: 'ICN/CDG', start: '13:00', end: '19:30' });
  const e = store.addEntry({ date: '2026-09-19', code: 'KE0901' });
  assert.strictEqual(e.start, '13:00');
  assert.strictEqual(e.end, '19:30');
});
