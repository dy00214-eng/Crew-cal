/**
 * 대한항공 기본 시간표.
 *
 * 편명만 있는 스케줄에 구간과 시각을 채우기 위한 밑자료다. 공개 시간표에서 확인한 값만
 * 담았고, 확인하지 못한 값은 비워 둔다(지어내지 않는다). 사용자가 직접 넣거나
 * "편명 기억" 에 등록한 값이 항상 이 표보다 우선한다.
 *
 * 계절과 요일에 따라 시간표가 바뀌므로 실제 로스터가 언제나 우선이다.
 * 기준: 2026년 9월 운항 스케줄.
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

  var SOURCE_NOTE = '공개 시간표 기준 (2026년 9월)';

  // 편명: [구간, 출발, 도착, 익일도착]
  // 출발·도착을 모두 확인한 편
  var FULL = {
    KE0035: ['ICN/ATL', '09:45', '10:20', 0],
    KE0036: ['ATL/ICN', '13:25', '17:50', 1],
    KE0053: ['ICN/HNL', '21:05', '10:55', 0],
    KE0054: ['HNL/ICN', '13:05', '18:25', 1],
    KE0471: ['ICN/SGN', '09:05', '12:35', 0],
    KE0472: ['SGN/ICN', '13:55', '21:25', 0],
    KE0805: ['ICN/TSN', '10:15', '11:15', 0],
    KE0806: ['TSN/ICN', '11:30', '14:20', 0],
    KE0901: ['ICN/CDG', '12:05', '18:30', 0],
    KE0902: ['CDG/ICN', '20:30', '15:30', 1],
    KE1401: ['ICN/PUS', '06:35', '07:45', 0],
    KE1402: ['PUS/ICN', '07:00', '08:10', 0],
    KE2071: ['PUS/PVG', '08:35', '09:30', 0],
    KE2072: ['PVG/PUS', '11:00', '13:17', 0]
  };

  // 구간과 출발 시각만 확인한 편 (인천 출발 전광판 기준)
  var DEPARTURE_ONLY = {
    KE0017: ['ICN/LAX', '14:30'],
    KE0033: ['ICN/ATL', '08:45'],
    KE0041: ['ICN/SEA', '16:40'],
    KE0165: ['ICN/WUH', '08:40'],
    KE0257: ['ICN/ANC', '22:05'],
    KE0497: ['ICN/DEL', '12:50'],
    KE0509: ['ICN/AMS', '11:05'],
    KE0711: ['ICN/NRT', '13:00'],
    KE0791: ['ICN/FUK', '11:05'],
    KE0833: ['ICN/SHE', '14:35'],
    KE0835: ['ICN/SZX', '08:40'],
    KE0843: ['ICN/TAO', '13:05'],
    KE0873: ['ICN/DLC', '13:00'],
    KE0881: ['ICN/PVG', '08:25'],
    KE0887: ['ICN/PVG', '11:10'],
    KE0921: ['ICN/LIS', '12:45'],
    KE1403: ['ICN/PUS', '08:20'],
    KE1405: ['ICN/PUS', '17:10'],
    KE2041: ['ICN/ULN', '08:35'],
    KE8053: ['ICN/HNL', null]
  };

  var TABLE = {};

  Object.keys(FULL).forEach(function (code) {
    var row = FULL[code];
    TABLE[code] = { route: row[0], start: row[1], end: row[2], endOffset: row[3] || 0 };
  });

  Object.keys(DEPARTURE_ONLY).forEach(function (code) {
    var row = DEPARTURE_ONLY[code];
    TABLE[code] = { route: row[0], start: row[1] || null, end: null, endOffset: 0 };
  });

  /** 편명을 표기 차이와 상관없이 찾는다. KE35, KE035, KE0035 모두 같은 편으로 본다. */
  function normalize(code) {
    var m = String(code || '').toUpperCase().match(/^([A-Z]{2})(\d{1,4})([A-Z]?)$/);
    if (!m) return null;
    var digits = m[2];
    while (digits.length < 4) digits = '0' + digits;
    return m[1] + digits;
  }

  function lookup(code) {
    var key = normalize(code);
    if (!key) return null;
    var hit = TABLE[key];
    if (!hit) return null;
    return {
      route: hit.route,
      start: hit.start,
      end: hit.end,
      endOffset: hit.endOffset,
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
