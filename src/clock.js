/**
 * 시간대 계산. 체류지가 지금 몇 시인지, 한국과 몇 시간 차이인지 알아낸다.
 *
 * 서머타임은 나라마다 시작·끝이 다르고 해마다 바뀌므로 직접 세지 않는다.
 * 브라우저가 갖고 있는 시간대 자료(IANA 이름)에 맡기고, 여기서는 그 결과를 읽는다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.clock = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KOREA = 'Asia/Seoul';

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function partsIn(zone, when) {
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    var out = {};
    fmt.formatToParts(when).forEach(function (part) { out[part.type] = part.value; });
    return out;
  }

  /**
   * 그 시간대가 UTC 에서 몇 분 앞선지. 서울이면 540.
   * 그 시간대의 벽시계를 UTC 로 읽었다 치고 실제 시각과의 차이를 본다.
   */
  function offsetMinutes(zone, when) {
    var at = when || new Date();
    try {
      var p = partsIn(zone, at);
      var asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, (+p.hour) % 24, +p.minute, +p.second);
      return Math.round((asUtc - at.getTime()) / 60000);
    } catch (e) {
      return null;   // 시간대를 모르는 낡은 브라우저
    }
  }

  /** 그 시간대의 지금. { time: '09:14', hour, minute, month, day, weekday: '수' } */
  function now(zone, when) {
    var at = when || new Date();
    try {
      var p = partsIn(zone, at);
      var hour = (+p.hour) % 24;
      var date = new Date(Date.UTC(+p.year, +p.month - 1, +p.day));
      return {
        time: pad2(hour) + ':' + pad2(+p.minute),
        hour: hour,
        minute: +p.minute,
        year: +p.year,
        month: +p.month,
        day: +p.day,
        weekday: ['일', '월', '화', '수', '목', '금', '토'][date.getUTCDay()]
      };
    } catch (e) {
      return null;
    }
  }

  /** 한국과의 시차(분). 현지가 앞서면 양수. */
  function gapMinutes(zone, when) {
    var there = offsetMinutes(zone, when);
    var here = offsetMinutes(KOREA, when);
    if (there == null || here == null) return null;
    return there - here;
  }

  /** 시차를 읽을 수 있게. 30분 단위 시차(인도·네팔 등)도 담아낸다. */
  function describeGap(minutes) {
    if (minutes == null) return '';
    if (minutes === 0) return '한국과 시차 없음';
    var ahead = minutes > 0;
    var abs = Math.abs(minutes);
    var hours = Math.floor(abs / 60);
    var rest = abs % 60;
    var span = hours ? hours + '시간' : '';
    if (rest) span += (span ? ' ' : '') + rest + '분';
    return '한국보다 ' + span + ' ' + (ahead ? '빠름' : '느림');
  }

  /** 하루가 어긋났는지: 현지가 한국보다 어제면 -1, 내일이면 +1. */
  function dayShift(zone, when) {
    var at = when || new Date();
    var there = now(zone, at);
    var here = now(KOREA, at);
    if (!there || !here) return 0;
    var a = Date.UTC(there.year, there.month - 1, there.day);
    var b = Date.UTC(here.year, here.month - 1, here.day);
    return Math.round((a - b) / 86400000);
  }

  return {
    KOREA: KOREA,
    offsetMinutes: offsetMinutes,
    now: now,
    gapMinutes: gapMinutes,
    describeGap: describeGap,
    dayShift: dayShift
  };
});
