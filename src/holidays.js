/**
 * 한국 공휴일.
 *
 * 날짜가 고정된 공휴일은 어느 해든 계산할 수 있지만, 설날·추석·부처님오신날은
 * 음력이라 계산으로 낼 수 없다. 대체공휴일과 선거일도 그때그때 정해진다.
 * 그래서 음력·대체·선거는 연도별 표로 넣고, 표가 없는 해는 고정 공휴일만 보여준다.
 * (없는 날을 지어내기보다 비워 두고, 화면에서 "아직 안 들어 있다" 고 알린다)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.holidays = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** 해마다 같은 날인 공휴일. [월, 일, 이름] */
  var FIXED = [
    [1, 1, '신정'],
    [3, 1, '삼일절'],
    [5, 5, '어린이날'],
    [6, 6, '현충일'],
    [8, 15, '광복절'],
    [10, 3, '개천절'],
    [10, 9, '한글날'],
    [12, 25, '성탄절']
  ];

  /**
   * 음력에서 오는 공휴일과 대체공휴일, 선거일.
   * 고정 공휴일과 겹치는 날(어린이날 겸 부처님오신날 같은)은 여기 이름이 이긴다.
   */
  var TABLE = {
    2025: {
      '2025-01-27': '임시공휴일',
      '2025-01-28': '설날 연휴', '2025-01-29': '설날', '2025-01-30': '설날 연휴',
      '2025-03-03': '대체공휴일',
      '2025-05-05': '어린이날 · 부처님오신날', '2025-05-06': '대체공휴일',
      '2025-06-03': '대통령선거',
      '2025-10-05': '추석 연휴', '2025-10-06': '추석', '2025-10-07': '추석 연휴',
      '2025-10-08': '대체공휴일'
    },
    2026: {
      '2026-02-16': '설날 연휴', '2026-02-17': '설날', '2026-02-18': '설날 연휴',
      '2026-03-02': '대체공휴일',
      '2026-05-24': '부처님오신날', '2026-05-25': '대체공휴일',
      '2026-06-03': '지방선거',
      '2026-08-17': '대체공휴일',
      '2026-09-24': '추석 연휴', '2026-09-25': '추석', '2026-09-26': '추석 연휴',
      '2026-10-05': '대체공휴일'
    },
    2027: {
      '2027-02-06': '설날 연휴', '2027-02-07': '설날', '2027-02-08': '설날 연휴',
      '2027-02-09': '대체공휴일',
      '2027-05-13': '부처님오신날',
      '2027-08-16': '대체공휴일',
      '2027-09-14': '추석 연휴', '2027-09-15': '추석', '2027-09-16': '추석 연휴',
      '2027-10-04': '대체공휴일',
      '2027-10-11': '대체공휴일',
      '2027-12-27': '대체공휴일'
    }
  };

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /** 음력 공휴일까지 들어 있는 해인지. 아니면 고정 공휴일만 나온다. */
  function covered(year) {
    return Object.prototype.hasOwnProperty.call(TABLE, String(year));
  }

  function coveredYears() {
    return Object.keys(TABLE).map(Number).sort();
  }

  /** 그날 공휴일 이름. 공휴일이 아니면 null. */
  function nameOf(isoDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(isoDate || ''))) return null;
    var year = isoDate.slice(0, 4);
    var listed = TABLE[year] && TABLE[year][isoDate];
    if (listed) return listed;

    var month = +isoDate.slice(5, 7);
    var day = +isoDate.slice(8, 10);
    for (var i = 0; i < FIXED.length; i++) {
      if (FIXED[i][0] === month && FIXED[i][1] === day) return FIXED[i][2];
    }
    return null;
  }

  function isHoliday(isoDate) {
    return !!nameOf(isoDate);
  }

  /** 그 달의 공휴일. { 'YYYY-MM-DD': 이름 } */
  function inMonth(year, month) {
    var out = {};
    var prefix = year + '-' + pad2(month);
    var listed = TABLE[String(year)] || {};
    Object.keys(listed).forEach(function (date) {
      if (date.indexOf(prefix) === 0) out[date] = listed[date];
    });
    FIXED.forEach(function (row) {
      if (row[0] !== month) return;
      var date = prefix + '-' + pad2(row[1]);
      if (!out[date]) out[date] = row[2];
    });
    return out;
  }

  return {
    FIXED: FIXED,
    TABLE: TABLE,
    nameOf: nameOf,
    isHoliday: isHoliday,
    inMonth: inMonth,
    covered: covered,
    coveredYears: coveredYears
  };
});
