const test = require('node:test');
const assert = require('node:assert');
const store = require('../src/store.js');
const parser = require('../src/parser.js');

// 기본 시간표는 따로 시험한다. 기억·저장 시험에서는 꺼 두어야 무엇이 어디서
// 왔는지 헷갈리지 않는다.
test.beforeEach(() => { store.clearAll(); store.forgetTimes(); store.setUseTable(false); });

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

test('덮어쓰기는 넣는 범위를 통째로 지운다', () => {
  // 넣는 날짜만 지우면 예전에 잘못 들어간 날이 그대로 남아, 1월 1일 유령 비행이
  // 다시 읽어도 사라지지 않았다.
  store.addEntry({ date: '2026-01-05', code: 'KE9999' });
  store.addEntry({ date: '2026-01-08', code: 'ADO' });
  const parsed = parser.parse('2026-01-04\tLO\n2026-01-12\tKE0006', { year: 2026, month: 1 });
  store.applyEntries(parsed.entries, 'replace');
  assert.deepStrictEqual(store.getByDate('2026-01-05').map((e) => e.code), []);
  assert.deepStrictEqual(store.getByDate('2026-01-08').map((e) => e.code), []);
  assert.deepStrictEqual(store.getByDate('2026-01-04').map((e) => e.code), ['LO']);
});

test('범위 밖은 건드리지 않고, 달 전체 지우기를 고르면 그 달만 비운다', () => {
  store.addEntry({ date: '2026-01-01', code: 'KE2012' });
  store.addEntry({ date: '2026-02-20', code: 'ATDO' });
  const parsed = parser.parse('2026-01-04\tLO', { year: 2026, month: 1 });

  store.applyEntries(parsed.entries, 'replace');
  assert.deepStrictEqual(store.getByDate('2026-01-01').map((e) => e.code), ['KE2012'], '범위 밖은 남는다');

  store.applyEntries(parsed.entries, 'replace', { clearMonth: '2026-01' });
  assert.deepStrictEqual(store.getByDate('2026-01-01').map((e) => e.code), [], '달 전체를 비운다');
  assert.deepStrictEqual(store.getByDate('2026-02-20').map((e) => e.code), ['ATDO'], '다른 달은 그대로');

  assert.deepStrictEqual(store.dateSpan([{ date: '2026-01-04' }, { date: '2026-01-12' }]),
    { from: '2026-01-04', to: '2026-01-12' });
  assert.deepStrictEqual(store.dateSpan([], { clearMonth: '2026-02' }),
    { from: '2026-02-01', to: '2026-02-28' });
});

test('시각은 덮어쓰지 않고 보탠다', () => {
  const HOME = '01\n9\nFRI\nKE 0005\nICN -LAS / 21:03 - 14:43';
  store.applyEntries(parser.parse(HOME, { year: 2026, month: 1 }).entries, 'replace');
  assert.deepStrictEqual(store.getByDate('2026-01-09').map((e) => [e.start, e.end]), [['21:03', '14:43']]);

  // 시각 없는 달력 캡처를 나중에 넣어도 시각이 날아가지 않는다
  store.applyEntries(parser.parse('2026-01-09\tKE0005', { year: 2026, month: 1 }).entries, 'replace');
  const kept = store.getByDate('2026-01-09')[0];
  assert.deepStrictEqual([kept.start, kept.end, kept.timeSource], ['21:03', '14:43', 'kept']);
});

test('직접 넣은 시각은 원본보다 우선한다', () => {
  store.applyEntries(parser.parse('2026-01-09\tKE0005', { year: 2026, month: 1 }).entries, 'replace');
  const e = store.getByDate('2026-01-09')[0];
  store.setTimes('2026-01-09', e.id, { start: '20:00' });
  assert.strictEqual(store.getByDate('2026-01-09')[0].timeSource, 'user');

  store.applyEntries(parser.parse('01\n9\nFRI\nKE 0005\nICN -LAS / 21:03 - 14:43',
    { year: 2026, month: 1 }).entries, 'replace');
  const after = store.getByDate('2026-01-09')[0];
  assert.strictEqual(after.start, '20:00', '직접 넣은 값이 남는다');
  assert.strictEqual(after.timeSource, 'user');
});

test('시각이 빈 비행만 모아 준다', () => {
  store.applyEntries(parser.parse('2026-01-09\tKE0005 LO\n2026-01-11\tKE0006',
    { year: 2026, month: 1 }).entries, 'replace');
  assert.deepStrictEqual(store.missingTimes().map((x) => x.code), ['KE0005', 'KE0006'], '체류는 빼고 비행만');
});

/* ---------------- 편명별 시각 기억 ---------------- */

test('원본에서 받은 시각을 편명별로 기억했다가 편명만 들어와도 채운다', () => {
  // 1) 홈 화면(목록) 글 — 시각이 들어 있다
  store.applyEntries(parser.parse('2026-01-09\tKE0005\tICN/LAS\t2103-1443',
    { year: 2026, month: 1 }).entries, 'append');
  assert.strictEqual(store.recallTimes('KE0005').start, '21:03');
  assert.strictEqual(store.recallTimes('KE0005').source, 'original');

  // 2) 다른 달에 편명만 들어와도 기억해 둔 시각이 붙는다
  store.applyEntries(parser.parse('2026-02-14\tKE0005', { year: 2026, month: 2 }).entries, 'append');
  const feb = store.getByDate('2026-02-14')[0];
  assert.strictEqual(feb.start, '21:03');
  assert.strictEqual(feb.end, '14:43');
  assert.strictEqual(feb.timeSource, 'memory', '기억해서 채운 값이라고 표시한다');
});

test('기억은 원본과 직접 넣은 값만 배운다 — 기억해 채운 값을 다시 배우지 않는다', () => {
  store.applyEntries([{ date: '2026-01-09', code: 'KE0005', start: '21:03', end: '14:43' }], 'append');
  // 기억해서 채워진 건은 다시 배움의 재료가 되지 않는다
  const filled = store.decorate({ date: '2026-02-14', code: 'KE0005', start: '09:00', timeSource: 'memory' });
  assert.strictEqual(store.learnTimes(filled), null);
  assert.strictEqual(store.recallTimes('KE0005').start, '21:03', '원본 값이 그대로 남는다');
});

test('직접 넣은 시각이 기억에서도 원본보다 우선한다', () => {
  store.applyEntries([{ date: '2026-01-09', code: 'KE0005', start: '21:03' }], 'append');
  const mine = store.decorate({ date: '2026-01-09', code: 'KE0005', start: '20:30', timeSource: 'user' });
  store.learnTimes(mine);
  assert.strictEqual(store.recallTimes('KE0005').start, '20:30');
  assert.strictEqual(store.recallTimes('KE0005').source, 'user');
  // 원본이 다시 들어와도 직접 넣은 기억을 덮지 않는다
  store.learnTimes(store.decorate({ date: '2026-03-01', code: 'KE0005', start: '21:03' }));
  assert.strictEqual(store.recallTimes('KE0005').start, '20:30');
});

test('기억이 원본을 덮지 않는다 — 원본에 시각이 있으면 그쪽이 맞다', () => {
  store.applyEntries([{ date: '2026-01-09', code: 'KE0005', start: '21:03', end: '14:43' }], 'append');
  store.applyEntries([{ date: '2026-02-14', code: 'KE0005', start: '19:00', end: '12:00' }], 'append');
  const feb = store.getByDate('2026-02-14')[0];
  assert.strictEqual(feb.start, '19:00', '새 원본이 우선');
  assert.notStrictEqual(feb.timeSource, 'memory');
});

test('기억해 둔 편명 시각을 목록으로 보고 지울 수 있다', () => {
  store.applyEntries([{ date: '2026-01-09', code: 'KE0005', start: '21:03' },
    { date: '2026-01-12', code: 'KE0006', end: '05:07' }], 'append');
  const book = store.timeBook();
  assert.deepStrictEqual(book.map((x) => x.code), ['KE0005', 'KE0006']);
  store.forgetTime('KE0005');
  assert.strictEqual(store.recallTimes('KE0005'), null);
  assert.ok(store.recallTimes('KE0006'), '나머지는 남는다');
});

test('이미 저장된 일정에도 기억한 시각을 한 번에 채운다', () => {
  store.applyEntries([{ date: '2026-01-09', code: 'KE0005', start: '21:03', end: '14:43' }], 'append');
  store.forgetTimes();
  store.learnTimes(store.decorate({ date: '2026-01-09', code: 'KE0006', start: '22:46' }));
  store.applyEntries([{ date: '2026-03-02', code: 'KE0006' }], 'append');
  // 일부러 비워 두고 나중에 채우는 길도 있어야 한다
  const before = store.getByDate('2026-03-02')[0];
  assert.strictEqual(before.start, '22:46');
  assert.strictEqual(store.fillTimesFromMemory(), 0, '이미 채워졌으면 더 채울 것이 없다');
});

test('기억 기능이 생기기 전에 넣어 둔 일정에서도 시각을 거둬들인다', () => {
  store.applyEntries([{ date: '2026-01-09', code: 'KE0005', start: '21:03', end: '14:43' }], 'append');
  store.forgetTimes();
  assert.strictEqual(store.recallTimes('KE0005'), null);
  assert.ok(store.learnFromStored() >= 1);
  assert.strictEqual(store.recallTimes('KE0005').start, '21:03');
});

test('날을 넘겨 나는 편은 떠나는 날 출발, 닿는 날 도착만 채운다', () => {
  // KE0006 은 10일 LAS 출발 → 11일 기내 → 12일 ICN 도착.
  // 세 칸 모두에 출발·도착을 같이 달면 안 된다.
  store.applyEntries([{ date: '2026-01-10', code: 'KE0006', route: 'LAS/ICN', start: '22:46' },
    { date: '2026-01-12', code: 'KE0006', route: 'LAS/ICN', end: '05:07' }], 'append');
  store.clearAll();

  store.applyEntries([
    { date: '2026-01-10', code: 'KE0006' },
    { date: '2026-01-11', code: 'KE0006' },
    { date: '2026-01-12', code: 'KE0006' }
  ], 'append');
  const day = (d) => store.getByDate(d)[0];
  assert.strictEqual(day('2026-01-10').start, '22:46', '떠나는 날은 출발만');
  assert.strictEqual(day('2026-01-10').end, null);
  assert.strictEqual(day('2026-01-11').start, null, '기내인 날은 비워 둔다');
  assert.strictEqual(day('2026-01-11').end, null);
  assert.strictEqual(day('2026-01-12').start, null, '닿는 날은 도착만');
  assert.strictEqual(day('2026-01-12').end, '05:07');
});

test('떨어진 날에 같은 편명이 또 나오면 저마다 한 번의 비행이다', () => {
  const roles = store.legRolesOf([
    { date: '2026-01-04', code: 'KE0658', type: 'flight' },
    { date: '2026-01-05', code: 'KE0658', type: 'flight' },
    { date: '2026-01-20', code: 'KE0658', type: 'flight' }
  ]);
  assert.strictEqual(roles['2026-01-04|KE0658'], 'depart');
  assert.strictEqual(roles['2026-01-05|KE0658'], 'arrive');
  assert.strictEqual(roles['2026-01-20|KE0658'], undefined, '홀로 선 날은 한쪽만 보지 않는다');
});

test('하루 왕복은 출발·도착을 모두 채운다', () => {
  store.applyEntries([{ date: '2026-01-07', code: 'KE0727', route: 'ICN/KIX', start: '11:03', end: '12:41' }], 'append');
  store.clearAll();
  store.applyEntries([{ date: '2026-02-07', code: 'KE0727' }], 'append');
  const e = store.getByDate('2026-02-07')[0];
  assert.strictEqual(e.start, '11:03');
  assert.strictEqual(e.end, '12:41');
});

/* ---------------- 기본 시간표 ---------------- */

test('원본에도 기억에도 없으면 기본 시간표에서 한국 쪽 시각을 가져온다', () => {
  store.setUseTable(true);
  store.applyEntries([{ date: '2026-01-09', code: 'KE0005' }], 'append');
  const e = store.getByDate('2026-01-09')[0];
  assert.strictEqual(e.start, '21:00', '인천 출발 시각');
  assert.strictEqual(e.timeSource, 'table', '시간표에서 왔다고 표시한다');
});

test('시간표는 원본과 기억보다 뒤다', () => {
  store.setUseTable(true);
  // 원본이 있으면 원본
  store.applyEntries([{ date: '2026-01-09', code: 'KE0005', start: '21:03' }], 'append');
  assert.strictEqual(store.getByDate('2026-01-09')[0].start, '21:03');
  // 그 원본을 기억했으니 다음 달에는 기억이 시간표를 이긴다
  store.applyEntries([{ date: '2026-02-09', code: 'KE0005' }], 'append');
  const feb = store.getByDate('2026-02-09')[0];
  assert.strictEqual(feb.start, '21:03', '기억이 시간표보다 먼저');
  assert.strictEqual(feb.timeSource, 'memory');
});

test('시간표에서 온 값은 기억으로 배우지 않는다', () => {
  store.setUseTable(true);
  store.applyEntries([{ date: '2026-01-09', code: 'KE0005' }], 'append');
  assert.strictEqual(store.timeBook().length, 0, '시간표 값은 기억에 담지 않는다');
});

test('시간표를 꺼 두면 쓰지 않는다', () => {
  store.setUseTable(false);
  store.applyEntries([{ date: '2026-01-09', code: 'KE0005' }], 'append');
  assert.strictEqual(store.getByDate('2026-01-09')[0].start, null);
});

test('시간표에도 익일 도착이 그대로 담겨 있다', () => {
  store.setUseTable(true);
  const row = store.fromTable('KE0006');
  assert.strictEqual(row.end, '04:40');
  assert.strictEqual(row.endOffset, 1);
  assert.strictEqual(store.fromTable('KE9999'), null, '표에 없으면 없다고 한다');
});
