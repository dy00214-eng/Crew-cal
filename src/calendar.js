/** 월간 캘린더 렌더러 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./airports.js'), require('./holidays.js'));
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.calendar = factory(root.CrewCal.airports, root.CrewCal.holidays);
  }
})(typeof self !== 'undefined' ? self : this, function (airports, holidays) {
  'use strict';

  var WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function iso(y, m, d) { return y + '-' + pad2(m) + '-' + pad2(d); }

  function todayIso() {
    var t = new Date();
    return iso(t.getFullYear(), t.getMonth() + 1, t.getDate());
  }

  function daysInMonth(year, month) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }

  function firstWeekday(year, month) {
    return new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  }

  function weekdayOf(isoDate) {
    var d = new Date(isoDate + 'T00:00:00Z');
    return isNaN(d) ? '' : WEEKDAYS[d.getUTCDay()];
  }

  /**
   * 그날 이 듀티에 무슨 일이 있었는지. 크루넷이 시각 칸에 적어 준 그대로 읽는다.
   *   'depart'  그날 출발했다        (시각 칸 "22:46 -")
   *   'arrive'  그날 도착했다        (시각 칸 "- 05:07")
   *   'enroute' 그날은 기내에 있었다 (시각 칸 "-")
   */
  function legRole(entry) {
    if (!entry) return null;
    if (entry.legRole) return entry.legRole;      // 크루넷 원본이 적어 준 것이 먼저
    if (entry.start) return 'depart';
    if (entry.end) return 'arrive';
    // 시각을 모르는 편은 '기내' 가 아니라 그냥 시각을 모르는 것이다.
    // 기내는 크루넷이 시각 칸을 "-" 로 적어 준 날에만 쓴다.
    return null;
  }

  /** 도착지가 한국인가. 구간을 알 때만 참·거짓, 모르면 null. */
  function arrivesKorea(entry) {
    if (!entry || !airports) return null;
    var to = entry.to || (entry.route ? airports.splitRoute(entry.route).to : null);
    if (!to) return null;
    var country = airports.countryOf(to);
    return country ? country === 'KR' : null;
  }

  function skipTime() { return false; }

  /**
   * 그날 떠나고 그날 닿은 편은 시각이 둘이다. 한국에서 나가는 편은 출발 시각이,
   * 한국으로 들어오는 편은 한국 도착 시각이 궁금하다. 시차가 섞이면 헷갈리니
   * 한쪽만 고른다. 한국과 무관한 구간이면 둘 다 보여준다.
   */
  function koreanSide(entry) {
    if (!entry || !airports) return null;
    var from = entry.from || (entry.route ? airports.splitRoute(entry.route).from : null);
    var to = entry.to || (entry.route ? airports.splitRoute(entry.route).to : null);
    if (!from || !to) return null;
    var fromKR = airports.countryOf(from) === 'KR';
    var toKR = airports.countryOf(to) === 'KR';
    if (fromKR && !toKR) return 'start';
    if (toKR && !fromKR) return 'end';
    return null;
  }

  /**
   * 달력 칸에 넣을 짧은 시각 표기.
   * 시각은 언제나 그 공항의 현지 시각이다. 한국 시각으로 돌리지 않는다.
   *   '11:03 출발' · '05:07 한국 도착' · '21:30 도착' · 기내인 날은 빈 문자열
   */
  function formatTimeRange(entry, full) {
    if (!entry) return '';
    var role = legRole(entry);
    var side = full ? null : koreanSide(entry);
    if (side === 'start' && entry.start) return entry.start + ' 출발';
    if (side === 'end' && entry.end) return entry.end + ' 한국 도착';

    if (role === 'depart' && entry.start) {
      // 한국과 무관한 구간이 그날 떠나 그날 닿았으면 양쪽을 다 적는다.
      // \u200B(폭 없는 공백)은 칸이 좁을 때 도착 시각이 아랫줄로 넘어가게 해준다.
      if (entry.end) return entry.start + '\u2192\u200B' + entry.end;
      return entry.start + ' 출발';
    }
    if (role === 'arrive' && entry.end) {
      return entry.end + (arrivesKorea(entry) ? ' 한국 도착' : ' 도착');
    }
    // 시각을 모르는 편(달력 캡처)도 어느 쪽으로 가는 편인지는 구간이 알려 준다.
    // 없는 값을 지어내는 것이 아니라 ICN/HKG 가 곧 '출발' 이라는 뜻이다.
    if (!entry.start && !entry.end && entry.type === 'flight') {
      // 날을 넘겨 나는 편은 그날이 출발인지 기내인지 도착인지가 먼저다
      if (role === 'enroute') return '';
      if (role === 'depart') return '출발';
      if (role === 'arrive') return arrivesKorea(entry) ? '한국 도착' : '도착';
      var korea = arrivesKorea(entry);
      if (korea === true) return '한국 도착';
      if (korea === false && entry.route) return '출발';
    }
    if (full && entry.start) return entry.start + ' 출발';
    return '';
  }

  // ── 시각 표기 ────────────────────────────────────────────────────────────
  // 크루넷이 적어 주는 시각은 그 공항의 현지 시각이다. 달력에는 한국 시각으로
  // 옮겨 적는다(설정에서 현지 시각으로 되돌릴 수 있다). 어느 공항 기준인지
  // 헷갈리지 않도록 시각 앞에 늘 공항 코드를 붙인다.
  var SHIFT_MARK = { '-2': '\u207B\u00B2', '-1': '\u207B\u00B9', '1': '\u207A\u00B9', '2': '\u207A\u00B2' };

  /**
   * 시각 하나를 칸에 적을 꼴로. 한국 시각으로 옮기면서 날이 넘어가면 표시를 남긴다.
   *   { text: 'ICN출발 21:03', shift: 0, at: 'ICN', kind: '출발', minutes: 1263 }
   * 시간대를 모르는 공항은 옮기지 않고 원래 값을 그대로 쓴다. 지어내지 않는다.
   */
  function timePoint(iata, kind, date, hhmm, localOnly) {
    if (!hhmm) return null;
    var at = iata ? String(iata).toUpperCase() : '';
    var shown = hhmm;
    var shift = 0;
    if (!localOnly && airports && airports.toKst) {
      var kst = airports.toKst(date, hhmm, at);
      if (kst) { shown = kst.time; shift = kst.shift; }
    }
    var hm = /^(\d{1,2}):(\d{2})$/.exec(shown);
    return {
      at: at,
      kind: kind,
      time: shown,
      shift: shift,
      text: (at ? at : '') + kind + ' ' + shown,
      minutes: hm ? (+hm[1]) * 60 + (+hm[2]) + shift * 1440 : 0
    };
  }

  /**
   * 한 엔트리가 그날 남기는 시각들. 출발은 떠난 공항, 도착은 닿은 공항 기준이다.
   * 칸에 적는 시각은 비행에서만 가져온다. 체류는 '체류' 한 마디로 족하다(중간일).
   */
  function entryTimes(entry, date, localOnly) {
    if (!entry || entry.type !== 'flight') return [];
    var ends = entry.route && airports ? airports.splitRoute(entry.route) : { from: null, to: null };
    var from = entry.from || ends.from;
    var to = entry.to || ends.to;
    var out = [];
    var start = entry.start ? timePoint(from, '\uCD9C\uBC1C', date, entry.start, localOnly) : null;
    var end = entry.end ? timePoint(to, '\uB3C4\uCC29', date, entry.end, localOnly) : null;
    // 비행기가 뜨기 전에 내릴 수는 없다. 시각만 보고 앞뒤가 바뀌면 하루를 넘긴 것이다.
    // 원본에 없는 값을 지어내는 것이 아니라 이미 있는 두 시각의 앞뒤를 맞추는 것뿐이다.
    if (start && end && end.minutes <= start.minutes) {
      end.shift += 1;
      end.minutes += 1440;
    }
    if (start) out.push(start);
    if (end) out.push(end);
    return out;
  }

  /** 편명 앞에 붙일 출발 나라 국기. 구간을 모르면 빈 문자열. */
  function departureFlag(entry) {
    return airports ? airports.departureFlag(entry) : '';
  }

  /** 국기 + 구간. '🇰🇷 ICN/JFK' (기억한 편명 목록처럼 구간 자체를 보여줄 때) */
  function routeLabel(entry) {
    if (!entry || !entry.route) return '';
    var flag = departureFlag(entry);
    return (flag ? flag + ' ' : '') + entry.route;
  }

  /** 어디 가는 편인지: '🇺🇸 애틀랜타'. 한국에서 나가면 도착지, 들어오면 출발지. */
  function placeLabel(entry) {
    if (!airports) return '';
    var place = airports.tripPlace(entry);
    if (!place) return '';
    return (place.flag ? place.flag + ' ' : '') + place.city;
  }

  /**
   * 날짜별 목록에 쓸 자세한 시각 표기. 원본이 적어 준 것만 쓴다.
   * 현지 시각이므로 어느 공항 시각인지 함께 적는다.
   */
  function describeTimes(entry, full) {
    if (!entry) return '';
    var role = legRole(entry);
    var flight = entry.type === 'flight' || entry.category === 'flight';
    var out = [];
    if (entry.start) {
      out.push((flight ? '출발' : '시작') + ' ' + entry.start +
        (entry.from ? ' (' + entry.from + ' 현지)' : ''));
    }
    if (entry.end) {
      out.push((flight ? '도착' : '종료') + ' ' + entry.end +
        (entry.to ? ' (' + entry.to + ' 현지)' : ''));
    }
    if (!out.length && role === 'enroute') return '기내';
    return out.join(' \u2192 ');
  }

  /**
   * 칸에 쓸 이름.
   * 비행이 아닌 근무는 코드 대신 한글 이름을 쓴다. 달력에서는 ATDO 보다 휴무가 읽기 쉽고,
   * 원래 코드는 길게 눌러 뜨는 설명과 날짜별 목록에 그대로 남는다.
   * 비행은 편명이 곧 정보라 그대로 두되, 칸이 좁으면 항공사 두 글자만 뗀다(KE0035 -> 0035).
   */
  function chipText(entry, compact) {
    if (!entry) return '';
    if (entry.type !== 'flight') return entry.label || entry.code || '';
    if (!compact) return entry.code;
    return String(entry.code).replace(/^[A-Z]{2}(?=\d)/, '');
  }

  /**
   * 그날이 어떤 날인지 한마디로. 칸 전체를 이 색으로 칠해 쉬는 날과 비행 날을 갈라 준다.
   * 하루에 여러 개가 있으면 무거운 쪽을 따른다. 비행이 하나라도 있으면 비행하는 날이고,
   * 아무 근무도 없이 휴무만 있어야 쉬는 날이다.
   */
  var DAY_ORDER = ['flight', 'standby', 'training', 'layover', 'other', 'unknown', 'vacation', 'off'];

  function dayCategory(list) {
    // 아는 항공사가 아닌 편명 꼴(AS0016)은 근무가 아니므로 칸 색을 좌우하지 않는다
    var real = (list || []).filter(function (e) { return !e.strange; });
    if (!real.length) return null;
    for (var i = 0; i < DAY_ORDER.length; i++) {
      for (var j = 0; j < real.length; j++) {
        if ((real[j].category || 'other') === DAY_ORDER[i]) return DAY_ORDER[i];
      }
    }
    return null;
  }

  // 한 칸에 몇 개까지 보일지. 넘는 것은 '+N' 으로 접기만 하고 절대 지우지 않는다.
  var CELL_LIMIT = 3;

  /**
   * 넘겨짚은 휴무를 붙여도 되는 날인지. 읽어 들인 근무가 하나라도 있으면 안 된다.
   * 1월 11일(KE0006)과 15일(KE2011 LO)이 흐린 '휴무' 로 덮여 버린 일이 있었다.
   * 실수로라도 다시 그러지 않도록 여기서 막고, 어긋나면 소리 내어 알린다.
   */
  function canAssumeOff(list) {
    return (list || []).length === 0;
  }

  /** 붙이기 직전에 한 번 더 확인한다. 어긋나면 조용히 넘어가지 않고 터뜨린다. */
  function assertNoEntries(list, date) {
    if (canAssumeOff(list)) return true;
    throw new Error('추정 휴무를 붙이려 했으나 ' + (date || '그 날') + ' 에 이미 근무가 ' +
      (list || []).length + '건 있습니다: ' +
      (list || []).map(function (e) { return e.code; }).join(', '));
  }

  /**
   * 달력 칸에 그릴 것만 골라 낸다. 지우는 것이 아니라 감추는 것이다.
   * 아는 항공사가 아닌 편명 꼴(AS0016)은 근무가 아니므로 칸에 띄우지 않는다.
   * 날짜를 누르면 원래 글자가 그대로 보인다.
   */
  function cellItems(list) {
    return (list || []).filter(function (e) {
      if (e.strange) return false;
      // TVL 은 그 편에 배지로 붙었으므로 따로 그리지 않는다(두 번 나오던 것)
      if (e.attachedTo) return false;
      return true;
    });
  }

  /**
   * 그날 짚어 볼 것이 있는지. 휴무와 비행이 함께 있거나 휴무가 여럿이면
   * 잘못 읽혔을 수 있다. 지우지 않고 '확인 필요' 표만 띄운다.
   */
  function dayNeedsCheck(list) {
    var real = (list || []).filter(function (e) { return !e.strange; });
    var offs = real.filter(function (e) { return (e.category || '') === 'off'; });
    if (!offs.length) return null;
    if (offs.length > 1) return '휴무 코드가 여럿입니다';
    if (real.some(function (e) { return e.type === 'flight'; })) return '휴무와 비행이 같은 날에 있습니다';
    if (real.some(function (e) { return (e.category || '') === 'layover'; })) return '휴무와 체류가 같은 날에 있습니다';
    return null;
  }

  function nextDay(date) {
    var d = new Date(date + 'T00:00:00Z');
    if (isNaN(d)) return null;
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  /**
   * 예전에는 익일 도착 편의 출발일 시각을 감췄다. 크루넷 원본이 날마다 그날
   * 무슨 일이 있었는지 따로 적어 주므로 감출 것이 없다. 빈 표를 준다.
   */
  function suppressedTimes() {
    return {};
  }

  function upcoming(entriesByDate, fromIso) {
    var byDate = entriesByDate || {};
    var from = fromIso || todayIso();
    var dates = Object.keys(byDate).filter(function (date) {
      return date >= from && (byDate[date] || []).length;
    }).sort();
    if (!dates.length) return null;

    var date = dates[0];
    var list = byDate[date];
    var pick = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].type === 'flight') { pick = list[i]; break; }
    }
    return { date: date, entry: pick || list[0], all: list, days: daysBetween(from, date) };
  }

  function daysBetween(fromIso, toIso) {
    var a = fromIso.split('-');
    var b = toIso.split('-');
    var one = Date.UTC(+a[0], +a[1] - 1, +a[2]);
    var two = Date.UTC(+b[0], +b[1] - 1, +b[2]);
    return Math.round((two - one) / 86400000);
  }

  /**
   * 날짜별로 "그날 어디에 있나". 체류하는 날에는 구간이 안 적혀 있으므로,
   * 마지막으로 내린 공항을 다음 비행까지 이어 간다. 한국에 내리면 다시 비운다.
   * 결과는 { 'YYYY-MM-DD': { iata, city, flag } }.
   */
  function tripPlaces(entriesByDate) {
    var byDate = entriesByDate || {};
    var out = {};
    var current = null;
    Object.keys(byDate).sort().forEach(function (date) {
      (byDate[date] || []).forEach(function (e) {
        if (e.type !== 'flight' || !e.route || !airports) return;
        var ends = airports.splitRoute(e.route);
        if (!ends.to) return;
        current = airports.countryOf(ends.to) === 'KR'
          ? null
          : { iata: ends.to, city: airports.cityOf(ends.to), flag: airports.flagOf(ends.to) };
      });
      out[date] = current;
    });
    return out;
  }

  // ── 멀티데이 띠 ──────────────────────────────────────────────────────────
  // 한 번의 해외 여정(나가는 편 ~ 돌아오는 편)을 칸 아래를 가로지르는 띠로 잇는다.
  // 띠가 있으면 달력을 훑기만 해도 어느 주에 어디에 나가 있었는지 바로 보인다.

  /** 그날 발이 닿아 있던 외국. 한국 안에서만 움직인 날은 null. */
  function awayCountryOf(list) {
    if (!airports) return null;
    var found = null;
    (list || []).forEach(function (e) {
      if (e.strange) return;
      var ends = e.route ? airports.splitRoute(e.route) : { from: null, to: null };
      var from = e.from || ends.from;
      var to = e.to || ends.to;
      [from, to].forEach(function (code) {
        if (!code) return;
        var country = airports.countryOf(code);
        if (!country || country === 'KR') return;
        if (!found) found = { country: country, iata: code };
      });
    });
    return found;
  }

  /**
   * 하루짜리 왕복은 띠를 그리지 않는다. 이틀 이상 이어지는 여정만 띠로 잇는다.
   * [{ country:'US', countryName:'미국', flag:'🇺🇸', start:'2026-01-09', end:'2026-01-12' }]
   */
  function tripBands(entriesByDate, dates) {
    if (!airports) return [];
    var out = [];
    var open = null;
    (dates || []).forEach(function (date) {
      var away = awayCountryOf(entriesByDate[date] || []);
      if (away && open && open.country === away.country) { open.end = date; return; }
      if (open) { out.push(open); open = null; }
      if (away) open = { country: away.country, start: date, end: date };
    });
    if (open) out.push(open);
    return out.filter(function (band) { return band.start !== band.end; })
      .map(function (band) {
        band.countryName = airports.countryName(band.country);
        band.flag = airports.flagOfCountry(band.country);
        return band;
      });
  }

  /** 나라마다 다른 색을 주되 아무 색이나 뽑지 않도록 코드에서 늘 같은 값을 만든다. */
  function bandHue(country) {
    var text = String(country || '');
    var sum = 0;
    for (var i = 0; i < text.length; i++) sum = (sum * 31 + text.charCodeAt(i)) % 360;
    return sum;
  }

  // ── 칸 내용 묶기 ─────────────────────────────────────────────────────────
  // 한 날에 비행과 체류가 함께 있으면 도시가 두 번 적혀 칸이 지저분해진다.
  // 같은 도시로 묶어 한 덩이로 보이게 하되, 시각은 하나도 버리지 않는다.

  function placeOf(entry, fallback) {
    if (!airports) return null;
    if (entry.type === 'flight') return airports.tripPlace(entry);
    if ((entry.category || '') === 'layover') {
      return (entry.route ? airports.tripPlace(entry) : null) || fallback || null;
    }
    return null;
  }

  /**
   * 칸에 그릴 덩이들. 도시가 같으면 한 덩이로 묶고, 도시가 없는 근무(휴무·대기)는
   * 저마다 한 덩이가 된다. 원본 엔트리는 모두 어느 덩이엔가 들어간다 — 버리지 않는다.
   */
  function cellGroups(list, date, staying, localOnly) {
    var groups = [];
    var byKey = {};
    (list || []).forEach(function (entry) {
      var place = placeOf(entry, staying);
      var key = place ? 'place:' + place.iata : 'code:' + groups.length + ':' + (entry.code || '');
      var group = byKey[key];
      if (!group) {
        group = {
          key: key,
          place: place,
          entries: [],
          times: [],
          category: entry.category || 'other'
        };
        byKey[key] = group;
        groups.push(group);
      }
      group.entries.push(entry);
      // 비행이 있으면 칸 색은 비행을 따른다. 체류만 있는 날은 체류 색.
      if (entry.type === 'flight') group.category = 'flight';
      group.times = group.times.concat(entryTimes(entry, date, localOnly));
    });
    groups.forEach(function (group) {
      group.times.sort(function (a, b) { return a.minutes - b.minutes; });
      group.enroute = group.entries.every(function (e) {
        return e.type !== 'flight' || legRole(e) === 'enroute';
      }) && group.entries.some(function (e) { return e.type === 'flight'; });
      group.layover = group.entries.some(function (e) { return (e.category || '') === 'layover'; });
    });
    return groups;
  }

  /** 칸에 적을 시각 줄. 여러 편이 겹친 날은 처음 떠난 때와 마지막 닿은 때만 적는다. */
  function groupLines(group) {
    var times = group.times;
    if (!times.length) return [];
    if (times.length <= 2) return times.slice();
    return [times[0], times[times.length - 1]];
  }

  // 달력은 언제나 일요일부터 토요일까지 일곱 칸이다. 이 값을 세는 곳은 여기 하나뿐.
  var COLUMNS = 7;

  function dayIndex(date) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ''));
    if (!m) return null;
    return Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000);
  }

  function render(container, options) {
    var year = options.year;
    var month = options.month;
    var entriesByDate = options.entriesByDate || {};
    var selected = options.selectedDate;
    var onSelect = options.onSelect || function () {};
    var hideTimes = options.hideTimes || {};
    var localOnly = !!options.localTimes;
    // 코드가 안 잡힌 이 달의 날은 휴무로 본다. 크루넷도 빈 칸은 쉬는 날이다.
    var assumeOff = options.assumeOff !== false;

    container.innerHTML = '';

    var head = document.createElement('div');
    head.className = 'cal-head';
    WEEKDAYS.forEach(function (w, i) {
      var cell = document.createElement('div');
      cell.className = 'cal-head-cell' + (i === 0 ? ' sun' : i === COLUMNS - 1 ? ' sat' : '');
      cell.textContent = w;
      head.appendChild(cell);
    });
    container.appendChild(head);

    var grid = document.createElement('div');
    grid.className = 'cal-grid';

    var places = tripPlaces(entriesByDate);
    var slots = gridDates(year, month);
    var today = todayIso();
    var origin = dayIndex(slots[0].date);

    // 칸이 앉을 자리는 오로지 날짜가 정한다. 몇 번째로 그렸는지는 보지 않는다.
    function seatOf(date) {
      var index = dayIndex(date);
      if (index === null || origin === null) return null;
      var offset = index - origin;
      var row = Math.floor(offset / COLUMNS);
      var column = new Date(date + 'T00:00:00Z').getUTCDay();
      // 요일과 자리가 어긋나면 달력 전체가 밀린다. 조용히 넘어가지 않는다.
      if (offset % COLUMNS !== column) {
        if (typeof console !== 'undefined' && console.error) {
          console.error('[Crew-cal] 달력 칸이 어긋났습니다: ' + date +
            ' 는 ' + WEEKDAYS[column] + '요일인데 ' + (offset % COLUMNS) + '번 칸에 놓였습니다.');
        }
        return { row: row, column: offset % COLUMNS, mismatch: true };
      }
      return { row: row, column: column, mismatch: false };
    }

    slots.forEach(function (slot) {
      var date = slot.date;
      var day = slot.day;
      var outside = slot.outside;
      var list = entriesByDate[date] || [];
      var weekday = new Date(date + 'T00:00:00Z').getUTCDay();
      var seat = seatOf(date);

      // button 요소는 브라우저가 내용 상자를 오그라뜨려 칩이 칸 너비를 못 채운다.
      var cell = document.createElement('div');
      cell.setAttribute('role', 'button');
      cell.tabIndex = 0;
      cell.className = 'cal-cell';
      if (seat) {
        cell.style.gridRow = String(seat.row + 1);
        cell.style.gridColumn = String(seat.column + 1);
        if (seat.mismatch) cell.classList.add('seat-mismatch');
      }
      var holiday = holidays ? holidays.nameOf(date) : null;
      if (weekday === 0) cell.classList.add('sun');
      if (weekday === COLUMNS - 1) cell.classList.add('sat');
      if (holiday) cell.classList.add('holiday');
      // 코드가 하나라도 있는 날은 절대 휴무로 덮어쓰지 않는다. 정확히 0건일 때만.
      var assumed = !outside && assumeOff && canAssumeOff(list);
      if (assumed) assertNoEntries(list, date);        // 방어 코드
      var dayKind = dayCategory(list) || (assumed ? 'off' : null);
      if (dayKind) cell.classList.add('day-' + dayKind);
      if (assumed) cell.classList.add('assumed');
      if (!outside) cell.classList.add('in-month');
      if (outside) cell.classList.add('outside');
      if (date === today) cell.classList.add('today');
      if (date === selected) cell.classList.add('selected');
      if (list.length) cell.classList.add('has-entry');
      cell.setAttribute('data-date', date);
      cell.setAttribute('aria-label', (+date.slice(5, 7)) + '월 ' + day + '일' +
        (holiday ? ' ' + holiday : '') +
        (assumed ? ', 코드 없음 — 휴무로 봄' : ', 일정 ' + list.length + '건'));

      var head2 = document.createElement('span');
      head2.className = 'cal-head-row';
      var num = document.createElement('span');
      num.className = 'cal-day';
      num.textContent = String(day);
      head2.appendChild(num);
      if (holiday) {
        var mark = document.createElement('span');
        mark.className = 'cal-holiday';
        mark.textContent = holiday;
        head2.appendChild(mark);
      }
      cell.appendChild(head2);

      var chips = document.createElement('span');
      chips.className = 'cal-chips';
      var shown = cellItems(list);
      var dayHasFlight = shown.some(function (e) { return e.type === 'flight'; });
      var staying = places[date] || null;
      var groups = cellGroups(shown, date, dayHasFlight ? null : staying, localOnly);
      var alerts = [];

      groups.slice(0, CELL_LIMIT).forEach(function (group) {
        var item = document.createElement('span');
        item.className = 'cal-item';
        item.title = group.entries.map(function (e) {
          return [e.code, e.label || '', airports ? airports.describeRoute(e.route) : e.route,
            describeTimes(e, true)].filter(Boolean).join(' · ');
        }).join('\n');

        var place = group.place;
        if (place) {
          var flag = document.createElement('span');
          flag.className = 'cal-flag';
          flag.textContent = place.flag || '';
          item.appendChild(flag);
          var city = document.createElement('span');
          // 라스베이거스처럼 긴 이름은 칸을 넘는다. 글자 수에 따라 조금씩 줄인다.
          var name = place.city || '';
          city.className = 'cal-city cat-' + (group.category || 'other') +
            (name.length >= 6 ? ' long' : name.length >= 5 ? ' longish' : '');
          city.textContent = name;
          item.appendChild(city);
        } else {
          // 도시가 없는 근무. 휴무는 '쉬는날', 대기는 '스탠바이' 가 제목이고
          // 원래 코드(ATDO/ADO/DO/STBY)는 아래에 작게 그대로 남는다.
          var lead = group.entries[0];
          var title = document.createElement('span');
          title.className = 'cal-title cat-' + (group.category || 'other');
          title.textContent = (group.category === 'off') ? '쉬는날'
            : (group.category === 'standby') ? '스탠바이'
              : (lead.label || lead.code || '');
          item.appendChild(title);
          if (group.category === 'standby') alerts.push('대기');
        }

        // 시각. 한국 시각으로 옮긴 값이고 어느 공항 기준인지 코드로 밝힌다.
        var muted = group.entries.every(function (e) { return hideTimes[date + '|' + e.code]; });
        var lines = muted ? [] : groupLines(group);
        if (lines.length) {
          lines.forEach(function (point) {
            // 칸이 좁아 저절로 줄이 바뀌는 것보다, 'ICN출발' 과 '19:30' 을
            // 처음부터 두 줄로 나눠 두는 편이 훨씬 읽기 좋다.
            var time = document.createElement('span');
            time.className = 'cal-time';
            var what = document.createElement('span');
            what.className = 'cal-time-at';
            what.textContent = (point.at ? point.at : '') + point.kind;
            var clock = document.createElement('span');
            clock.className = 'cal-clock';
            clock.textContent = point.time;
            time.appendChild(what);
            time.appendChild(clock);
            if (point.shift && SHIFT_MARK[String(point.shift)]) {
              var sh = document.createElement('sup');
              sh.className = 'cal-shift';
              sh.textContent = SHIFT_MARK[String(point.shift)];
              sh.title = point.shift > 0 ? '한국 시각으로는 다음 날입니다' : '한국 시각으로는 전날입니다';
              clock.appendChild(sh);
            }
            time.title = point.text;
            item.appendChild(time);
          });
        } else if (group.enroute) {
          var air = document.createElement('span');
          air.className = 'cal-time stay';
          air.textContent = '기내';
          item.appendChild(air);
        } else if (group.layover) {
          var stay = document.createElement('span');
          stay.className = 'cal-time stay';
          stay.textContent = '체류';
          item.appendChild(stay);
        }

        // 자동으로 물어 채운 노선만 표를 단다. 원본·시드로 푼 것은 아무 표시도 않는다.
        if (group.entries.some(function (e) { return e.routeSource === 'lookup'; })) {
          var found = document.createElement('span');
          found.className = 'cal-lookup';
          found.textContent = '조회';
          found.title = '노선을 자동으로 찾아 채웠습니다. 실제 로스터를 따르세요.';
          item.appendChild(found);
        }
        if (group.entries.some(function (e) { return e.routePending; })) {
          var waiting = document.createElement('span');
          waiting.className = 'cal-lookup pending';
          waiting.textContent = '조회 중';
          item.appendChild(waiting);
        }

        // 공동운항이면 실제로 누가 띄우는 편인지 작게 알려 준다. 주인공은 도시다.
        var shares = {};
        group.entries.forEach(function (e) {
          if (e.codeshare && e.operatorName) shares[e.operatorName] = true;
        });
        Object.keys(shares).forEach(function (name) {
          var by = document.createElement('span');
          by.className = 'cal-operator';
          by.textContent = name + '운항';
          by.title = name + ' 가 띄우는 공동운항편입니다.';
          item.appendChild(by);
        });
        // 시즌·운휴 같은 덧말. 미심쩍다고 적힌 것은 다른 색으로.
        var notes = {};
        group.entries.forEach(function (e) {
          if (e.routeNote) notes[e.routeNote] = !!e.routeNoteWarn;
        });
        Object.keys(notes).forEach(function (text) {
          var note = document.createElement('span');
          note.className = 'cal-note' + (notes[text] ? ' warn' : '');
          note.textContent = text.length > 14 ? text.slice(0, 13) + '…' : text;
          note.title = text;
          item.appendChild(note);
        });

        // 한 도시로 묶인 편이 여럿이면 몇 편인지 남긴다. 편명은 눌러서 상세로 본다.
        var flights = group.entries.filter(function (e) { return e.type === 'flight'; }).length;
        if (flights > 1) {
          var many = document.createElement('span');
          many.className = 'cal-count';
          many.textContent = flights + '편';
          many.title = group.entries.map(function (e) { return e.code; }).join(' · ');
          item.appendChild(many);
        }

        // 손님으로 타고 가는 편(TVL)은 실제 승무가 아니므로 표를 남긴다. 한 번만.
        if (group.entries.some(function (e) { return e.deadhead; })) {
          var dh = document.createElement('span');
          dh.className = 'cal-deadhead';
          dh.textContent = '탑승 근무';
          dh.title = 'TVL — 손님으로 타고 이동하는 편입니다. 비행 편수에 넣지 않습니다.';
          item.appendChild(dh);
        }

        // 도시가 주인공이라 편명은 칸에서 뺐다(누르면 상세에 그대로 있다).
        // 휴무·대기처럼 이름을 한글로 바꿔 적은 것만 원래 코드를 아래에 남긴다.
        if (!place) {
          var codes = [];
          group.entries.forEach(function (e) {
            var code = e.code || '';
            if (code && code !== (e.label || '') && codes.indexOf(code) < 0) codes.push(code);
          });
          if (codes.length) {
            var sub = document.createElement('span');
            sub.className = 'cal-code';
            sub.textContent = codes.join(' · ');
            item.appendChild(sub);
          }
        }

        chips.appendChild(item);
      });

      // 코드가 없는 날. 쉬는날이라 적되 코드 자리는 비워 두어 추정임을 드러낸다.
      if (assumed) {
        var guess = document.createElement('span');
        guess.className = 'cal-item assumed';
        guess.title = '읽어 들인 코드가 없는 날입니다. 쉬는날로 봅니다.';
        var guessTitle = document.createElement('span');
        guessTitle.className = 'cal-title cat-off';
        guessTitle.textContent = '쉬는날';
        guess.appendChild(guessTitle);
        chips.appendChild(guess);
      }
      // 자리가 모자라면 접기만 한다. 날짜를 누르면 전부 보인다.
      if (groups.length > CELL_LIMIT) {
        var more = document.createElement('span');
        more.className = 'cal-more';
        more.textContent = '+' + (groups.length - CELL_LIMIT);
        more.title = '이 날 근무 ' + shown.length + '건. 눌러서 전부 보기';
        chips.appendChild(more);
      }

      // 읽기는 했는데 칸에 아무것도 못 그린 날. 휴무로 덮지 않고 잘못됐다고 알린다.
      if (list.length && !shown.length) {
        var failed = document.createElement('span');
        failed.className = 'cal-badge cal-failed';
        failed.textContent = '파싱 실패';
        failed.title = list.map(function (e) { return e.code; }).join(', ') +
          ' — 읽기는 했으나 근무로 알아보지 못했습니다. 눌러서 원래 글자를 보세요.';
        chips.appendChild(failed);
        cell.classList.add('parse-failed');
        alerts.push('파싱 실패');
      }

      var checkNote = dayNeedsCheck(list);
      if (checkNote) {
        var check = document.createElement('span');
        check.className = 'cal-badge cal-check';
        check.textContent = '확인 필요';
        check.title = checkNote + ' — 지우지 않았으니 눌러서 확인하세요.';
        chips.appendChild(check);
        cell.classList.add('needs-check');
        alerts.push(checkNote);
      }
      cell.appendChild(chips);

      if (alerts.length) {
        var bell = document.createElement('span');
        bell.className = 'cal-alert';
        bell.textContent = '!';
        bell.title = alerts.join(' · ');
        head2.appendChild(bell);
      }

      cell.addEventListener('click', function () { onSelect(date); });
      cell.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(date);
        }
      });
      grid.appendChild(cell);
    });

    // 여러 날에 걸친 한 여정을 칸 아래로 잇는 띠. 주가 바뀌면 끊어서 이어 그린다.
    var spanDates = slots.map(function (slot) { return slot.date; });
    tripBands(entriesByDate, spanDates).forEach(function (band) {
      var first = seatOf(band.start);
      var last = seatOf(band.end);
      if (!first || !last) return;
      var hue = bandHue(band.country);
      for (var row = first.row; row <= last.row; row++) {
        var from = (row === first.row) ? first.column : 0;
        var to = (row === last.row) ? last.column : COLUMNS - 1;
        if (to < from) continue;
        var bar = document.createElement('span');
        bar.className = 'cal-band';
        if (row === first.row) bar.classList.add('band-start');
        if (row === last.row) bar.classList.add('band-end');
        bar.style.gridRow = String(row + 1);
        bar.style.gridColumn = (from + 1) + ' / span ' + (to - from + 1);
        bar.style.setProperty('--band-hue', String(hue));
        bar.title = band.countryName + ' — ' + band.start + ' ~ ' + band.end;
        var label = document.createElement('span');
        label.className = 'cal-band-label';
        label.textContent = (band.flag ? band.flag + ' ' : '') + band.countryName;
        bar.appendChild(label);
        grid.appendChild(bar);
      }
    });

    container.appendChild(grid);
  }

  /**
   * 달력에 그릴 날짜. 앞은 지난달 말일로 채우고, 뒤는 마지막 주가 찰 때까지 다음 달 초로 채운다.
   * 31일 비행 - 1일 체류처럼 달을 넘겨 이어지는 일정이 함께 보인다.
   */
  function gridDates(year, month) {
    var out = [];
    var lead = firstWeekday(year, month);
    var total = daysInMonth(year, month);

    var pm = month - 1, py = year;
    if (pm < 1) { pm = 12; py -= 1; }
    var prevTotal = daysInMonth(py, pm);

    var nm = month + 1, ny = year;
    if (nm > 12) { nm = 1; ny += 1; }

    for (var i = lead; i > 0; i--) {
      var d = prevTotal - i + 1;
      out.push({ day: d, date: iso(py, pm, d), outside: true });
    }
    for (var day = 1; day <= total; day++) {
      out.push({ day: day, date: iso(year, month, day), outside: false });
    }
    var trail = (7 - ((lead + total) % 7)) % 7;
    for (var n = 1; n <= trail; n++) {
      out.push({ day: n, date: iso(ny, nm, n), outside: true });
    }
    return out;
  }

  /**
   * 월간 목록 보기. 달력 칸이 좁은 화면에서 한눈에 훑기 위한 화면이라
   * 코드를 줄이지 않고 구간과 시각까지 그대로 편다.
   */
  function renderList(container, options) {
    var year = options.year;
    var month = options.month;
    var entriesByDate = options.entriesByDate || {};
    var selected = options.selectedDate;
    var onSelect = options.onSelect || function () {};

    container.innerHTML = '';

    // 달력과 같은 범위를 쓴다(앞뒤 달 날짜 포함)
    var span = gridDates(year, month);
    var inSpan = {};
    var outsideDates = {};
    span.forEach(function (c) {
      inSpan[c.date] = true;
      if (c.outside) outsideDates[c.date] = true;
    });

    var dates = Object.keys(entriesByDate)
      .filter(function (d) { return inSpan[d] && entriesByDate[d].length; })
      .sort();

    if (!dates.length) {
      var empty = document.createElement('p');
      empty.className = 'list-empty';
      empty.textContent = month + '월에 등록된 일정이 없습니다.';
      container.appendChild(empty);
      return;
    }

    var today = todayIso();
    var hideTimes = options.hideTimes || {};

    dates.forEach(function (date) {
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'agenda-row';
      var weekday = new Date(date + 'T00:00:00Z').getUTCDay();
      if (weekday === 0) row.classList.add('sun');
      if (weekday === 6) row.classList.add('sat');
      if (date === today) row.classList.add('today');
      if (date === selected) row.classList.add('selected');
      if (outsideDates[date]) row.classList.add('outside');
      var rowKind = dayCategory(entriesByDate[date]);
      if (rowKind) row.classList.add('day-' + rowKind);
      row.setAttribute('data-date', date);

      var day = document.createElement('span');
      day.className = 'agenda-date';
      day.innerHTML = (outsideDates[date] ? '<small class="cal-month">' + (+date.slice(5, 7)) + '월</small>' : '') +
        '<b>' + (+date.slice(8, 10)) + '</b><small>' + WEEKDAYS[weekday] + '</small>';
      row.appendChild(day);

      var items = document.createElement('span');
      items.className = 'agenda-items';

      entriesByDate[date].forEach(function (e) {
        var item = document.createElement('span');
        item.className = 'agenda-item';

        var chip = document.createElement('span');
        chip.className = 'chip cat-' + (e.category || 'other');
        chip.textContent = chipText(e);
        chip.title = e.code;
        item.appendChild(chip);

        var text = document.createElement('span');
        text.className = 'agenda-text';
        var times = hideTimes[date + '|' + e.code] ? '' : describeTimes(e);
        text.textContent = [placeLabel(e), times, e.memo || '']
          .filter(Boolean).join(' · ') || (e.type === 'flight' ? (e.label || '') : '');
        text.title = [airports ? airports.describeRoute(e.route) : '', e.label || '']
          .filter(Boolean).join(' · ');
        item.appendChild(text);

        items.appendChild(item);
      });

      row.appendChild(items);
      row.addEventListener('click', function () { onSelect(date); });
      container.appendChild(row);
    });
  }

  /**
   * 한 달 요약.
   *
   * 건수만 세면 "체류 3" 이 사흘인지 세 번인지 알 수 없다. 그래서 비행은 편수로,
   * 나머지는 날수로 센다(하루에 두 번 적혀 있어도 하루). 다녀온 도시도 순서대로 모은다.
   */
  /**
   * 한 해 요약. 어디를 몇 번 갔는지와 날수를 센다.
   *
   * 비행 편수는 크루넷이 이틀에 걸쳐 적어둔 도착편을 한 번만 센다.
   * "간 곳" 은 한국에서 뜨는 편만 세어 한 번 다녀온 것을 한 번으로 잡는다
   * (나가는 편과 들어오는 편을 다 세면 갈 때마다 두 번이 된다).
   */
  function summarizeYear(entriesByDate, year) {
    var byDate = entriesByDate || {};
    var hidden = suppressedTimes(byDate);
    var prefix = String(year) + '-';
    var dayCounts = {};
    var days = 0;
    var flights = 0;
    var visits = {};

    Object.keys(byDate).sort().forEach(function (date) {
      if (date.indexOf(prefix) !== 0) return;
      var list = byDate[date] || [];
      if (!list.length) return;
      days++;
      var seenHere = {};
      list.forEach(function (e) {
        var c = e.category || 'other';
        if (!seenHere[c]) { seenHere[c] = true; dayCounts[c] = (dayCounts[c] || 0) + 1; }
        if (e.type !== 'flight') return;
        if (hidden[date + '|' + e.code]) return;      // 도착일 쪽에서 이미 셌다
        flights++;
        if (!airports) return;
        var ends = airports.splitRoute(e.route);
        if (!ends.from || airports.countryOf(ends.from) !== 'KR') return;   // 나가는 편만
        var place = airports.tripPlace(e);
        if (!place) return;
        if (!visits[place.city]) visits[place.city] = { city: place.city, flag: place.flag, count: 0 };
        visits[place.city].count++;
      });
    });

    var places = Object.keys(visits).map(function (city) { return visits[city]; });
    places.sort(function (a, b) {
      if (a.count !== b.count) return b.count - a.count;
      return a.city < b.city ? -1 : 1;
    });

    return { year: year, days: days, flights: flights, dayCounts: dayCounts, places: places };
  }

  /**
   * 한 해를 열두 개의 작은 달로 그린다. 칸마다 그날의 성격을 점으로만 찍는다.
   * 휴가를 어디에 붙일지, 어느 달이 빡셌는지 한눈에 보라고 만든 화면이다.
   * 날짜를 누르면 그 달로 넘어간다.
   */
  function renderYear(container, options) {
    var year = options.year;
    var entriesByDate = options.entriesByDate || {};
    var onSelect = options.onSelect || function () {};
    var today = todayIso();

    container.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'year-grid';

    for (var month = 1; month <= 12; month++) {
      (function (m) {
        var card = document.createElement('div');
        card.className = 'year-month';

        var title = document.createElement('div');
        title.className = 'ym-title';
        title.textContent = m + '월';
        var stat = document.createElement('span');
        var sum = summarize(entriesByDate, year, m);
        stat.className = 'ym-stat';
        stat.textContent = sum.flights ? sum.flights + '편' : '';
        title.appendChild(stat);
        card.appendChild(title);

        var head = document.createElement('div');
        head.className = 'ym-head';
        WEEKDAYS.forEach(function (w) {
          var cell = document.createElement('div');
          cell.textContent = w;
          head.appendChild(cell);
        });
        card.appendChild(head);

        var grid = document.createElement('div');
        grid.className = 'ym-grid';
        var lead = firstWeekday(year, m);
        for (var blank = 0; blank < lead; blank++) {
          grid.appendChild(document.createElement('span'));
        }
        var total = daysInMonth(year, m);
        for (var day = 1; day <= total; day++) {
          (function (d) {
            var date = iso(year, m, d);
            var list = entriesByDate[date] || [];
            var cell = document.createElement('span');
            cell.className = 'ym-day';
            if (date === today) cell.className += ' today';
            cell.textContent = d;
            if (list.length) {
              var main = list[0];
              for (var i = 0; i < list.length; i++) {
                if (list[i].type === 'flight') { main = list[i]; break; }
              }
              cell.className += ' has cat-' + (main.category || 'other');
              cell.title = date + ' ' + list.map(function (e) { return e.code; }).join(', ');
              cell.setAttribute('role', 'button');
              cell.addEventListener('click', function () { onSelect(date); });
            }
            grid.appendChild(cell);
          })(day);
        }
        card.appendChild(grid);
        wrap.appendChild(card);
      })(month);
    }

    container.appendChild(wrap);
  }

  function summarize(entriesByDate, year, month, options) {
    var opts = options || {};
    var prefix = year + '-' + pad2(month);
    var counts = { flight: 0, layover: 0, standby: 0, off: 0, vacation: 0, training: 0, other: 0, unknown: 0 };
    var dayCounts = {};
    var days = 0;
    var flightCodes = {};
    var cities = [];
    var seenCity = {};

    Object.keys(entriesByDate).sort().forEach(function (date) {
      if (date.indexOf(prefix) !== 0) return;
      if (!(entriesByDate[date] || []).some(function (e) { return !e.strange; })) return;
      days++;
      var seenHere = {};
      entriesByDate[date].forEach(function (e) {
        if (e.strange) return;      // 근무가 아니라 잘못 읽힌 글자다
        var c = e.category || 'other';
        if (counts[c] == null) counts[c] = 0;
        counts[c]++;
        if (!seenHere[c]) {
          seenHere[c] = true;
          dayCounts[c] = (dayCounts[c] || 0) + 1;
        }
        // 날을 넘겨 나는 편은 한 편으로 센다. 손님으로 타고 가는 편은 세지 않는다.
        if (e.type === 'flight' && e.code && !e.deadhead) {
          flightCodes[e.segment || (e.code + '|' + e.date)] = true;
        }
        var place = airports && airports.tripPlace ? airports.tripPlace(e) : null;
        if (place && !seenCity[place.city]) {
          seenCity[place.city] = true;
          cities.push(place);
        }
      });
    });

    // 코드가 없어 휴무로 넘겨짚은 날도 휴무에 넣는다. 몇 날이 짐작인지는 따로 남겨
    // "휴무 10일 (추정 3일 포함)" 처럼 갈라 보여줄 수 있게 한다.
    var assumedOff = 0;
    if (opts.assumeOff) {
      var total = daysInMonth(year, month);
      for (var d = 1; d <= total; d++) {
        var date = iso(year, month, d);
        if (!(entriesByDate[date] || []).length) assumedOff++;
      }
      if (assumedOff) {
        dayCounts.off = (dayCounts.off || 0) + assumedOff;
        counts.off += assumedOff;
      }
    }

    return {
      days: days,
      counts: counts,
      dayCounts: dayCounts,
      assumedOff: assumedOff,
      flights: Object.keys(flightCodes).length,
      cities: cities
    };
  }

  /**
   * 편명·도시·코드로 지난 일정을 찾는다. "ATL 언제 갔더라" 를 답하는 자리.
   * 찾는 말은 편명(KE35, 0035), 도시 이름(애틀랜타), 코드(LO), 날짜 조각(2026-09) 다 된다.
   */
  function search(entriesByDate, query, limit) {
    var needle = String(query || '').trim().toLowerCase();
    if (needle.length < 1) return [];
    var digits = needle.replace(/[^0-9]/g, '');
    var out = [];

    Object.keys(entriesByDate || {}).sort().reverse().some(function (date) {
      (entriesByDate[date] || []).forEach(function (entry) {
        var hay = [
          date,
          entry.code || '',
          entry.label || '',
          entry.route || '',
          entry.memo || '',
          placeLabel(entry)
        ].join(' ').toLowerCase();

        var hit = hay.indexOf(needle) >= 0;
        // 'KE35' 나 '35' 로도 KE0035 를 찾을 수 있게 앞의 0 을 떼고 한 번 더 본다
        if (!hit && digits && entry.code) {
          var codeDigits = String(entry.code).replace(/[^0-9]/g, '').replace(/^0+/, '');
          hit = codeDigits === digits.replace(/^0+/, '');
        }
        if (hit) out.push({ date: date, entry: entry });
      });
      return limit && out.length >= limit;
    });

    return limit ? out.slice(0, limit) : out;
  }

  return {
    WEEKDAYS: WEEKDAYS,
    render: render,
    renderList: renderList,
    renderYear: renderYear,
    gridDates: gridDates,
    suppressedTimes: suppressedTimes,
    upcoming: upcoming,
    daysBetween: daysBetween,
    summarize: summarize,
    summarizeYear: summarizeYear,
    search: search,
    formatTimeRange: formatTimeRange,
    describeTimes: describeTimes,
    legRole: legRole,
    koreanSide: koreanSide,
    arrivesKorea: arrivesKorea,
    departureFlag: departureFlag,
    skipTime: skipTime,
    routeLabel: routeLabel,
    placeLabel: placeLabel,
    chipText: chipText,
    dayCategory: dayCategory,
    cellItems: cellItems,
    canAssumeOff: canAssumeOff,
    assertNoEntries: assertNoEntries,
    dayNeedsCheck: dayNeedsCheck,
    CELL_LIMIT: CELL_LIMIT,
    COLUMNS: COLUMNS,
    tripPlaces: tripPlaces,
    tripBands: tripBands,
    awayCountryOf: awayCountryOf,
    cellGroups: cellGroups,
    groupLines: groupLines,
    entryTimes: entryTimes,
    timePoint: timePoint,
    iso: iso,
    pad2: pad2,
    todayIso: todayIso,
    weekdayOf: weekdayOf,
    daysInMonth: daysInMonth
  };
});
