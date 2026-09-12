/**
 * 글자 인식 결과를 붙여넣기 탭이 읽는 글로 되돌린다.
 *
 * 인식기는 글자와 그 글자가 있던 자리(네모)를 준다. 글만 이어 붙이면 달력 스케줄은
 * "1 2 3 4 5 6 7 / ATDO KE0035 LO …" 처럼 가로로 읽혀 어느 날의 근무인지 사라진다.
 * 그래서 자리를 보고 칸을 되짚는다. 날짜 줄에서 칸의 경계를 잡고, 그 아래 글자를
 * 가로 자리로 나눠 담으면 "2일 KE0035 ICN/ATL 0945-1020" 이 돌아온다.
 *
 * 한 줄에 하루씩 적힌 표는 그대로 줄을 이어 붙이면 된다. 파서가 이미 읽을 수 있다.
 *
 * 인식기가 없는 곳에서도 검사할 수 있도록, 여기서는 네모와 글자만 다룬다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.ocrlayout = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DAY = /^([1-9]|[12][0-9]|3[01])$/;
  var DATE_HEAD = /^(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[./]\d{1,2}|\d{1,2}[A-Z]{3}\d{2})$/;
  var MONTHS = 'JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC'.split(' ');
  var UNSURE = 60;                 // 이보다 자신 없는 글자는 확인하라고 일러준다
  var JUNK = 35;                   // 이보다 자신 없는 글자는 아예 버린다. 대개 무늬나 선이다.

  /**
   * 0 과 O, 1 과 l 은 인식기가 자주 헷갈린다. 편명은 "영문 두 자 + 숫자" 라는 걸
   * 아니까, 그 꼴에 맞춰 되돌린다. 글자 수가 하나 늘어 KE00035 처럼 되는 일도 있어
   * 앞의 0 을 떼고 네 자리로 맞춘다. 편명 아닌 글자는 건드리지 않는다.
   */
  function fixCode(token) {
    var flight = /^([A-Z]{2})([O0-9OIl]{3,7})$/.exec(token);
    if (flight) {
      var digits = flight[2].replace(/[OQ]/g, '0').replace(/[Il]/g, '1');
      if (!/^\d+$/.test(digits)) return token;
      var number = digits.replace(/^0+/, '') || '0';
      if (number.length > 4) return token;                 // 편명으로 보기엔 너무 길다
      while (number.length < 4) number = '0' + number;
      return flight[1] + number;
    }
    // 날짜(01SEP26). 자릿수가 하나 늘거나 0 이 O 로 읽힌 것을 되돌린다
    var date = /^([O0-9]{1,3})([A-Z]{3})([O0-9]{2,3})$/.exec(token);
    if (date && MONTHS.indexOf(date[2]) !== -1) {
      var day = +date[1].replace(/O/g, '0');
      var year = date[3].replace(/O/g, '0').slice(-2);
      if (day >= 1 && day <= 31) return (day < 10 ? '0' : '') + day + date[2] + year;
    }

    // 시각(0945, 2350-0620+1)에 섞여 든 O 도 되돌린다
    if (/^[O0-9]{3,4}([-+][O0-9+]{1,6})?$/.test(token) && /O/.test(token)) {
      return token.replace(/O/g, '0');
    }
    return token;
  }

  /** 인식기가 흘린 기호를 떼고, 남을 글자만 남긴다. */
  function clean(word) {
    var text = String((word && word.text) || '').trim();
    text = text.replace(/^[^0-9A-Za-z가-힣]+/, '').replace(/[^0-9A-Za-z가-힣+\-/:.]+$/, '');
    if (!text) return null;
    var conf = word.conf == null ? 100 : word.conf;
    // 자신 없는 글자 중 한두 자짜리만 버린다. 대개 선이나 무늬를 글자로 본 것이다.
    // 긴 글자는 틀렸더라도 남겨 둔다. 날짜 한 줄이 통째로 사라지는 편이 더 나쁘다.
    if (conf < JUNK && text.length <= 2) return null;
    if (text.length === 1 && !/[0-9]/.test(text)) return null;   // 홀로 선 글자 하나는 글이 아니다
    return {
      text: fixCode(text),
      conf: conf,
      x0: word.x0, x1: word.x1, y0: word.y0, y1: word.y1,
      cx: (word.x0 + word.x1) / 2,
      cy: (word.y0 + word.y1) / 2,
      h: word.y1 - word.y0
    };
  }

  function median(values) {
    if (!values.length) return 0;
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    return sorted[Math.floor(sorted.length / 2)];
  }

  /** 같은 높이에 있는 글자를 한 줄로 묶는다. */
  function rows(words) {
    var list = words.slice().sort(function (a, b) { return a.cy - b.cy; });
    var tall = median(list.map(function (w) { return w.h; })) || 10;
    var out = [];
    var current = null;
    list.forEach(function (word) {
      if (!current || Math.abs(word.cy - current.cy) > tall * 0.7) {
        current = { cy: word.cy, words: [word] };
        out.push(current);
        return;
      }
      current.words.push(word);
      // 줄이 아래로 흐르면 기준도 같이 내린다
      current.cy = current.words.reduce(function (sum, w) { return sum + w.cy; }, 0) / current.words.length;
    });
    out.forEach(function (row) {
      row.words.sort(function (a, b) { return a.x0 - b.x0; });
    });
    return out;
  }

  /**
   * 날짜만 죽 늘어선 줄. 달력에서 칸의 경계를 여기서 잡는다.
   * 달이 바뀌는 주는 "31 1 2 3 4 5 6" 처럼 한 번 꺾이므로, 꺾임 한 번은 봐준다.
   */
  function isDayRow(row) {
    var days = row.words.filter(function (w) { return DAY.test(w.text); });
    if (days.length < 3 || days.length < row.words.length - 1) return false;
    var breaks = 0;
    for (var i = 1; i < days.length; i++) {
      if (+days[i].text <= +days[i - 1].text) breaks++;
    }
    return breaks <= 1;
  }

  /** 한 줄에 하루씩 적힌 표인지. 줄 맨 앞이 날짜면 그렇다. */
  function isListShape(rowList) {
    var heads = rowList.filter(function (row) {
      return row.words.length && DATE_HEAD.test(row.words[0].text);
    });
    return heads.length >= 3;
  }

  /** 쪼개진 시각을 도로 붙인다. "0945-" + "1020" -> "0945-1020" */
  function joinTimes(tokens) {
    var out = [];
    tokens.forEach(function (token) {
      var prev = out[out.length - 1];
      if (prev && /[-~]$/.test(prev) && /^\d/.test(token)) {
        out[out.length - 1] = prev + token;
        return;
      }
      out.push(token);
    });
    return out;
  }

  /** 달력을 칸으로 되짚어 "날짜 근무" 줄로 만든다. */
  function fromCalendar(rowList) {
    var out = [];
    rowList.forEach(function (row, index) {
      if (!isDayRow(row)) return;

      var days = row.words.filter(function (w) { return DAY.test(w.text); });
      var width = days.length > 1
        ? (days[days.length - 1].x0 - days[0].x0) / (days.length - 1)
        : 1e9;
      var edges = days.map(function (day) { return day.x0 - width * 0.12; });

      var cells = days.map(function (day) { return { day: +day.text, tokens: [] }; });

      for (var i = index + 1; i < rowList.length; i++) {
        if (isDayRow(rowList[i])) break;                    // 다음 주
        rowList[i].words.forEach(function (word) {
          var at = 0;
          for (var c = 0; c < edges.length; c++) {
            if (word.cx >= edges[c]) at = c;
          }
          cells[at].tokens.push(word.text);
        });
      }

      cells.forEach(function (cell) {
        if (!cell.tokens.length) return;
        out.push({ day: cell.day, tokens: joinTimes(cell.tokens) });
      });
    });
    return out;
  }

  /**
   * 달력 귀퉁이에 붙은 앞뒤 달의 날짜를 떼어 낸다. 9월 달력이라면 1일 앞에 붙은
   * 8월 말과, 30일 뒤에 붙은 10월 초가 그것이다. 그대로 두면 엉뚱한 날에 얹힌다.
   *
   * 가려내는 법은 "가장 길게 이어 오르는 토막만 남기기". 한 달치 달력에서 그 토막은
   * 언제나 이번 달이고, 앞뒤에 붙은 며칠은 거기서 떨어져 나간다.
   */
  function trimOtherMonths(cells) {
    if (cells.length < 2) return { cells: cells.slice(), dropped: 0 };

    var bestFrom = 0, bestLength = 1;
    var from = 0;
    for (var i = 1; i <= cells.length; i++) {
      if (i < cells.length && cells[i].day > cells[i - 1].day) continue;
      if (i - from > bestLength) { bestLength = i - from; bestFrom = from; }
      from = i;
    }
    return {
      cells: cells.slice(bestFrom, bestFrom + bestLength),
      dropped: cells.length - bestLength
    };
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /**
   * 달력 칸을 글줄로 옮긴다. 몇 년 몇 월인지 알면 날짜를 또렷이 적는다. 날짜만 적어
   * 두면 파서가 달이 넘어갔다고 잘못 볼 수 있어서다.
   */
  function cellLines(cells, opts) {
    var seen = {};
    var out = [];
    cells.forEach(function (cell) {
      if (seen[cell.day]) return;              // 같은 날이 두 번 나오면 앞의 것만
      seen[cell.day] = true;
      var head = opts.year && opts.month
        ? opts.year + '-' + pad2(opts.month) + '-' + pad2(cell.day)
        : String(cell.day);
      out.push(head + '\t' + cell.tokens.join(' '));
    });
    return out;
  }

  /**
   * toText(words, options) -> { text, shape, unsure, dropped }
   *
   *   words   [{ text, conf, x0, y0, x1, y1 }]  인식기가 준 글자와 그 자리
   *   shape   'calendar' | 'list' | 'plain'
   *   unsure  인식기가 자신 없어 한 글자들. 미리보기에서 눈으로 확인하라고 보여준다.
   */
  function toText(words, options) {
    var opts = options || {};
    var clean_ = (words || []).map(clean).filter(Boolean);
    if (!clean_.length) return { text: '', shape: 'plain', unsure: [], dropped: 0 };

    var rowList = rows(clean_);
    var unsure = clean_.filter(function (w) { return w.conf < (opts.unsure || UNSURE); })
      .map(function (w) { return w.text; });

    if (isListShape(rowList)) {
      return {
        text: rowList.map(function (row) {
          return joinTimes(row.words.map(function (w) { return w.text; })).join(' ');
        }).join('\n'),
        shape: 'list',
        unsure: unsure,
        dropped: 0
      };
    }

    var cells = fromCalendar(rowList);
    if (cells.length >= 3) {
      var trimmed = trimOtherMonths(cells);
      return {
        text: cellLines(trimmed.cells, opts).join('\n'),
        shape: 'calendar',
        unsure: unsure,
        dropped: trimmed.dropped
      };
    }

    // 달력도 표도 아니면 줄만 이어 붙인다. 파서가 읽어 보고 못 읽은 줄을 알려준다.
    return {
      text: rowList.map(function (row) {
        return joinTimes(row.words.map(function (w) { return w.text; })).join(' ');
      }).join('\n'),
      shape: 'plain',
      unsure: unsure,
      dropped: 0
    };
  }

  return {
    toText: toText,
    cellLines: cellLines,
    fixCode: fixCode,
    rows: rows,
    isDayRow: isDayRow,
    joinTimes: joinTimes
  };
});
