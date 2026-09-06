const test = require('node:test');
const assert = require('node:assert');
const clock = require('../src/clock.js');

// 겨울(한국 1월)과 여름(한국 7월)을 각각 본다. 서머타임이 걸리는 쪽이 달라진다.
const WINTER = new Date('2026-01-15T03:00:00Z');
const SUMMER = new Date('2026-07-15T03:00:00Z');

test('시간대의 UTC 오프셋을 분으로 읽는다', () => {
  assert.strictEqual(clock.offsetMinutes('Asia/Seoul', WINTER), 540);
  assert.strictEqual(clock.offsetMinutes('Asia/Kolkata', WINTER), 330);   // 30분 단위
  assert.strictEqual(clock.offsetMinutes('America/New_York', WINTER), -300);
  assert.strictEqual(clock.offsetMinutes('America/New_York', SUMMER), -240); // 서머타임
  assert.strictEqual(clock.offsetMinutes('없는/시간대', WINTER), null);
});

test('한국과의 시차를 구한다', () => {
  assert.strictEqual(clock.gapMinutes('Asia/Seoul', WINTER), 0);
  assert.strictEqual(clock.gapMinutes('America/New_York', WINTER), -840);   // 14시간 느림
  assert.strictEqual(clock.gapMinutes('America/New_York', SUMMER), -780);   // 13시간 느림
  assert.strictEqual(clock.gapMinutes('Europe/Paris', SUMMER), -420);       // 7시간 느림
  assert.strictEqual(clock.gapMinutes('Australia/Sydney', SUMMER), 60);     // 1시간 빠름
  assert.strictEqual(clock.gapMinutes('Asia/Kolkata', WINTER), -210);       // 3시간 30분 느림
});

test('시차를 읽을 수 있게 적는다', () => {
  assert.strictEqual(clock.describeGap(0), '한국과 시차 없음');
  assert.strictEqual(clock.describeGap(-780), '한국보다 13시간 느림');
  assert.strictEqual(clock.describeGap(60), '한국보다 1시간 빠름');
  assert.strictEqual(clock.describeGap(-210), '한국보다 3시간 30분 느림');
  assert.strictEqual(clock.describeGap(-30), '한국보다 30분 느림');
  assert.strictEqual(clock.describeGap(null), '');
});

test('그 시간대의 지금을 시각·요일까지 준다', () => {
  const seoul = clock.now('Asia/Seoul', WINTER);        // 2026-01-15 12:00 KST (목)
  assert.strictEqual(seoul.time, '12:00');
  assert.strictEqual(seoul.month, 1);
  assert.strictEqual(seoul.day, 15);
  assert.strictEqual(seoul.weekday, '목');

  const ny = clock.now('America/New_York', WINTER);     // 같은 순간 뉴욕은 전날 22:00
  assert.strictEqual(ny.time, '22:00');
  assert.strictEqual(ny.day, 14);
  assert.strictEqual(ny.weekday, '수');

  assert.strictEqual(clock.now('없는/시간대', WINTER), null);
});

test('한국과 날짜가 어긋나는지 알려준다', () => {
  assert.strictEqual(clock.dayShift('America/New_York', WINTER), -1);  // 한국보다 하루 전
  assert.strictEqual(clock.dayShift('Asia/Seoul', WINTER), 0);
  // 한국 밤이면 시드니는 이미 다음 날
  assert.strictEqual(clock.dayShift('Pacific/Auckland', new Date('2026-01-15T14:00:00Z')), 1);
});
