/** 월간 캘린더 렌더러 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./airports.js'));
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.calendar = factory(root.CrewCal.airports);
  }
})(typeof self !== 'undefined' ? self : this, function (airports) {
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

  /** 달력 칸에 넣을 짧은 시각 표기: '09:45 출발', '17:50+1 도착', 국내선은 '06:35→07:45' */
  function formatTimeRange(entry, full) {
    if (!entry) return '';
    var suffix = entry.endOffset ? '+' + entry.endOffset : '';
    var side = full ? null : koreanSide(entry);

    if (side === 'start' && entry.start) return entry.start + ' 출발';
    if (side === 'end' && entry.end) return entry.end + suffix + ' 도착';

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

  /** 국기 + 구간. '🇰🇷 ICN/JFK' */
  function routeLabel(entry) {
    if (!entry || !entry.route) return '';
    var flag = departureFlag(entry);
    return (flag ? flag + ' ' : '') + entry.route;
  }

  /** 목록에 쓸 자세한 시각 표기. 비행이면 출발/도착, 그 밖에는 시작/종료로 읽는다. */
  /**
   * 목록에 쓸 자세한 시각 표기. 비행이면 출발/도착, 그 밖에는 시작/종료로 읽는다.
   * full 을 주면 한국 시각만 남기는 규칙을 건너뛰고 양쪽을 모두 보여준다.
   */
  function describeTimes(entry, full) {
    if (!entry || (!entry.start && !entry.end)) return '';
    var flight = entry.type === 'flight' || entry.category === 'flight';
    var startLabel = flight ? '출발' : '시작';
    var endLabel = flight ? '도착' : '종료';
    var nextDay = entry.endOffset ? ' (익일)' : '';
    var side = full ? null : koreanSide(entry);

    if (side === 'start' && entry.start) return startLabel + ' ' + entry.start;
    if (side === 'end' && entry.end) return endLabel + ' ' + entry.end + nextDay;

    if (entry.start && entry.end) {
      return startLabel + ' ' + entry.start + ' \u2192 ' + endLabel + ' ' + entry.end + nextDay;
    }
    if (entry.start) return startLabel + ' ' + entry.start;
    return endLabel + ' ' + entry.end + nextDay;
  }

  /** 칸이 좁을 때 쓰는 짧은 표기. KE0035 -> 0035 (전체 코드는 툴팁과 목록에 남는다) */
  function shortCode(entry, compact) {
    if (!compact || entry.type !== 'flight') return entry.code;
    return entry.code.replace(/^[A-Z]{2}(?=\d)/, '');
  }

  function render(container, options) {
    var year = options.year;
    var month = options.month;
    var entriesByDate = options.entriesByDate || {};
    var selected = options.selectedDate;
    var onSelect = options.onSelect || function () {};

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

    // 칸 너비를 재서 좁으면 짧은 표기로 바꾼다
    var compact = (container.clientWidth || 0) / 7 < 62;

    var lead = firstWeekday(year, month);
    var total = daysInMonth(year, month);
    var today = todayIso();

    for (var i = 0; i < lead; i++) {
      var blank = document.createElement('div');
      blank.className = 'cal-cell blank';
      grid.appendChild(blank);
    }

    for (var day = 1; day <= total; day++) {
      (function (day) {
        var date = iso(year, month, day);
        var list = entriesByDate[date] || [];
        var weekday = (lead + day - 1) % 7;

        // button 요소는 브라우저가 내용 상자를 오그라뜨려 칩이 칸 너비를 못 채운다.
        var cell = document.createElement('div');
        cell.setAttribute('role', 'button');
        cell.tabIndex = 0;
        cell.className = 'cal-cell';
        if (weekday === 0) cell.classList.add('sun');
        if (weekday === 6) cell.classList.add('sat');
        if (date === today) cell.classList.add('today');
        if (date === selected) cell.classList.add('selected');
        if (list.length) cell.classList.add('has-entry');
        cell.setAttribute('data-date', date);
        cell.setAttribute('aria-label', month + '월 ' + day + '일, 일정 ' + list.length + '건');

        var num = document.createElement('span');
        num.className = 'cal-day';
        num.textContent = String(day);
        cell.appendChild(num);

        var chips = document.createElement('span');
        chips.className = 'cal-chips';
        list.slice(0, 3).forEach(function (e) {
          var item = document.createElement('span');
          item.className = 'cal-item';

          var chip = document.createElement('span');
          chip.className = 'chip cat-' + (e.category || 'other');
          var flag = departureFlag(e);
          chip.textContent = (flag ? flag + '\u2009' : '') + shortCode(e, compact);
          chip.title = [e.code, e.label || '', airports ? airports.describeRoute(e.route) : e.route, describeTimes(e, true)]
            .filter(Boolean).join(' · ');
          item.appendChild(chip);

          var timeText = formatTimeRange(e);
          if (timeText) {
            var time = document.createElement('span');
            time.className = 'cal-time';
            time.textContent = timeText;
            item.appendChild(time);
          }
          chips.appendChild(item);
        });
        if (list.length > 3) {
          var more = document.createElement('span');
          more.className = 'chip more';
          more.textContent = '+' + (list.length - 3);
          chips.appendChild(more);
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
      })(day);
    }

    container.appendChild(grid);
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

    var prefix = year + '-' + pad2(month);
    var dates = Object.keys(entriesByDate)
      .filter(function (d) { return d.indexOf(prefix) === 0 && entriesByDate[d].length; })
      .sort();

    if (!dates.length) {
      var empty = document.createElement('p');
      empty.className = 'list-empty';
      empty.textContent = month + '월에 등록된 일정이 없습니다.';
      container.appendChild(empty);
      return;
    }

    var today = todayIso();

    dates.forEach(function (date) {
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'agenda-row';
      var weekday = new Date(date + 'T00:00:00Z').getUTCDay();
      if (weekday === 0) row.classList.add('sun');
      if (weekday === 6) row.classList.add('sat');
      if (date === today) row.classList.add('today');
      if (date === selected) row.classList.add('selected');
      row.setAttribute('data-date', date);

      var day = document.createElement('span');
      day.className = 'agenda-date';
      day.innerHTML = '<b>' + (+date.slice(8, 10)) + '</b><small>' + WEEKDAYS[weekday] + '</small>';
      row.appendChild(day);

      var items = document.createElement('span');
      items.className = 'agenda-items';

      entriesByDate[date].forEach(function (e) {
        var item = document.createElement('span');
        item.className = 'agenda-item';

        var chip = document.createElement('span');
        chip.className = 'chip cat-' + (e.category || 'other');
        chip.textContent = e.code;
        item.appendChild(chip);

        var text = document.createElement('span');
        text.className = 'agenda-text';
        text.textContent = [routeLabel(e), describeTimes(e), e.memo || '']
          .filter(Boolean).join(' · ') || (e.label || '');
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

  function summarize(entriesByDate, year, month) {
    var prefix = year + '-' + pad2(month);
    var counts = { flight: 0, layover: 0, standby: 0, off: 0, training: 0, other: 0, unknown: 0 };
    var days = 0;
    Object.keys(entriesByDate).forEach(function (date) {
      if (date.indexOf(prefix) !== 0) return;
      days++;
      entriesByDate[date].forEach(function (e) {
        var c = e.category || 'other';
        if (counts[c] == null) counts[c] = 0;
        counts[c]++;
      });
    });
    return { days: days, counts: counts };
  }

  return {
    WEEKDAYS: WEEKDAYS,
    render: render,
    renderList: renderList,
    summarize: summarize,
    formatTimeRange: formatTimeRange,
    describeTimes: describeTimes,
    koreanSide: koreanSide,
    departureFlag: departureFlag,
    routeLabel: routeLabel,
    iso: iso,
    pad2: pad2,
    todayIso: todayIso,
    weekdayOf: weekdayOf,
    daysInMonth: daysInMonth
  };
});
