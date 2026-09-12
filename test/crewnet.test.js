const test = require('node:test');
const assert = require('node:assert');
const crewnet = require('../src/crewnet.js');

/** 크루넷 홈 화면을 글로 옮긴 모양. 왼쪽 날짜 블록이 세 줄이다. */
const JANUARY = [
  '1:55', 'HANWAY Crewnet',
  '01', '7', 'WED', 'KE 0727', 'ICN -KIX / 11:03 - 12:41', 'KE 0728', 'KIX -ICN / 13:59 - 16:03',
  '01', '8', 'THU', 'ADO',
  '01', '9', 'FRI', 'KE 0005', 'ICN -LAS / 21:03 - 14:43', 'LO', 'LAS / -',
  '01', '10', 'SAT', 'LO', 'LAS / - 21:30', 'KE 0006', 'LAS -ICN / 22:46 -',
  '01', '11', 'SUN', 'KE 0006', 'LAS -ICN / -',
  '01', '12', 'MON', 'KE 0006', 'LAS -ICN / - 05:07',
  '01', '13', 'TUE', 'ATDO',
  '홈', '스케줄', 'crewnet.koreanair.com'
].join('\n');

function parse() {
  return crewnet.parse(JANUARY, { year: 2026, month: 1 });
}

function on(out, date) {
  return out.entries.filter((e) => e.date === date);
}

test('왼쪽 세 줄 가운데 둘째 줄만 날짜로 읽는다', () => {
  const out = parse();
  // 첫 줄의 '01' 은 달이다. 이걸 1일로 읽어 17일 비행이 1일에 복제된 일이 있었다.
  assert.deepStrictEqual(out.days, [
    '2026-01-07', '2026-01-08', '2026-01-09', '2026-01-10',
    '2026-01-11', '2026-01-12', '2026-01-13'
  ]);
  assert.strictEqual(on(out, '2026-01-01').length, 0, '1일에는 아무것도 없다');
  assert.deepStrictEqual(out.warnings, [], '요일까지 달력과 맞는다');
});

test('요일이 달력과 어긋나면 알려 준다', () => {
  const out = crewnet.parse('01\n7\nMON\nADO\n01\n8\nTHU\nADO', { year: 2026, month: 1 });
  assert.strictEqual(out.warnings.length, 1);
  assert.match(out.warnings[0].message, /7일은 MON 이 아닙니다/);
  assert.strictEqual(out.entries[0].date, '2026-01-07', '날짜는 그대로 쓴다');
});

test('구간은 원본 문자열에서 그대로 읽는다', () => {
  const out = parse();
  const go = on(out, '2026-01-07')[0];
  assert.strictEqual(go.code, 'KE0727');
  assert.strictEqual(go.route, 'ICN/KIX');
  assert.strictEqual(go.from, 'ICN');
  assert.strictEqual(go.to, 'KIX');
});

test('시각 칸은 그날 무슨 일이 있었는지로 읽는다', () => {
  assert.deepStrictEqual(crewnet.readTimes('21:03 - 14:43'), { start: '21:03', end: '14:43' });
  assert.deepStrictEqual(crewnet.readTimes('22:46 -'), { start: '22:46', end: null });
  assert.deepStrictEqual(crewnet.readTimes('- 05:07'), { start: null, end: '05:07' });
  assert.deepStrictEqual(crewnet.readTimes('-'), { start: null, end: null });
  assert.strictEqual(crewnet.readTimes('LAS'), null);
});

test('체류도 공항과 끝나는 시각을 읽는다', () => {
  const out = parse();
  const start = on(out, '2026-01-09').find((e) => e.code === 'LO');
  assert.strictEqual(start.route, 'LAS');
  assert.strictEqual(start.start, null);
  assert.strictEqual(start.end, null, '체류 시작일에는 시각이 없다');

  const done = on(out, '2026-01-10').find((e) => e.code === 'LO');
  assert.strictEqual(done.end, '21:30', '체류가 끝나는 시각');
});

test('날을 넘겨 나는 편은 한 편으로 묶는다', () => {
  const out = parse();
  const legs = out.entries.filter((e) => e.code === 'KE0006');
  assert.deepStrictEqual(legs.map((e) => e.date),
    ['2026-01-10', '2026-01-11', '2026-01-12']);
  assert.deepStrictEqual(legs.map((e) => e.legRole), ['depart', 'enroute', 'arrive']);
  assert.strictEqual(new Set(legs.map((e) => e.segment)).size, 1, '한 세그먼트');
  assert.deepStrictEqual(legs.map((e) => e.segmentStart), [true, false, false]);
  assert.strictEqual(legs[0].start, '22:46');
  assert.strictEqual(legs[1].start, null);
  assert.strictEqual(legs[1].end, null, '기내인 날은 출발도 도착도 없다');
  assert.strictEqual(legs[2].end, '05:07');
});

test('휴무 코드는 읽은 그대로 쓴다', () => {
  const out = parse();
  assert.strictEqual(on(out, '2026-01-08')[0].code, 'ADO');
  assert.strictEqual(on(out, '2026-01-13')[0].code, 'ATDO');
  assert.strictEqual(on(out, '2026-01-13')[0].category, 'off');
});

test('TVL 은 바로 앞 편명 카드에 붙는다', () => {
  const out = crewnet.parse(
    '01\n29\nTHU\nKE 0601\nICN -CEB / 18:50 - 22:05\nTVL', { year: 2026, month: 1 });
  assert.strictEqual(out.entries.length, 1);
  assert.strictEqual(out.entries[0].code, 'KE0601', '편명은 원본 그대로');
  assert.strictEqual(out.entries[0].deadhead, true);
});

test('화면 껍데기 줄은 버린다', () => {
  const out = parse();
  assert.ok(!out.entries.some((e) => /HANWAY|홈|스케줄/.test(e.code)));
  assert.deepStrictEqual(out.warnings, []);
});

test('한 줄에 붙어 읽힌 날짜 블록도 받는다', () => {
  const out = crewnet.parse('01 9 FRI KE 0005\nICN -LAS / 21:03 - 14:43\n01 10 SAT\nLO\nLAS / -',
    { year: 2026, month: 1 });
  assert.deepStrictEqual(out.days, ['2026-01-09', '2026-01-10']);
  assert.strictEqual(out.entries[0].code, 'KE0005');
  assert.strictEqual(out.entries[0].route, 'ICN/LAS');
});

test('크루넷 목록인지 알아본다', () => {
  assert.strictEqual(crewnet.looksLikeCrewnet(JANUARY), true);
  assert.strictEqual(crewnet.looksLikeCrewnet('2026-09-06 KE0035 LO'), false);
  assert.strictEqual(crewnet.looksLikeCrewnet(''), false);
});

test('TVL 은 제 엔트리를 만들지 않고 그 편에만 붙는다', () => {
  // 배지로 한 번, 엔트리로 한 번 두 번 나오던 것
  const out = crewnet.parse('01\n29\nTHU\nKE 0601\nICN -CEB / 18:50 - 22:05\nTVL',
    { year: 2026, month: 1 });
  assert.strictEqual(out.entries.length, 1, 'TVL 엔트리는 만들지 않는다');
  assert.strictEqual(out.entries[0].code, 'KE0601');
  assert.strictEqual(out.entries[0].deadhead, true);
});

test('하루치만 붙여넣어도 크루넷 목록으로 알아본다', () => {
  assert.strictEqual(crewnet.looksLikeCrewnet('01\n9\nFRI\nKE 0005\nICN -LAS / 21:03 - 14:43'), true);
  assert.strictEqual(crewnet.looksLikeCrewnet('2026-09-06 KE0035 LO'), false);
});
