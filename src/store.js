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

  function decorate(entry) {
    var out = {
      id: entry.id || newId(),
      date: entry.date,
      code: String(entry.code || '').toUpperCase(),
      type: entry.type || null,
      category: entry.category || null,
      label: entry.label || null,
      route: entry.route || null,
      start: entry.start || null,
      end: entry.end || null,
      memo: entry.memo || null
    };
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

  function getAll() {
    return load().entries;
  }

  function getByDate(date) {
    var all = load().entries;
    return (all[date] || []).slice();
  }

  function getRange(fromIso, toIso) {
    var all = load().entries;
    var out = {};
    Object.keys(all).forEach(function (d) {
      if (d >= fromIso && d <= toIso) out[d] = all[d].slice();
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
    newId: newId
  };
});
