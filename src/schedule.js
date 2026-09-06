/**
 * 대한항공 기본 시간표.
 *
 * 인천공항 출발·도착 전광판(2026-09-06 운항)에서 모은 값과, 개별로 확인한 값을 담았다.
 * 앱은 한국 쪽 시각만 보여주므로 여기에도 한국 쪽 시각만 둔다.
 *   - 한국에서 나가는 편: 출발 시각
 *   - 한국으로 들어오는 편: 한국 도착 시각
 * 확인하지 못한 시각은 비워 둔다(지어내지 않는다).
 *
 * 표에 없는 짝수 편명은 바로 앞 홀수 편명의 되돌아오는 편으로 보고 구간만 뒤집어 쓴다.
 * (KE0037 ICN/ORD 이면 KE0038 은 ORD/ICN) 대한항공 편명 규칙이라 구간은 이렇게 맞지만,
 * 시각까지 추측하지는 않는다.
 *
 * 요일과 계절에 따라 시간표가 바뀌므로 실제 로스터가 언제나 우선한다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.schedule = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SOURCE_NOTE = '인천공항 시간표 기준 (2026년 9월)';

  /* 한국에서 나가는 편: 편명 -> [도착 공항, 출발 시각] */
  var OUT = {
    '0005': ['LAS', '21:00'], '0011': ['LAX', '19:40'], '0017': ['LAX', '14:30'],
    '0023': ['SFO', '16:00'], '0031': ['DFW', '09:30'], '0033': ['ATL', '08:45'],
    '0035': ['ATL', '10:35'], '0037': ['ORD', '10:40'], '0041': ['SEA', '16:40'],
    '0053': ['HNL', '21:05'], '0071': ['YVR', '18:45'], '0075': ['YVR', '22:40'],
    '0077': ['YYZ', '10:00'], '0081': ['JFK', '10:00'], '0093': ['IAD', '10:25'],
    '0101': ['NKG', '10:25'], '0115': ['YNJ', '09:25'], '0125': ['XMN', '10:20'],
    '0127': ['FOC', '08:10'], '0141': ['XIY', '09:10'], '0155': ['HFE', '13:25'],
    '0165': ['WUH', '08:40'], '0213': ['LAX', '02:20'], '0257': ['ANC', '22:05'],
    '0283': ['ANC', '04:00'], '0313': ['HKG', '22:25'], '0317': ['ANC', '01:45'],
    '0319': ['CAN', '00:05'], '0321': ['CAN', '00:35'], '0343': ['MNL', '22:40'],
    '0349': ['CGK', '22:20'], '0361': ['HAN', '23:30'], '0411': ['AKL', '18:00'],
    '0415': ['GUM', '10:05'], '0417': ['GUM', '18:25'], '0427': ['KUL', '16:20'],
    '0431': ['DPS', '16:10'], '0433': ['DPS', '18:00'], '0441': ['HAN', '08:00'],
    '0471': ['SGN', '09:05'], '0497': ['DEL', '12:50'], '0509': ['AMS', '11:05'],
    '0551': ['NRT', '13:35'], '0619': ['MNL', '22:35'], '0647': ['SIN', '23:35'],
    '0651': ['BKK', '18:05'], '0677': ['HKT', '17:50'], '0703': ['NRT', '10:10'],
    '0707': ['NRT', '14:45'], '0711': ['NRT', '13:00'], '0713': ['NRT', '17:15'],
    '0723': ['KIX', '09:35'], '0725': ['KIX', '15:05'], '0743': ['NGO', '18:50'],
    '0769': ['CTS', '12:35'], '0787': ['FUK', '08:00'], '0791': ['FUK', '11:05'],
    '0795': ['FUK', '16:25'], '0805': ['TSN', '09:10'], '0831': ['SHE', '08:05'],
    '0833': ['SHE', '14:35'], '0835': ['SZX', '08:40'], '0841': ['TAO', '07:50'],
    '0843': ['TAO', '13:05'], '0851': ['PEK', '08:15'], '0855': ['PEK', '10:40'],
    '0867': ['CAN', '08:50'], '0873': ['DLC', '13:00'], '0881': ['PVG', '08:25'],
    '0887': ['PVG', '11:10'], '0901': ['CDG', '12:05'], '0907': ['LHR', '10:55'],
    '0913': ['MAD', '10:13'], '0921': ['LIS', '12:45'], '0927': ['MXP', '15:25'],
    '0931': ['FCO', '14:05'], '0945': ['FRA', '10:50'], '1401': ['PUS', '06:35'],
    '1405': ['PUS', '17:10'], '2005': ['HKG', '13:25'], '2015': ['MFM', '10:10'],
    '2021': ['TPE', '10:30'], '2027': ['TPE', '16:10'], '2041': ['ULN', '08:35'],
    '2147': ['OKA', '09:20'], '2155': ['KMJ', '17:05'], '2171': ['UKB', '09:05'],
    '2173': ['KIX', '15:50'], '2185': ['OKJ', '10:30'], '2193': ['AOJ', '09:05'],
    '2197': ['KIJ', '17:10'], '8053': ['HNL', '22:35'], '8207': ['LAX', '16:10'],
    '8315': ['PVG', '01:40']
  };

  /* 한국으로 들어오는 편: 편명 -> [출발 공항, 한국 도착 시각, 익일 도착이면 1] */
  var IN = {
    '0006': ['LAS', '04:40', 1], '0012': ['LAX', '04:40', 1], '0036': ['ATL', '17:50', 1],
    '0054': ['HNL', '18:25', 1], '0086': ['JFK', '05:10', 1], '0418': ['GUM', '05:40', 0],
    '0472': ['SGN', '21:25', 0], '0602': ['CEB', '06:30', 0], '0626': ['MNL', '06:15', 0],
    '0644': ['SIN', '05:35', 0], '0658': ['BKK', '05:05', 0], '0806': ['TSN', '14:20', 0],
    '0864': ['PEK', '04:40', 0], '0902': ['CDG', '15:30', 1], '8204': ['LAX', '00:45', 1]
  };

  /* 국내선이나 한국을 거치지 않는 편처럼 양쪽 시각을 다 아는 편 */
  var FULL = {
    '1402': ['PUS/ICN', '07:00', '08:10', 0],
    '2071': ['PUS/PVG', '08:35', '09:30', 0],
    '2072': ['PVG/PUS', '11:00', '13:17', 0]
  };

  var TABLE = {};

  Object.keys(OUT).forEach(function (num) {
    TABLE['KE' + num] = { route: 'ICN/' + OUT[num][0], start: OUT[num][1], end: null, endOffset: 0 };
  });
  Object.keys(IN).forEach(function (num) {
    TABLE['KE' + num] = { route: IN[num][0] + '/ICN', start: null, end: IN[num][1], endOffset: IN[num][2] || 0 };
  });
  Object.keys(FULL).forEach(function (num) {
    TABLE['KE' + num] = { route: FULL[num][0], start: FULL[num][1], end: FULL[num][2], endOffset: FULL[num][3] || 0 };
  });

  /** 편명을 표기 차이와 상관없이 찾는다. KE35, KE035, KE0035 모두 같은 편으로 본다. */
  function normalize(code) {
    var m = String(code || '').toUpperCase().match(/^([A-Z]{2})(\d{1,4})([A-Z]?)$/);
    if (!m) return null;
    var digits = m[2];
    while (digits.length < 4) digits = '0' + digits;
    return m[1] + digits;
  }

  /**
   * 표에 없는 짝수 편은 바로 앞 홀수 편(나가는 편)의 되돌아오는 편으로 본다.
   * 구간만 뒤집어 쓰고 시각은 넣지 않는다.
   */
  function pairedReturn(key) {
    var m = key.match(/^KE(\d{4})$/);
    if (!m) return null;
    var num = parseInt(m[1], 10);
    if (num % 2 !== 0 || num < 2) return null;

    var outbound = TABLE['KE' + String(num - 1).padStart(4, '0')];
    if (!outbound || !outbound.route) return null;

    var parts = outbound.route.split('/');
    if (parts.length !== 2 || parts[0] !== 'ICN') return null;
    return { route: parts[1] + '/ICN', start: null, end: null, endOffset: 0, derived: true };
  }

  function lookup(code) {
    var key = normalize(code);
    if (!key) return null;
    var hit = TABLE[key] || pairedReturn(key);
    if (!hit) return null;
    return {
      route: hit.route,
      start: hit.start,
      end: hit.end,
      endOffset: hit.endOffset,
      derived: !!hit.derived,
      source: 'schedule'
    };
  }

  function size() {
    return Object.keys(TABLE).length;
  }

  return {
    TABLE: TABLE,
    SOURCE_NOTE: SOURCE_NOTE,
    normalize: normalize,
    lookup: lookup,
    size: size
  };
});
