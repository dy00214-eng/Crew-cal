/**
 * 미등록 편명 일괄 등록.
 *
 * 저장된 일정을 훑어 구간을 모르는 편명을 모은다. 칸을 하나씩 눌러 고치는 것은
 * 한 달에 열 편씩 나올 때 쓸 수가 없다. 여기서 도착 공항만 줄줄이 적으면 된다.
 *
 * 대한항공 편명은 홀수가 한국발, 짝수가 한국행이다(1997년 이후 체계). 그래서
 * 도착 공항 하나만 알면 구간이 정해지고, 짝이 되는 편명도 거꾸로 제안할 수 있다.
 * 어디까지나 편명 규칙이므로 실제 로스터가 언제나 우선한다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./codes.js'), require('./airports.js'));
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.bulkroutes = factory(root.CrewCal.codes, root.CrewCal.airports);
  }
})(typeof self !== 'undefined' ? self : this, function (codes, airports) {
  'use strict';

  var BASE = 'ICN';

  function numberOf(code) {
    var parts = codes && codes.splitFlight ? codes.splitFlight(code) : null;
    return parts ? +parts.number : null;
  }

  /** 홀수면 한국발, 짝수면 한국행. 짝이 되는 편명(없으면 null). */
  function pairOf(code) {
    var parts = codes && codes.splitFlight ? codes.splitFlight(code) : null;
    if (!parts) return null;
    var n = +parts.number;
    if (!n) return null;
    var mate = n % 2 === 1 ? n + 1 : n - 1;
    if (mate < 1) return null;
    var digits = String(mate);
    while (digits.length < parts.number.length) digits = '0' + digits;
    return parts.airline + digits;
  }

  /**
   * 도착 공항 하나로 구간을 정한다.
   *  홀수 -> 한국에서 나가는 편 (ICN/XXX)
   *  짝수 -> 한국으로 들어오는 편 (XXX/ICN)
   * base 를 주면 인천 대신 그 공항을 한국 쪽으로 쓴다(김포 출발 등).
   */
  function routeFor(code, outstation, base) {
    var iata = airports && airports.findCode ? airports.findCode(outstation) : null;
    if (!iata) return null;
    var home = (airports && airports.findCode ? airports.findCode(base || BASE) : null) || BASE;
    var n = numberOf(code);
    if (n == null) return null;
    return n % 2 === 1 ? { from: home, to: iata } : { from: iata, to: home };
  }

  /** 한쪽을 넣으면 반대쪽 편을 제안한다. { code, from, to } 또는 null. */
  function pairSuggestion(code, outstation, base) {
    var mate = pairOf(code);
    if (!mate) return null;
    var route = routeFor(mate, outstation, base);
    if (!route) return null;
    return { code: mate, from: route.from, to: route.to };
  }

  /** ke-routes.json 한 줄 모양으로. 도시·나라·국기는 공항표에서 채운다. */
  function toRouteRow(route) {
    if (!route) return null;
    var outIata = airports && airports.outstation
      ? airports.outstation(route.from + '/' + route.to)
      : route.to;
    var info = airports && airports.describeAirport ? airports.describeAirport(outIata) : null;
    return {
      from: route.from,
      to: route.to,
      city: info ? info.city : outIata,
      country: info ? info.country : null,
      flag: info ? info.flag : '',
      start: route.start || null,
      end: route.end || null,
      endOffset: route.endOffset || 0
    };
  }

  /**
   * 저장된 일정에서 구간을 모르는 편명을 모은다.
   *   entriesByDate: 날짜 -> 일정 목록
   *   recall(code): 아는 구간을 돌려주는 함수(store.recallFlight)
   * 편명마다 몇 번 나왔는지, 어느 날에 있는지, 짝 편명이 무엇인지 함께 준다.
   */
  function missingFlights(entriesByDate, recall) {
    var found = {};
    Object.keys(entriesByDate || {}).sort().forEach(function (date) {
      (entriesByDate[date] || []).forEach(function (entry) {
        if (!entry || entry.type !== 'flight' || entry.strange) return;
        if (entry.route) return;
        var code = String(entry.code || '').toUpperCase();
        if (!code) return;
        var known = recall ? recall(code) : null;
        if (known && known.route) return;
        if (!found[code]) found[code] = { code: code, count: 0, dates: [], pair: pairOf(code) };
        found[code].count++;
        if (found[code].dates.indexOf(date) === -1) found[code].dates.push(date);
      });
    });
    return Object.keys(found).sort().map(function (code) { return found[code]; });
  }

  return {
    BASE: BASE,
    pairOf: pairOf,
    routeFor: routeFor,
    pairSuggestion: pairSuggestion,
    toRouteRow: toRouteRow,
    missingFlights: missingFlights
  };
});
