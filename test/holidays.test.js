const test = require('node:test');
const assert = require('node:assert');
const holidays = require('../src/holidays.js');

test('날짜가 고정된 공휴일은 어느 해든 나온다', () => {
  assert.strictEqual(holidays.nameOf('2026-01-01'), '신정');
  assert.strictEqual(holidays.nameOf('2026-03-01'), '삼일절');
  assert.strictEqual(holidays.nameOf('2026-06-06'), '현충일');
  assert.strictEqual(holidays.nameOf('2026-12-25'), '성탄절');
  // 표가 없는 해에도 고정 공휴일은 나온다
  assert.strictEqual(holidays.nameOf('2035-08-15'), '광복절');
});

test('음력 공휴일과 대체공휴일은 표에 있는 해에만 나온다', () => {
  assert.strictEqual(holidays.nameOf('2026-02-17'), '설날');
  assert.strictEqual(holidays.nameOf('2026-02-16'), '설날 연휴');
  assert.strictEqual(holidays.nameOf('2026-09-25'), '추석');
  assert.strictEqual(holidays.nameOf('2026-05-24'), '부처님오신날');
  assert.strictEqual(holidays.nameOf('2026-03-02'), '대체공휴일');
  // 표에 없는 해의 음력 공휴일은 지어내지 않는다
  assert.strictEqual(holidays.nameOf('2035-02-17'), null);
});

test('표에 적은 이름이 고정 공휴일 이름을 이긴다', () => {
  // 2025년 어린이날은 부처님오신날과 겹쳤다
  assert.strictEqual(holidays.nameOf('2025-05-05'), '어린이날 · 부처님오신날');
});

test('공휴일이 아닌 날과 엉뚱한 값은 null', () => {
  assert.strictEqual(holidays.nameOf('2026-09-07'), null);
  assert.strictEqual(holidays.nameOf('아무거나'), null);
  assert.strictEqual(holidays.nameOf(), null);
  assert.strictEqual(holidays.isHoliday('2026-01-01'), true);
  assert.strictEqual(holidays.isHoliday('2026-01-02'), false);
});

test('한 달치를 한 번에 준다', () => {
  const sep = holidays.inMonth(2026, 9);
  assert.deepStrictEqual(sep, {
    '2026-09-24': '추석 연휴',
    '2026-09-25': '추석',
    '2026-09-26': '추석 연휴'
  });

  const oct = holidays.inMonth(2026, 10);
  assert.strictEqual(oct['2026-10-03'], '개천절');
  assert.strictEqual(oct['2026-10-05'], '대체공휴일');
  assert.strictEqual(oct['2026-10-09'], '한글날');

  assert.deepStrictEqual(holidays.inMonth(2026, 4), {});
});

test('음력 공휴일이 들어 있는 해를 알려준다', () => {
  assert.strictEqual(holidays.covered(2026), true);
  assert.strictEqual(holidays.covered(2035), false);
  const years = holidays.coveredYears();
  assert.ok(years.length >= 3);
  assert.ok(years.indexOf(2026) !== -1);
  // 오름차순으로 준다
  assert.deepStrictEqual(years.slice().sort((a, b) => a - b), years);
});
