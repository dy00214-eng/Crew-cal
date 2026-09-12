const test = require('node:test');
const assert = require('node:assert');
const ocrlayout = require('../src/ocrlayout.js');
const parser = require('../src/parser.js');
const codes = require('../src/codes.js');

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

test('판 색을 알면 두 글자 코드도 되돌린다', () => {
  // 크루넷은 휴무를 연두, 비행·체류를 파랑 판에 적는다. 색을 알면 PO 가 DO 인지
  // LO 인지 가려진다. 색을 모르면 헷갈릴 수 있으니 건드리지 않는다.
  assert.strictEqual(ocrlayout.fixCode('PO', 'green'), 'DO');
  assert.strictEqual(ocrlayout.fixCode('TO', 'blue'), 'LO');
  assert.strictEqual(ocrlayout.fixCode('WO', 'blue'), 'LO');
  assert.strictEqual(ocrlayout.fixCode('PO'), 'PO', '색을 모르면 그냥 둔다');
  assert.strictEqual(ocrlayout.fixCode('STBV', 'gray'), 'STBY');
  assert.strictEqual(ocrlayout.fixCode('FVG', 'blue'), 'FVC');

  // 제대로 읽힌 코드는 색과 무관하게 그대로
  assert.strictEqual(ocrlayout.fixCode('LO', 'blue'), 'LO');
  assert.strictEqual(ocrlayout.fixCode('ATDO', 'green'), 'ATDO');
  // 그 색에 없는 갈래로는 바꾸지 않는다
  assert.strictEqual(ocrlayout.fixCode('STBV', 'green'), 'STBV');
});

test('붙어 읽힌 두 편명은 가른다', () => {
  assert.deepStrictEqual(ocrlayout.splitCodes(['KE2071KE1402']), ['KE2071', 'KE1402']);
  assert.deepStrictEqual(ocrlayout.splitCodes(['KE2071{KE1402']), ['KE2071', 'KE1402']);
  assert.deepStrictEqual(ocrlayout.splitCodes(['KE0035', 'LO']), ['KE0035', 'LO']);
});

test('날짜 하나를 잘못 읽어도 그 주가 어긋나지 않는다', () => {
  // 25 를 23 으로 잘못 읽은 줄. 나머지 여섯 칸이 바로잡아야 한다.
  const words = [];
  ['19', '20', '21', 'PE', '23', '24', '23'].forEach((d, i) => words.push(word(d, i, 0)));
  ['ATDO', 'KE0647', 'LO', 'VAC', 'DO'].forEach((code, i) => words.push(word(code, i === 4 ? 6 : i, 1)));

  const out = ocrlayout.toText(words, { year: 2026, month: 4 });
  assert.ok(out.text.indexOf('2026-04-19\tATDO') !== -1, out.text);
  assert.ok(out.text.indexOf('2026-04-25\tDO') !== -1, '마지막 칸은 25일: ' + out.text);
});

test('달이 바뀌는 주는 한 줄 안에서 기준이 바뀐다', () => {
  const words = [];
  ['28', '29', '30', '1', '2', '3', '4'].forEach((d, i) => words.push(word(d, i, 0)));
  words.push(word('LO', 1, 1));      // 8월 29일
  words.push(word('VAC', 4, 1));     // 9월 2일

  const days = ocrlayout.daysOfWeekRow(ocrlayout.rows(words.map((w) => ({
    text: w.text, conf: w.conf, x0: w.x0, x1: w.x1, y0: w.y0, y1: w.y1,
    cx: (w.x0 + w.x1) / 2, cy: (w.y0 + w.y1) / 2, h: w.y1 - w.y0
  })))[0], [26, 186, 346, 506, 666, 826, 986]);

  assert.deepStrictEqual(days, [28, 29, 30, 1, 2, 3, 4]);
});

test('달이 목요일에 시작해 앞이 비어도 날짜가 밀리지 않는다', () => {
  // 2026년 1월. 첫 주 앞 네 칸이 비어 있고 1·2·3 만 오른쪽에 있다.
  const words = [];
  ['1', '2', '3'].forEach((d, i) => words.push(word(d, i + 4, 0)));
  words.push(word('ATDO', 4, 1));                    // 1일
  ['4', '5', '6', '7', '8', '9', '10'].forEach((d, i) => words.push(word(d, i, 3)));
  words.push(word('KE0006', 0, 4));                  // 4일
  ['11', '12', '13', '14', '15', '16', '17'].forEach((d, i) => words.push(word(d, i, 6)));
  words.push(word('KE2011', 4, 7));                  // 15일
  words.push(word('KE2012', 6, 7));                  // 17일

  const out = ocrlayout.toText(words, { year: 2026, month: 1 });
  const lines = out.text.split('\n');
  assert.deepStrictEqual(lines, [
    '2026-01-01\tATDO',
    '2026-01-04\tKE0006',
    '2026-01-15\tKE2011',
    '2026-01-17\tKE2012'
  ], out.text);
});

test('날짜를 못 읽은 주는 자리로 날짜를 지어내지 않는다', () => {
  // 첫 주의 날짜 줄이 통째로 안 읽힌 경우. 예전에는 다음 주에서 이레를 빼
  // 날짜를 만들어 붙였고, 그 바람에 엉뚱한 날에 근무가 복제됐다.
  const words = [];
  words.push(word('ATDO', 4, 0));                    // 날짜 줄 없이 근무만
  ['8', '9', '10', '11', '12', '13', '14'].forEach((d, i) => words.push(word(d, i, 3)));
  words.push(word('KE0006', 0, 4));
  ['15', '16', '17', '18', '19', '20', '21'].forEach((d, i) => words.push(word(d, i, 6)));
  words.push(word('KE2011', 0, 7));
  words.push(word('KE2012', 2, 7));

  const out = ocrlayout.toText(words, { year: 2026, month: 1 });
  assert.deepStrictEqual(out.text.split('\n'),
    ['2026-01-08\tKE0006', '2026-01-15\tKE2011', '2026-01-17\tKE2012'],
    '지어낸 날짜가 없다: ' + out.text);
  assert.ok(out.text.indexOf('ATDO') === -1, '날짜를 모르는 근무는 버린다: ' + out.text);
});

test('편명 숫자는 짐작으로 바뀌지 않는다', () => {
  // 글자를 숫자로 되돌리는 것은 되지만(O -> 0), 숫자를 다른 숫자로 바꾸지는 않는다
  assert.strictEqual(ocrlayout.fixCode('KEO601'), 'KE0601');
  assert.strictEqual(ocrlayout.fixCode('KE060I'), 'KE0601');
  assert.strictEqual(ocrlayout.fixCode('KE0601'), 'KE0601', '시간표에 없어도 그대로');
  assert.strictEqual(ocrlayout.fixCode('KE0502'), 'KE0502');
  assert.strictEqual(ocrlayout.keepFlightNumber('KE0601', 'KE0502'), 'KE0601');
  assert.strictEqual(ocrlayout.flightDigits('KE0601'), '601');
  assert.strictEqual(ocrlayout.flightDigits('KE060I'), null, '아직 되돌릴 여지가 있다');
});

test('휴무 코드끼리는 절대 바꿔치지 않는다', () => {
  // ATDO / ADO / DO 는 서로 다른 근무다
  assert.strictEqual(ocrlayout.fixCode('ATDO', 'green'), 'ATDO');
  assert.strictEqual(ocrlayout.fixCode('ADO', 'green'), 'ADO');
  assert.strictEqual(ocrlayout.fixCode('DO', 'green'), 'DO');
  assert.strictEqual(ocrlayout.fixCode('ATDO'), 'ATDO');
  assert.strictEqual(ocrlayout.fixCode('ADO'), 'ADO');
});

test('날짜 숫자가 옆 글자와 같은 띠로 읽혀도 그 주를 잃지 않는다', () => {
  // 2026년 1월. 3주차 날짜 줄(11~17)이 2주차 근무와 같은 높이로 묶여 읽힌 상황.
  // 예전에는 그 줄을 날짜 줄로 못 알아봐 11~17일 내용이 4~10일 칸에 흘러들었다.
  const words = [];
  const put = (text, col, y) => words.push({
    text, conf: 95, x0: 20 + col * 160, x1: 20 + col * 160 + text.length * 12, y0: y, y1: y + 20
  });

  ['4', '5', '6', '7', '8', '9', '10'].forEach((d, i) => put(d, i, 100));
  put('LO', 0, 140); put('KE0658', 0, 165);
  put('KE0658', 1, 140);
  put('ATDO', 2, 140);
  put('KE0727', 3, 140); put('KE0728', 3, 165);
  put('ADO', 4, 140);
  put('KE0005', 5, 140); put('LO', 5, 165);
  put('LO', 6, 140); put('KE0006', 6, 165);

  // 3주차 날짜 줄이 2주차 마지막 글자와 같은 높이(172)에 걸쳐 읽혔다
  ['11', '12', '13', '14', '15', '16', '17'].forEach((d, i) => put(d, i, 172));
  put('KE0006', 0, 210);
  put('KE0006', 1, 210);
  put('ATDO', 2, 210);
  put('ATDO', 3, 210);
  put('KE2011', 4, 210); put('LO', 4, 235);
  put('LO', 5, 210);
  put('KE2012', 6, 210);

  const out = ocrlayout.toText(words, { year: 2026, month: 1 });
  const lines = out.text.split('\n');
  const on = (day) => (lines.find((l) => l.indexOf('2026-01-' + day) === 0) || '').split('\t')[1] || '';

  // 2주차가 3주차 내용을 삼키지 않는다
  assert.strictEqual(on('04'), 'LO KE0658', out.text);
  assert.strictEqual(on('08'), 'ADO', out.text);
  assert.strictEqual(on('09'), 'KE0005 LO', out.text);
  assert.strictEqual(on('10'), 'LO KE0006', out.text);
  // 3주차가 자기 줄을 갖는다
  assert.strictEqual(on('11'), 'KE0006', out.text);
  assert.strictEqual(on('15'), 'KE2011 LO', out.text);
  assert.strictEqual(on('17'), 'KE2012', out.text);
  // 날짜 숫자가 내용에 섞이지 않는다
  assert.ok(!/\t.*\b(1[1-7])\b/.test(out.text), '날짜 숫자가 내용에 섞였다: ' + out.text);
});

test('한 칸의 글자만 그 날짜에 귀속된다', () => {
  const grid = ocrlayout.gridOf(ocrlayout.rows([
    { text: '4', conf: 95, x0: 20, x1: 32, y0: 100, y1: 120 },
    { text: '5', conf: 95, x0: 180, x1: 192, y0: 100, y1: 120 },
    { text: '6', conf: 95, x0: 340, x1: 352, y0: 100, y1: 120 },
    { text: 'ATDO', conf: 95, x0: 180, x1: 228, y0: 140, y1: 160 }
  ].map((w) => Object.assign({}, w, { cx: (w.x0 + w.x1) / 2, cy: (w.y0 + w.y1) / 2, h: w.y1 - w.y0 }))));
  assert.ok(grid, '칸을 잡는다');
  assert.strictEqual(grid.columns.length, 3);
  assert.deepStrictEqual(grid.dayRows[0].days, [4, 5, 6]);
});

test('편명 숫자 자리의 글자를 숫자로 되돌린다', () => {
  // KE000S 때문에 9~12일 라스베이거스 비행이 통째로 사라진 일이 있었다
  assert.strictEqual(ocrlayout.fixCode('KE000S'), 'KE0005');
  assert.strictEqual(ocrlayout.fixCode('KEOOO5'), 'KE0005');
  assert.strictEqual(ocrlayout.fixCode('KE2OI2'), 'KE2012');
  assert.strictEqual(ocrlayout.fixCode('KEO6OZ'), 'KE0602');
  assert.strictEqual(ocrlayout.toDigits('000S'), '0005');
  assert.strictEqual(ocrlayout.toDigits('00X5'), null, '되돌릴 수 없는 글자는 포기한다');

  // 숫자를 다른 숫자로 바꾸지는 않는다
  assert.strictEqual(ocrlayout.fixCode('KE0601'), 'KE0601');
  assert.strictEqual(ocrlayout.fixCode('KE0045'), 'KE0045');
  // 네 자리로 못 맞추면 편명으로 인정하지 않는다
  assert.strictEqual(ocrlayout.fixCode('KE12345'), 'KE12345');
  assert.strictEqual(codes.isFlightCode('KE12345'), false);
});

test('못 읽은 날과 섞여 든 날짜 숫자를 알려 준다', () => {
  const cells = [{ day: 4, tokens: ['LO'] }, { day: 5, tokens: ['ATDO', '12'] }];
  assert.deepStrictEqual(ocrlayout.missingDays(cells, { year: 2026, month: 1 }).slice(0, 4), [1, 2, 3, 6]);
  assert.deepStrictEqual(ocrlayout.strayDays(cells), [{ day: 5, token: '12' }]);
  assert.deepStrictEqual(ocrlayout.strayDays([{ day: 4, tokens: ['LO', 'KE0658'] }]), []);
});

test('노선표에 없는 편명 꼴은 다시 읽어 볼 값어치가 있다고 본다', () => {
  // KE0891 을 KE0691 로 읽어도 편명 꼴이라 그냥 지나가던 것을 막는다.
  // 비슷한 편명으로 갈아 끼우는 것이 아니라, 그 판을 더 크게 다시 읽으라는 표다.
  assert.strictEqual(ocrlayout.isKnownCode('KE0691'), true, '편명 꼴이긴 하다');
  assert.strictEqual(ocrlayout.isSettledCode('KE0691'), false, '노선표에 없으니 다시 본다');
  assert.strictEqual(ocrlayout.isSettledCode('KE0891'), true);
  assert.strictEqual(ocrlayout.isSettledCode('ATDO'), true, '아는 근무 코드');
  assert.strictEqual(ocrlayout.isSettledCode('AS0016'), false);
  assert.strictEqual(ocrlayout.isSeedFlight('KE891'), true, '자릿수가 달라도 같은 편');
});
