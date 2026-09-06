/** 월간 캘린더 렌더러 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.calendar = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
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

  /** 달력 칸에 넣을 짧은 시각 표기: '10:30→14:20', '23:50→06:20+1' */
  function formatTimeRange(entry) {
    if (!entry) return '';
    var suffix = entry.endOffset ? '+' + entry.endOffset : '';
    if (entry.start && entry.end) return entry.start + '\u2192' + entry.end + suffix;
    if (entry.start) return entry.start + ' 출발';
    if (entry.end) return entry.end + suffix + ' 도착';
    return '';
  }

  /** 목록에 쓸 자세한 시각 표기. 비행이면 출발/도착, 그 밖에는 시작/종료로 읽는다. */
  function describeTimes(entry) {
    if (!entry || (!entry.start && !entry.end)) return '';
    var flight = entry.type === 'flight' || entry.category === 'flight';
    var startLabel = flight ? '출발' : '시작';
    var endLabel = flight ? '도착' : '종료';
    var nextDay = entry.endOffset ? ' (익일)' : '';
    if (entry.start && entry.end) {
      return startLabel + ' ' + entry.start + ' \u2192 ' + endLabel + ' ' + entry.end + nextDay;
    }
    if (entry.start) return startLabel + ' ' + entry.start;
    return endLabel + ' ' + entry.end + nextDay;
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

        var cell = document.createElement('button');
        cell.type = 'button';
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
          chip.textContent = e.code;
          chip.title = [e.label || '', e.route || '', describeTimes(e)]
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
        grid.appendChild(cell);
      })(day);
    }

    container.appendChild(grid);
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
    summarize: summarize,
    formatTimeRange: formatTimeRange,
    describeTimes: describeTimes,
    iso: iso,
    pad2: pad2,
    todayIso: todayIso,
    weekdayOf: weekdayOf,
    daysInMonth: daysInMonth
  };
});
