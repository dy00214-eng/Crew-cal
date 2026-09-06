const test = require('node:test');
const assert = require('node:assert');
const calendar = require('../src/calendar.js');

test('달력 칸 시각 표기는 출발→도착, 익일은 +1', () => {
  assert.strictEqual(calendar.formatTimeRange({ start: '10:30', end: '14:20' }), '10:30→14:20');
  assert.strictEqual(calendar.formatTimeRange({ start: '23:50', end: '06:20', endOffset: 1 }), '23:50→06:20+1');
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
