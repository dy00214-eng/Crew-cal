/**
 * 스케줄에서 "어디를 몇 번 갔고 얼마나 날았는지" 를 뽑는다.
 *
 * 크루캘이 쌓아 둔 일정을 그대로 먹는다. 크루넷이 익일 도착편을 이틀에 걸쳐 적어
 * 두는 탓에 생기는 중복은 달력과 같은 규칙으로 한 번만 센다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./airports.js'), require('./calendar.js'), require('./geo.js'));
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.journeys = factory(root.CrewCal.airports, root.CrewCal.calendar, root.CrewCal.geo);
  }
})(typeof self !== 'undefined' ? self : this, function (airports, calendar, geo) {
  'use strict';

  /**
   * collect(entriesByDate, { from: '2026-01-01', to: '2026-12-31' })
   *
   *   legs   [{ from, to, count }]                지도에 그릴 항로
   *   places [{ iata, city, flag, country, count, firstDate, lastDate }]  다녀온 곳
   *   totals { trips, flights, km, cities, countries, days }
   *
   * "다녀온 횟수" 는 한국에서 뜨는 편만 센다. 나가는 편과 들어오는 편을 다 세면
   * 한 번 다녀온 것이 두 번이 되기 때문이다. 거리는 실제로 탄 모든 편을 더한다.
   */
  function collect(entriesByDate, options) {
    var opts = options || {};
    var byDate = entriesByDate || {};
    var hidden = calendar ? calendar.suppressedTimes(byDate) : {};
    var legs = {};
    var places = {};
    var years = {};
    var flights = 0;
    var trips = 0;
    var km = 0;

    Object.keys(byDate).sort().forEach(function (date) {
      if (opts.from && date < opts.from) return;
      if (opts.to && date > opts.to) return;

      (byDate[date] || []).forEach(function (entry) {
        if (entry.type !== 'flight' || !entry.route) return;
        if (hidden[date + '|' + entry.code]) return;
        var ends = airports.splitRoute(entry.route);
        if (!ends.from || !ends.to) return;

        flights++;
        years[date.slice(0, 4)] = true;

        var key = ends.from + '-' + ends.to;
        if (!legs[key]) legs[key] = { from: ends.from, to: ends.to, count: 0 };
        legs[key].count++;
        km += geo.distanceKm(geo.coordOf(ends.from), geo.coordOf(ends.to));

        // 다녀온 곳은 한국에서 뜨는 편만
        if (airports.countryOf(ends.from) !== 'KR') return;
        var place = airports.tripPlace(entry);
        if (!place) return;
        trips++;
        if (!places[place.iata]) {
          places[place.iata] = {
            iata: place.iata,
            city: place.city,
            flag: place.flag,
            country: airports.countryOf(place.iata),
            count: 0,
            firstDate: date,
            lastDate: date
          };
        }
        var hit = places[place.iata];
        hit.count++;
        if (date < hit.firstDate) hit.firstDate = date;
        if (date > hit.lastDate) hit.lastDate = date;
      });
    });

    var placeList = Object.keys(places).map(function (iata) { return places[iata]; });
    placeList.sort(function (a, b) {
      if (a.count !== b.count) return b.count - a.count;
      return a.city < b.city ? -1 : 1;
    });

    var countries = {};
    placeList.forEach(function (p) { if (p.country) countries[p.country] = true; });

    return {
      legs: Object.keys(legs).map(function (k) { return legs[k]; })
        .sort(function (a, b) { return b.count - a.count; }),
      places: placeList,
      years: Object.keys(years).sort(),
      totals: {
        flights: flights,
        trips: trips,
        km: Math.round(km),
        laps: geo.laps(km),
        cities: placeList.length,
        countries: Object.keys(countries).length
      }
    };
  }

  /** 일정이 걸쳐 있는 해 목록. 화면에서 연도를 고르는 데 쓴다. */
  function yearsOf(entriesByDate) {
    var seen = {};
    Object.keys(entriesByDate || {}).forEach(function (date) {
      if ((entriesByDate[date] || []).length) seen[date.slice(0, 4)] = true;
    });
    return Object.keys(seen).sort();
  }

  return {
    collect: collect,
    yearsOf: yearsOf
  };
});
