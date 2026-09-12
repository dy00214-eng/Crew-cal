const test = require('node:test');
const assert = require('node:assert');
const ocrlayout = require('../src/ocrlayout.js');
const parser = require('../src/parser.js');

/** 네모를 손으로 적기 번거로우니, 칸 위치만 주면 글자 하나를 만들어 준다. */
function word(text, col, row, options) {
  const opts = options || {};
  const x0 = 20 + col * 160;
  const y0 = 100 + row * 30;
  return {
    text: text,
    conf: opts.conf == null ? 95 : opts.conf,
    x0: opts.x0 == null ? x0 : opts.x0,
    x1: (opts.x0 == null ? x0 : opts.x0) + text.length * 12,
    y0: y0,
    y1: y0 + 20
  };
}

/** 한 주가 든 달력. 날짜 줄 아래에 근무가 칸칸이 놓인다. */
function calendarWords() {
  const out = [];
  ['1', '2', '3', '4', '5', '6', '7'].forEach((d, i) => out.push(word(d, i, 0)));
  out.push(word('ATDO', 0, 1));
  out.push(word('KE0035', 1, 1));
  out.push(word('ICN/ATL', 1, 2));
  out.push(word('0945-', 1, 3));
  out.push(word('1020', 1, 4));
  out.push(word('LO', 2, 1));
  out.push(word('KE0036', 3, 1));
  out.push(word('VAC', 6, 1));
  return out;
}

test('달력은 칸을 되짚어 날짜별로 모은다', () => {
  const out = ocrlayout.toText(calendarWords());
  assert.strictEqual(out.shape, 'calendar');
  assert.deepStrictEqual(out.text.split('\n'), [
    '1\tATDO',
    '2\tKE0035 ICN/ATL 0945-1020',
    '3\tLO',
    '4\tKE0036',
    '7\tVAC'
  ]);
});

test('몇 년 몇 월인지 알면 날짜를 또렷이 적는다', () => {
  const out = ocrlayout.toText(calendarWords(), { year: 2026, month: 9 });
  assert.ok(out.text.startsWith('2026-09-01\tATDO'));

  // 파서까지 태워 보면 그대로 일정이 된다
  const entries = parser.parse(out.text, { year: 2026, month: 9 }).entries;
  assert.deepStrictEqual(entries.map((e) => [e.date, e.code]), [
    ['2026-09-01', 'ATDO'], ['2026-09-02', 'KE0035'], ['2026-09-03', 'LO'],
    ['2026-09-04', 'KE0036'], ['2026-09-07', 'VAC']
  ]);
  assert.strictEqual(entries[1].route, 'ICN/ATL');
  assert.strictEqual(entries[1].start, '09:45');
  assert.strictEqual(entries[1].end, '10:20');
});

test('한 줄에 하루씩인 표는 줄을 그대로 잇는다', () => {
  const words = [];
  [['01SEP26', 'ATDO'], ['02SEP26', 'KE0035'], ['03SEP26', 'LO'], ['04SEP26', 'KE0036']]
    .forEach((row, i) => row.forEach((text, col) => words.push(word(text, col, i))));

  const out = ocrlayout.toText(words);
  assert.strictEqual(out.shape, 'list');
  assert.strictEqual(out.text.split('\n')[0], '01SEP26 ATDO');
  const entries = parser.parse(out.text, { year: 2026, month: 9 }).entries;
  assert.deepStrictEqual(entries.map((e) => e.date),
    ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04']);
});

test('편명·날짜·시각에 섞여 든 O 를 0 으로 되돌린다', () => {
  assert.strictEqual(ocrlayout.fixCode('KEO0035'), 'KE0035');   // 자리가 하나 늘었다
  assert.strictEqual(ocrlayout.fixCode('KEOO35'), 'KE0035');
  assert.strictEqual(ocrlayout.fixCode('KE0902'), 'KE0902');
  assert.strictEqual(ocrlayout.fixCode('O3SEP26'), '03SEP26');
  assert.strictEqual(ocrlayout.fixCode('O02SEP26'), '02SEP26');
  assert.strictEqual(ocrlayout.fixCode('O945-1O20'), '0945-1020');

  // 편명도 날짜도 아닌 글자는 건드리지 않는다
  assert.strictEqual(ocrlayout.fixCode('ICN/ATL'), 'ICN/ATL');
  assert.strictEqual(ocrlayout.fixCode('ATDO'), 'ATDO');
  assert.strictEqual(ocrlayout.fixCode('99XYZ12'), '99XYZ12');
  assert.strictEqual(ocrlayout.fixCode('KE12345678'), 'KE12345678');
});

test('쪼개진 시각은 도로 붙인다', () => {
  assert.deepStrictEqual(ocrlayout.joinTimes(['0945-', '1020']), ['0945-1020']);
  assert.deepStrictEqual(ocrlayout.joinTimes(['2350-', '0620+1']), ['2350-0620+1']);
  assert.deepStrictEqual(ocrlayout.joinTimes(['LO', '0945-', 'ICN']), ['LO', '0945-', 'ICN']);
});

test('선이나 무늬를 글자로 본 것은 버린다', () => {
  const words = calendarWords();
  words.push(word('|', 5, 1, { conf: 20 }));
  words.push(word('e', 5, 2, { conf: 12 }));
  const out = ocrlayout.toText(words);
  assert.ok(out.text.indexOf('|') === -1 && !/\be\b/.test(out.text));

  // 자신 없어도 긴 글자는 남긴다. 날짜 한 줄이 통째로 사라지는 편이 더 나쁘다.
  const kept = ocrlayout.toText([...calendarWords(), word('KE0081', 5, 1, { conf: 20 })]);
  assert.ok(kept.text.indexOf('KE0081') !== -1);
});

test('자신 없어 한 글자는 확인하라고 알려준다', () => {
  const words = calendarWords();
  words.push(word('KE0999', 4, 1, { conf: 41 }));
  const out = ocrlayout.toText(words);
  assert.deepStrictEqual(out.unsure, ['KE0999']);
});

test('달력 귀퉁이에 붙은 앞뒤 달은 떼어 낸다', () => {
  const words = [];
  // 8월 30, 31 뒤에 9월 1, 2 …
  ['30', '31', '1', '2', '3', '4', '5'].forEach((d, i) => words.push(word(d, i, 0)));
  ['LO', 'ATDO', 'VAC', 'VAC', 'DO', 'DO', 'DO'].forEach((c, i) => words.push(word(c, i, 1)));

  const out = ocrlayout.toText(words, { year: 2026, month: 9 });
  assert.strictEqual(out.dropped, 2);
  assert.ok(out.text.indexOf('2026-09-30') === -1);
  assert.ok(out.text.startsWith('2026-09-01\tVAC'));
});

test('같은 날이 두 번 나오면 앞의 것만 쓴다', () => {
  const lines = ocrlayout.cellLines(
    [{ day: 3, tokens: ['LO'] }, { day: 3, tokens: ['XX'] }, { day: 4, tokens: ['DO'] }],
    { year: 2026, month: 9 });
  assert.deepStrictEqual(lines, ['2026-09-03\tLO', '2026-09-04\tDO']);
});

test('읽은 글자가 없으면 빈 글을 준다', () => {
  assert.deepStrictEqual(ocrlayout.toText([]), { text: '', shape: 'plain', unsure: [], dropped: 0 });
  assert.deepStrictEqual(ocrlayout.toText(), { text: '', shape: 'plain', unsure: [], dropped: 0 });
});

test('달력도 표도 아니면 줄만 이어 붙인다', () => {
  const words = [word('스케줄', 0, 0), word('KE0035', 1, 0), word('ICN/ATL', 2, 0)];
  const out = ocrlayout.toText(words);
  assert.strictEqual(out.shape, 'plain');
  assert.strictEqual(out.text, '스케줄 KE0035 ICN/ATL');
});
