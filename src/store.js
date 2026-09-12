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
  var TIMES_KEY = 'crew-cal.flight-times.v1';
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
      timeSource: entry.timeSource || null,
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

    // 지우기 전에 갖고 있던 시각을 챙겨 둔다
    var kept = {};
    Object.keys(data.entries).forEach(function (date) {
      data.entries[date].forEach(function (old) {
        if (old.start || old.end) kept[date + '|' + old.code] = old;
      });
    });

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

    var roles = legRolesOf(entries);
    entries.forEach(function (entry) {
      var e = decorate(entry);
      e.id = newId();
      data.entries[e.date] = data.entries[e.date] || [];
      // 시각은 덮어쓰지 않고 보탠다. 달력 캡처(시각 없음)를 나중에 넣어도
      // 홈 화면에서 받아 둔 시각이나 직접 넣은 시각이 날아가지 않도록.
      keepTimes(kept[e.date + '|' + e.code], e);
      // 원본에서 온 시각은 편명별로 기억해 둔다. 다음에 편명만 들어와도 채울 수 있다.
      learnTimes(e);
      // 시각 없이 들어온 편은 기억해 둔 값으로 채운다('기억' 표가 붙는다).
      fillFromMemory(e, roles[e.date + '|' + String(e.code).toUpperCase()]);
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


  /* ---------------- 편명별 시각 기억 ----------------
   *
   * 달력 화면을 복사해 붙여넣으면 편명만 들어오고 시각이 없다. 홈 화면(목록)을
   * 한 번이라도 넣었다면 그때 받은 시각을 편명별로 기억해 두었다가 채워 준다.
   *
   * 지어내는 것이 아니다 — 기억하는 값은 오로지 원본에서 온 시각과 직접 넣은
   * 시각뿐이다. 노선표나 규칙으로 짐작한 값은 배우지 않는다.
   * 채워 넣은 자리에는 '기억' 표를 달아 원본과 구별되게 둔다.
   */

  var timeMemory = {};

  function loadTimes() {
    var ls = storage();
    if (!ls) return timeMemory;
    try {
      var raw = ls.getItem(TIMES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return timeMemory;
    }
  }

  function saveTimeBook(data) {
    var ls = storage();
    if (!ls) { timeMemory = data; return data; }
    try { ls.setItem(TIMES_KEY, JSON.stringify(data)); } catch (e) { timeMemory = data; }
    return data;
  }

  /** 이 엔트리의 시각을 배워도 되는가. 원본과 직접 넣은 값만 배운다. */
  function teachable(entry) {
    if (!entry || entry.type !== 'flight' || !entry.code) return false;
    if (!entry.start && !entry.end) return false;
    // 기억해 둔 값을 다시 배우면 틀린 값이 굳어 버린다. 짐작한 값도 배우지 않는다.
    var from = entry.timeSource || null;
    return from === null || from === 'user' || from === 'kept';
  }

  /** 편명 하나의 시각을 기억한다. 직접 넣은 값이 언제나 우선이다. */
  function learnTimes(entry) {
    if (!teachable(entry)) return null;
    var code = String(entry.code).toUpperCase();
    var data = loadTimes();
    var known = data[code] || {};
    if (known.source === 'user' && entry.timeSource !== 'user') return known;
    data[code] = {
      start: entry.start || known.start || null,
      end: entry.end || known.end || null,
      endOffset: entry.end ? (entry.endOffset || 0) : (known.endOffset || 0),
      source: entry.timeSource === 'user' ? 'user' : 'original',
      seenAt: new Date().toISOString()
    };
    saveTimeBook(data);
    return data[code];
  }

  function recallTimes(code) {
    if (!code) return null;
    return loadTimes()[String(code).toUpperCase()] || null;
  }

  /**
   * 시각이 비어 있는 비행에 기억해 둔 시각을 채운다. 채운 자리는 표를 남긴다.
   *
   * 날을 넘겨 나는 편은 하루에 한쪽만 일어난다. 떠나는 날엔 출발만, 닿는 날엔
   * 도착만, 기내에서 날을 넘기는 날엔 아무것도. 이걸 가리지 않으면 KE0006 이
   * 10·11·12일 세 칸 모두에 '출발'과 '도착'을 같이 달고 나온다.
   */
  function fillFromMemory(entry, role) {
    if (!entry || entry.type !== 'flight' || !entry.code) return entry;
    if (entry.start && entry.end) return entry;
    if (entry.timeSource === 'user') return entry;
    var known = recallTimes(entry.code);
    if (!known) return entry;

    var leg = role || entry.legRole || null;
    if (leg === 'enroute') return entry;          // 기내에서 날을 넘기는 날

    var filled = false;
    if (!entry.start && known.start && leg !== 'arrive') { entry.start = known.start; filled = true; }
    if (!entry.end && known.end && leg !== 'depart') {
      entry.end = known.end;
      entry.endOffset = known.endOffset || 0;
      filled = true;
    }
    if (filled) {
      entry.timeSource = 'memory';
      if (!entry.legRole && leg) entry.legRole = leg;
    }
    return entry;
  }

  function dayNumberOf(date) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ''));
    return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000) : null;
  }

  /**
   * 한 묶음 안에서 같은 편명이 이어진 날에 걸쳐 있으면 한 번의 비행이다.
   * 첫날은 출발, 끝날은 도착, 사이는 기내. 떨어져 있는 날은 저마다 따로 본다.
   * { '2026-01-10|KE0006': 'depart', '2026-01-11|KE0006': 'enroute', … }
   */
  function legRolesOf(entries) {
    var byCode = {};
    (entries || []).forEach(function (e) {
      if (!e || !e.code || !e.date) return;
      if (e.type !== 'flight' && !codes.isFlightCode(e.code)) return;
      var key = String(e.code).toUpperCase();
      (byCode[key] = byCode[key] || []).push(e.date);
    });
    var roles = {};
    Object.keys(byCode).forEach(function (code) {
      var days = byCode[code].slice().sort();
      var run = [];
      function close() {
        if (run.length > 1) {
          run.forEach(function (date, i) {
            roles[date + '|' + code] = i === 0 ? 'depart'
              : i === run.length - 1 ? 'arrive' : 'enroute';
          });
        }
        run = [];
      }
      days.forEach(function (date) {
        if (!run.length) { run.push(date); return; }
        var gap = dayNumberOf(date) - dayNumberOf(run[run.length - 1]);
        if (gap === 1) run.push(date);
        else if (gap === 0) { /* 같은 날 두 번은 한 칸으로 본다 */ }
        else { close(); run.push(date); }
      });
      close();
    });
    return roles;
  }

  /** 저장해 둔 일정 전체에 기억한 시각을 채운다. 채운 건수를 돌려준다. */
  function fillTimesFromMemory() {
    var data = load();
    var filled = 0;
    var all = [];
    Object.keys(data.entries).forEach(function (date) {
      data.entries[date].forEach(function (e) { all.push(e); });
    });
    var roles = legRolesOf(all);
    Object.keys(data.entries).forEach(function (date) {
      data.entries[date].forEach(function (entry) {
        var before = (entry.start || '') + '|' + (entry.end || '');
        fillFromMemory(entry, roles[entry.date + '|' + String(entry.code).toUpperCase()]);
        if ((entry.start || '') + '|' + (entry.end || '') !== before) filled++;
      });
    });
    if (filled) save(data);
    return filled;
  }

  /**
   * 이미 저장돼 있는 일정에서 편명 시각을 거둬들인다.
   * 기억 기능이 생기기 전에 넣어 둔 홈 화면 글도 바로 쓸 수 있게 하려는 것이다.
   * 원본에서 온 시각과 직접 넣은 시각만 배운다(teachable 이 걸러 준다).
   */
  function learnFromStored() {
    var data = load();
    var learned = 0;
    Object.keys(data.entries).forEach(function (date) {
      data.entries[date].forEach(function (entry) {
        if (learnTimes(entry)) learned++;
      });
    });
    return learned;
  }

  /** 기억해 둔 편명 시각 목록. 설정 화면이 쓴다. */
  function timeBook() {
    var data = loadTimes();
    return Object.keys(data).sort().map(function (code) {
      return {
        code: code,
        start: data[code].start || null,
        end: data[code].end || null,
        endOffset: data[code].endOffset || 0,
        source: data[code].source || 'original'
      };
    });
  }

  function forgetTime(code) {
    var data = loadTimes();
    delete data[String(code).toUpperCase()];
    saveTimeBook(data);
  }

  function forgetTimes() { saveTimeBook({}); }

  /**
   * 새로 들어온 건에 시각이 없으면 갖고 있던 시각을 옮겨 준다.
   * 사용자가 직접 넣은 값(timeSource 'user')은 어떤 경우에도 지키고,
   * 새 원본에 시각이 있으면 그쪽이 맞다(스케줄이 바뀌었을 수 있으니).
   */
  function keepTimes(old, next) {
    if (!old) return next;
    var mine = old.timeSource === 'user';
    if (!next.start && old.start) { next.start = old.start; next.timeSource = old.timeSource || 'kept'; }
    else if (mine && old.start) { next.start = old.start; next.timeSource = 'user'; }
    if (!next.end && old.end) {
      next.end = old.end;
      next.endOffset = old.endOffset || 0;
      next.timeSource = next.timeSource || old.timeSource || 'kept';
    } else if (mine && old.end) {
      next.end = old.end;
      next.endOffset = old.endOffset || 0;
      next.timeSource = 'user';
    }
    return next;
  }

  /** 한 건의 시각을 직접 고친다. 직접 넣은 값이라고 표시해 둔다. */
  function setTimes(date, id, times) {
    var data = load();
    var list = data.entries[date] || [];
    var hit = null;
    list.forEach(function (e) { if (e.id === id) hit = e; });
    if (!hit) return null;
    hit.start = times.start || null;
    hit.end = times.end || null;
    hit.endOffset = times.end ? (+times.endOffset || 0) : 0;
    hit.timeSource = (times.start || times.end) ? 'user' : null;
    if (!hit.legRole) hit.legRole = hit.start ? 'depart' : (hit.end ? 'arrive' : null);
    save(data);
    return hit;
  }

  /** 시각이 비어 있는 비행. 한 번에 채우는 화면이 쓴다. */
  function missingTimes(fromIso, toIso) {
    var all = load().entries;
    var out = [];
    Object.keys(all).sort().forEach(function (date) {
      if (fromIso && date < fromIso) return;
      if (toIso && date > toIso) return;
      all[date].forEach(function (e) {
        if (e.type !== 'flight' || e.strange) return;
        if (e.start || e.end) return;
        out.push({ date: date, id: e.id, code: e.code, route: e.route || null, legRole: e.legRole || null });
      });
    });
    return out;
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
    keepTimes: keepTimes,
    setTimes: setTimes,
    learnTimes: learnTimes,
    recallTimes: recallTimes,
    fillFromMemory: fillFromMemory,
    legRolesOf: legRolesOf,
    fillTimesFromMemory: fillTimesFromMemory,
    timeBook: timeBook,
    learnFromStored: learnFromStored,
    forgetTime: forgetTime,
    forgetTimes: forgetTimes,
    missingTimes: missingTimes,
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
