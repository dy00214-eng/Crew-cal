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
  assert.deepStrictEqual(codesOn(r, '2026-09-06'), ['KE0035', 'LO', 'STBY']);
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

test('날짜를 못 찾은 코드 줄은 경고로 남는다', () => {
  const r = parse('KE0035\nLO');
  assert.strictEqual(r.entries.length, 0);
  assert.strictEqual(r.warnings.length, 2);
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
