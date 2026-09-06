/**
 * 크루넷에서 복사한 스케줄 텍스트를 날짜 + 코드 목록으로 파싱한다.
 *
 * 설계 원칙
 *  - 줄 단위로 훑되, 날짜만 있는 줄은 "현재 날짜"를 바꾸고 다음 줄들의 코드를 그 날짜에 붙인다.
 *  - 공백/탭/쉼표/줄바꿈이 섞여도, 날짜 표기가 여러 형태여도 최대한 받아낸다.
 *  - 판단이 애매한 토큰은 버리지 않고 경고로 남겨 사용자가 미리보기에서 결정하게 한다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./codes.js'));
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.parser = factory(root.CrewCal.codes);
  }
})(typeof self !== 'undefined' ? self : this, function (codes) {
  'use strict';

  var MONTHS = codes.MONTHS;
  var MONTH_ALT = Object.keys(MONTHS).join('|');

  var RE = {
    ymd: /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})\.?$/,
    md: /^(\d{1,2})[-./](\d{1,2})\.?$/,
    ymdCompact: /^(\d{4})(\d{2})(\d{2})$/,
    dayMarker: /^@D(\d{1,2})$/,
    dMon: new RegExp('^(\\d{1,2})[-\\s]?(' + MONTH_ALT + ')[-\\s]?(\\d{2}|\\d{4})?$'),
    monD: new RegExp('^(' + MONTH_ALT + ')[-\\s]?(\\d{1,2})$'),
    bareDay: /^(\d{1,2})$/,
    flight: /^([A-Z]{2})-?(\d{1,4})([A-Z])?$/,
    airline: /^[A-Z]{2}$/,
    digits: /^\d{1,4}$/,
    route: /^[A-Z]{3}(?:[/\-][A-Z]{3})+$/,
    clock: /^(\d{1,2}):([0-5]\d)$/,
    clockRange: /^(\d{1,2}):([0-5]\d)\s*[-~]\s*(\d{1,2}):([0-5]\d)$/,
    compactRange: /^(\d{3,4})[-~](\d{3,4})$/,
    dutyLike: /^[A-Z]{1,6}$/,
    rangeSep: /^[~]$/
  };

  function normalizeText(text) {
    var s = String(text == null ? '' : text);
    s = s.replace(/\r\n?/g, '\n');
    s = s.replace(/[   　]/g, ' ');
    // 전각 문자 -> 반각
    s = s.replace(/[！-～]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    });
    s = s.replace(/[‐-―−]/g, '-');
    s = s.replace(/[〜]/g, '~');
    return s;
  }

  function preprocessLine(line) {
    var s = line;
    s = s.replace(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/g, '$1-$2-$3');
    s = s.replace(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/g, '$1-$2');
    s = s.replace(/(\d{4})\s*년\s*(\d{1,2})\s*월/g, '$1-$2-1');
    // 요일 표기 제거: (일) (SUN) [월] 등
    s = s.replace(/[([](?:일|월|화|수|목|금|토)[)\]]/g, ' ');
    s = s.replace(/[([](?:SUN|MON|TUE|WED|THU|FRI|SAT)[)\]]/gi, ' ');
    // 남은 "6일" 형태는 일자 마커로 변환
    s = s.replace(/(^|[^\d])(\d{1,2})\s*일(?![0-9])/g, '$1 @D$2 ');
    return s;
  }

  function tokenize(line) {
    return line
      .split(/[\s,;|]+/)
      .map(function (t) { return t.trim(); })
      .filter(function (t) { return t.length > 0; });
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function isoDate(y, m, d) {
    return y + '-' + pad2(m) + '-' + pad2(d);
  }

  function isValidDate(y, m, d) {
    if (!(m >= 1 && m <= 12) || !(d >= 1 && d <= 31)) return false;
    var dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }

  function resolveYear(month, ctx) {
    // 연도가 안 적힌 경우: 기준 월과 6개월 이상 벌어지면 연도가 넘어간 것으로 본다.
    var diff = month - ctx.baseMonth;
    if (diff < -6) return ctx.baseYear + 1;
    if (diff > 6) return ctx.baseYear - 1;
    return ctx.baseYear;
  }

  function normalizeYear(raw, ctx) {
    var n = parseInt(raw, 10);
    if (raw.length === 4) return n;
    return 2000 + n;
  }

  /** 토큰 하나를 날짜로 해석. 실패하면 null. */
  function parseDateToken(token, ctx, atLineStart) {
    var t = token.toUpperCase();
    var m;

    if ((m = t.match(RE.ymd))) {
      return build(+m[1], +m[2], +m[3]);
    }
    if ((m = t.match(RE.ymdCompact))) {
      return build(+m[1], +m[2], +m[3]);
    }
    if ((m = t.match(RE.md))) {
      var mo = +m[1], da = +m[2];
      return build(resolveYear(mo, ctx), mo, da);
    }
    if ((m = t.match(RE.dMon))) {
      var mon = MONTHS[m[2]];
      var yr = m[3] ? normalizeYear(m[3], ctx) : resolveYear(mon, ctx);
      return build(yr, mon, +m[1]);
    }
    if ((m = t.match(RE.monD))) {
      var mon2 = MONTHS[m[1]];
      return build(resolveYear(mon2, ctx), mon2, +m[2]);
    }
    if ((m = t.match(RE.dayMarker))) {
      return buildDayOnly(+m[1]);
    }
    if (atLineStart && (m = t.match(RE.bareDay))) {
      return buildDayOnly(+m[1]);
    }
    return null;

    function build(y, mm, dd) {
      if (!isValidDate(y, mm, dd)) return null;
      return isoDate(y, mm, dd);
    }
    function buildDayOnly(dd) {
      var y = ctx.currentYear || ctx.baseYear;
      var mm = ctx.currentMonth || ctx.baseMonth;
      if (!isValidDate(y, mm, dd)) return null;
      return isoDate(y, mm, dd);
    }
  }

  function expandRange(fromIso, toIso) {
    var out = [];
    var start = new Date(fromIso + 'T00:00:00Z');
    var end = new Date(toIso + 'T00:00:00Z');
    if (isNaN(start) || isNaN(end) || end < start) return [fromIso];
    var guard = 0;
    while (start <= end && guard++ < 400) {
      out.push(start.toISOString().slice(0, 10));
      start.setUTCDate(start.getUTCDate() + 1);
    }
    return out;
  }

  function makeFlightItem(airline, number, suffix) {
    var code = airline + number + (suffix || '');
    return {
      code: code,
      type: 'flight',
      category: 'flight',
      label: airline + ' ' + number + '편',
      airline: airline,
      flightNumber: number,
      known: true
    };
  }

  function makeDutyItem(code) {
    var hit = codes.lookup(code);
    if (hit) {
      return {
        code: code.toUpperCase(),
        type: 'duty',
        category: hit.category,
        label: hit.label,
        known: true
      };
    }
    return {
      code: code.toUpperCase(),
      type: 'duty',
      category: 'unknown',
      label: '미확인 코드',
      known: false
    };
  }

  function splitSlashCodes(token) {
    // "LO/STBY" 처럼 슬래시로 붙은 근무 코드 분리 (공항 코드 ICN/NRT 는 제외)
    if (token.indexOf('/') === -1) return null;
    var parts = token.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    var allKnown = parts.every(function (p) { return codes.lookup(p); });
    return allKnown ? parts : null;
  }

  function parse(text, options) {
    options = options || {};
    var base = options.baseDate ? new Date(options.baseDate + 'T00:00:00Z') : new Date();
    var ctx = {
      baseYear: options.year || (options.baseDate ? base.getUTCFullYear() : base.getFullYear()),
      baseMonth: options.month || (options.baseDate ? base.getUTCMonth() + 1 : base.getMonth() + 1),
      currentYear: null,
      currentMonth: null
    };

    var entries = [];
    var warnings = [];
    var ignoredLines = [];
    var seen = {};
    var currentDates = [];
    var seq = 0;

    var rawLines = normalizeText(text).split('\n');

    rawLines.forEach(function (rawLine, lineIndex) {
      var trimmed = rawLine.trim();
      if (!trimmed) return;

      var tokens = tokenize(preprocessLine(trimmed));
      if (!tokens.length) return;

      var lineDates = [];
      var items = [];
      var pendingRange = false;
      var unknownTokens = [];
      var lastRoute = null;
      var lastTime = null;

      for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        var upper = token.toUpperCase();

        // 1) 날짜
        var atLineStart = (lineDates.length === 0 && items.length === 0 && i <= 1);
        var asDate = parseDateToken(token, ctx, atLineStart);
        if (asDate) {
          if (pendingRange && lineDates.length) {
            var expanded = expandRange(lineDates[lineDates.length - 1], asDate);
            expanded.shift();
            lineDates = lineDates.concat(expanded);
            pendingRange = false;
          } else {
            lineDates.push(asDate);
          }
          ctx.currentYear = +asDate.slice(0, 4);
          ctx.currentMonth = +asDate.slice(5, 7);
          continue;
        }

        // 2) 날짜 범위 구분자
        if (RE.rangeSep.test(token) || upper === '-' || upper === 'TO') {
          if (lineDates.length) { pendingRange = true; continue; }
        }

        // 3) 시간
        var timeMatch = upper.match(RE.clockRange) || upper.match(RE.compactRange);
        if (timeMatch) {
          lastTime = normalizeTimeRange(upper);
          applyDetail(items, { start: lastTime.start, end: lastTime.end });
          continue;
        }
        if (RE.clock.test(upper)) {
          applyDetail(items, { start: upper });
          continue;
        }

        // 4) 구간(공항 코드)
        if (RE.route.test(upper)) {
          lastRoute = upper.replace(/-/g, '/');
          applyDetail(items, { route: lastRoute });
          continue;
        }

        // 5) 항공편 (KE0035 / KE 0035 / KE-035)
        var fl = upper.match(RE.flight);
        if (fl && !codes.lookup(upper)) {
          items.push(makeFlightItem(fl[1], fl[2], fl[3]));
          continue;
        }
        if (RE.airline.test(upper) && !codes.lookup(upper) && i + 1 < tokens.length && RE.digits.test(tokens[i + 1])) {
          items.push(makeFlightItem(upper, tokens[i + 1]));
          i++;
          continue;
        }

        // 6) 근무 코드
        var slashed = splitSlashCodes(upper);
        if (slashed) {
          slashed.forEach(function (p) { items.push(makeDutyItem(p)); });
          continue;
        }
        if (codes.lookup(upper)) {
          items.push(makeDutyItem(upper));
          continue;
        }

        // 7) 무시 대상
        if (codes.IGNORED_TOKENS[upper] || /^\d+$/.test(upper)) continue;

        // 8) 정체불명 코드 후보 -> 사용자에게 판단을 넘긴다
        if (RE.dutyLike.test(upper) && upper.length >= 2) {
          var item = makeDutyItem(upper);
          items.push(item);
          unknownTokens.push(upper);
          continue;
        }

        ignoredLines.push({ line: lineIndex + 1, text: trimmed, token: token });
      }

      var targetDates = lineDates.length ? lineDates : currentDates;
      if (lineDates.length) currentDates = lineDates;

      if (!items.length) return;

      if (!targetDates.length) {
        warnings.push({
          line: lineIndex + 1,
          text: trimmed,
          message: '날짜를 찾지 못해 건너뛴 줄입니다.'
        });
        return;
      }

      if (unknownTokens.length) {
        warnings.push({
          line: lineIndex + 1,
          text: trimmed,
          message: '알 수 없는 코드: ' + unknownTokens.join(', ') + ' — 확인 후 반영하세요.'
        });
      }

      targetDates.forEach(function (date) {
        items.forEach(function (item) {
          var key = [date, item.code, item.route || '', item.start || '', item.end || ''].join('|');
          if (seen[key]) return;
          seen[key] = true;
          entries.push({
            id: 'p' + (++seq),
            date: date,
            code: item.code,
            type: item.type,
            category: item.category,
            label: item.label,
            known: item.known,
            route: item.route || null,
            start: item.start || null,
            end: item.end || null,
            source: trimmed
          });
        });
      });
    });

    entries.sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return parseInt(a.id.slice(1), 10) - parseInt(b.id.slice(1), 10);
    });

    return {
      entries: entries,
      warnings: warnings,
      ignoredLines: ignoredLines,
      stats: summarize(entries)
    };

    function applyDetail(list, detail) {
      if (!list.length) return;
      var target = null;
      for (var k = list.length - 1; k >= 0; k--) {
        if (list[k].type === 'flight') { target = list[k]; break; }
      }
      if (!target) target = list[list.length - 1];
      Object.keys(detail).forEach(function (k) {
        if (detail[k] != null && target[k] == null) target[k] = detail[k];
      });
    }
  }

  function normalizeTimeRange(token) {
    var m = token.match(RE.clockRange);
    if (m) {
      return { start: pad2(+m[1]) + ':' + m[2], end: pad2(+m[3]) + ':' + m[4] };
    }
    m = token.match(RE.compactRange);
    if (m) {
      return { start: toClock(m[1]), end: toClock(m[2]) };
    }
    return { start: null, end: null };
  }

  function toClock(digits) {
    var s = digits.length === 3 ? '0' + digits : digits;
    return s.slice(0, 2) + ':' + s.slice(2, 4);
  }

  function summarize(entries) {
    var byDate = {};
    var counts = { flight: 0, layover: 0, standby: 0, off: 0, training: 0, other: 0, unknown: 0 };
    entries.forEach(function (e) {
      byDate[e.date] = true;
      if (counts[e.category] == null) counts[e.category] = 0;
      counts[e.category]++;
    });
    var dates = Object.keys(byDate).sort();
    return {
      dateCount: dates.length,
      entryCount: entries.length,
      firstDate: dates[0] || null,
      lastDate: dates[dates.length - 1] || null,
      counts: counts
    };
  }

  return {
    parse: parse,
    normalizeText: normalizeText,
    preprocessLine: preprocessLine,
    tokenize: tokenize,
    expandRange: expandRange,
    isoDate: isoDate,
    isValidDate: isValidDate
  };
});
