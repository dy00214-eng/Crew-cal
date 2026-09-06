const test = require('node:test');
const assert = require('node:assert');
const schedule = require('../src/schedule.js');

test('편명 표기가 달라도 같은 편으로 찾는다', () => {
  assert.strictEqual(schedule.normalize('KE35'), 'KE0035');
  assert.strictEqual(schedule.normalize('KE035'), 'KE0035');
  assert.strictEqual(schedule.normalize('KE0035'), 'KE0035');
  assert.strictEqual(schedule.normalize('LO'), null);
});

test('한국으로 들어오는 편은 한국 도착 시각만 담는다', () => {
  const ke36 = schedule.lookup('KE0036');
  assert.strictEqual(ke36.route, 'ATL/ICN');
  assert.strictEqual(ke36.start, null);      // 현지 출발 시각은 화면에 쓰지 않으므로 담지 않는다
  assert.strictEqual(ke36.end, '17:50');
  assert.strictEqual(ke36.endOffset, 1);
});

test('출발만 확인한 편은 도착을 비워 둔다', () => {
  const ke17 = schedule.lookup('KE17');
  assert.strictEqual(ke17.route, 'ICN/LAX');
  assert.strictEqual(ke17.start, '14:30');
  assert.strictEqual(ke17.end, null);
});

test('구간만 추정한 편은 시각을 비워 둔다', () => {
  // KE0127 은 표에 있고 KE0128 은 없다
  const ke128 = schedule.lookup('KE0128');
  assert.strictEqual(ke128.route, 'FOC/ICN');
  assert.strictEqual(ke128.derived, true);
  assert.strictEqual(ke128.start, null);
  assert.strictEqual(ke128.end, null);
});

test('모르는 편은 아무것도 지어내지 않는다', () => {
  assert.strictEqual(schedule.lookup('KE9999'), null);
  assert.strictEqual(schedule.lookup('OZ201'), null);
  assert.strictEqual(schedule.lookup('LO'), null);
});

test('KE8053 은 인천 출발 시각을 갖는다', () => {
  const ke8053 = schedule.lookup('KE8053');
  assert.strictEqual(ke8053.route, 'ICN/HNL');
  assert.strictEqual(ke8053.start, '22:35');
});

test('표에 담긴 모든 편은 구간을 가진다', () => {
  Object.keys(schedule.TABLE).forEach((code) => {
    assert.ok(/^[A-Z]{3}\/[A-Z]{3}$/.test(schedule.TABLE[code].route), code + ' 구간 형식');
    assert.ok(/^KE\d{4}$/.test(code), code + ' 편명 형식');
  });
});

test('인천 출발편은 출발 시각, 도착편은 한국 도착 시각을 갖는다', () => {
  const out = schedule.lookup('KE0037');
  assert.strictEqual(out.route, 'ICN/ORD');
  assert.strictEqual(out.start, '10:40');
  assert.strictEqual(out.end, null);

  const back = schedule.lookup('KE0036');
  assert.strictEqual(back.route, 'ATL/ICN');
  assert.strictEqual(back.end, '17:50');
  assert.strictEqual(back.endOffset, 1);
  assert.strictEqual(back.start, null);
});

test('표에 있는 복편은 한국 도착 시각까지 돌려준다', () => {
  const back = schedule.lookup('KE0038');
  assert.strictEqual(back.route, 'ORD/ICN');
  assert.strictEqual(back.derived, false);
  assert.strictEqual(back.end, '16:50');
  assert.strictEqual(back.endOffset, 1);
});

test('되돌아오는 편 추정은 인천에서 나가는 편에만 적용한다', () => {
  assert.strictEqual(schedule.lookup('KE9998'), null);   // 짝이 표에 없다
  assert.strictEqual(schedule.lookup('KE2072').derived, false);  // 표에 있으면 그대로
});

test('표에 없는 홀수 편은 뒤 짝수 편의 나가는 구간으로 본다', () => {
  const out = schedule.lookup('KE0085');   // KE0086 JFK/ICN 이 표에 있다
  assert.strictEqual(out.route, 'ICN/JFK');
  assert.strictEqual(out.derived, true);
  assert.strictEqual(out.start, null);

  assert.strictEqual(schedule.lookup('KE0741').route, 'ICN/NGO');
  assert.strictEqual(schedule.lookup('KE0601').route, 'ICN/CEB');
  assert.strictEqual(schedule.lookup('KE0479').route, 'ICN/SGN');
});
