const test = require('node:test');
const assert = require('node:assert');
const calendar = require('../src/calendar.js');

test('구간을 모르면 출발→도착을 함께, 익일은 +1', () => {
  // 화살표 뒤 \u200B 는 좁은 칸에서 도착 시각이 아랫줄로 넘어가게 하는 줄바꿈 지점
  assert.strictEqual(calendar.formatTimeRange({ start: '10:30', end: '14:20' }), '10:30\u2192\u200B14:20');
  assert.strictEqual(calendar.formatTimeRange({ start: '23:50', end: '06:20', endOffset: 1 }), '23:50\u2192\u200B06:20+1');
  assert.strictEqual(calendar.formatTimeRange({ start: '10:30' }), '10:30 출발');
  assert.strictEqual(calendar.formatTimeRange({ end: '14:20' }), '14:20 도착');
  assert.strictEqual(calendar.formatTimeRange({}), '');
});

test('비행은 출발/도착, 그 밖의 근무는 시작/종료로 읽는다', () => {
  assert.strictEqual(
    calendar.describeTimes({ type: 'flight', start: '23:50', end: '06:20', endOffset: 1 }),
    '출발 23:50 → 도착 06:20 (익일)'
  );
  assert.strictEqual(
    calendar.describeTimes({ type: 'duty', start: '09:00', end: '17:00' }),
    '시작 09:00 → 종료 17:00'
  );
  assert.strictEqual(calendar.describeTimes({ type: 'duty' }), '');
});

test('구간이 있으면 출발 나라 국기를 붙인다', () => {
  assert.strictEqual(calendar.departureFlag({ route: 'ICN/JFK' }), '🇰🇷');
  assert.strictEqual(calendar.departureFlag({ route: 'JFK/ICN' }), '🇺🇸');
  assert.strictEqual(calendar.routeLabel({ route: 'ICN/CDG' }), '🇰🇷 ICN/CDG');
  assert.strictEqual(calendar.departureFlag({ route: 'ZZZ/YYY' }), '');
  assert.strictEqual(calendar.departureFlag({}), '');
  assert.strictEqual(calendar.routeLabel({ code: 'LO' }), '');
});

test('한국 출발편은 출발 시각만, 한국 도착편은 한국 도착 시각만 보여준다', () => {
  const out = { type: 'flight', route: 'ICN/ATL', start: '09:45', end: '10:20' };
  const back = { type: 'flight', route: 'ATL/ICN', start: '13:25', end: '17:50', endOffset: 1 };

  assert.strictEqual(calendar.formatTimeRange(out), '09:45 출발');
  assert.strictEqual(calendar.formatTimeRange(back), '17:50+1 도착');
  assert.strictEqual(calendar.describeTimes(out), '출발 09:45');
  assert.strictEqual(calendar.describeTimes(back), '도착 17:50 (익일)');
});

test('국내선과 해외-해외 구간은 시차가 없거나 한국과 무관하니 양쪽을 보여준다', () => {
  const dom = { type: 'flight', route: 'ICN/PUS', start: '06:35', end: '07:45' };
  const foreign = { type: 'flight', route: 'PVG/NRT', start: '11:00', end: '14:00' };
  assert.strictEqual(calendar.describeTimes(dom), '출발 06:35 → 도착 07:45');
  assert.strictEqual(calendar.describeTimes(foreign), '출발 11:00 → 도착 14:00');
});

test('full 을 주면 한국 시각만 남기는 규칙을 건너뛴다', () => {
  const out = { type: 'flight', route: 'ICN/ATL', start: '09:45', end: '10:20' };
  assert.strictEqual(calendar.describeTimes(out, true), '출발 09:45 → 도착 10:20');
  assert.strictEqual(calendar.formatTimeRange(out, true), '09:45→​10:20');
});

test('구간을 모르는 항공편은 규칙을 적용하지 않는다', () => {
  assert.strictEqual(calendar.koreanSide({ route: 'ICN/JFK' }), 'start');
  assert.strictEqual(calendar.koreanSide({ route: 'JFK/ICN' }), 'end');
  assert.strictEqual(calendar.koreanSide({ route: 'GMP/PUS' }), null);
  assert.strictEqual(calendar.koreanSide({}), null);
});

test('체류에는 시각을 쓰지 않는다', () => {
  const lo = { type: 'duty', category: 'layover', code: 'LO', start: '09:00', end: '17:00' };
  assert.strictEqual(calendar.formatTimeRange(lo), '');
  assert.strictEqual(calendar.describeTimes(lo), '');
  // 툴팁처럼 전부 보여줘야 할 때는 그대로 나온다
  assert.strictEqual(calendar.describeTimes(lo, true), '시작 09:00 → 종료 17:00');
});

test('체류가 아닌 근무는 시각을 그대로 쓴다', () => {
  const stby = { type: 'duty', category: 'standby', code: 'STBY', start: '09:00', end: '17:00' };
  assert.strictEqual(calendar.formatTimeRange(stby), '09:00→​17:00');
  assert.strictEqual(calendar.describeTimes(stby), '시작 09:00 → 종료 17:00');
});

test('다음날 도착하는 편은 체류하는 전날 칸에서 시각을 감춘다', () => {
  const entriesByDate = {
    '2026-09-02': [
      { type: 'flight', code: 'KE0035', route: 'ICN/ATL', start: '10:35' },
      { type: 'duty', category: 'layover', code: 'LO' }
    ],
    '2026-09-04': [
      { type: 'duty', category: 'layover', code: 'LO' },
      { type: 'flight', code: 'KE0036', route: 'ATL/ICN', end: '17:50', endOffset: 1 }
    ],
    '2026-09-05': [
      { type: 'flight', code: 'KE0036', route: 'ATL/ICN', end: '17:50', endOffset: 1 }
    ]
  };
  const hidden = calendar.suppressedTimes(entriesByDate);
  assert.deepStrictEqual(hidden, { '2026-09-04|KE0036': true });
});

test('다음날에 같은 편이 없으면 시각을 감추지 않는다', () => {
  const entriesByDate = {
    '2026-09-17': [
      { type: 'duty', category: 'layover', code: 'LO' },
      { type: 'flight', code: 'KE0472', route: 'CDG/ICN', end: '21:25' }
    ],
    '2026-09-20': [
      { type: 'flight', code: 'KE0902', route: 'CDG/ICN', end: '17:20', endOffset: 1 }
    ]
  };
  assert.deepStrictEqual(calendar.suppressedTimes(entriesByDate), {});
  assert.deepStrictEqual(calendar.suppressedTimes({}), {});
  assert.deepStrictEqual(calendar.suppressedTimes(), {});
});

test('다음 일정은 오늘 것부터, 하루에 여럿이면 비행을 앞세운다', () => {
  const byDate = {
    '2026-09-01': [{ type: 'duty', code: 'PDO' }],
    '2026-09-08': [
      { type: 'duty', category: 'standby', code: 'STBY' },
      { type: 'flight', code: 'KE0035', route: 'ICN/ATL', start: '10:35' }
    ],
    '2026-09-20': [{ type: 'flight', code: 'KE0081' }]
  };
  const next = calendar.upcoming(byDate, '2026-09-06');
  assert.strictEqual(next.date, '2026-09-08');
  assert.strictEqual(next.entry.code, 'KE0035');
  assert.strictEqual(next.days, 2);
  assert.strictEqual(next.all.length, 2);

  // 오늘 것이 있으면 오늘을 준다
  assert.strictEqual(calendar.upcoming(byDate, '2026-09-08').days, 0);
  // 앞으로 아무것도 없으면 null
  assert.strictEqual(calendar.upcoming(byDate, '2026-10-01'), null);
  assert.strictEqual(calendar.upcoming({}, '2026-09-06'), null);
});

test('빈 날짜는 건너뛴다', () => {
  const byDate = { '2026-09-07': [], '2026-09-09': [{ type: 'duty', code: 'LO' }] };
  assert.strictEqual(calendar.upcoming(byDate, '2026-09-06').date, '2026-09-09');
});

test('날짜 사이 일수', () => {
  assert.strictEqual(calendar.daysBetween('2026-09-06', '2026-09-06'), 0);
  assert.strictEqual(calendar.daysBetween('2026-12-31', '2027-01-02'), 2);
  assert.strictEqual(calendar.daysBetween('2026-02-28', '2026-03-01'), 1);
});
