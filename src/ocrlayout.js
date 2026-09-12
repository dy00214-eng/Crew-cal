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
    module.exports = factory(require('./codes.js'), require('./schedule.js'));
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.ocrlayout = factory(root.CrewCal.codes, root.CrewCal.schedule);
  }
})(typeof self !== 'undefined' ? self : this, function (codes, schedule) {
  'use strict';

  var DAY = /^([1-9]|[12][0-9]|3[01])$/;
  var DATE_HEAD = /^(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[./]\d{1,2}|\d{1,2}[A-Z]{3}\d{2})$/;
  var MONTHS = 'JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC'.split(' ');
  var UNSURE = 60;                 // 이보다 자신 없는 글자는 확인하라고 일러준다
  var JUNK = 35;                   // 이보다 자신 없는 글자는 아예 버린다. 대개 무늬나 선이다.

  // 인식기가 숫자를 이 글자들로 잘못 읽는다. 편명 숫자 자리에서만 되돌린다.
  // S 와 G 는 5·8, 6·8 둘 다로 읽히므로 두 가지를 다 만들어 보고 시간표에 있는 쪽을 쓴다.
  var LOOKALIKE = {
    O: ['0'], Q: ['0'], D: ['0'], I: ['1'], L: ['1'], J: ['1'],
    Z: ['2'], S: ['5', '8'], G: ['6', '8'], B: ['8'], T: ['7']
  };
  var DIGITISH = 'O0-9QDILJZSGBT';

  /**
   * 0 과 O, 1 과 L 은 인식기가 자주 헷갈린다. 편명은 "영문 두 자 + 숫자" 라는 걸
   * 아니까, 그 꼴에 맞춰 되돌린다. 글자 수가 하나 늘어 KE00035 처럼 되는 일도 있어
   * 앞의 0 을 떼고 네 자리로 맞춘다. 편명 아닌 글자는 건드리지 않는다.
   */
  function fixCode(token, tone) {
    // 코드 뒤에 붙어 읽힌 칸 선(ATDO-, KE2193.)을 떼어 낸다.
    // 시각(0945-)은 뒤의 - 가 뜻이 있어 그대로 둔다.
    var trailing = /^([A-Z][A-Z0-9]+)[-.]+$/.exec(token);
    if (trailing) token = trailing[1];

    // 편명 뒤에 판 테두리가 글자 한 자로 붙어 읽히는 일이 있다(KE1820F).
    // 떼어 낸 쪽이 시간표에 있는 편이면 떼어 낸다.
    var suffix = /^([A-Z]{2}\d{4})[A-Z]$/.exec(token);
    if (suffix && schedule && schedule.lookup(suffix[1])) return suffix[1];

    // 앞에 글자가 한둘 붙어 읽힌 편명(IKEO703)은 뒤쪽만 떼어 본다
    if (token.length > 6 && /^[A-Z]/.test(token)) {
      var trimmed = token.slice(token.length - 6);
      var guess = new RegExp('^[A-Z]{2}[' + DIGITISH + ']{4}$').test(trimmed) ? fixCode(trimmed) : null;
      if (guess && schedule && schedule.lookup(guess)) return guess;
    }

    var flight = new RegExp('^([A-Z]{2})([' + DIGITISH + ']{3,7})$').exec(token);
    if (flight) {
      var candidates = flightCandidates(flight[1], flight[2]);
      if (!candidates.length) return token;
      var known = candidates.filter(function (code) { return schedule && schedule.lookup(code); });
      if (known.length === 1) return known[0];             // 시간표에 있는 편이 하나뿐이면 그것
      if (known.length) return candidates[0];

      // 아는 편이 하나도 없다. 앞 두 글자를 잘못 읽었을 수 있다(BC0075 → KE0075).
      // 아는 항공사 코드가 아니고, 시간표에 KE 편이 있을 때만 바로잡는다.
      var airline = ['KE', 'OZ', 'LJ', 'TW', 'BX', 'ZE', 'RS', 'RF'].indexOf(flight[1]) !== -1;
      var digits = candidates[0].slice(2);
      if (!airline && schedule && schedule.lookup('KE' + digits)) return 'KE' + digits;
      return candidates[0];
    }

    // 앞에 군더더기가 붙은 편명(JJKE1402)은 뒤의 편명만 남긴다
    var tail = /^[A-Z]{1,3}([A-Z]{2}\d{4})$/.exec(token);
    if (tail) return tail[1];

    // 앞 글자가 잘못 읽히거나(BC0075) 떨어져 나간(E0805, 0703) 편명을 되살린다.
    // 시간표에 그런 편이 있을 때만, 그리고 아는 항공사 코드가 아닐 때만 손댄다.
    var lost = /^([A-Z]{0,2})(\d{4})$/.exec(token);
    if (lost && schedule) {
      var prefix = lost[1];
      var known = ['KE', 'OZ', 'LJ', 'TW', 'BX', 'ZE', 'RS', 'RF'].indexOf(prefix) !== -1;
      // 숫자만 남은 것은 시각일 수도 있어, 판 위의 글자일 때만 고친다
      var readable = prefix.length === 2 ? !known : (prefix.length === 1 || tone === 'blue');
      if (readable && schedule.lookup('KE' + lost[2])) return 'KE' + lost[2];
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
    return snapToKnownCode(token, tone);
  }

  // 판 색이 일러 주는 근무의 갈래. 크루넷이 색으로 갈라 적어 둔 것을 그대로 옮겼다.
  // 파랑은 비행·체류·휴가(FVC), 연두는 휴무, 회색은 대기다.
  var TONE_KINDS = {
    blue: ['layover', 'flight', 'vacation'],
    green: ['off'],
    gray: ['standby']
  };

  /**
   * 헷갈리는 글자를 숫자로 바꿔 가며 있을 법한 편명을 모두 만든다.
   * 앞의 0 을 떼고 네 자리로 맞추므로 KE00035 도 KE0035 가 된다.
   */
  function flightCandidates(prefix, digits) {
    var out = [''];
    for (var i = 0; i < digits.length; i++) {
      var ch = digits[i];
      var options = LOOKALIKE[ch] || (/[0-9]/.test(ch) ? [ch] : null);
      if (!options) return [];
      var next = [];
      out.forEach(function (head) {
        options.forEach(function (option) { next.push(head + option); });
      });
      out = next;
      if (out.length > 8) return [];                       // 헷갈리는 글자가 너무 많다
    }
    var seen = {};
    var codesOut = [];
    out.forEach(function (number) {
      var trimmed = number.replace(/^0+/, '') || '0';
      if (trimmed.length > 4) return;
      while (trimmed.length < 4) trimmed = '0' + trimmed;
      var code = prefix + trimmed;
      if (seen[code]) return;
      seen[code] = true;
      codesOut.push(code);
    });
    return codesOut;
  }

  /**
   * 아는 근무 코드에서 한 글자만 어긋난 것은 그 코드로 본다. ATOO -> ATDO 처럼.
   * 헷갈릴 만한 후보가 둘 이상이면 건드리지 않는다. 엉뚱한 근무로 바꾸는 것보다
   * 모르는 코드로 두고 사람이 고치는 편이 낫다. 두 글자짜리는 서로 너무 닮아 뺀다.
   */
  function snapToKnownCode(token, tone) {
    if (!codes || token.length < 2 || token.length > 6 || !/^[A-Z0-9]+$/.test(token)) return token;
    var known = codes.knownCodeList();
    if (known.indexOf(token) !== -1) return token;

    // 판 색을 알면 그 색으로 적는 근무만 후보로 둔다. 연두 판의 PO 는 LO 가 아니라 DO 다.
    var kinds = tone && TONE_KINDS[tone];
    // 색을 모르면 두 글자짜리는 손대지 않는다. LO·DO·SB 처럼 서로 너무 닮았다.
    if (!kinds && token.length < 3) return token;
    var pool = known.filter(function (code) {
      if (code.length < 2) return false;
      if (!kinds) return code.length >= 3;    // 색을 모르면 두 글자짜리는 건드리지 않는다
      var found = codes.lookup(code);
      return found && kinds.indexOf(found.category) !== -1;
    });

    var near = pool.filter(function (code) { return oneEditApart(token, code); });
    // 글자 수가 같은 후보가 있으면 그쪽만 본다. 인식기는 글자를 빠뜨리기보다
    // 다른 글자로 잘못 읽는 일이 훨씬 잦다. (PO 는 PDO 보다 DO 일 것이다)
    var same = near.filter(function (code) { return code.length === token.length; });
    var candidates = same.length ? same : near;
    return candidates.length === 1 ? candidates[0] : token;
  }

  /** 아는 근무 코드이거나 기본 시간표에 있는 편명인지. 잘못 읽은 판을 가려내는 데 쓴다. */
  function isKnownCode(token) {
    var text = String(token || '').toUpperCase();
    if (!text) return false;
    var fixed = fixCode(text);
    if (codes && codes.knownCodeList().indexOf(fixed) !== -1) return true;
    if (schedule && schedule.lookup(fixed)) return true;
    // 시간표에 없어도 아는 항공사의 편명 꼴이면 그대로 믿는다.
    // 모르는 항공사(AS0016)는 잘못 읽은 것으로 보고 다시 읽게 둔다.
    return !!(codes && codes.isFlightCode && codes.isFlightCode(fixed));
  }

  /** 한 글자를 바꾸거나 넣거나 빼면 같아지는지. */
  function oneEditApart(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false;
    if (a.length === b.length) {
      var diff = 0;
      for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
      return diff === 1;
    }
    var longer = a.length > b.length ? a : b;
    var shorter = a.length > b.length ? b : a;
    for (var j = 0, k = 0, skipped = 0; j < longer.length; j++) {
      if (longer[j] === shorter[k]) k++;
      else if (++skipped > 1) return false;
    }
    return true;
  }

  /**
   * 인식기가 흘린 기호를 떼고, 남을 글자만 남긴다.
   * 글자 사이에 낀 이상한 기호(ATDO._-—«KE0843)는 거기서 토막을 낸다. 판 두 개를
   * 한 낱말로 읽은 자국이라, 가르지 않으면 둘 다 알 수 없는 코드가 된다.
   */
  function splitJunk(text) {
    return String(text).split(/[^0-9A-Za-z가-힣+\-/:.]+/)
      .filter(function (piece) { return /[0-9A-Za-z가-힣]/.test(piece); });
  }

  function clean(word) {
    var text = String((word && word.text) || '').trim();
    text = text.replace(/^[^0-9A-Za-z가-힣]+/, '').replace(/[^0-9A-Za-z가-힣+\-/:.]+$/, '');
    if (!text) return null;
    // 스케줄의 코드·공항·편명은 모두 대문자다. 인식기가 흘린 소문자를 되돌린다.
    text = text.toUpperCase();
    var conf = word.conf == null ? 100 : word.conf;
    // 자신 없다고 버리지 않는다. 버리면 그 날이 빈칸이 되어 버린 줄도 모르고 지나간다.
    // 틀리게라도 남으면 미리보기에 뜨고, 거기서 고치면 된다.
    // 다만 홀로 선 글자 하나(획이나 칸 선을 글자로 본 것)는 글이 아니다.
    if (text.length === 1 && !/[0-9]/.test(text)) return null;
    return {
      text: fixCode(text, word.tone),
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
   *
   * 일곱 칸 가운데 몇 개가 글자로 잘못 읽히는 일이 흔하다(5→S, 13→LS, 17→1/7).
   * 그래서 "날짜가 몇 개나 되느냐" 로 재지 않고, **근무 코드가 하나도 없는 줄**인지로
   * 가른다. 근무 판에는 늘 아는 코드나 편명이 들어 있으므로 이 둘은 섞이지 않는다.
   * 날짜 줄 하나를 놓치면 그 주가 통째로 앞 주에 얹혀 버린다.
   */
  function isDayRow(row) {
    var days = row.words.filter(function (w) { return DAY.test(w.text); });
    if (days.length < 2) return false;

    var duty = row.words.some(function (w) {
      var text = w.text;
      if (DAY.test(text)) return false;
      if (/^[A-Z]{2}\d{2,4}$/.test(text)) return true;               // 편명
      if (/^[A-Z가-힣]{3,}$/.test(text)) return true;                 // 세 자 이상 글자
      return codes ? codes.knownCodeList().indexOf(text) !== -1 : false;
    });
    if (duty) return false;

    // 달이 바뀌는 주는 "31 1 2 3" 처럼 한 번 꺾인다. 꺾임 한 번까지는 봐준다.
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

  /** 두 편명이 붙어 읽힌 것(KE2071KE1402)을 도로 가른다. */
  function splitCodes(tokens) {
    var out = [];
    tokens.forEach(function (token) {
      var pair = /^([A-Z]{2}\d{4})[^A-Z0-9]?([A-Z]{2}\d{4})$/.exec(token);
      if (pair) { out.push(pair[1], pair[2]); return; }
      out.push(token);
    });
    return out;
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

  /**
   * 날짜 숫자들이 서 있는 세로줄(요일 칸)을 찾는다.
   *
   * 한 주만 보고 칸을 나누면, 읽히지 않은 날짜 하나 때문에 그 칸의 근무가 옆 칸으로
   * 밀린다. 달력 전체의 날짜 자리를 모아 세로줄을 잡으면 그런 일이 없다.
   */
  function columnsOf(dayRows) {
    var centers = [];
    dayRows.forEach(function (row) {
      row.words.forEach(function (word) { if (DAY.test(word.text)) centers.push(word.cx); });
    });
    if (centers.length < 3) return [];
    centers.sort(function (a, b) { return a - b; });

    var span = centers[centers.length - 1] - centers[0];
    var tol = Math.max(4, span / 14);          // 일곱 칸이면 칸 사이의 절반쯤
    var columns = [];
    var group = [centers[0]];
    for (var i = 1; i < centers.length; i++) {
      if (centers[i] - group[group.length - 1] <= tol) { group.push(centers[i]); continue; }
      columns.push(mean(group));
      group = [centers[i]];
    }
    columns.push(mean(group));
    return columns;
  }

  function mean(values) {
    return values.reduce(function (sum, v) { return sum + v; }, 0) / values.length;
  }

  function nearestColumn(x, columns) {
    var at = 0;
    for (var i = 1; i < columns.length; i++) {
      if (Math.abs(x - columns[i]) < Math.abs(x - columns[at])) at = i;
    }
    return at;
  }

  /**
   * 한 주의 칸마다 날짜를 매긴다.
   *
   * 읽은 숫자를 그대로 믿지 않는다. 달력은 칸 하나에 하루씩 늘어나므로, 읽은 숫자마다
   * "첫 칸이 며칠인지"를 셈해 보고 가장 많이 나온 값을 쓴다. 25 를 23 으로 잘못 읽어도
   * 나머지 여섯 칸이 바로잡아 준다. 잘못 읽은 숫자 하나가 그 뒤 주를 통째로 날려 버리는
   * 일이 있었다.
   *
   * 달이 바뀌는 주는 한 줄 안에서 기준이 한 번 바뀐다(28 29 30 1 2 3 4). 그래서 바뀌는
   * 자리를 하나 찾아, 앞뒤로 각각 기준을 잡는다.
   */
  function daysOfWeekRow(row, columns) {
    var reads = [];
    row.words.forEach(function (word) {
      if (!DAY.test(word.text)) return;
      reads.push({ col: nearestColumn(word.cx, columns), day: +word.text });
    });
    if (!reads.length) return new Array(columns.length).fill(null);

    function baseOf(list) {
      var votes = {};
      var best = null;
      list.forEach(function (read) {
        var base = read.day - read.col;
        votes[base] = (votes[base] || 0) + 1;
        if (best === null || votes[base] > votes[best]) best = base;
      });
      return best === null ? null : { base: +best, votes: votes[best] };
    }

    // 나누지 않는 쪽을 먼저 본다. 나누는 쪽은 앞뒤가 모두 두 칸 이상 받쳐 주고,
    // 나누지 않은 것보다 더 많은 숫자를 설명할 때만 쓴다.
    var whole = baseOf(reads);
    var bestPlan = { score: whole ? whole.votes : 0, cut: columns.length, left: whole, right: null };

    for (var cut = 2; cut < columns.length; cut++) {
      var left = baseOf(reads.filter(function (read) { return read.col < cut; }));
      var right = baseOf(reads.filter(function (read) { return read.col >= cut; }));
      if (!left || !right || left.votes < 2 || right.votes < 2) continue;
      if (left.base === right.base) continue;
      var score = left.votes + right.votes;
      if (score > bestPlan.score) {
        bestPlan = { score: score, cut: cut, left: left, right: right };
      }
    }

    return columns.map(function (column, index) {
      var side = index < bestPlan.cut ? bestPlan.left : bestPlan.right;
      if (!side) return null;
      var day = side.base + index;
      return day >= 1 && day <= 31 ? day : null;
    });
  }

  /**
   * 달력을 칸으로 되짚어 "날짜 근무" 줄로 만든다.
   *
   * 칸은 달력 전체에서 잡은 세로줄로 나누고, 글자는 가장 가까운 세로줄에 담는다.
   * 숫자를 왼쪽에 붙여 쓰는 달력도, 가운데에 놓는 달력도 이 기준이면 같이 맞는다.
   */
  function fromCalendar(rowList) {
    var out = [];
    var dayRows = [];
    rowList.forEach(function (row, index) { if (isDayRow(row)) dayRows.push(index); });
    if (!dayRows.length) return out;

    // 한 주가 차지하는 높이. 마지막 주 아래의 딴 글(메뉴 따위)을 끊는 데 쓴다.
    var heights = [];
    for (var d = 1; d < dayRows.length; d++) {
      heights.push(rowList[dayRows[d]].cy - rowList[dayRows[d - 1]].cy);
    }
    var weekHeight = heights.length ? median(heights) : Infinity;

    var columns = columnsOf(dayRows.map(function (index) { return rowList[index]; }));
    if (!columns.length) return out;

    // 첫 주의 날짜 줄이 안 읽히는 일이 있다. 앞 달 날짜가 흐린 회색이라 통째로
    // 묻히기 때문이다. 그 줄 바로 아래 근무가 있으면, 다음 주에서 이레를 빼 날짜를 센다.
    var firstRow = rowList[dayRows[0]];
    var above = daysOfWeekRow(firstRow, columns).map(function (day) {
      return day == null ? null : day - 7;
    });
    if (above.some(function (day) { return day >= 1; })) {
      var cellsAbove = above.map(function (day) { return { day: day, tokens: [] }; });
      for (var back = dayRows[0] - 1; back >= 0; back--) {
        if (firstRow.cy - rowList[back].cy > weekHeight * 0.8) break;
        if (isDayRow(rowList[back])) break;
        rowList[back].words.forEach(function (word) {
          cellsAbove[nearestColumn(word.cx, columns)].tokens.push(word.text);
        });
      }
      cellsAbove.forEach(function (cell) {
        if (cell.day == null || cell.day < 1 || !cell.tokens.length) return;
        out.push({ day: cell.day, tokens: splitCodes(joinTimes(cell.tokens)) });
      });
    }

    dayRows.forEach(function (index, which) {
      var row = rowList[index];
      var days = daysOfWeekRow(row, columns);
      var cells = days.map(function (day) { return { day: day, tokens: [] }; });
      var stopBelow = which === dayRows.length - 1 ? row.cy + weekHeight : Infinity;

      for (var i = index + 1; i < rowList.length; i++) {
        if (isDayRow(rowList[i])) break;                    // 다음 주
        if (rowList[i].cy > stopBelow) break;               // 달력 아래의 딴 글
        rowList[i].words.forEach(function (word) {
          cells[nearestColumn(word.cx, columns)].tokens.push(word.text);
        });
      }

      cells.forEach(function (cell) {
        if (cell.day == null || !cell.tokens.length) return;
        out.push({ day: cell.day, tokens: splitCodes(joinTimes(cell.tokens)) });
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
  /**
   * 자정을 넘겨 한국에 닿는 편은 크루넷이 출발일과 도착일 두 칸에 똑같이 적는다.
   * 그래서 도착일 칸에 한 자만 다르게 읽힌 편명이 나오면(KE0498 -> KE0408) 앞날의
   * 편명이 맞다. 앞날 편이 실제로 자정을 넘겨 도착하고, 잘못 읽힌 쪽은 그렇지 않을
   * 때만 손댄다. 그래야 진짜로 다른 편이 이튿날 뜬 경우를 건드리지 않는다.
   */
  function mendNextDayFlights(cells) {
    if (!schedule) return cells;
    var byDay = {};
    cells.forEach(function (cell) { if (cell.day != null && !byDay[cell.day]) byDay[cell.day] = cell; });

    Object.keys(byDay).forEach(function (key) {
      var day = +key;
      var prev = byDay[day - 1];
      if (!prev) return;
      var here = byDay[day];
      var flights = here.tokens.filter(function (t) { return /^[A-Z]{2}\d{4}$/.test(t); });
      if (flights.length !== 1) return;                 // 편이 하나뿐인 칸에서만

      var mine = schedule.lookup(flights[0]);
      if (mine && mine.endOffset) return;               // 이 편 자체가 이튿날 도착이면 그대로

      prev.tokens.forEach(function (token) {
        if (!/^[A-Z]{2}\d{4}$/.test(token) || token === flights[0]) return;
        if (!oneEditApart(token, flights[0])) return;
        var theirs = schedule.lookup(token);
        if (!theirs || !theirs.endOffset) return;       // 앞날 편이 자정을 넘겨야 이틀에 걸친다
        here.tokens = here.tokens.map(function (t) { return t === flights[0] ? token : t; });
      });
    });
    return cells;
  }

  function cellLines(cells, opts) {
    var seen = {};
    var out = [];
    // 그 달에 없는 날(9월 31일 따위)은 옆 달 칸을 잘못 센 것이다
    var last = opts.year && opts.month
      ? new Date(Date.UTC(opts.year, opts.month, 0)).getUTCDate()
      : 31;
    cells.forEach(function (cell) {
      if (cell.day > last) return;
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
    // 한 낱말 안에 두 코드가 붙어 읽힌 것은 먼저 토막 낸다
    var pieces = [];
    (words || []).forEach(function (word) {
      var parts = splitJunk(word.text);
      if (parts.length <= 1) { pieces.push(word); return; }
      parts.forEach(function (part) {
        pieces.push({
          text: part, conf: word.conf, tone: word.tone,
          x0: word.x0, x1: word.x1, y0: word.y0, y1: word.y1
        });
      });
    });
    var clean_ = pieces.map(clean).filter(Boolean);
    if (!clean_.length) return { text: '', shape: 'plain', unsure: [], dropped: 0 };

    var rowList = rows(clean_);
    var unsure = clean_.filter(function (w) { return w.conf < (opts.unsure || UNSURE); })
      .map(function (w) { return w.text; });

    if (isListShape(rowList)) {
      return {
        text: rowList.map(function (row) {
          return splitCodes(joinTimes(row.words.map(function (w) { return w.text; }))).join(' ');
        }).join('\n'),
        shape: 'list',
        unsure: unsure,
        dropped: 0
      };
    }

    var cells = fromCalendar(rowList);
    if (cells.length >= 3) {
      var trimmed = trimOtherMonths(cells);
      mendNextDayFlights(trimmed.cells);
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
    mendNextDayFlights: mendNextDayFlights,
    fixCode: fixCode,
    snapToKnownCode: snapToKnownCode,
    columnsOf: columnsOf,
    daysOfWeekRow: daysOfWeekRow,
    flightCandidates: flightCandidates,
    rows: rows,
    isDayRow: isDayRow,
    joinTimes: joinTimes,
    splitCodes: splitCodes,
    splitJunk: splitJunk,
    isKnownCode: isKnownCode
  };
});
