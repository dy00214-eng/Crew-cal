const test = require('node:test');
const assert = require('node:assert');
const parser = require('../src/parser.js');

const BASE = { year: 2026, month: 9 };

function parse(text, options) {
  return parser.parse(text, options || BASE);
}

function codesOn(result, date) {
  return result.entries.filter(e => e.date === date).map(e => e.code);
}

test('YYYY-MM-DD 형식과 항공편 코드', () => {
  const r = parse('2026-09-06 KE0035');
  assert.strictEqual(r.entries.length, 1);
  assert.deepStrictEqual(codesOn(r, '2026-09-06'), ['KE0035']);
  assert.strictEqual(r.entries[0].category, 'flight');
});

test('구분자가 달라도(., /) 날짜를 읽는다', () => {
  const r = parse('2026.09.06 LO\n2026/09/07 LO\n20260908 LO');
  assert.deepStrictEqual(
    r.entries.map(e => e.date),
    ['2026-09-06', '2026-09-07', '2026-09-08']
  );
});

test('연도 없는 MM/DD 는 기준 연월로 보정한다', () => {
  const r = parse('09/12 ATDO');
  assert.strictEqual(r.entries[0].date, '2026-09-12');
  assert.strictEqual(r.entries[0].category, 'off');
});

test('기준 월과 6개월 이상 벌어지면 다음 해로 넘긴다', () => {
  const r = parse('01/05 DO', { year: 2026, month: 11 });
  assert.strictEqual(r.entries[0].date, '2027-01-05');
});

test('한글 날짜 표기', () => {
  const r = parse('2026년 9월 6일 KE0035\n9월 7일 LO\n8일 STBY');
  assert.deepStrictEqual(
    r.entries.map(e => e.date),
    ['2026-09-06', '2026-09-07', '2026-09-08']
  );
});

test('요일 표기가 붙어 있어도 무시한다', () => {
  const r = parse('2026-09-06(일) STBY\n09/07 (월) LO\n08 [화] DO');
  assert.strictEqual(r.entries.length, 3);
  assert.deepStrictEqual(r.entries.map(e => e.code), ['STBY', 'LO', 'DO']);
});

test('DDMONYY / MONDD 형식', () => {
  const r = parse('06SEP26 KE0035\n07 SEP LO\nSEP08 DO');
  assert.deepStrictEqual(
    r.entries.map(e => e.date),
    ['2026-09-06', '2026-09-07', '2026-09-08']
  );
});

test('줄 앞의 일자 숫자만 있어도 날짜로 본다', () => {
  const r = parse('1\tKE0035\n2\tLO\n15\tATDO');
  assert.deepStrictEqual(
    r.entries.map(e => e.date),
    ['2026-09-01', '2026-09-02', '2026-09-15']
  );
});

test('날짜 줄 다음에 오는 코드 줄들을 그 날짜에 붙인다', () => {
  const r = parse('2026-09-06\n  KE0035\n  LO\n2026-09-07\n  KE0036');
  assert.deepStrictEqual(codesOn(r, '2026-09-06'), ['KE0035', 'LO']);
  assert.deepStrictEqual(codesOn(r, '2026-09-07'), ['KE0036']);
});

test('한 줄에 코드가 여러 개면 모두 반영한다', () => {
  const r = parse('2026-09-06  KE0035  LO');
  assert.deepStrictEqual(codesOn(r, '2026-09-06'), ['KE0035', 'LO']);
});

test('탭·다중 공백·쉼표 구분을 모두 처리한다', () => {
  const r = parse('2026-09-06\t\tKE0035 ,  LO   |  STBY');
  // 셋 다 읽어 들이고 하나도 버리지 않는다
  assert.deepStrictEqual(codesOn(r, '2026-09-06'), ['KE0035', 'LO', 'STBY']);
  assert.deepStrictEqual(r.dropped, []);
});

test('구간과 출발·도착 시각을 항공편에 붙인다', () => {
  const r = parse('2026-09-06 KE0035 ICN/JFK 1030-1420');
  const e = r.entries[0];
  assert.strictEqual(e.route, 'ICN/JFK');
  assert.strictEqual(e.start, '10:30');
  assert.strictEqual(e.end, '14:20');
  assert.strictEqual(e.endOffset, 0);
});

test('HH:MM-HH:MM 시각 표기', () => {
  const r = parse('2026-09-06 KE0035 09:30-14:20');
  assert.strictEqual(r.entries[0].start, '09:30');
  assert.strictEqual(r.entries[0].end, '14:20');
});

test('+1 이 붙으면 도착을 익일로 표시한다', () => {
  const r = parse('2026-09-06 KE0036 JFK/ICN 2350-0620+1\n2026-09-08 KE0038 23:50-06:20+1');
  assert.strictEqual(r.entries[0].start, '23:50');
  assert.strictEqual(r.entries[0].end, '06:20');
  assert.strictEqual(r.entries[0].endOffset, 1);
  assert.strictEqual(r.entries[1].endOffset, 1);
});

test('+1 이 따로 떨어져 있어도 익일로 본다', () => {
  const r = parse('2026-09-06 KE0036 2350-0620 +1');
  assert.strictEqual(r.entries[0].endOffset, 1);
});

test('한 줄에 시각이 두 번 나오면 출발 -> 도착 순으로 채운다', () => {
  const r = parse('2026-09-06 KE0035 10:30 14:20');
  assert.strictEqual(r.entries[0].start, '10:30');
  assert.strictEqual(r.entries[0].end, '14:20');
});

test('편명이 있는 줄의 3~4자리 숫자는 출발·도착 시각으로 읽는다', () => {
  const r = parse('2026-09-06\tKE0035\tICN/JFK\t1030\t1420');
  assert.strictEqual(r.entries[0].start, '10:30');
  assert.strictEqual(r.entries[0].end, '14:20');
});

test('STD/STA · DEP/ARR 라벨로 출발·도착을 구분한다', () => {
  const r = parse([
    '2026-09-06 KE0081 STD 1420 STA 0850+1',
    '2026-09-07 KE0082 DEP 09:30 ARR 18:40',
    '2026-09-08 KE0083 DEP1030 ARR:1420'
  ].join('\n'));
  assert.deepStrictEqual(
    r.entries.map(e => [e.start, e.end, e.endOffset]),
    [['14:20', '08:50', 1], ['09:30', '18:40', 0], ['10:30', '14:20', 0]]
  );
});

test('한글 출발/도착 라벨도 읽는다', () => {
  const r = parse('2026-09-06 KE0035 출발 09:30 도착 18:40');
  assert.strictEqual(r.entries[0].start, '09:30');
  assert.strictEqual(r.entries[0].end, '18:40');
});

test('라벨이 도착만 있으면 도착 시각만 채운다', () => {
  const r = parse('2026-09-06 KE0035 STA 1420');
  assert.strictEqual(r.entries[0].start, null);
  assert.strictEqual(r.entries[0].end, '14:20');
});

test('시각이 아닌 숫자는 시각으로 잡지 않는다', () => {
  const r = parse('2026-09-06 KE0035 9999');
  assert.strictEqual(r.entries[0].start, null);
  assert.strictEqual(r.entries[0].end, null);
});

test('비행이 아닌 근무에도 시작·종료 시각을 붙인다', () => {
  const r = parse('2026-09-06 STBY 0900-1700');
  assert.strictEqual(r.entries[0].code, 'STBY');
  assert.strictEqual(r.entries[0].start, '09:00');
  assert.strictEqual(r.entries[0].end, '17:00');
});

test('편이 두 개면 시각이 각 편에 나뉘어 붙는다', () => {
  const r = parse('2026-09-06 KE0035 1030-1420 KE0036 1620-1830');
  assert.deepStrictEqual(
    r.entries.map(e => [e.code, e.start, e.end]),
    [['KE0035', '10:30', '14:20'], ['KE0036', '16:20', '18:30']]
  );
});

test('시각 사이의 - 를 날짜 범위로 오해하지 않는다', () => {
  const r = parse('2026-09-06 KE0035 10:30 - 14:20');
  assert.strictEqual(r.entries.length, 1);
  assert.strictEqual(r.entries[0].start, '10:30');
  assert.strictEqual(r.entries[0].end, '14:20');
});

test('KE 0035 처럼 띄어 쓴 항공편도 하나로 묶는다', () => {
  const r = parse('2026-09-06 KE 0035');
  assert.deepStrictEqual(codesOn(r, '2026-09-06'), ['KE0035']);
});

test('날짜 범위(~)는 각 날짜로 펼친다', () => {
  const r = parse('2026-09-10 ~ 2026-09-12 VAC');
  assert.deepStrictEqual(
    r.entries.map(e => e.date),
    ['2026-09-10', '2026-09-11', '2026-09-12']
  );
  assert.ok(r.entries.every(e => e.code === 'VAC'));
});

test('슬래시로 붙은 근무 코드는 나누고, 공항 코드는 구간으로 둔다', () => {
  const r = parse('2026-09-06 LO/STBY\n2026-09-07 KE0035 ICN/NRT');
  assert.deepStrictEqual(codesOn(r, '2026-09-06'), ['LO', 'STBY']);
  assert.deepStrictEqual(codesOn(r, '2026-09-07'), ['KE0035']);
  assert.strictEqual(r.entries.find(e => e.date === '2026-09-07').route, 'ICN/NRT');
});

test('모르는 코드는 버리지 않고 미확인으로 표시하고 경고를 남긴다', () => {
  const r = parse('2026-09-06 ZZQ');
  assert.strictEqual(r.entries.length, 1);
  assert.strictEqual(r.entries[0].known, false);
  assert.strictEqual(r.entries[0].category, 'unknown');
  assert.strictEqual(r.warnings.length, 1);
});

test('날짜를 못 찾은 코드 줄은 고칠 수 있게 못 읽은 줄로 남는다', () => {
  // 경고에 묻어 두면 못 보고 지나친다. 사유를 달아 '읽지 못한 줄' 에 올려
  // 그 자리에서 날짜를 적어 다시 읽을 수 있게 한다.
  const r = parse('KE0035\nLO');
  assert.strictEqual(r.entries.length, 0);
  assert.strictEqual(r.skippedLines.length, 2);
  assert.deepStrictEqual(r.skippedLines.map((x) => x.text), ['KE0035', 'LO']);
  assert.ok(r.skippedLines.every((x) => x.reason === '날짜 없음'), JSON.stringify(r.skippedLines));
});

test('못 읽은 줄에는 언제나 사유가 붙는다', () => {
  const r = parse(['소속 : 객실승무본부', '2026-09-05 KE0035', 'LO'].join('\n'));
  assert.ok(r.skippedLines.length >= 1);
  assert.ok(r.skippedLines.every((x) => x.reason), JSON.stringify(r.skippedLines));
});

test('같은 날짜·코드 중복은 한 번만 담는다', () => {
  const r = parse('2026-09-06 LO\n2026-09-06 LO');
  assert.strictEqual(r.entries.length, 1);
});

test('머리글 행과 빈 줄은 무시한다', () => {
  const r = parse('날짜\t코드\tRemark\n\n2026-09-06\tLO\n\n');
  assert.strictEqual(r.entries.length, 1);
  assert.strictEqual(r.entries[0].code, 'LO');
});

test('잘못된 날짜는 날짜로 잡지 않는다', () => {
  const r = parse('2026-13-45 LO');
  assert.strictEqual(r.entries.length, 0);
});

test('통계는 날짜 수·건수·범위를 담는다', () => {
  const r = parse('2026-09-01 KE0035\n2026-09-02 LO\n2026-09-02 STBY');
  assert.strictEqual(r.stats.dateCount, 2);
  assert.strictEqual(r.stats.entryCount, 3);
  assert.strictEqual(r.stats.firstDate, '2026-09-01');
  assert.strictEqual(r.stats.lastDate, '2026-09-02');
  assert.strictEqual(r.stats.counts.flight, 1);
});

test('결과는 날짜 오름차순으로 정렬된다', () => {
  const r = parse('2026-09-20 LO\n2026-09-03 DO\n2026-09-11 STBY');
  assert.deepStrictEqual(
    r.entries.map(e => e.date),
    ['2026-09-03', '2026-09-11', '2026-09-20']
  );
});

test('전각 문자와 CRLF 를 정규화한다', () => {
  const r = parse('２０２６－０９－０６　ＫＥ００３５\r\n2026-09-07 LO');
  assert.deepStrictEqual(codesOn(r, '2026-09-06'), ['KE0035']);
  assert.strictEqual(r.entries.length, 2);
});

test('빈 입력은 빈 결과를 낸다', () => {
  const r = parse('   \n\n');
  assert.deepStrictEqual(r.entries, []);
  assert.deepStrictEqual(r.warnings, []);
});

test('크루넷 표 형태 전체 흐름', () => {
  const text = [
    '2026년 9월 스케줄',
    '일자\t근무\t구간\t시각',
    '01 (화)\tKE0035\tICN/JFK\t1030-1420',
    '02 (수)\tLO',
    '03 (목)\tKE0036\tJFK/ICN',
    '04 (금)\tATDO',
    '05 (토)\tSTBY\t0900-1700',
    '06 (일)\tDO'
  ].join('\n');
  const r = parse(text);
  assert.strictEqual(r.stats.dateCount, 6);
  assert.deepStrictEqual(codesOn(r, '2026-09-01'), ['KE0035']);
  assert.deepStrictEqual(codesOn(r, '2026-09-05'), ['STBY']);
  assert.strictEqual(r.entries.find(e => e.date === '2026-09-05').start, '09:00');
  assert.strictEqual(r.entries.find(e => e.date === '2026-09-05').end, '17:00');
});

test('TVL 은 비행 근무로 읽는다', () => {
  const r = parse('2026-09-04 KE0038 TVL');
  assert.deepStrictEqual(r.entries.map(e => [e.code, e.category]), [['KE0038', 'flight'], ['TVL', 'flight']]);
  assert.strictEqual(r.warnings.length, 0);
});

test('화면 조작용 줄은 조용히 건너뛴다', () => {
  const text = ['MY SKD', 'Actual (Current Month)', 'Extra (Current Month)', 'prev', 'next',
    'clear 오늘', '2026-09-06 ATDO'].join('\n');
  const r = parse(text);
  assert.strictEqual(r.entries.length, 1);
  assert.strictEqual(r.warnings.length, 0);
  assert.strictEqual(r.skippedLines.length, 0);
});

test('읽어내지 못한 줄은 따로 남겨 확인할 수 있게 한다', () => {
  const r = parse('2026-07-04 KE0038\n알 수 없는 내용입니다\n2026-07-06 ATDO');
  assert.strictEqual(r.entries.length, 2);
  assert.strictEqual(r.skippedLines.length, 1);
  assert.strictEqual(r.skippedLines[0].line, 2);
  assert.strictEqual(r.skippedLines[0].text, '알 수 없는 내용입니다');
});

test('앞 칸 코드에 다음 날 날짜가 붙어 나와도 날짜를 새로 연다', () => {
  // 달력 화면을 복사하면 "TVL 6" 처럼 앞 칸 마지막 코드와 다음 칸 날짜가 한 줄이 된다
  const r = parse('5\nKE0038\nTVL 6\nATDO\n7\nATDO', { year: 2026, month: 7 });
  assert.deepStrictEqual(
    r.entries.map(e => e.date + ':' + e.code),
    ['2026-07-05:KE0038', '2026-07-05:TVL', '2026-07-06:ATDO', '2026-07-07:ATDO']
  );
});

test('한 줄에 여러 날이 들어 있어도 날짜별로 나눈다', () => {
  const r = parse('5 KE0038 TVL 6 ATDO 7 ATDO', { year: 2026, month: 7 });
  assert.deepStrictEqual(
    r.entries.map(e => e.date + ':' + e.code),
    ['2026-07-05:KE0038', '2026-07-05:TVL', '2026-07-06:ATDO', '2026-07-07:ATDO']
  );
});

test('줄 중간 날짜는 앞 날짜의 근무를 가져가지 않는다', () => {
  const r = parse('20\nKE0602\nTVL 21\nKE0479\n22\nLO', { year: 2026, month: 7 });
  assert.deepStrictEqual(
    r.entries.map(e => e.date + ':' + e.code),
    ['2026-07-20:KE0602', '2026-07-20:TVL', '2026-07-21:KE0479', '2026-07-22:LO']
  );
});

test('구간과 시각은 줄 중간에 날짜가 끼어도 제 날짜에 붙는다', () => {
  const r = parse('2 KE0037 ICN/ORD 1040 3 KE0038 ORD/ICN 1650', { year: 2026, month: 7 });
  assert.deepStrictEqual(
    r.entries.map(e => [e.date.slice(8), e.code, e.route, e.start]),
    [['02', 'KE0037', 'ICN/ORD', '10:40'], ['03', 'KE0038', 'ORD/ICN', '16:50']]
  );
});

test('YVS 는 휴가, TFRS 는 교육으로 읽는다', () => {
  const r = parse('2026-09-10 YVS\n2026-09-29 TFRS\n2026-09-09 PDO');
  assert.deepStrictEqual(
    r.entries.map(e => [e.code, e.category, e.label]),
    [['PDO', 'off', '휴무'], ['YVS', 'vacation', '휴가'], ['TFRS', 'training', '교육']]
  );
  assert.strictEqual(r.warnings.length, 0);
});

test('달력 격자에 딸려 오는 다음 달 날짜는 다음 달로 넘긴다', () => {
  // 5월 격자의 마지막 줄에는 6월 1~2일이 흐리게 붙어 온다
  const r = parse('30\tKE2101\n31\tKE0497\n1\tLO KE0498\n2\tKE0498', { year: 2026, month: 5 });
  assert.deepStrictEqual(
    r.entries.map(e => e.date + ':' + e.code),
    ['2026-05-30:KE2101', '2026-05-31:KE0497', '2026-06-01:LO', '2026-06-01:KE0498', '2026-06-02:KE0498']
  );
});

test('달력 격자 첫 줄의 지난달 날짜는 지난달로 본다', () => {
  // 앞머리(4월 말) 다음에 5월이 통째로 이어지는 모양이라야 격자로 본다
  const lines = ['28\tLO', '29\tLO', '30\tLO'];
  for (let d = 1; d <= 31; d++) lines.push(d + '\tATDO');
  const r = parse(lines.join('\n'), { year: 2026, month: 5 });
  assert.strictEqual(r.entries[0].date, '2026-04-28');
  assert.strictEqual(r.entries[2].date, '2026-04-30');
  assert.strictEqual(r.entries[3].date, '2026-05-01');
  assert.strictEqual(r.entries[r.entries.length - 1].date, '2026-05-31');
});

test('달 끝부분만 잘라 붙여넣으면 그 달 그대로 읽는다', () => {
  const r = parse('30\tKE2101\n31\tKE0497\n1\tLO\n2\tKE0498', { year: 2026, month: 5 });
  assert.deepStrictEqual(
    r.entries.map(e => e.date + ':' + e.code),
    ['2026-05-30:KE2101', '2026-05-31:KE0497', '2026-06-01:LO', '2026-06-02:KE0498']
  );
});

test('달 초부터 시작하는 붙여넣기는 그대로 그 달로 읽는다', () => {
  const r = parse('1\tDO\n2\tKE0037\n3\tLO', { year: 2026, month: 7 });
  assert.deepStrictEqual(
    r.entries.map(e => e.date + ':' + e.code),
    ['2026-07-01:DO', '2026-07-02:KE0037', '2026-07-03:LO']
  );
});

test('연월이 적힌 날짜는 되돌아가도 그대로 쓴다', () => {
  const r = parse('2026-05-31\tLO\n2026-05-01\tATDO', { year: 2026, month: 5 });
  assert.deepStrictEqual(r.entries.map(e => e.date), ['2026-05-01', '2026-05-31']);
});

test('근무 이름은 한글로 짧게 쓴다', () => {
  const r = parse('2026-09-06 LO\n2026-09-07 STBY\n2026-09-08 DO', { year: 2026, month: 9 });
  assert.deepStrictEqual(r.entries.map(e => e.label), ['체류', '대기', '휴무']);
});

test('RF 는 자택 대기로 읽는다', () => {
  const r = parse('2026-09-06 RF');
  assert.strictEqual(r.entries[0].label, '자택 대기');
  assert.strictEqual(r.entries[0].category, 'standby');
  assert.strictEqual(r.warnings.length, 0);
});

test('공항 대기 코드를 읽는다', () => {
  const r = parse('2026-09-06 SA\n2026-09-07 SB\n2026-09-08 SC\n2026-09-09 IA\n2026-09-10 IB\n2026-09-11 IC');
  assert.deepStrictEqual(
    r.entries.map(e => e.label),
    ['김포공항 대기', '김포공항 대기', '김포공항 대기', '인천공항 대기', '인천공항 대기', '인천공항 대기']
  );
  assert.ok(r.entries.every(e => e.category === 'standby'));
  assert.strictEqual(r.warnings.length, 0);
});

/* ---------------- 월별 달력 화면 붙여넣기 ---------------- */

const GRID = [
  '2026년 1월',
  '일\t월\t화\t수\t목\t금\t토',
  '\t\t\t\t1\t2\t3',
  '\t\t\t\tATDO\t\tKE0657',
  '4\t5\t6\t7\t8\t9\t10',
  'LO\tKE0658\tATDO\tKE0727\tADO\tKE0005\tLO',
  '11\t12\t13\t14\t15\t16\t17',
  'KE0006\tKE0006\tATDO\tATDO\tKE2011\tLO\tKE2012',
  '18\t19\t20\t21\t22\t23\t24',
  'KE2179 KE2180\tKE0457\tKE0458\tATDO\t\t\t'
].join('\n');

test('달력 격자는 열 자리로 날짜를 가른다 — 한 주가 첫날에 몰리지 않는다', () => {
  assert.ok(parser.looksLikeGrid(GRID));
  const r = parser.parse(GRID, { year: 2026, month: 1 });
  assert.strictEqual(r.shape, 'grid');
  const on = (d) => codesOn(r, d);
  assert.deepStrictEqual(on('2026-01-01'), ['ATDO']);
  assert.deepStrictEqual(on('2026-01-03'), ['KE0657']);
  assert.deepStrictEqual(on('2026-01-04'), ['LO']);
  assert.deepStrictEqual(on('2026-01-05'), ['KE0658']);
  assert.deepStrictEqual(on('2026-01-07'), ['KE0727']);
  assert.deepStrictEqual(on('2026-01-09'), ['KE0005']);
  assert.deepStrictEqual(on('2026-01-17'), ['KE2012']);
  // 한 칸 안에 두 편이 붙어 있으면 둘 다 그 날로 간다
  assert.deepStrictEqual(on('2026-01-18'), ['KE2179', 'KE2180']);
  assert.deepStrictEqual(on('2026-01-20'), ['KE0458']);
});

test('달력 격자는 요일이 고루 퍼진다 — 7일 간격으로 몰리지 않는다', () => {
  const r = parser.parse(GRID, { year: 2026, month: 1 });
  const weekdays = new Set(r.entries.map((e) => new Date(e.date + 'T00:00:00Z').getUTCDay()));
  assert.ok(weekdays.size >= 5, '요일이 ' + weekdays.size + '가지뿐입니다');
  const sundays = r.entries.filter((e) => new Date(e.date + 'T00:00:00Z').getUTCDay() === 0).length;
  assert.ok(sundays < r.entries.length / 2, '일요일에 몰렸습니다: ' + sundays + '/' + r.entries.length);
});

test('달력 격자는 기준 달 밖의 날짜를 만들지 않는다', () => {
  const r = parser.parse(GRID, { year: 2026, month: 1 });
  const outside = r.entries.filter((e) => e.date.slice(0, 7) !== '2026-01');
  assert.strictEqual(outside.length, 0, JSON.stringify(outside));
});

test('달력 격자에서 열을 못 맞춘 덩이는 아무 날에나 얹지 않고 돌려준다', () => {
  // 날짜 줄보다 열이 더 많은 줄. 어느 칸인지 자신할 수 없으면 못 읽은 줄로 남긴다.
  const bad = ['4\t5\t6', 'LO\tATDO\tDO\tKE9999\tKE8888'].join('\n');
  const r = parser.parseGrid(bad, { year: 2026, month: 1 });
  assert.deepStrictEqual(codesOn(r, '2026-01-04'), ['LO']);
  assert.deepStrictEqual(codesOn(r, '2026-01-06'), ['DO']);
  assert.ok(r.skippedLines.length >= 1, '못 읽은 줄을 남긴다');
  assert.ok(r.skippedLines.every((x) => x.reason), '사유가 붙는다');
});

test('날짜가 적힌 글은 격자로 오해하지 않는다', () => {
  const plain = ['2026-01-01  ATDO', '2026-01-03  KE0657 LO', '2026-01-31  KE0401'].join('\n');
  assert.strictEqual(parser.looksLikeGrid(plain), false);
  const r = parser.parse(plain, { year: 2026, month: 1 });
  assert.strictEqual(r.shape, 'lines');
  assert.strictEqual(r.skippedLines.length, 0);
  assert.deepStrictEqual(r.entries.map((e) => e.date), [
    '2026-01-01', '2026-01-03', '2026-01-03', '2026-01-31'
  ]);
});

test('편명 두 개가 붙은 줄은 날짜 줄이 아니다', () => {
  assert.strictEqual(parser.readDayRow('KE0727\tKE0728\tKE0729'), null);
  assert.strictEqual(parser.readDayRow('4\t5\t6\t7\t8\t9\t10') === null, false);
  assert.strictEqual(parser.readDayRow('4\t5'), null, '셋 미만은 날짜 줄로 보지 않는다');
});

test('기준 달 밖의 날짜가 적혀 있으면 알리되 지우지는 않는다', () => {
  const r = parser.parse('2026-01-31 KE0401\n2026-02-01 LO', { year: 2026, month: 1 });
  assert.strictEqual(r.entries.length, 2, '적힌 날짜는 그대로 둔다');
  assert.strictEqual(r.outOfMonth.length, 1);
  assert.ok(r.warnings.some((w) => /기준 달/.test(w.message)), JSON.stringify(r.warnings));
});

/* ---------------- 세로(열)로 긁어 붙여넣은 달력 ---------------- */

// 휴대폰에서 달력을 드래그하면 칸 순서가 아니라 열 순서로 딸려 온다.
// 일요일 칸을 위에서 아래까지 다 읽고, 그다음 월요일 칸을 처음부터.
const COLUMNS = [
  '2026.01 <>',
  'S', '28', '4', 'LO', 'KE0658', '11', 'KE0006', '18', 'KE2179', 'KE2180', '25', 'KE0082',
  'M', '29', '5', 'KE0658', '12', 'KE0006', '19', 'KEO457', 'LO', '26', 'ATDO',
  'T', '30',
  'W', '31',
  'T', '1', 'ATDO', '6', 'ATDO', '13', 'ATDO', '20', 'LO', 'KEO458', '27', 'ATDO',
  '7', 'KE0727', 'KE0728', '14', 'ATDO', '21', 'ATDO', '28', 'ADO',
  '8', 'ADO', '15', 'KE2011', 'LO', '22', 'KE0085', 'LO', '29', 'KE0601', 'TVL',
  'F', '2', 'ATDO', '9', 'KE0005', 'LO', '16', 'LO', '23', 'LO', '30', 'KE0602', '오늘',
  'S', '3', 'KE0657', 'LO', '10', 'LO', 'KE0006', '17', 'KE2012', '24', 'LO', 'KE0082',
  '31', 'KE0401'
].join('\n');

test('세로로 긁은 달력은 숫자가 떨어져도 달을 넘기지 않는다', () => {
  assert.ok(parser.looksLikeColumns(COLUMNS));
  const r = parser.parse(COLUMNS, { year: 2026, month: 1 });
  assert.strictEqual(r.shape, 'columns');
  // 예전에는 일요일 열만 1월에 남고 나머지가 2~6월로 흩어졌다
  const outside = r.entries.filter((e) => e.date.slice(0, 7) !== '2026-01');
  assert.strictEqual(outside.length, 0, JSON.stringify(outside.map((e) => e.date + ':' + e.code)));
  assert.strictEqual(r.skippedLines.length, 0, JSON.stringify(r.skippedLines));
});

test('세로로 긁은 달력을 원본과 하나하나 맞춰 읽는다', () => {
  const r = parser.parse(COLUMNS, { year: 2026, month: 1 });
  const want = {
    1: ['ATDO'], 2: ['ATDO'], 3: ['KE0657', 'LO'], 4: ['LO', 'KE0658'], 5: ['KE0658'],
    6: ['ATDO'], 7: ['KE0727', 'KE0728'], 8: ['ADO'], 9: ['KE0005', 'LO'],
    10: ['LO', 'KE0006'], 11: ['KE0006'], 12: ['KE0006'], 13: ['ATDO'], 14: ['ATDO'],
    15: ['KE2011', 'LO'], 16: ['LO'], 17: ['KE2012'], 18: ['KE2179', 'KE2180'],
    19: ['KE0457', 'LO'], 20: ['LO', 'KE0458'], 21: ['ATDO'], 22: ['KE0085', 'LO'],
    23: ['LO'], 24: ['LO', 'KE0082'], 25: ['KE0082'], 26: ['ATDO'], 27: ['ATDO'],
    28: ['ADO'], 29: ['KE0601', 'TVL'], 30: ['KE0602'], 31: ['KE0401']
  };
  Object.keys(want).forEach((day) => {
    const date = '2026-01-' + (day < 10 ? '0' + day : day);
    assert.deepStrictEqual(codesOn(r, date), want[day], date);
  });
  assert.strictEqual(r.entries.length, 43);
});

test('세로 달력에서 열 맨 위의 지난달 날짜는 1월로 끌어오지 않는다', () => {
  const r = parser.parse(COLUMNS, { year: 2026, month: 1 });
  // 12월 28·29·30·31 칸은 비어 있었으니 1월에 아무것도 만들지 않는다
  assert.deepStrictEqual(codesOn(r, '2025-12-28'), []);
  assert.deepStrictEqual(codesOn(r, '2025-12-31'), []);
});

test('평범한 날짜 목록을 세로 달력으로 오해하지 않는다', () => {
  const plain = ['2026-01-01 ATDO', '2026-01-02 ATDO', '2026-01-03 KE0657'].join('\n');
  assert.strictEqual(parser.looksLikeColumns(plain), false);
  const week = Array.from({ length: 20 }, (_, i) => String(i + 1) + '\nATDO').join('\n');
  assert.strictEqual(parser.looksLikeColumns(week), false, '하루씩 늘어나는 목록은 아니다');
});

test('편명 자리의 글자는 제자리 숫자로 돌린다 — 비슷한 편명을 찾아 바꾸지 않는다', () => {
  assert.strictEqual(parser.repairFlightCode('KEO457'), 'KE0457');
  assert.strictEqual(parser.repairFlightCode('KEOO35'), 'KE0035');
  assert.strictEqual(parser.repairFlightCode('KE0457'), 'KE0457', '이미 숫자면 그대로');
  assert.strictEqual(parser.repairFlightCode('XX1234'), 'XX1234', '모르는 항공사는 손대지 않는다');
  assert.strictEqual(parser.repairFlightCode('ATDO'), 'ATDO', '근무 코드는 손대지 않는다');
  assert.strictEqual(parser.repairFlightCode('LO'), 'LO');
});
