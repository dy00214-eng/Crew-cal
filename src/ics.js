/**
 * 일정을 아이폰·구글 캘린더가 읽는 .ics 파일로 만든다.
 *
 * 시각은 한국 시각으로만 갖고 있으므로 Asia/Seoul 로 못 박아 내보낸다.
 * 해외에서 열어도 한국 시각 기준으로 같은 순간을 가리킨다.
 * 시각을 모르는 근무(체류·휴무·대기 등)는 하루 종일 일정으로 넣는다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./calendar.js'), require('./airports.js'));
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.ics = factory(root.CrewCal.calendar, root.CrewCal.airports);
  }
})(typeof self !== 'undefined' ? self : this, function (calendar, airports) {
  'use strict';

  var CRLF = '\r\n';

  /** 쉼표·세미콜론·역슬래시·줄바꿈은 그대로 두면 다음 칸으로 새는 글자다. */
  function escapeText(value) {
    return String(value == null ? '' : value)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  /**
   * 한 줄은 75바이트까지다. 넘으면 다음 줄 앞에 공백 한 칸을 두고 이어 붙인다.
   * 한글은 한 자에 3바이트라 글자 수가 아니라 바이트로 세야 한다.
   */
  function fold(line) {
    var out = [];
    var current = '';
    var size = 0;
    var limit = 74; // 이어지는 줄의 앞 공백 한 칸까지 셈에 넣는다
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      var code = ch.charCodeAt(0);
      var bytes = code < 0x80 ? 1 : code < 0x800 ? 2 : 3;
      if (size + bytes > limit) {
        out.push(current);
        current = ' ';
        size = 1;
        limit = 74;
      }
      current += ch;
      size += bytes;
    }
    out.push(current);
    return out.join(CRLF);
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /** '2026-09-01' -> '20260901' */
  function dateOnly(iso) {
    return String(iso).replace(/-/g, '');
  }

  /** '2026-09-01' + '10:35' -> '20260901T103500' */
  function stamp(iso, time) {
    return dateOnly(iso) + 'T' + String(time).replace(':', '') + '00';
  }

  function shiftDate(iso, days) {
    var parts = String(iso).split('-');
    var d = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
    d.setUTCDate(d.getUTCDate() + days);
    return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
  }

  function addMinutes(time, minutes) {
    var parts = String(time).split(':');
    var total = (+parts[0]) * 60 + (+parts[1]) + minutes;
    var day = 0;
    while (total >= 1440) { total -= 1440; day++; }
    while (total < 0) { total += 1440; day--; }
    return { time: pad2(Math.floor(total / 60)) + ':' + pad2(total % 60), day: day };
  }

  function placeName(iata) {
    if (!iata || !airports) return iata || '';
    return airports.cityOf ? (airports.cityOf(iata) || iata) : iata;
  }

  /**
   * "KE0035 인천 → 애틀랜타" 처럼, 달력에서 읽던 대로 제목을 만든다.
   * 비행이 아닌 근무는 한글 이름만 쓴다. 캘린더에서 "LO 체류" 는 군더더기다.
   */
  function summaryOf(entry) {
    if (entry.type !== 'flight' && entry.label) return entry.label;
    var bits = [];
    if (entry.code) bits.push(entry.code);
    if (entry.route && entry.route.indexOf('/') > 0) {
      var ends = entry.route.split('/');
      bits.push(placeName(ends[0]) + ' → ' + placeName(ends[1]));
    } else if (entry.label) {
      bits.push(entry.label);
    }
    if (!bits.length) bits.push(entry.label || entry.code || '근무');
    return bits.join(' ');
  }

  /**
   * 한 일정이 캘린더에서 어떤 모양이 될지 정한다.
   *
   * - 한국에서 뜨는 편: 출발 시각부터 한 시간짜리 (현지 도착 시각은 갖고 있지 않다)
   * - 한국에 내리는 편: 실제 내리는 날의 도착 시각부터 한 시간짜리
   * - 국내선처럼 양쪽 시각을 다 아는 편: 출발부터 도착까지
   * - 시각을 모르는 근무: 하루 종일
   */
  function shapeOf(entry, date) {
    var side = calendar.koreanSide ? calendar.koreanSide(entry) : null;
    var isFlight = entry.type === 'flight';
    var skip = calendar.skipTime && calendar.skipTime(entry);

    if (!isFlight || skip) return { allDay: true, date: date };

    if (entry.start && entry.end && !side) {
      var end = addMinutes(entry.end, 0);
      var endDate = shiftDate(date, (entry.endOffset || 0) + end.day);
      return { start: { date: date, time: entry.start }, end: { date: endDate, time: entry.end } };
    }
    if (side === 'start' || (entry.start && !entry.end)) {
      if (!entry.start) return { allDay: true, date: date };
      var after = addMinutes(entry.start, 60);
      return {
        start: { date: date, time: entry.start },
        end: { date: shiftDate(date, after.day), time: after.time }
      };
    }
    if (side === 'end' || (entry.end && !entry.start)) {
      if (!entry.end) return { allDay: true, date: date };
      var landing = shiftDate(date, entry.endOffset || 0);
      var later = addMinutes(entry.end, 60);
      return {
        start: { date: landing, time: entry.end },
        end: { date: shiftDate(landing, later.day), time: later.time }
      };
    }
    return { allDay: true, date: date };
  }

  /** 다시 넣어도 같은 일정이 겹쳐 쌓이지 않도록, 날짜와 코드로 고정된 이름표를 붙인다. */
  function uidOf(date, entry, index) {
    var code = String(entry.code || entry.label || 'duty').replace(/[^A-Za-z0-9]/g, '');
    return 'crewcal-' + dateOnly(date) + '-' + (code || 'duty') + '-' + index + '@crew-cal';
  }

  function descriptionOf(entry) {
    var bits = [];
    if (entry.label && entry.label !== entry.code) bits.push(entry.label);
    var times = calendar.describeTimes ? calendar.describeTimes(entry, true) : '';
    if (times) bits.push(times);
    if (entry.memo) bits.push(entry.memo);
    bits.push('크루캘에서 내보냄');
    return bits.join('\n');
  }

  /**
   * .ics 본문을 만든다.
   *
   *   build(entriesByDate, { from: '2026-09-01', to: '2026-09-30', now: Date })
   *
   * from/to 를 안 주면 갖고 있는 전부를 넣는다. 크루넷이 익일 도착편을 이틀에
   * 걸쳐 적어두는 탓에 생기는 중복은 달력과 같은 규칙으로 걸러낸다.
   */
  function build(entriesByDate, options) {
    var opts = options || {};
    var byDate = entriesByDate || {};
    var hidden = calendar.suppressedTimes ? calendar.suppressedTimes(byDate) : {};
    var now = opts.now || new Date();
    var dtstamp = now.getUTCFullYear() + pad2(now.getUTCMonth() + 1) + pad2(now.getUTCDate()) +
      'T' + pad2(now.getUTCHours()) + pad2(now.getUTCMinutes()) + pad2(now.getUTCSeconds()) + 'Z';

    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Crew-cal//KO//',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:크루캘',
      'X-WR-TIMEZONE:Asia/Seoul',
      'BEGIN:VTIMEZONE',
      'TZID:Asia/Seoul',
      'BEGIN:STANDARD',
      'DTSTART:19700101T000000',
      'TZOFFSETFROM:+0900',
      'TZOFFSETTO:+0900',
      'TZNAME:KST',
      'END:STANDARD',
      'END:VTIMEZONE'
    ];

    var count = 0;
    Object.keys(byDate).sort().forEach(function (date) {
      if (opts.from && date < opts.from) return;
      if (opts.to && date > opts.to) return;
      (byDate[date] || []).forEach(function (entry, index) {
        // 체류하는 날 칸에 딸려 적힌 도착편은 실제 도착일 쪽에서 넣는다
        if (hidden[date + '|' + entry.code]) return;

        var shape = shapeOf(entry, date);
        lines.push('BEGIN:VEVENT');
        lines.push('UID:' + uidOf(date, entry, index));
        lines.push('DTSTAMP:' + dtstamp);
        if (shape.allDay) {
          lines.push('DTSTART;VALUE=DATE:' + dateOnly(shape.date));
          lines.push('DTEND;VALUE=DATE:' + dateOnly(shiftDate(shape.date, 1)));
        } else {
          lines.push('DTSTART;TZID=Asia/Seoul:' + stamp(shape.start.date, shape.start.time));
          lines.push('DTEND;TZID=Asia/Seoul:' + stamp(shape.end.date, shape.end.time));
        }
        lines.push('SUMMARY:' + escapeText(summaryOf(entry)));
        lines.push('DESCRIPTION:' + escapeText(descriptionOf(entry)));
        var place = entry.route && entry.route.indexOf('/') > 0
          ? placeName(entry.route.split('/')[1]) : '';
        if (place) lines.push('LOCATION:' + escapeText(place));
        lines.push('TRANSP:TRANSPARENT');
        lines.push('END:VEVENT');
        count++;
      });
    });

    lines.push('END:VCALENDAR');
    return { text: lines.map(fold).join(CRLF) + CRLF, count: count };
  }

  function filename(from, to) {
    if (from && to && from.slice(0, 7) === to.slice(0, 7)) return 'crew-cal-' + from.slice(0, 7) + '.ics';
    return 'crew-cal.ics';
  }

  return {
    build: build,
    filename: filename,
    escapeText: escapeText,
    fold: fold,
    shapeOf: shapeOf,
    summaryOf: summaryOf,
    shiftDate: shiftDate,
    addMinutes: addMinutes
  };
});
