const test = require('node:test');
const assert = require('node:assert');
const schedule = require('../src/schedule.js');

test('편명 표기가 달라도 같은 편으로 찾는다', () => {
  assert.strictEqual(schedule.normalize('KE35'), 'KE0035');
  assert.strictEqual(schedule.normalize('KE035'), 'KE0035');
  assert.strictEqual(schedule.normalize('KE0035'), 'KE0035');
  assert.strictEqual(schedule.normalize('LO'), null);
});

test('확인한 편은 구간과 출발·도착을 돌려준다', () => {
  const ke36 = schedule.lookup('KE0036');
  assert.strictEqual(ke36.route, 'ATL/ICN');
  assert.strictEqual(ke36.start, '13:25');
  assert.strictEqual(ke36.end, '17:50');
  assert.strictEqual(ke36.endOffset, 1);
});

test('출발만 확인한 편은 도착을 비워 둔다', () => {
  const ke17 = schedule.lookup('KE17');
  assert.strictEqual(ke17.route, 'ICN/LAX');
  assert.strictEqual(ke17.start, '14:30');
  assert.strictEqual(ke17.end, null);
});

test('구간만 아는 편은 시각을 비워 둔다', () => {
  const ke8053 = schedule.lookup('KE8053');
  assert.strictEqual(ke8053.route, 'ICN/HNL');
  assert.strictEqual(ke8053.start, null);
});

test('모르는 편은 아무것도 지어내지 않는다', () => {
  assert.strictEqual(schedule.lookup('KE9999'), null);
  assert.strictEqual(schedule.lookup('OZ201'), null);
  assert.strictEqual(schedule.lookup('LO'), null);
});

test('표에 담긴 모든 편은 구간을 가진다', () => {
  Object.keys(schedule.TABLE).forEach((code) => {
    assert.ok(/^[A-Z]{3}\/[A-Z]{3}$/.test(schedule.TABLE[code].route), code + ' 구간 형식');
    assert.ok(/^KE\d{4}$/.test(code), code + ' 편명 형식');
  });
});
