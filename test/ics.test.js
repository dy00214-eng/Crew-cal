const test = require('node:test');
const assert = require('node:assert');
const ics = require('../src/ics.js');

const NOW = new Date(Date.UTC(2026, 8, 6, 5, 0, 0));

function build(byDate, options) {
  return ics.build(byDate, Object.assign({ now: NOW }, options || {}));
}

test('한국에서 뜨는 편은 출발 시각부터 한 시간짜리로 넣는다', () => {
  const out = build({
    '2026-09-01': [{ type: 'flight', code: 'KE0035', route: 'ICN/ATL', start: '10:35' }]
  });
  assert.match(out.text, /DTSTART;TZID=Asia\/Seoul:20260901T103500/);
  assert.match(out.text, /DTEND;TZID=Asia\/Seoul:20260901T113500/);
  assert.strictEqual(out.count, 1);
});

test('한국에 내리는 익일 도착편은 실제 내리는 날짜에 들어간다', () => {
  const out = build({
    '2026-09-03': [{ type: 'flight', code: 'KE0036', route: 'ATL/ICN', end: '17:50', endOffset: 1 }]
  });
  assert.match(out.text, /DTSTART;TZID=Asia\/Seoul:20260904T175000/);
  assert.match(out.text, /DTEND;TZID=Asia\/Seoul:20260904T185000/);
});

test('양쪽 시각을 다 아는 국내선은 출발부터 도착까지', () => {
  const out = build({
    '2026-09-05': [{ type: 'flight', code: 'KE1201', route: 'GMP/CJU', start: '06:35', end: '07:45' }]
  });
  assert.match(out.text, /DTSTART;TZID=Asia\/Seoul:20260905T063500/);
  assert.match(out.text, /DTEND;TZID=Asia\/Seoul:20260905T074500/);
});

test('시각이 없는 근무는 하루 종일 일정이 된다', () => {
  const out = build({
    '2026-09-07': [{ type: 'duty', category: 'off', code: 'PDO', label: '휴무' }]
  });
  assert.match(out.text, /DTSTART;VALUE=DATE:20260907/);
  assert.match(out.text, /DTEND;VALUE=DATE:20260908/);
});

test('체류는 시각이 있어도 하루 종일로 넣는다', () => {
  const out = build({
    '2026-09-08': [{ type: 'duty', category: 'layover', code: 'LO', label: '체류', start: '09:00', end: '17:00' }]
  });
  assert.match(out.text, /DTSTART;VALUE=DATE:20260908/);
  assert.doesNotMatch(out.text, /DTSTART;TZID/);
});

test('이틀에 걸쳐 적힌 도착편은 한 번만 들어간다', () => {
  const entry = { type: 'flight', code: 'KE0036', route: 'ATL/ICN', end: '17:50', endOffset: 1 };
  const out = build({
    '2026-09-04': [{ type: 'duty', category: 'layover', code: 'LO', label: '체류' }, entry],
    '2026-09-05': [entry]
  });
  assert.strictEqual((out.text.match(/UID:crewcal-\d+-KE0036/g) || []).length, 1);
  assert.match(out.text, /UID:crewcal-20260905-KE0036/);
});

test('기간을 주면 그 안의 일정만 담는다', () => {
  const byDate = {
    '2026-08-31': [{ type: 'duty', category: 'off', code: 'PDO' }],
    '2026-09-01': [{ type: 'duty', category: 'off', code: 'PDO' }],
    '2026-10-01': [{ type: 'duty', category: 'off', code: 'PDO' }]
  };
  const out = build(byDate, { from: '2026-09-01', to: '2026-09-30' });
  assert.strictEqual(out.count, 1);
  assert.match(out.text, /UID:crewcal-20260901/);
});

test('제목은 편명과 도시로, 위치는 도착지로 적는다', () => {
  const out = build({
    '2026-09-01': [{ type: 'flight', code: 'KE0035', route: 'ICN/ATL', start: '10:35' }]
  });
  assert.match(out.text, /SUMMARY:KE0035 인천 → 애틀랜타/);
  assert.match(out.text, /LOCATION:애틀랜타/);
});

test('쉼표·세미콜론·줄바꿈은 그대로 새지 않게 감싼다', () => {
  assert.strictEqual(ics.escapeText('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne');
});

test('한 줄이 75바이트를 넘으면 공백 한 칸으로 이어 붙인다', () => {
  const folded = ics.fold('SUMMARY:' + '가'.repeat(60));
  const rows = folded.split('\r\n');
  assert.ok(rows.length > 1);
  rows.slice(1).forEach((row) => assert.strictEqual(row[0], ' '));
  rows.forEach((row) => assert.ok(Buffer.byteLength(row, 'utf8') <= 75));
  assert.strictEqual(folded.replace(/\r\n /g, ''), 'SUMMARY:' + '가'.repeat(60));
});

test('달력 앱이 읽을 수 있는 뼈대를 갖춘다', () => {
  const out = build({ '2026-09-01': [{ type: 'duty', category: 'off', code: 'PDO' }] });
  assert.match(out.text, /^BEGIN:VCALENDAR\r\n/);
  assert.match(out.text, /VERSION:2\.0/);
  assert.match(out.text, /BEGIN:VTIMEZONE\r\nTZID:Asia\/Seoul/);
  assert.match(out.text, /DTSTAMP:20260906T050000Z/);
  assert.match(out.text, /END:VCALENDAR\r\n$/);
  // 모든 줄은 CRLF 로 끝난다
  assert.ok(out.text.split('\r\n').length > 10);
});

test('파일 이름은 한 달치면 그 달을 달고 나온다', () => {
  assert.strictEqual(ics.filename('2026-09-01', '2026-09-30'), 'crew-cal-2026-09.ics');
  assert.strictEqual(ics.filename('2026-09-01', '2026-10-31'), 'crew-cal.ics');
  assert.strictEqual(ics.filename(), 'crew-cal.ics');
});

test('자정을 넘는 시각 더하기', () => {
  assert.deepStrictEqual(ics.addMinutes('23:30', 60), { time: '00:30', day: 1 });
  assert.deepStrictEqual(ics.addMinutes('00:30', -60), { time: '23:30', day: -1 });
  assert.strictEqual(ics.shiftDate('2026-12-31', 1), '2027-01-01');
});

test('자정 직전 출발은 다음 날로 끝난다', () => {
  const out = build({
    '2026-09-09': [{ type: 'flight', code: 'KE0081', route: 'ICN/JFK', start: '23:50' }]
  });
  assert.match(out.text, /DTSTART;TZID=Asia\/Seoul:20260909T235000/);
  assert.match(out.text, /DTEND;TZID=Asia\/Seoul:20260910T005000/);
});

test('비행이 아닌 근무는 한글 이름만 제목으로 쓴다', () => {
  const out = build({
    '2026-09-02': [{ type: 'duty', category: 'layover', code: 'LO', label: '체류' }],
    '2026-09-03': [{ type: 'duty', category: 'off', code: 'ATDO', label: '추가 휴무' }]
  });
  assert.match(out.text, /SUMMARY:체류/);
  assert.match(out.text, /SUMMARY:추가 휴무/);
  assert.doesNotMatch(out.text, /SUMMARY:LO 체류/);
  // 코드는 설명에 남는다
  assert.match(out.text, /DESCRIPTION:체류/);
});
