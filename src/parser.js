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
    clock: /^(\d{1,2}):([0-5]\d)(?:\s*\+(\d))?$/,
    clockRange: /^(\d{1,2}):([0-5]\d)[-~](\d{1,2}):([0-5]\d)(?:\+(\d))?$/,
    compactRange: /^(\d{3,4})[-~](\d{3,4})(?:\+(\d))?$/,
    compactClock: /^(\d{3,4})(?:\+(\d))?$/,
    dayOffset: /^\+(\d)$/,
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

  /** '1030' / '930' -> '10:30' / '09:30'. 시각으로 볼 수 없으면 null. */
  function toClock(digits) {
    var raw = String(digits);
    if (!/^\d{3,4}$/.test(raw)) return null;
    var s = raw.length === 3 ? '0' + raw : raw;
    var h = +s.slice(0, 2);
    var m = +s.slice(2, 4);
    if (h > 23 || m > 59) return null;
    return pad2(h) + ':' + pad2(m);
  }

  /** 'HH:MM' 정규화. 시각이 아니면 null. */
  function toClockFromParts(hour, minute) {
    var h = +hour, m = +minute;
    if (h > 23 || m > 59) return null;
    return pad2(h) + ':' + pad2(m);
  }

  /** 라벨 없이 쓰인 시각 토큰 하나를 읽는다. ('10:30', '1030', '0850+1') */
  function readClockToken(token) {
    if (!token) return null;
    var t = String(token).toUpperCase().replace(/[LZ]$/, '');
    var m = t.match(RE.clock);
    if (m) {
      var value = toClockFromParts(m[1], m[2]);
      return value ? { value: value, offset: m[3] ? +m[3] : 0 } : null;
    }
    m = t.match(RE.compactClock);
    if (m) {
      var compact = toClock(m[1]);
      return compact ? { value: compact, offset: m[2] ? +m[2] : 0 } : null;
    }
    return null;
  }

  /** 'STD 1030' / '출발 10:30' / 'ARR14:20' 처럼 라벨이 붙은 시각. */
  function readLabeledTime(token, nextToken) {
    var joined = String(token).toUpperCase().match(/^([A-Z가-힣]{1,8})[:\-]?(\d{1,2}:?[0-5]?\d(?:\+\d)?)$/);
    if (joined) {
      var which = codes.timeLabel(joined[1]);
      var parsed = which && readClockToken(joined[2]);
      if (parsed) return { which: which, time: parsed, consumed: 1 };
    }
    var label = codes.timeLabel(token);
    if (label) {
      var next = readClockToken(nextToken);
      if (next) return { which: label, time: next, consumed: 2 };
    }
    return null;
  }

  /**
   * 스케줄이 아니라 화면 조작용으로 붙어 오는 줄. 페이지를 통째로 복사하면 섞여 들어온다.
   * 경고 목록만 어지럽히므로 조용히 건너뛴다.
   */
  var NOISE_LINE = /^(?:MY\s*SKD|Actual|Extra|prev(?:ious)?|next|clear|오늘|이전|다음|초기화|인쇄|조회|검색|더보기|Total|Sum|합계|Page\s*\d+)(?:\s*\(\s*(?:Current|Next|Previous)\s*Month\s*\))?$/i;

  function isNoiseLine(line) {
    var t = String(line || '').trim().replace(/\s+/g, ' ');
    if (!t) return true;
    if (NOISE_LINE.test(t)) return true;
    // "clear 오늘" 처럼 조작용 단어만 이어 붙은 줄
    var words = t.split(' ');
    if (words.length <= 3 && words.every(function (w) { return NOISE_LINE.test(w); })) return true;
    return false;
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
    var skippedLines = [];
    var seen = {};
    var currentDates = [];
    var seq = 0;

    var rawLines = normalizeText(text).split('\n');

    rawLines.forEach(function (rawLine, lineIndex) {
      var trimmed = rawLine.trim();
      if (!trimmed || isNoiseLine(trimmed)) return;

      var tokens = tokenize(preprocessLine(trimmed));
      if (!tokens.length) return;

      /*
       * 한 줄에 여러 날이 들어 있는 경우가 있다. 달력 화면을 복사하면
       * 앞 칸의 마지막 코드와 다음 칸의 날짜가 "TVL 6" 처럼 한 줄로 붙어 나온다.
       * 그래서 줄을 날짜 단위 묶음(segment)으로 쪼개 읽는다.
       */
      var segments = [{ dates: [], items: [] }];
      var pendingRange = false;
      var unknownTokens = [];
      var lastRoute = null;

      function seg() { return segments[segments.length - 1]; }

      function addDate(date) {
        if (seg().items.length) segments.push({ dates: [], items: [] });
        seg().dates.push(date);
      }

      function hasAnyDate() {
        return segments.some(function (x) { return x.dates.length; }) || currentDates.length > 0;
      }

      for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        var upper = token.toUpperCase();

        // 1) 날짜
        //    맨 앞의 1~2자리 숫자는 물론, 줄 중간에 다시 나오는 숫자도 날짜로 본다.
        //    (달력을 복사하면 앞 칸 코드와 다음 칸 날짜가 한 줄에 붙는다)
        var atLineStart = (segments.length === 1 && seg().dates.length === 0 && seg().items.length === 0 && i <= 1);
        var midLineDay = false;
        if (!atLineStart && RE.bareDay.test(token) && hasAnyDate()) {
          var next = tokens[i + 1];
          midLineDay = !next || !/^\d+$/.test(next);
        }

        var asDate = parseDateToken(token, ctx, atLineStart || midLineDay);
        if (asDate) {
          var dates = seg().dates;
          if (pendingRange && dates.length) {
            var expanded = expandRange(dates[dates.length - 1], asDate);
            expanded.shift();
            expanded.forEach(function (d) { dates.push(d); });
            pendingRange = false;
          } else {
            addDate(asDate);
          }
          ctx.currentYear = +asDate.slice(0, 4);
          ctx.currentMonth = +asDate.slice(5, 7);
          continue;
        }

        // 2) 날짜 범위 구분자 (뒤에 날짜가 와야 범위로 본다)
        if (RE.rangeSep.test(token) || upper === '-' || upper === 'TO') {
          if (seg().dates.length && parseDateToken(tokens[i + 1] || '', ctx, false)) {
            pendingRange = true;
            continue;
          }
        }

        // 3) 출발/도착 라벨이 붙은 시각 (STD 1030 / 출발 10:30 / ARR14:20)
        var labeled = readLabeledTime(token, tokens[i + 1]);
        if (labeled) {
          applyTime(seg().items, labeled.time, labeled.which);
          i += labeled.consumed - 1;
          continue;
        }

        // 4) 시각 범위 (1030-1420, 09:30-14:20, 2350-0620+1)
        var range = readTimeRange(upper);
        if (range) {
          applyTime(seg().items, range.start, 'start');
          applyTime(seg().items, range.end, 'end');
          continue;
        }

        // 5) 단독 시각. 한 줄에 두 번 나오면 출발 -> 도착 순으로 채운다.
        var clock = upper.match(RE.clock) ? readClockToken(upper) : null;
        if (clock) {
          applyTime(seg().items, clock, 'auto');
          continue;
        }

        // 6) '+1' 만 따로 떨어져 있으면 직전 도착 시각을 익일로 표시
        var offsetOnly = upper.match(RE.dayOffset);
        if (offsetOnly) {
          markNextDay(seg().items, +offsetOnly[1]);
          continue;
        }

        // 4) 구간(공항 코드)
        if (RE.route.test(upper)) {
          lastRoute = upper.replace(/-/g, '/');
          applyDetail(seg().items, { route: lastRoute });
          continue;
        }

        // 5) 항공편 (KE0035 / KE 0035 / KE-035)
        var fl = upper.match(RE.flight);
        if (fl && !codes.lookup(upper)) {
          seg().items.push(makeFlightItem(fl[1], fl[2], fl[3]));
          continue;
        }
        if (RE.airline.test(upper) && !codes.lookup(upper) && i + 1 < tokens.length && RE.digits.test(tokens[i + 1])) {
          seg().items.push(makeFlightItem(upper, tokens[i + 1]));
          i++;
          continue;
        }

        // 6) 근무 코드
        var slashed = splitSlashCodes(upper);
        if (slashed) {
          slashed.forEach(function (p) { seg().items.push(makeDutyItem(p)); });
          continue;
        }
        if (codes.lookup(upper)) {
          seg().items.push(makeDutyItem(upper));
          continue;
        }

        // 7) 편명이 이미 나온 줄에서 3~4자리 숫자는 출발/도착 시각으로 본다
        if (/^\d{3,4}(\+\d)?$/.test(upper) && hasFlight(seg().items) && needsTime(seg().items)) {
          var implicit = readClockToken(upper);
          if (implicit) {
            applyTime(seg().items, implicit, 'auto');
            continue;
          }
        }

        // 8) 무시 대상
        if (codes.IGNORED_TOKENS[upper] || /^\d+$/.test(upper)) continue;

        // 9) 정체불명 코드 후보 -> 사용자에게 판단을 넘긴다
        if (RE.dutyLike.test(upper) && upper.length >= 2) {
          var item = makeDutyItem(upper);
          seg().items.push(item);
          unknownTokens.push(upper);
          continue;
        }

        ignoredLines.push({ line: lineIndex + 1, text: trimmed, token: token });
      }

      var lineHasDate = segments.some(function (x) { return x.dates.length; });
      var lineHasItems = segments.some(function (x) { return x.items.length; });

      if (!lineHasItems) {
        // 날짜도 근무도 못 읽어낸 줄. 왜 빠졌는지 볼 수 있게 남긴다.
        if (!lineHasDate) skippedLines.push({ line: lineIndex + 1, text: trimmed });
        else currentDates = segments[segments.length - 1].dates;
        return;
      }

      if (!lineHasDate && !currentDates.length) {
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

      segments.forEach(function (part) {
        var targetDates = part.dates.length ? part.dates : currentDates;
        if (part.dates.length) currentDates = part.dates;
        if (!part.items.length || !targetDates.length) return;
        addEntries(targetDates, part.items, trimmed);
      });
    });

    function addEntries(targetDates, items, trimmed) {
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
            endOffset: item.endOffset || 0,
            source: trimmed
          });
        });
      });
    }

    entries.sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return parseInt(a.id.slice(1), 10) - parseInt(b.id.slice(1), 10);
    });

    return {
      entries: entries,
      warnings: warnings,
      ignoredLines: ignoredLines,
      skippedLines: skippedLines,
      stats: summarize(entries)
    };

    function timeTarget(list) {
      if (!list.length) return null;
      for (var k = list.length - 1; k >= 0; k--) {
        if (list[k].type === 'flight') return list[k];
      }
      return list[list.length - 1];
    }

    function applyDetail(list, detail) {
      var target = timeTarget(list);
      if (!target) return;
      Object.keys(detail).forEach(function (k) {
        if (detail[k] != null && target[k] == null) target[k] = detail[k];
      });
    }

    /**
     * 시각을 붙인다.
     *  which 'start' 출발(시작) / 'end' 도착(종료)
     *  which 'auto' 한 줄에 시각이 두 번 나오면 출발 -> 도착 순으로 채운다.
     */
    function applyTime(list, time, which) {
      var target = timeTarget(list);
      if (!target || !time) return;
      var slot = which;
      if (slot === 'auto') slot = target.start == null ? 'start' : (target.end == null ? 'end' : null);
      if (!slot || target[slot] != null) return;
      target[slot] = time.value;
      if (slot === 'end' && time.offset) target.endOffset = time.offset;
    }

    function markNextDay(list, days) {
      var target = timeTarget(list);
      if (target && target.end) target.endOffset = days;
    }

    function hasFlight(list) {
      return list.some(function (item) { return item.type === 'flight'; });
    }

    function needsTime(list) {
      var target = timeTarget(list);
      return !!target && (target.start == null || target.end == null);
    }
  }

  /** '1030-1420', '09:30-14:20', '2350-0620+1' -> { start, end } */
  function readTimeRange(token) {
    var m = token.match(RE.clockRange);
    if (m) {
      var s1 = toClockFromParts(m[1], m[2]);
      var e1 = toClockFromParts(m[3], m[4]);
      if (!s1 || !e1) return null;
      return { start: { value: s1, offset: 0 }, end: { value: e1, offset: m[5] ? +m[5] : 0 } };
    }
    m = token.match(RE.compactRange);
    if (m) {
      var s2 = toClock(m[1]);
      var e2 = toClock(m[2]);
      if (!s2 || !e2) return null;
      return { start: { value: s2, offset: 0 }, end: { value: e2, offset: m[3] ? +m[3] : 0 } };
    }
    return null;
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
    isNoiseLine: isNoiseLine,
    expandRange: expandRange,
    readClockToken: readClockToken,
    readTimeRange: readTimeRange,
    isoDate: isoDate,
    isValidDate: isValidDate
  };
});
