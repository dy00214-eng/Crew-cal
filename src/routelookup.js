/**
 * 3단계: 시드에도 대역에도 없는 편명을 Claude 에게 물어본다.
 *
 * 편명당 한 번만 묻는다. 성공하면 캐시에 넣어 다음부터는 2단계에서 바로 풀리고,
 * 못 찾은 것도 적어 두어 같은 달을 다시 열 때 되묻지 않는다(이레 뒤 재시도).
 * 한꺼번에 셋까지만 보내고, 조회하는 동안 달력은 막지 않는다.
 *
 * 실패는 조용히 넘어간다. 물어보다 잘못돼도 이미 있는 일정이 다치면 안 된다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./routes.js'));
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.routelookup = factory(root.CrewCal.routes);
  }
})(typeof self !== 'undefined' ? self : this, function (routes) {
  'use strict';

  var ENDPOINT = 'https://api.anthropic.com/v1/messages';
  var MODEL = 'claude-sonnet-4-6';
  var MAX_TOKENS = 1000;
  var CONCURRENCY = 3;

  var inFlight = {};        // 지금 묻고 있는 편명
  var asked = {};           // 이번에 이미 물어본 편명 (한 번만)
  var calls = 0;            // 실제로 보낸 요청 수 (검증용)

  function prompt(code) {
    return '대한항공 편명 ' + code + '의 출발 공항과 도착 공항을 웹 검색으로 확인해줘.\n' +
      'JSON만 출력하고 다른 말은 절대 붙이지 마. 마크다운 코드펜스도 쓰지 마.\n' +
      '형식: {"flight":"' + code + '","from":"ICN","to":"KIX","confidence":"high"}\n' +
      '확실하지 않으면 {"flight":"' + code + '","from":null,"to":null,"confidence":"unknown"} 을 출력해.';
  }

  function requestBody(code) {
    return {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      // 실제 노선을 검색해서 답하게 한다. 기억으로 지어내면 안 된다.
      tools: [{ type: 'web_search_20260209', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt(code) }]
    };
  }

  /**
   * 응답에서 글자만 골라 잇는다. content 는 여러 갈래가 섞여 오고
   * 검색 결과 덩어리가 앞에 붙기도 하므로 차례를 믿지 않는다.
   */
  function textOf(data) {
    var blocks = (data && data.content) || [];
    if (!blocks.length || typeof blocks.map !== 'function') return '';
    return blocks
      .filter(function (block) { return block && block.type === 'text' && typeof block.text === 'string'; })
      .map(function (block) { return block.text; })
      .join('\n')
      .trim();
  }

  /** 앞뒤 코드펜스를 떼고 JSON 으로 읽는다. 못 읽으면 null. */
  function readJson(text) {
    var body = String(text == null ? '' : text).trim();
    body = body.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    if (!body) return null;
    // 앞뒤에 말이 붙어 와도 중괄호 덩어리만 떼어 본다
    var first = body.indexOf('{');
    var last = body.lastIndexOf('}');
    if (first === -1 || last === -1 || last < first) return null;
    try {
      return JSON.parse(body.slice(first, last + 1));
    } catch (e) {
      return null;
    }
  }

  /** 확신이 high 일 때만 받는다. 그 밖에는 미등록으로 둔다. */
  function accept(answer, code) {
    if (!answer || typeof answer !== 'object') return null;
    if (String(answer.confidence || '').toLowerCase() !== 'high') return null;
    var from = String(answer.from || '').toUpperCase();
    var to = String(answer.to || '').toUpperCase();
    if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to) || from === to) return null;
    return { code: code, from: from, to: to };
  }

  function send(code) {
    var fetcher = (typeof fetch === 'function') ? fetch : null;
    if (!fetcher) return Promise.resolve(null);
    calls++;
    return fetcher(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
        // 브라우저에서 바로 부를 때 필요하다. 키는 아티팩트 환경이 채운다.
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(requestBody(code))
    }).then(function (res) {
      if (!res || !res.ok) return null;
      return res.json();
    }).then(function (data) {
      return accept(readJson(textOf(data)), code);
    });
  }

  /** 한 편명을 묻고 캐시에 넣는다. 무슨 일이 있어도 던지지 않는다. */
  function askOne(code) {
    if (inFlight[code]) return inFlight[code];
    var job = Promise.resolve()
      .then(function () { return send(code); })
      .then(function (found) {
        if (found) {
          routes.remember(found.code, found.from, found.to, 'lookup');
          return found;
        }
        routes.rememberFailure(code);
        return null;
      })
      .catch(function (err) {
        // 조용히 넘어간다. 미등록으로 두고 일정은 그대로 둔다.
        if (typeof console !== 'undefined' && console && console.warn) {
          console.warn('[crew-cal] ' + code + ' 노선 조회에 실패했습니다. 미등록으로 둡니다.', err);
        }
        routes.rememberFailure(code);
        return null;
      })
      .then(function (found) {
        delete inFlight[code];
        return found;
      });
    inFlight[code] = job;
    return job;
  }

  /**
   * 편명 목록을 훑는다. 중복을 지우고 셋씩 나눠 보낸다.
   * onResolved(code, found) 는 하나 끝날 때마다 불린다. 다 끝나면 채운 수를 준다.
   */
  function run(codes, onResolved) {
    var queue = [];
    var seen = {};
    (codes || []).forEach(function (raw) {
      var code = routes.normalize(raw);
      if (!code || seen[code] || asked[code]) return;
      seen[code] = true;
      asked[code] = true;
      queue.push(code);
    });
    if (!queue.length) return Promise.resolve({ filled: 0, asked: 0 });

    var filled = 0;
    var at = 0;
    function next() {
      if (at >= queue.length) return Promise.resolve();
      var code = queue[at++];
      return askOne(code).then(function (found) {
        if (found) filled++;
        if (typeof onResolved === 'function') {
          try { onResolved(code, found); } catch (e) { /* 화면 쪽 잘못이 조회를 멈추지 않게 */ }
        }
        return next();
      });
    }

    var lanes = [];
    for (var i = 0; i < Math.min(CONCURRENCY, queue.length); i++) lanes.push(next());
    return Promise.all(lanes).then(function () {
      return { filled: filled, asked: queue.length };
    });
  }

  /** 지금 묻고 있는 편명인지. 그 칸을 '조회 중' 으로 그리는 데 쓴다. */
  function pending(code) {
    return !!inFlight[routes.normalize(code)];
  }

  function pendingList() {
    return Object.keys(inFlight);
  }

  /** 검증용. 보낸 요청 수와 이번에 물어본 편명을 비운다. */
  function stats() {
    return { calls: calls, asked: Object.keys(asked).length };
  }

  function reset() {
    inFlight = {};
    asked = {};
    calls = 0;
  }

  return {
    ENDPOINT: ENDPOINT,
    MODEL: MODEL,
    CONCURRENCY: CONCURRENCY,
    run: run,
    askOne: askOne,
    pending: pending,
    pendingList: pendingList,
    stats: stats,
    reset: reset,
    textOf: textOf,
    readJson: readJson,
    accept: accept,
    requestBody: requestBody
  };
});
