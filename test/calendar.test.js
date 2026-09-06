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
