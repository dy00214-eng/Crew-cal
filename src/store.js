/**
 * 일정 저장소. localStorage 기반이며, 저장소가 없는 환경에서는 메모리로 동작한다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./codes.js'), require('./resolve.js'));
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.store = factory(root.CrewCal.codes, root.CrewCal.resolve);
  }
})(typeof self !== 'undefined' ? self : this, function (codes, resolver) {
  'use strict';

  var KEY = 'crew-cal.schedule.v1';
  var memory = null;
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

  /*
   * 편명 기억·시간표 채우기는 걷어냈다. 크루넷 홈 화면 원본에 구간과 시각이
   * 다 적혀 있어, 편명으로 목적지를 짐작할 까닭이 없어졌다.
   */

  /** KE704 와 KE0704 가 다른 일정으로 남지 않도록 편명 숫자를 네 자리로 맞춘다. */
  function normalizeCode(code) {
    var raw = String(code || '').toUpperCase().replace(/\s+/g, '');
    if (codes.lookup(raw)) return raw;
    var m = codes.splitFlight(raw);
    // 아는 항공사의 편명만 자릿수를 맞춘다. 모르는 글자는 읽힌 그대로 남겨야
    // 나중에 무엇을 잘못 읽었는지 알아볼 수 있다.
    if (!m || !codes.isAirline(m.airline)) return raw;
    var digits = m.number;
    while (digits.length < 4) digits = '0' + digits;
    return m.airline + digits + m.suffix;
  }

  function decorate(entry) {
    var out = {
      id: entry.id || newId(),
      date: entry.date,
      code: normalizeCode(entry.code),
      type: entry.type || null,
      category: entry.category || null,
      label: entry.label || null,
      route: entry.route || null,
      start: entry.start || entry.dep || null,   // 출발(시작) 시각 HH:MM
      end: entry.end || entry.arr || null,       // 도착(종료) 시각 HH:MM
      endOffset: +(entry.endOffset || entry.arrOffset || 0) || 0, // 도착이 익일이면 1
      memo: entry.memo || null,
      // 크루넷 원본이 알려 주는 것들. 짐작한 값이 아니라 화면에 적혀 있던 값이다.
      from: entry.from || null,
      to: entry.to || null,
      deadhead: !!entry.deadhead,
      segment: entry.segment || null,
      segmentStart: entry.segmentStart !== false,
      legRole: entry.legRole || null,
      strange: entry.strange || false
    };
    if (!out.end) out.endOffset = 0;
    if (!out.type || !out.category || !out.label) {
      var flight = codes.isFlightCode(out.code) ? codes.splitFlight(out.code) : null;
      if (flight && !codes.lookup(out.code)) {
        out.type = out.type || 'flight';
        out.category = out.category || 'flight';
        out.label = out.label || flight.airline + ' ' + flight.number + '편';
      } else if (!codes.lookup(out.code) && codes.splitFlight(out.code)) {
        // 편명 꼴이지만 아는 항공사가 아니다. 비행으로 세지 않는다.
        out.type = out.type || 'duty';
        out.category = out.category || 'unknown';
        out.label = out.label || '알 수 없는 코드';
        out.strange = true;
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

  /**
   * 저장할 때 붙여둔 이름표를 지금 사전 기준으로 다시 읽는다.
   * 사전에서 이름이 바뀌면(ATDO 를 "추가 휴무" 에서 "휴무" 로 바꾼 것처럼)
   * 예전에 넣어둔 일정도 새 이름으로 보인다. 저장된 값은 건드리지 않는다.
   */
  function relabel(entry) {
    var hit = codes.lookup(entry.code);
    if (!hit) return entry;
    if (entry.label === hit.label && entry.category === hit.category) return entry;
    var out = {};
    Object.keys(entry).forEach(function (k) { out[k] = entry[k]; });
    out.label = hit.label;
    out.category = hit.category;
    return out;
  }

  function getAll() {
    var all = load().entries;
    var out = {};
    Object.keys(all).forEach(function (date) { out[date] = sortByTime(all[date].map(relabel)); });
    return out;
  }

  function getByDate(date) {
    var all = load().entries;
    return sortByTime((all[date] || []).map(relabel));
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
  /**
   * 'replace' 로 넣을 때 지울 범위.
   *   options.clearMonth 를 주면 그 달 전체(1일~말일)
   *   아니면 넣는 일정의 첫날~마지막 날
   * 넣는 날짜만 지우면 예전에 잘못 들어간 날이 살아남는다.
   */
  function dateSpan(entries, options) {
    var opts = options || {};
    if (opts.clearMonth) {
      var m = /^(\d{4})-(\d{2})$/.exec(opts.clearMonth);
      if (m) {
        var last = new Date(Date.UTC(+m[1], +m[2], 0)).getUTCDate();
        return { from: opts.clearMonth + '-01', to: opts.clearMonth + '-' + (last < 10 ? '0' : '') + last };
      }
    }
    var dates = entries.map(function (e) { return e.date; }).filter(Boolean).sort();
    if (!dates.length) return null;
    return { from: dates[0], to: dates[dates.length - 1] };
  }

  function applyEntries(entries, mode, options) {
    var data = load();
    var touched = {};
    var removed = 0;
    var added = 0;

    if (mode === 'replace') {
      // 넣는 날짜만 지우면, 예전에 잘못 들어간 날은 새로 읽어도 그대로 남는다.
      // (1월 1일에 유령 비행이 계속 붙어 있던 까닭) 그래서 넣는 범위를 통째로 지운다.
      var span = dateSpan(entries, options);
      Object.keys(data.entries).forEach(function (date) {
        if (span && (date < span.from || date > span.to)) return;
        if (!span && !entries.some(function (e) { return e.date === date; })) return;
        touched[date] = true;
        removed += data.entries[date].length;
        delete data.entries[date];
      });
      entries.forEach(function (e) { touched[e.date] = true; });
    }

    entries.forEach(function (entry) {
      var e = decorate(entry);
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

    var dropped = resolveDates(data, Object.keys(dates(entries)));
    added -= dropped.length;

    save(data);
    return { added: added, removed: removed, dates: Object.keys(touched).length, dropped: dropped };
  }

  function dates(entries) {
    var out = {};
    entries.forEach(function (e) { if (e && e.date) out[e.date] = true; });
    return out;
  }

  /**
   * 반영한 날짜를 다시 훑는다. 지우는 것은 글자까지 똑같은 중복뿐이고, 그 밖에
   * 이상한 조합은 표시만 남는다. 읽어 들인 근무를 저장소에서 없애지 않는다.
   */
  function resolveDates(data, targets) {
    if (!resolver || !targets.length) return [];
    var cleaned = resolver.resolveByDate(data.entries);
    var dropped = cleaned.dropped.filter(function (item) {
      return targets.indexOf(item.date) !== -1;
    });
    targets.forEach(function (date) {
      if (!data.entries[date]) return;
      var next = cleaned.entriesByDate[date] || [];
      if (next.length) data.entries[date] = next;
      else delete data.entries[date];
    });
    return dropped;
  }

  /** 그 범위에 이미 들어 있는 건수. 덮어쓰기 전에 사람에게 알리는 데 쓴다. */
  function countInRange(span) {
    if (!span) return 0;
    var data = load();
    var n = 0;
    Object.keys(data.entries).forEach(function (date) {
      if (date >= span.from && date <= span.to) n += data.entries[date].length;
    });
    return n;
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
    countInRange: countInRange,
    clearAll: clearAll,
    dateSpan: dateSpan,
    resolveDates: resolveDates,
    exportJson: exportJson,
    importJson: importJson,
    decorate: decorate,
    relabel: relabel,
    normalizeCode: normalizeCode,
    sortByTime: sortByTime,
    newId: newId
  };
});
