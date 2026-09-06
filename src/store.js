/**
 * 일정 저장소. localStorage 기반이며, 저장소가 없는 환경에서는 메모리로 동작한다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./codes.js'));
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.store = factory(root.CrewCal.codes);
  }
})(typeof self !== 'undefined' ? self : this, function (codes) {
  'use strict';

  var KEY = 'crew-cal.schedule.v1';
  var FLIGHTS_KEY = 'crew-cal.flights.v1';
  var memory = null;
  var flightMemory = null;
  var seq = 0;

  function storage() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('__crewcal_probe__', '1');
        localStorage.removeItem('__crewcal_probe__');
        return localStorage;
      }
    } catch (e) { /* 사파리 프라이빗 모드 등 */ }
    return null;
  }

  function emptyData() {
    return { version: 1, entries: {}, updatedAt: null };
  }

  function load() {
    var ls = storage();
    if (!ls) return memory || (memory = emptyData());
    try {
      var raw = ls.getItem(KEY);
      if (!raw) return emptyData();
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || !data.entries) return emptyData();
      return data;
    } catch (e) {
      return emptyData();
    }
  }

  function save(data) {
    data.updatedAt = new Date().toISOString();
    var ls = storage();
    if (!ls) { memory = data; return data; }
    try {
      ls.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      memory = data;
    }
    return data;
  }

  function newId() {
    return 'e' + Date.now().toString(36) + (seq++).toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /* ---------------- 편명 기억 ----------------
   * 크루넷 월간 화면에는 편명만 있고 시각이 없다. 한 번이라도 구간·시각을 넣은
   * 편명은 여기에 적어두었다가, 다음에 같은 편명이 코드만으로 들어오면 채워준다.
   * 없는 정보를 지어내지 않도록, 사용자가 직접 넣은 값만 기억한다.
   */

  function loadFlights() {
    var ls = storage();
    if (!ls) return flightMemory || (flightMemory = {});
    try {
      var raw = ls.getItem(FLIGHTS_KEY);
      var data = raw ? JSON.parse(raw) : null;
      return (data && typeof data === 'object') ? data : {};
    } catch (e) {
      return {};
    }
  }

  function saveFlights(data) {
    var ls = storage();
    if (!ls) { flightMemory = data; return data; }
    try {
      ls.setItem(FLIGHTS_KEY, JSON.stringify(data));
    } catch (e) {
      flightMemory = data;
    }
    return data;
  }

  function isFlightCode(entry) {
    return entry && entry.type === 'flight' && /^[A-Z]{2}\d{1,4}[A-Z]?$/.test(entry.code || '');
  }

  /** 구간이나 시각이 들어 있는 항공편이면 그 값을 기억한다. */
  function learnFlight(entry) {
    if (!isFlightCode(entry)) return null;
    if (!entry.route && !entry.start && !entry.end) return null;

    var data = loadFlights();
    var known = data[entry.code] || {};
    data[entry.code] = {
      route: entry.route || known.route || null,
      start: entry.start || known.start || null,
      end: entry.end || known.end || null,
      endOffset: entry.end ? (entry.endOffset || 0) : (known.endOffset || 0),
      updatedAt: new Date().toISOString()
    };
    saveFlights(data);
    return data[entry.code];
  }

  function recallFlight(code) {
    if (!code) return null;
    return loadFlights()[String(code).toUpperCase()] || null;
  }

  /** 코드만 있는 항공편에 기억해둔 구간·시각을 채운다. 채운 항목은 표시를 남긴다. */
  function enrich(entry) {
    if (!isFlightCode(entry)) return entry;
    if (entry.route && entry.start && entry.end) return entry;

    var known = recallFlight(entry.code);
    if (!known) return entry;

    var filled = [];
    if (!entry.route && known.route) { entry.route = known.route; filled.push('route'); }
    if (!entry.start && known.start) { entry.start = known.start; filled.push('start'); }
    if (!entry.end && known.end) {
      entry.end = known.end;
      entry.endOffset = known.endOffset || 0;
      filled.push('end');
    }
    if (filled.length) entry.autoFilled = filled;
    return entry;
  }

  function forgetFlights() {
    saveFlights({});
  }

  function flightList() {
    var data = loadFlights();
    return Object.keys(data).sort().map(function (code) {
      var item = data[code];
      return {
        code: code,
        route: item.route || null,
        start: item.start || null,
        end: item.end || null,
        endOffset: item.endOffset || 0
      };
    });
  }

  function decorate(entry) {
    var out = {
      id: entry.id || newId(),
      date: entry.date,
      code: String(entry.code || '').toUpperCase(),
      type: entry.type || null,
      category: entry.category || null,
      label: entry.label || null,
      route: entry.route || null,
      start: entry.start || entry.dep || null,   // 출발(시작) 시각 HH:MM
      end: entry.end || entry.arr || null,       // 도착(종료) 시각 HH:MM
      endOffset: +(entry.endOffset || entry.arrOffset || 0) || 0, // 도착이 익일이면 1
      memo: entry.memo || null,
      autoFilled: entry.autoFilled || null
    };
    if (!out.end) out.endOffset = 0;
    if (!out.type || !out.category || !out.label) {
      var flight = out.code.match(/^([A-Z]{2})(\d{1,4})([A-Z])?$/);
      if (flight && !codes.lookup(out.code)) {
        out.type = out.type || 'flight';
        out.category = out.category || 'flight';
        out.label = out.label || flight[1] + ' ' + flight[2] + '편';
      } else {
        var hit = codes.describe(out.code);
        out.type = out.type || 'duty';
        out.category = out.category || hit.category;
        out.label = out.label || hit.label;
      }
    }
    return out;
  }

  /** 하루치 일정을 출발(시작) 시각 순으로. 시각이 없는 건은 뒤로 보낸다. */
  function sortByTime(list) {
    return list
      .map(function (e, i) { return { e: e, i: i }; })
      .sort(function (a, b) {
        var at = a.e.start || '99:99';
        var bt = b.e.start || '99:99';
        if (at !== bt) return at < bt ? -1 : 1;
        return a.i - b.i;
      })
      .map(function (x) { return x.e; });
  }

  function getAll() {
    var all = load().entries;
    var out = {};
    Object.keys(all).forEach(function (date) { out[date] = sortByTime(all[date]); });
    return out;
  }

  function getByDate(date) {
    var all = load().entries;
    return sortByTime((all[date] || []).slice());
  }

  function getRange(fromIso, toIso) {
    var all = load().entries;
    var out = {};
    Object.keys(all).forEach(function (d) {
      if (d >= fromIso && d <= toIso) out[d] = sortByTime(all[d].slice());
    });
    return out;
  }

  function addEntry(entry) {
    var data = load();
    var e = decorate(entry);
    if (!e.date) throw new Error('날짜가 필요합니다.');
    if (!e.code) throw new Error('코드가 필요합니다.');
    learnFlight(e);
    enrich(e);
    data.entries[e.date] = data.entries[e.date] || [];
    data.entries[e.date].push(e);
    save(data);
    return e;
  }

  function removeEntry(date, id) {
    var data = load();
    var list = data.entries[date];
    if (!list) return false;
    var next = list.filter(function (e) { return e.id !== id; });
    if (next.length === list.length) return false;
    if (next.length) data.entries[date] = next;
    else delete data.entries[date];
    save(data);
    return true;
  }

  function clearDate(date) {
    var data = load();
    if (!data.entries[date]) return 0;
    var n = data.entries[date].length;
    delete data.entries[date];
    save(data);
    return n;
  }

  /**
   * 파싱 결과를 일괄 반영한다.
   * mode: 'replace' (해당 날짜의 기존 일정을 지우고 반영) | 'merge' (기존에 이어 붙임)
   */
  function applyEntries(entries, mode) {
    var data = load();
    var touched = {};
    var removed = 0;
    var added = 0;

    if (mode === 'replace') {
      entries.forEach(function (e) {
        if (touched[e.date]) return;
        touched[e.date] = true;
        if (data.entries[e.date]) {
          removed += data.entries[e.date].length;
          delete data.entries[e.date];
        }
      });
    }

    entries.forEach(function (entry) { learnFlight(entry); });

    entries.forEach(function (entry) {
      var e = enrich(decorate(entry));
      e.id = newId();
      data.entries[e.date] = data.entries[e.date] || [];
      if (mode !== 'replace') {
        var dup = data.entries[e.date].some(function (x) {
          return x.code === e.code && (x.route || '') === (e.route || '') && (x.start || '') === (e.start || '');
        });
        if (dup) return;
      }
      data.entries[e.date].push(e);
      added++;
    });

    save(data);
    return { added: added, removed: removed, dates: Object.keys(touched).length };
  }

  function countExisting(entries) {
    var data = load();
    var dates = {};
    entries.forEach(function (e) { dates[e.date] = true; });
    var n = 0;
    Object.keys(dates).forEach(function (d) {
      n += (data.entries[d] || []).length;
    });
    return n;
  }

  function clearAll() {
    save(emptyData());
  }

  function exportJson() {
    return JSON.stringify(load(), null, 2);
  }

  function importJson(json) {
    var data = JSON.parse(json);
    if (!data || !data.entries) throw new Error('올바른 백업 파일이 아닙니다.');
    save({ version: 1, entries: data.entries, updatedAt: null });
  }

  return {
    KEY: KEY,
    load: load,
    getAll: getAll,
    getByDate: getByDate,
    getRange: getRange,
    addEntry: addEntry,
    removeEntry: removeEntry,
    clearDate: clearDate,
    applyEntries: applyEntries,
    countExisting: countExisting,
    clearAll: clearAll,
    exportJson: exportJson,
    importJson: importJson,
    decorate: decorate,
    sortByTime: sortByTime,
    learnFlight: learnFlight,
    recallFlight: recallFlight,
    enrich: enrich,
    flightList: flightList,
    forgetFlights: forgetFlights,
    FLIGHTS_KEY: FLIGHTS_KEY,
    newId: newId
  };
});
