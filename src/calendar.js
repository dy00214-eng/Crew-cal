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
   * 어느 쪽 시각을 보여줄지 고른다.
   * 시차가 섞이면 헷갈리므로 한국 시각만 남긴다.
   *   한국에서 출발 -> 출발 시각만 (현지 도착 시각은 감춘다)
   *   한국에 도착   -> 한국 도착 시각만 (현지 출발 시각은 감춘다)
   *   국내선이나 한국과 무관한 구간, 구간을 모르면 -> 둘 다
   */
  function koreanSide(entry) {
    if (!entry || !entry.route || !airports) return null;
    var parts = airports.splitRoute(entry.route);
    var fromKR = airports.countryOf(parts.from) === 'KR';
    var toKR = airports.countryOf(parts.to) === 'KR';
    if (fromKR && !toKR) return 'start';
    if (toKR && !fromKR) return 'end';
    return null;
  }

  /**
   * 체류(LO)는 시각을 쓰지 않는다. 며칠에 걸쳐 이어지는 상태라 특정 시각이 뜻이 없다.
   * full 을 주면(툴팁 등) 갖고 있는 값을 그대로 보여준다.
   */
  function skipTime(entry, full) {
    return !full && !!entry && entry.category === 'layover';
  }

  /** 달력 칸에 넣을 짧은 시각 표기: '09:45 출발', '17:50+1 도착', 국내선은 '06:35→07:45' */
  function formatTimeRange(entry, full) {
    if (!entry || skipTime(entry, full)) return '';
    var suffix = entry.endOffset ? '+' + entry.endOffset : '';
    var side = full ? null : koreanSide(entry);

    if (side === 'start' && entry.start) return entry.start + ' 출발';
    if (side === 'end' && entry.end) return entry.end + suffix + ' 한국 도착';

    // \u200B(폭 없는 공백)은 칸이 좁을 때 도착 시각이 아랫줄로 넘어가게 해준다.
    if (entry.start && entry.end) return entry.start + '\u2192\u200B' + entry.end + suffix;
    if (entry.start) return entry.start + ' 출발';
    if (entry.end) return entry.end + suffix + ' 도착';
    return '';
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

  /** 목록에 쓸 자세한 시각 표기. 비행이면 출발/도착, 그 밖에는 시작/종료로 읽는다. */
  /**
   * 목록에 쓸 자세한 시각 표기. 비행이면 출발/도착, 그 밖에는 시작/종료로 읽는다.
   * full 을 주면 한국 시각만 남기는 규칙을 건너뛰고 양쪽을 모두 보여준다.
   */
  function describeTimes(entry, full) {
    if (!entry || (!entry.start && !entry.end)) return '';
    if (skipTime(entry, full)) return '';
    var flight = entry.type === 'flight' || entry.category === 'flight';
    var startLabel = flight ? '출발' : '시작';
    var endLabel = flight ? '도착' : '종료';
    var nextDay = entry.endOffset ? ' (익일)' : '';
    var side = full ? null : koreanSide(entry);

    if (side === 'start' && entry.start) return startLabel + ' ' + entry.start;
    if (side === 'end' && entry.end) return '한국 ' + endLabel + ' ' + entry.end + nextDay;

    if (entry.start && entry.end) {
      return startLabel + ' ' + entry.start + ' \u2192 ' + endLabel + ' ' + entry.end + nextDay;
    }
    if (entry.start) return startLabel + ' ' + entry.start;
    return endLabel + ' ' + entry.end + nextDay;
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
   * 달력 칸에 그릴 것만 골라 낸다. 지우는 것이 아니라 감추는 것이다.
   * 아는 항공사가 아닌 편명 꼴(AS0016)은 근무가 아니므로 칸에 띄우지 않는다.
   * 날짜를 누르면 원래 글자가 그대로 보인다.
   */
  function cellItems(list) {
    return (list || []).filter(function (e) { return !e.strange; });
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

  /** 구간을 모르는 항공편인지. 편명만 있고 어디 가는지 모르는 것들. */
  function needsRoute(entry) {
    return !!entry && entry.type === 'flight' && !entry.route;
  }

  /** 대역·홀짝 규칙으로 짐작한 구간에 붙이는 작은 표. */
  function guessMark() {
    var mark = document.createElement('span');
    mark.className = 'cal-guess';
    mark.textContent = '추정';
    mark.title = '시간표에 없어 편명 규칙으로 짐작한 구간입니다. 실제 로스터를 따르세요.';
    return mark;
  }

  function nextDay(date) {
    var d = new Date(date + 'T00:00:00Z');
    if (isNaN(d)) return null;
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  /**
   * 체류하는 날에 붙는 시각을 걸러낸다.
   * 크루넷은 익일 도착하는 편을 출발일과 도착일 두 칸에 모두 적는다. 출발일에는 아직
   * 한국에 오지 않았으므로(그날은 체류 중이다) 그 칸의 시각은 빼고 도착일에만 남긴다.
   * 결과는 '날짜|편명' 을 키로 하는 표.
   */
  function suppressedTimes(entriesByDate) {
    var out = {};
    Object.keys(entriesByDate || {}).forEach(function (date) {
      var after = nextDay(date);
      var later = (entriesByDate[after] || []);
      entriesByDate[date].forEach(function (e) {
        if (e.type !== 'flight' || !e.endOffset) return;
        var repeats = later.some(function (x) { return x.code === e.code; });
        if (repeats) out[date + '|' + e.code] = true;
      });
    });
    return out;
  }

  /**
   * 오늘(또는 준 날짜)로부터 가장 가까운 앞으로의 일정.
   * 하루에 여러 건이면 비행을 앞세운다. 앱을 열자마자 "다음에 뭐였지" 를 없애려는 것.
   */
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

  function render(container, options) {
    var year = options.year;
    var month = options.month;
    var entriesByDate = options.entriesByDate || {};
    var selected = options.selectedDate;
    var onSelect = options.onSelect || function () {};
    var hideTimes = options.hideTimes || {};
    // 구간을 모르는 편의 '노선 미등록' 표를 눌렀을 때. 없으면 칸 고르기로 떨어진다.
    var onFixRoute = options.onFixRoute || null;
    // 코드가 안 잡힌 이 달의 날은 휴무로 본다. 크루넷도 빈 칸은 쉬는 날이다.
    var assumeOff = options.assumeOff !== false;

    container.innerHTML = '';

    var head = document.createElement('div');
    head.className = 'cal-head';
    WEEKDAYS.forEach(function (w, i) {
      var cell = document.createElement('div');
      cell.className = 'cal-head-cell' + (i === 0 ? ' sun' : i === 6 ? ' sat' : '');
      cell.textContent = w;
      head.appendChild(cell);
    });
    container.appendChild(head);

    var grid = document.createElement('div');
    grid.className = 'cal-grid';

    var places = tripPlaces(entriesByDate);

    var lead = firstWeekday(year, month);
    var total = daysInMonth(year, month);
    var today = todayIso();

    // 크루넷처럼 앞뒤 달 날짜도 함께 그린다. 달을 넘겨 이어지는 비행·체류가 잘리지 않는다.
    gridDates(year, month).forEach(function (slot) {
      (function (day, date, outside) {
        var list = entriesByDate[date] || [];
        var weekday = new Date(date + 'T00:00:00Z').getUTCDay();

        // button 요소는 브라우저가 내용 상자를 오그라뜨려 칩이 칸 너비를 못 채운다.
        var cell = document.createElement('div');
        cell.setAttribute('role', 'button');
        cell.tabIndex = 0;
        cell.className = 'cal-cell';
        var holiday = holidays ? holidays.nameOf(date) : null;
        if (weekday === 0) cell.classList.add('sun');
        if (weekday === 6) cell.classList.add('sat');
        if (holiday) cell.classList.add('holiday');
        // 코드가 없어도 이 달의 날이면 칸을 그린다. 앞뒤 달의 흐린 날과 헷갈리지 않는다.
        // 코드가 하나라도 있는 날은 절대 휴무로 덮어쓰지 않는다. 정확히 0건일 때만.
        var assumed = !outside && list.length === 0 && assumeOff;
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

        var num = document.createElement('span');
        num.className = 'cal-day';
        num.textContent = String(day);
        cell.appendChild(num);

        if (holiday) {
          var mark = document.createElement('span');
          mark.className = 'cal-holiday';
          mark.textContent = holiday;
          cell.appendChild(mark);
        }

        var chips = document.createElement('span');
        chips.className = 'cal-chips';
        var shown = cellItems(list);
        var dayHasFlight = shown.some(function (e) { return e.type === 'flight'; });
        var staying = places[date] || null;

        shown.slice(0, CELL_LIMIT).forEach(function (e) {
          var item = document.createElement('span');
          item.className = 'cal-item';
          item.title = [e.code, e.label || '', airports ? airports.describeRoute(e.route) : e.route,
            describeTimes(e, true)].filter(Boolean).join(' · ');

          // 도시가 주인공이다. 비행하는 날은 그 편이 가는 곳, 체류하는 날은 머무는 곳.
          var place = e.type === 'flight' ? (airports ? airports.tripPlace(e) : null)
            : (e.category === 'layover' && !dayHasFlight ? staying : null);

          if (place) {
            if (place.flag || e.type === 'flight') {
              var flag = document.createElement('span');
              flag.className = 'cal-flag';
              flag.textContent = (e.type === 'flight' ? '\u2708\uFE0F ' : '') + (place.flag || '');
              item.appendChild(flag);
            }
            var city = document.createElement('span');
            city.className = 'cal-city cat-' + (e.category || 'other');
            city.textContent = place.city;
            item.appendChild(city);
            if (e.derived) item.appendChild(guessMark());
          } else {
            var title = document.createElement('span');
            title.className = 'cal-title cat-' + (e.category || 'other');
            // 구간을 모르는 비행은 편명이 곧 제목이다
            title.textContent = e.type === 'flight'
              ? '\u2708\uFE0F ' + e.code
              : (e.label || e.code);
            item.appendChild(title);

            // 어디 가는 편인지 모르는 비행. 눌러서 넣어 달라고 표를 남긴다.
            if (needsRoute(e)) {
              var badge = document.createElement(onFixRoute ? 'button' : 'span');
              badge.className = 'cal-badge';
              badge.textContent = '노선 미등록';
              if (onFixRoute) {
                badge.type = 'button';
                (function (entry) {
                  badge.addEventListener('click', function (event) {
                    event.stopPropagation();
                    onFixRoute(entry, date);
                  });
                })(e);
              }
              item.appendChild(badge);
              item.title = e.code + ' 의 구간을 모릅니다. 칸을 눌러 넣어 주세요.';
              cell.classList.add('needs-route');
            }
          }

          var timeText = hideTimes[date + '|' + e.code] ? '' : formatTimeRange(e);
          if (timeText) {
            var time = document.createElement('span');
            time.className = 'cal-time';
            time.textContent = timeText;
            item.appendChild(time);
          }

          // 큰 글씨 밑에는 작은 글씨로 한 줄. 도시 밑에는 편명(체류면 '체류'),
          // 휴무·대기처럼 이름이 제목인 경우에는 원래 코드를 적는다.
          var subText = place
            ? (e.type === 'flight' ? e.code : (e.label || ''))
            : (e.type === 'flight' ? '' : (e.code !== e.label ? e.code : ''));
          if (subText) {
            var sub = document.createElement('span');
            sub.className = 'cal-code';
            sub.textContent = subText;
            item.appendChild(sub);
          }

          chips.appendChild(item);
        });
        // 코드가 없는 날. 휴무라고 적되 코드 자리는 비워 두어 추정임을 드러낸다.
        if (assumed) {
          var guess = document.createElement('span');
          guess.className = 'cal-item assumed';
          guess.title = '읽어 들인 코드가 없는 날입니다. 휴무로 봅니다.';
          var guessTitle = document.createElement('span');
          guessTitle.className = 'cal-title cat-off';
          guessTitle.textContent = '휴무';
          guess.appendChild(guessTitle);
          chips.appendChild(guess);
        }
        // 자리가 모자라면 접기만 한다. 날짜를 누르면 전부 보인다.
        if (shown.length > CELL_LIMIT) {
          var more = document.createElement('span');
          more.className = 'cal-more';
          more.textContent = '+' + (shown.length - CELL_LIMIT);
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
        }

        var checkNote = dayNeedsCheck(list);
        if (checkNote) {
          var check = document.createElement('span');
          check.className = 'cal-badge cal-check';
          check.textContent = '확인 필요';
          check.title = checkNote + ' — 지우지 않았으니 눌러서 확인하세요.';
          chips.appendChild(check);
          cell.classList.add('needs-check');
        }
        cell.appendChild(chips);

        cell.addEventListener('click', function () { onSelect(date); });
        cell.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(date);
          }
        });
        grid.appendChild(cell);
      })(slot.day, slot.date, slot.outside);
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
        if (e.type === 'flight' && e.code) flightCodes[e.code] = true;
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
    koreanSide: koreanSide,
    departureFlag: departureFlag,
    skipTime: skipTime,
    routeLabel: routeLabel,
    placeLabel: placeLabel,
    chipText: chipText,
    dayCategory: dayCategory,
    needsRoute: needsRoute,
    cellItems: cellItems,
    dayNeedsCheck: dayNeedsCheck,
    CELL_LIMIT: CELL_LIMIT,
    tripPlaces: tripPlaces,
    iso: iso,
    pad2: pad2,
    todayIso: todayIso,
    weekdayOf: weekdayOf,
    daysInMonth: daysInMonth
  };
});
