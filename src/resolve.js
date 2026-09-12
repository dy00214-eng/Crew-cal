/**
 * 하루에 겹쳐 들어온 근무를 정리한다.
 *
 * 크루넷 캡처를 읽다 보면 한 칸에서 같은 근무를 두 번 집거나(ADO 와 ATDO),
 * 서로 같이 있을 수 없는 근무가 함께 들어온다(휴무와 체류). 그대로 두면
 * 달력 한 칸에 휴무·체류·휴무가 나란히 서서 어느 것이 맞는지 알 수 없다.
 * 지어내지 않고 고를 수 있는 것만 고른다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./codes.js'), require('./airports.js'));
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.resolve = factory(root.CrewCal.codes, root.CrewCal.airports);
  }
})(typeof self !== 'undefined' ? self : this, function (codes, airports) {
  'use strict';

  /** 휴무 계열끼리 겹치면 더 구체적인 쪽을 남긴다. 앞에 있을수록 세다. */
  var OFF_RANK = ['ATDO', 'ADO', 'GDO', 'CDO', 'PDO', 'DO', 'OFF', 'X'];

  /** 한 칸에 여럿이 남았을 때 어느 것을 먼저 보여줄지. 앞에 있을수록 세다. */
  var KEEP_RANK = ['flight', 'layover', 'standby', 'training', 'vacation', 'off', 'other', 'unknown'];

  /**
   * 그 자체로는 하루를 설명하지 못하는 덧말. 크루넷이 비행 칸 위에 겹쳐 찍는 표시라
   * 자리가 모자라면 이것부터 뺀다. 비행이나 체류를 밀어내면 안 된다.
   */
  var FILLER = { TVL: true, BRF: true, BLK: true };

  var MAX_PER_DAY = 2;

  function categoryOf(entry) {
    if (!entry) return 'unknown';
    if (entry.category) return entry.category;
    if (entry.type === 'flight') return 'flight';
    return codes ? codes.describe(entry.code).category : 'unknown';
  }

  function codeOf(entry) {
    return String((entry && entry.code) || '').toUpperCase();
  }

  function isOff(entry) {
    return categoryOf(entry) === 'off';
  }

  function isLayover(entry) {
    return categoryOf(entry) === 'layover';
  }

  function isFlight(entry) {
    return categoryOf(entry) === 'flight' || (entry && entry.type === 'flight');
  }

  function rankIn(list, value) {
    var i = list.indexOf(value);
    return i === -1 ? list.length : i;
  }

  /** 자리가 모자랄 때 남길 차례. 작을수록 먼저 남는다. */
  function keepRank(entry) {
    if (FILLER[codeOf(entry)]) return KEEP_RANK.length + 1;
    return rankIn(KEEP_RANK, categoryOf(entry));
  }

  function warn(message) {
    if (typeof console !== 'undefined' && console && typeof console.warn === 'function') {
      console.warn('[crew-cal] ' + message);
    }
  }

  function prevDay(date) {
    var d = new Date(date + 'T00:00:00Z');
    if (isNaN(d.getTime())) return null;
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  /** 도착지가 한국 밖인 비행이면 참. 구간을 모르면 판단하지 않는다(null). */
  function arrivesOverseas(entry) {
    if (!isFlight(entry)) return null;
    if (!entry.route || !airports) return null;
    var parts = airports.splitRoute(entry.route);
    if (!parts || !parts.to) return null;
    var country = airports.countryOf(parts.to);
    if (!country) return null;
    return country !== 'KR';
  }

  /**
   * 이 날짜 직전에 해외에 내려놓은 비행이 있었는지.
   * 체류는 며칠씩 이어지므로 체류만 있는 날은 건너뛰고 더 거슬러 올라간다.
   * 비행을 만나면 거기서 판가름하고, 구간을 모르는 비행이면 판단을 미룬다(null).
   */
  function arrivedOverseasBefore(byDate, date, limit) {
    var back = limit == null ? 7 : limit;
    var cursor = prevDay(date);
    for (var i = 0; i < back && cursor; i++) {
      var list = byDate[cursor] || [];
      var flights = list.filter(isFlight);
      if (flights.length) {
        var unknown = false;
        for (var j = flights.length - 1; j >= 0; j--) {
          var verdict = arrivesOverseas(flights[j]);
          if (verdict === true) return true;
          if (verdict === null) unknown = true;
        }
        return unknown ? null : false;
      }
      // 체류만 이어지는 날은 그 앞의 비행을 마저 찾는다
      if (list.length && list.every(isLayover)) { cursor = prevDay(cursor); continue; }
      return false;
    }
    return false;
  }

  /** 같은 (날짜, 코드) 가 두 번 들어오면 앞의 것만 남긴다. */
  function dedupe(entries) {
    var seen = {};
    var out = [];
    (entries || []).forEach(function (entry) {
      if (!entry || !entry.date) return;
      var key = entry.date + '|' + codeOf(entry);
      if (seen[key]) return;
      seen[key] = true;
      out.push(entry);
    });
    return out;
  }

  function groupByDate(entries) {
    var byDate = {};
    entries.forEach(function (entry) {
      (byDate[entry.date] = byDate[entry.date] || []).push(entry);
    });
    return byDate;
  }

  /**
   * 하루치를 정리한다. byDate 는 앞뒤 날을 살펴보기 위한 것이고,
   * 남길 것과 버릴 것을 갈라 돌려준다.
   */
  function resolveDay(list, date, byDate, dropped) {
    var keep = list.slice();
    var drop = function (entry, why) {
      dropped.push({ date: date, code: codeOf(entry), reason: why, entry: entry });
    };

    // 1) 휴무 계열은 하루에 하나. ATDO > ADO > DO
    var offs = keep.filter(isOff);
    if (offs.length > 1) {
      var best = offs.slice().sort(function (a, b) {
        return rankIn(OFF_RANK, codeOf(a)) - rankIn(OFF_RANK, codeOf(b));
      })[0];
      keep = keep.filter(function (e) {
        if (!isOff(e) || e === best) return true;
        drop(e, 'off-merge');
        return false;
      });
    }

    // 2) 휴무와 체류는 같은 날 함께 있을 수 없다.
    //    직전에 해외에 내린 비행이 있으면 체류가 맞고, 없으면 휴무가 맞다.
    var hasOff = keep.some(isOff);
    var hasLayover = keep.some(isLayover);
    if (hasOff && hasLayover) {
      var overseas = arrivedOverseasBefore(byDate, date);
      var dropLayover = overseas === false;   // 판단이 안 서면(null) 체류를 남긴다
      keep = keep.filter(function (e) {
        if (dropLayover ? !isLayover(e) : !isOff(e)) return true;
        drop(e, dropLayover ? 'layover-without-arrival' : 'off-with-layover');
        return false;
      });
    }

    // 3) 한 칸에 두 개까지. 넘치는 것은 조용히 버리지 않고 알린다.
    if (keep.length > MAX_PER_DAY) {
      var ordered = keep.map(function (e, i) { return { e: e, i: i }; }).sort(function (a, b) {
        var d = keepRank(a.e) - keepRank(b.e);
        return d !== 0 ? d : a.i - b.i;
      });
      var cut = ordered.slice(MAX_PER_DAY).map(function (x) { return x.e; });
      cut.forEach(function (e) { drop(e, 'overflow'); });
      warn(date + ' 에 근무가 ' + keep.length + '개 들어왔습니다. ' +
        keep.map(codeOf).join(', ') + ' 중 ' + cut.map(codeOf).join(', ') + ' 를 빼고 그렸습니다.');
      keep = keep.filter(function (e) { return cut.indexOf(e) === -1; });
    }

    return keep;
  }

  /**
   * 일정 목록을 정리해 돌려준다. 원본은 건드리지 않는다.
   * { entries, dropped } 를 준다. dropped 에는 어떤 날의 무엇을 왜 뺐는지 남는다.
   */
  function resolve(entries) {
    var list = dedupe(entries);
    var byDate = groupByDate(list);
    var dropped = [];
    var out = [];
    Object.keys(byDate).sort().forEach(function (date) {
      byDate[date] = resolveDay(byDate[date], date, byDate, dropped);
    });
    list.forEach(function (entry) {
      if ((byDate[entry.date] || []).indexOf(entry) !== -1) out.push(entry);
    });
    return { entries: out, dropped: dropped };
  }

  /** 날짜별 표({'2026-04-12': [...]})를 그대로 정리해 돌려준다. */
  function resolveByDate(entriesByDate) {
    var flat = [];
    Object.keys(entriesByDate || {}).sort().forEach(function (date) {
      (entriesByDate[date] || []).forEach(function (entry) {
        if (entry && entry.date === date) flat.push(entry);
        else if (entry) {
          var copy = {};
          Object.keys(entry).forEach(function (k) { copy[k] = entry[k]; });
          copy.date = date;
          flat.push(copy);
        }
      });
    });
    var done = resolve(flat);
    var out = {};
    done.entries.forEach(function (entry) {
      (out[entry.date] = out[entry.date] || []).push(entry);
    });
    return { entriesByDate: out, dropped: done.dropped };
  }

  return {
    resolve: resolve,
    resolveByDate: resolveByDate,
    resolveDay: resolveDay,
    dedupe: dedupe,
    arrivesOverseas: arrivesOverseas,
    arrivedOverseasBefore: arrivedOverseasBefore,
    OFF_RANK: OFF_RANK,
    keepRank: keepRank,
    MAX_PER_DAY: MAX_PER_DAY
  };
});
