/**
 * 한 달 스케줄을 그림 한 장으로 그린다. 카톡으로 보내거나 사진에 저장하려는 용도.
 *
 * 화면을 그대로 찍는 대신 캔버스에 다시 그린다. 스크롤·탭·버튼이 끼지 않고,
 * 폰 화면 크기와 상관없이 언제나 같은 크기로 나오기 때문이다.
 * 자리 계산과 칸에 넣을 글자는 캔버스 없이도 따로 검사할 수 있게 떼어 놨다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./calendar.js'), require('./airports.js'), require('./holidays.js'));
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.poster = factory(root.CrewCal.calendar, root.CrewCal.airports, root.CrewCal.holidays);
  }
})(typeof self !== 'undefined' ? self : this, function (calendar, airports, holidays) {
  'use strict';

  var WIDTH = 1080;
  var PAD = 28;
  var TITLE_H = 108;
  var HEAD_H = 46;
  var FOOT_H = 54;

  /** 칸 하나에 넣을 글줄. 달력 화면과 같은 규칙을 쓴다. */
  function cellLines(list, options) {
    var opts = options || {};
    var hideTimes = opts.hideTimes || {};
    var date = opts.date;
    var place = opts.place || null;
    var hasFlight = list.some(function (e) { return e.type === 'flight'; });
    var out = [];

    list.slice(0, 3).forEach(function (e) {
      var spot = e.type === 'flight'
        ? (airports ? airports.tripPlace(e) : null)
        : (e.category === 'layover' && !hasFlight ? place : null);

      var head = '';
      if (spot) {
        head = (e.type === 'flight' ? '✈️ ' : '') + (spot.flag || '');
      }
      var title = spot ? spot.city
        : (e.type === 'flight' ? '✈️ ' + e.code : (e.label || e.code));
      var time = hideTimes[date + '|' + e.code] ? '' : calendar.formatTimeRange(e);
      var sub = spot
        ? (e.type === 'flight' ? e.code : (e.label || ''))
        : (e.type === 'flight' ? '' : (e.code !== e.label ? e.code : ''));

      out.push({
        category: e.category || 'other',
        head: head,
        title: title,
        time: time ? time.replace(/​/g, '') : '',
        sub: sub
      });
    });

    if (list.length > 3) out.push({ category: 'other', head: '', title: '+' + (list.length - 3), time: '', sub: '' });
    return out;
  }

  /** 칸 자리. 주 수에 따라 높이가 달라지므로 전체 크기도 함께 준다. */
  function layout(year, month) {
    var slots = calendar.gridDates(year, month);
    var weeks = Math.ceil(slots.length / 7);
    var cellW = (WIDTH - PAD * 2) / 7;
    var cellH = 168;
    var height = TITLE_H + HEAD_H + cellH * weeks + FOOT_H;
    var cells = slots.map(function (slot, i) {
      return {
        date: slot.date,
        day: slot.day,
        outside: slot.outside,
        column: i % 7,
        x: PAD + (i % 7) * cellW,
        y: TITLE_H + HEAD_H + Math.floor(i / 7) * cellH,
        w: cellW,
        h: cellH
      };
    });
    return { width: WIDTH, height: height, weeks: weeks, cellW: cellW, cellH: cellH, cells: cells };
  }

  /** 화면에서 쓰는 색을 그대로 가져온다. 밝은/어두운 화면에 맞춰 따라간다. */
  function readColors(doc) {
    var style = (doc || document).defaultView.getComputedStyle((doc || document).documentElement);
    function token(name, fallback) {
      var value = style.getPropertyValue(name);
      return (value && value.trim()) || fallback;
    }
    return {
      bg: token('--bg', '#f7f5f1'),
      surface: token('--surface', '#ffffff'),
      text: token('--text', '#221f1a'),
      muted: token('--muted', '#6b6555'),
      faint: token('--faint', '#a9a293'),
      sub: token('--cal-sub', '#3b372f'),
      line: token('--line', '#d8d2c6'),
      sun: token('--sun', '#a2554a'),
      sat: token('--sat', '#33456e'),
      cat: {
        flight: token('--cat-flight', '#33456e'),
        layover: token('--cat-layover', '#33456e'),
        standby: token('--cat-standby', '#b18a3a'),
        training: token('--cat-training', '#a2603f'),
        vacation: token('--cat-vacation', '#6b7a45'),
        off: token('--cat-off', '#8d8067'),
        other: token('--cat-other', '#97907f'),
        unknown: token('--cat-unknown', '#8f3f3a')
      }
    };
  }

  var TINT = {
    flight: 0.13, layover: 0.13, standby: 0.17, training: 0.16,
    vacation: 0.18, off: 0.17, other: 0.10, unknown: 0.13
  };

  var FONT = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

  /**
   * 캔버스에 한 달을 그린다.
   *   draw(canvas, { year, month, entriesByDate, hideTimes, scale })
   * scale 을 2로 주면 선명한 그림이 나온다(폰 화면 그대로 확대해도 안 깨진다).
   */
  function draw(canvas, options) {
    var opts = options || {};
    var year = opts.year;
    var month = opts.month;
    var byDate = opts.entriesByDate || {};
    var hideTimes = opts.hideTimes || calendar.suppressedTimes(byDate);
    var places = calendar.tripPlaces(byDate);
    var scale = opts.scale || 2;
    var plan = layout(year, month);
    var color = opts.colors || readColors(canvas.ownerDocument);

    canvas.width = plan.width * scale;
    canvas.height = plan.height * scale;
    var ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.textBaseline = 'top';

    ctx.fillStyle = color.bg;
    ctx.fillRect(0, 0, plan.width, plan.height);

    // 머리말
    ctx.fillStyle = color.text;
    ctx.font = '700 40px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText(year + '년 ' + month + '월', PAD, 34);
    ctx.fillStyle = color.faint;
    ctx.font = '500 22px ' + FONT;
    ctx.textAlign = 'right';
    ctx.fillText('크루캘', plan.width - PAD, 48);

    // 요일
    ctx.textAlign = 'center';
    ctx.font = '600 20px ' + FONT;
    calendar.WEEKDAYS.forEach(function (w, i) {
      ctx.fillStyle = i === 0 ? color.sun : i === 6 ? color.sat : color.muted;
      ctx.fillText(w, PAD + plan.cellW * (i + 0.5), TITLE_H + 12);
    });

    plan.cells.forEach(function (cell) {
      var list = byDate[cell.date] || [];
      var kind = calendar.dayCategory(list);
      var holiday = holidays ? holidays.nameOf(cell.date) : null;

      if (kind) {
        ctx.save();
        ctx.globalAlpha = TINT[kind] == null ? 0.12 : TINT[kind];
        ctx.fillStyle = color.cat[kind] || color.cat.other;
        roundRect(ctx, cell.x + 2, cell.y + 2, cell.w - 4, cell.h - 4, 12);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.globalAlpha = cell.outside ? 0.45 : 1;
      ctx.textAlign = 'center';
      var middle = cell.x + cell.w / 2;

      ctx.font = '700 22px ' + FONT;
      ctx.fillStyle = holiday || cell.column === 0 ? color.sun : cell.column === 6 ? color.sat : color.text;
      ctx.fillText(String(cell.day), middle, cell.y + 10);

      var y = cell.y + 38;
      if (holiday) {
        ctx.font = '600 15px ' + FONT;
        ctx.fillStyle = color.sun;
        ctx.fillText(cut(ctx, holiday, cell.w - 10), middle, y);
        y += 19;
      }

      cellLines(list, { date: cell.date, hideTimes: hideTimes, place: places[cell.date] }).forEach(function (line) {
        if (line.head) {
          ctx.font = '400 18px ' + FONT;
          ctx.fillStyle = color.text;
          ctx.fillText(line.head, middle, y);
          y += 21;
        }
        if (line.title) {
          ctx.font = '700 19px ' + FONT;
          ctx.fillStyle = color.cat[line.category] || color.cat.other;
          y = wrap(ctx, line.title, middle, y, cell.w - 8, 21);
        }
        if (line.time) {
          ctx.font = '500 15px ' + FONT;
          ctx.fillStyle = color.sub;
          y = wrap(ctx, line.time, middle, y, cell.w - 8, 18);
        }
        if (line.sub) {
          ctx.font = '500 15px ' + FONT;
          ctx.fillStyle = color.muted;
          y = wrap(ctx, line.sub, middle, y, cell.w - 8, 18);
        }
        y += 4;
      });
      ctx.restore();
    });

    // 바닥말
    ctx.textAlign = 'center';
    ctx.font = '500 17px ' + FONT;
    ctx.fillStyle = color.faint;
    ctx.fillText('출·도착 시각은 한국 시각 기준 · 실제 로스터를 따르세요',
      plan.width / 2, plan.height - FOOT_H + 16);

    return plan;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /** 칸을 넘치면 줄을 바꿔 가며 그린다. 다음 줄이 시작할 y 를 준다. */
  function wrap(ctx, text, cx, y, maxWidth, lineHeight) {
    var words = String(text).split(' ');
    var line = '';
    for (var i = 0; i < words.length; i++) {
      var next = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(next).width > maxWidth && line) {
        ctx.fillText(line, cx, y);
        y += lineHeight;
        line = words[i];
      } else {
        line = next;
      }
    }
    if (line) {
      ctx.fillText(cut(ctx, line, maxWidth), cx, y);
      y += lineHeight;
    }
    return y;
  }

  /** 한 줄에 안 들어가면 뒤를 잘라 낸다. */
  function cut(ctx, text, maxWidth) {
    var value = String(text);
    if (ctx.measureText(value).width <= maxWidth) return value;
    while (value.length > 1 && ctx.measureText(value + '…').width > maxWidth) {
      value = value.slice(0, -1);
    }
    return value + '…';
  }

  function filename(year, month) {
    return 'crew-cal-' + year + '-' + (month < 10 ? '0' : '') + month + '.png';
  }

  return {
    WIDTH: WIDTH,
    layout: layout,
    cellLines: cellLines,
    readColors: readColors,
    draw: draw,
    filename: filename
  };
});
