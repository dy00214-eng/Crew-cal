/**
 * 동료가 보내는 의견을 한 덩어리 글로 만든다.
 *
 * 서버가 없는 앱이라 보내는 길은 폰이 이미 갖고 있는 공유 시트(카톡 등)를 쓴다.
 * 여기서는 "무엇을 적어 보낼지"만 만들고, 실제로 넘기는 일은 app.js 가 한다.
 * 화면 정보와 앱 버전을 같이 붙여야 "저는 되는데요" 를 줄일 수 있다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.feedback = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KINDS = [
    { value: 'parse', label: '스케줄이 제대로 안 읽혀요', needsSchedule: true },
    { value: 'time', label: '편명 시각·구간이 틀려요', needsSchedule: false },
    { value: 'idea', label: '이런 게 있으면 좋겠어요', needsSchedule: false },
    { value: 'bug', label: '화면이 이상해요', needsSchedule: false },
    { value: 'etc', label: '그 밖에', needsSchedule: false }
  ];

  function kindLabel(value) {
    for (var i = 0; i < KINDS.length; i++) {
      if (KINDS[i].value === value) return KINDS[i].label;
    }
    return KINDS[KINDS.length - 1].label;
  }

  /** 종류에 따라 스케줄 원문을 같이 보내자고 권할지. */
  function suggestsSchedule(value) {
    for (var i = 0; i < KINDS.length; i++) {
      if (KINDS[i].value === value) return KINDS[i].needsSchedule;
    }
    return false;
  }

  function trim(text, limit) {
    var value = String(text == null ? '' : text).trim();
    if (!limit || value.length <= limit) return value;
    return value.slice(0, limit) + '\n…(' + (value.length - limit) + '자 줄임)';
  }

  /**
   * 보낼 글을 만든다.
   *
   *   compose({
   *     kind: 'parse',
   *     message: '7월 6일이 비어요',
   *     schedule: '크루넷에서 복사한 원문',   // 넣기로 했을 때만
   *     context: { version, ua, screen, entries, at }
   *   })
   *
   * 빈 칸은 알아서 빠지고, 없는 정보는 줄 자체를 넣지 않는다.
   */
  function compose(input) {
    var data = input || {};
    var context = data.context || {};
    var lines = ['[크루캘 의견]', ''];

    lines.push('종류: ' + kindLabel(data.kind));

    var message = trim(data.message, 2000);
    if (message) {
      lines.push('');
      lines.push(message);
    }

    var schedule = trim(data.schedule, 2000);
    if (schedule) {
      lines.push('');
      lines.push('--- 안 읽힌 스케줄 원문 ---');
      lines.push(schedule);
      lines.push('--- 여기까지 ---');
    }

    var facts = [];
    if (context.at) facts.push('보낸 때: ' + context.at);
    if (context.version) facts.push('버전: ' + context.version);
    if (context.entries != null) facts.push('저장된 일정: ' + context.entries + '건');
    if (context.screen) facts.push('화면: ' + context.screen);
    if (context.standalone) facts.push('홈 화면 앱으로 열었음');
    if (context.ua) facts.push('브라우저: ' + trim(context.ua, 200));
    if (facts.length) {
      lines.push('');
      lines.push('— 참고 —');
      facts.forEach(function (fact) { lines.push(fact); });
    }

    return lines.join('\n').trim() + '\n';
  }

  /**
   * 메일 앱을 열 주소를 만든다. 제목과 본문이 채워진 채로 열린다.
   * 본문이 너무 길면 메일 앱이 통째로 무시하는 폰이 있어 적당히 자른다.
   */
  function mailtoUrl(address, text, limit) {
    var max = limit || 3000;
    var body = String(text || '');
    if (body.length > max) body = body.slice(0, max) + '\n…(뒷부분 줄임)';
    return 'mailto:' + address +
      '?subject=' + encodeURIComponent('[크루캘] 의견') +
      '&body=' + encodeURIComponent(body);
  }

  /** 보낼 만한 내용인지. 고른 종류만 있고 아무 말도 없으면 받아도 알 수가 없다. */
  function isSendable(input) {
    var data = input || {};
    return !!(trim(data.message) || trim(data.schedule));
  }

  return {
    KINDS: KINDS,
    kindLabel: kindLabel,
    suggestsSchedule: suggestsSchedule,
    compose: compose,
    mailtoUrl: mailtoUrl,
    isSendable: isSendable
  };
});
