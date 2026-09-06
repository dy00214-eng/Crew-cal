const test = require('node:test');
const assert = require('node:assert');
const holidays = require('../src/holidays.js');
const lunar = require('../src/holidays-lunar.js');

test('날짜가 고정된 공휴일은 어느 해든 나온다', () => {
  assert.strictEqual(holidays.nameOf('2026-01-01'), '신정');
  assert.strictEqual(holidays.nameOf('2026-03-01'), '삼일절');
  assert.strictEqual(holidays.nameOf('2026-06-06'), '현충일');
  assert.strictEqual(holidays.nameOf('2026-12-25'), '성탄절');
  assert.strictEqual(holidays.nameOf('2150-08-15'), '광복절');
});

test('음력 공휴일은 표에서 가져와 연휴까지 붙인다', () => {
  assert.strictEqual(holidays.nameOf('2026-02-16'), '설날 연휴');
  assert.strictEqual(holidays.nameOf('2026-02-17'), '설날');
  assert.strictEqual(holidays.nameOf('2026-02-18'), '설날 연휴');
  assert.strictEqual(holidays.nameOf('2026-05-24'), '부처님오신날');
  assert.strictEqual(holidays.nameOf('2026-09-24'), '추석 연휴');
  assert.strictEqual(holidays.nameOf('2026-09-25'), '추석');
  assert.strictEqual(holidays.nameOf('2026-09-26'), '추석 연휴');
});

test('2100년까지 설날·부처님오신날·추석이 들어 있다', () => {
  assert.strictEqual(lunar.TO, 2100);
  assert.strictEqual(holidays.covered(2100), true);
  assert.strictEqual(holidays.nameOf('2100-02-09'), '설날');
  assert.strictEqual(holidays.nameOf('2100-09-18'), '추석');
  assert.deepStrictEqual(holidays.coveredRange(), { from: lunar.FROM, to: 2100 });
  // 표 밖의 해는 음력 공휴일을 지어내지 않는다
  assert.strictEqual(holidays.covered(2150), false);
  assert.strictEqual(holidays.lunarDates(2150), null);
});

test('토·일에 걸린 공휴일은 다음 첫 비공휴일로 대체된다', () => {
  assert.strictEqual(holidays.nameOf('2026-03-01'), '삼일절');      // 일요일
  assert.strictEqual(holidays.nameOf('2026-03-02'), '대체공휴일');
  assert.strictEqual(holidays.nameOf('2026-05-25'), '대체공휴일');  // 부처님오신날(일)
  // 광복절·개천절이 토요일이면 일요일을 건너뛰고 월요일로 간다
  assert.strictEqual(holidays.nameOf('2026-08-17'), '대체공휴일');
  assert.strictEqual(holidays.nameOf('2026-10-05'), '대체공휴일');
  assert.strictEqual(holidays.nameOf('2027-10-11'), '대체공휴일');  // 한글날(토)
  assert.strictEqual(holidays.nameOf('2027-12-27'), '대체공휴일');  // 성탄절(토)
});

test('설날·추석 연휴에 일요일이 끼면 하루가 대체된다', () => {
  assert.strictEqual(holidays.nameOf('2025-10-08'), '대체공휴일');  // 추석 연휴에 10/5(일)
  assert.strictEqual(holidays.nameOf('2027-02-09'), '대체공휴일');  // 설날 연휴에 2/7(일)
  // 일요일이 안 끼면 대체가 없다
  assert.strictEqual(holidays.nameOf('2026-02-19'), null);
  assert.strictEqual(holidays.nameOf('2026-09-27'), null);
});

test('어린이날은 다른 공휴일과 겹쳐도 대체된다', () => {
  assert.strictEqual(holidays.nameOf('2025-05-05'), '어린이날 · 부처님오신날');
  assert.strictEqual(holidays.nameOf('2025-05-06'), '대체공휴일');
});

test('신정과 현충일은 주말에 걸려도 대체하지 않는다', () => {
  // 2027-06-06 은 일요일, 2028-01-01 은 토요일
  assert.strictEqual(holidays.nameOf('2027-06-06'), '현충일');
  assert.strictEqual(holidays.nameOf('2027-06-07'), null);
  assert.strictEqual(holidays.nameOf('2028-01-01'), '신정');
  assert.strictEqual(holidays.nameOf('2028-01-03'), null);
});

test('임시공휴일과 선거일은 적어둔 것만 나온다', () => {
  assert.strictEqual(holidays.nameOf('2025-01-27'), '임시공휴일');
  assert.strictEqual(holidays.nameOf('2026-06-03'), '지방선거');
});

test('공휴일이 아닌 날과 엉뚱한 값은 null', () => {
  assert.strictEqual(holidays.nameOf('2026-09-07'), null);
  assert.strictEqual(holidays.nameOf('아무거나'), null);
  assert.strictEqual(holidays.nameOf(), null);
  assert.strictEqual(holidays.isHoliday('2026-01-01'), true);
  assert.strictEqual(holidays.isHoliday('2026-01-02'), false);
});

test('한 달치를 한 번에 준다', () => {
  assert.deepStrictEqual(holidays.inMonth(2026, 9), {
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

test('어느 해든 공휴일 수가 말이 되는 범위에 있다', () => {
  for (let year = lunar.FROM; year <= lunar.TO; year++) {
    const days = Object.keys(holidays.ofYear(year));
    assert.ok(days.length >= 14 && days.length <= 22,
      year + '년 공휴일이 ' + days.length + '일이라 이상합니다');
    days.forEach((date) => {
      assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
      assert.strictEqual(date.slice(0, 4), String(year));
    });
  }
});

test('대체공휴일은 일요일이나 다른 공휴일에 겹치지 않는다', () => {
  for (let year = lunar.FROM; year <= lunar.TO; year++) {
    const map = holidays.ofYear(year);
    Object.keys(map).forEach((date) => {
      if (map[date] !== '대체공휴일') return;
      const weekday = new Date(date + 'T00:00:00Z').getUTCDay();
      assert.notStrictEqual(weekday, 0, date + ' 대체공휴일이 일요일입니다');
    });
  }
});
