/**
 * 스크린샷(이미지)에서 스케줄을 읽어오는 어댑터.
 *
 * 두 가지 경로가 있고, 쓸 수 있는 쪽을 자동으로 고른다.
 *
 *  1. sample   - 아티팩트로 열렸을 때. 뷰어의 Claude 가 이미지를 직접 읽는다.
 *                서버도 API 키도 필요 없고, 첫 호출 때 뷰어에게 사용 동의를 받는다.
 *  2. endpoint - 직접 띄워 쓸 때. 아래 규약을 지키는 서버 주소를 설정에 넣어두면 그쪽으로 보낸다.
 *
 *        POST {endpoint}
 *        요청  { image_base64, media_type, prompt, model, hint: { year, month } }
 *        응답  { text }  또는  { entries: [{ date, code, route?, start?, end?, endOffset? }] }
 *
 *      브라우저에 API 키를 두면 그대로 노출되므로, 키는 서버에 두고 여기에는 주소만 넣는다.
 *
 * 어느 쪽이든 결과는 텍스트 붙여넣기와 같은 미리보기 -> 확인 절차를 그대로 탄다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.vision = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CONFIG_KEY = 'crew-cal.vision.v1';
  var DEFAULT_MODEL = 'claude-opus-5';
  var MAX_BYTES = 5 * 1024 * 1024;
  var ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

  /**
   * 이미지에서 읽은 내용을 텍스트 파서가 그대로 먹을 수 있는 형태로 받아온다.
   * 달력 칸 형태든 한 줄에 하루씩인 표 형태든 같은 형식으로 돌려달라고 못박는다.
   */
  function buildPrompt(hint) {
    var year = hint && hint.year;
    var month = hint && hint.month;
    return [
      '이 이미지는 항공사 승무원의 스케줄입니다.',
      '달력 형태(칸마다 날짜와 근무가 적힌 월간 표)일 수도 있고, 한 줄에 하루씩인 목록일 수도 있습니다.',
      '읽은 내용을 아래 형식의 데이터 줄로만 출력하세요.',
      '',
      'YYYY-MM-DD<탭>코드 [코드 ...] [출발공항/도착공항] [출발시각-도착시각]',
      '',
      '규칙:',
      '- 하루에 한 줄, 날짜 오름차순으로 출력합니다.',
      '- 근무가 없는(빈) 날은 줄을 만들지 않습니다.',
      '- 코드는 이미지에 적힌 그대로 대문자로 씁니다. 예: KE0035, LO, ATDO, STBY, DO, VAC, GT',
      '- 한 날짜에 근무가 여러 개면 한 줄에 이어 씁니다.',
      year && month
        ? '- 이미지에 연도나 월이 보이지 않으면 ' + year + '년 ' + month + '월로 봅니다.'
        : '- 이미지에 보이는 연도와 월을 그대로 씁니다.',
      '- 시각은 24시간 HHMM-HHMM 으로 씁니다. 도착이 다음 날이면 뒤에 +1 을 붙입니다. 예: 2350-0620+1',
      '- 구간이나 시각이 안 보이면 그 부분은 생략합니다.',
      '- 글자가 흐려 확실하지 않은 칸은 그 줄을 생략합니다.',
      '- 설명, 머리말, 코드블록, 빈 줄 없이 데이터 줄만 출력합니다.',
      '',
      '출력 예:',
      '2026-09-01\tKE0035\tICN/JFK\t1030-1420',
      '2026-09-02\tLO',
      '2026-09-03\tATDO'
    ].filter(Boolean).join('\n');
  }

  /* ---------------- 설정 (endpoint 경로에서만 쓴다) ---------------- */

  function loadConfig() {
    try {
      var raw = localStorage.getItem(CONFIG_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        return {
          endpoint: parsed.endpoint || '',
          model: parsed.model || DEFAULT_MODEL
        };
      }
    } catch (e) { /* 저장소를 못 읽으면 기본값 */ }
    return { endpoint: '', model: DEFAULT_MODEL };
  }

  function saveConfig(config) {
    var next = {
      endpoint: (config && config.endpoint ? String(config.endpoint) : '').trim(),
      model: (config && config.model ? String(config.model) : DEFAULT_MODEL).trim()
    };
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
    } catch (e) { /* 저장에 실패해도 이번 세션에는 반환값으로 동작 */ }
    return next;
  }

  /* ---------------- 경로 고르기 ---------------- */

  var samplePromise = null;

  /**
   * 아티팩트 뷰어의 Claude 를 쓸 수 있는지 한 번만 확인한다.
   * 못 쓰면 왜 못 쓰는지(reason)를 함께 돌려줘서 화면에서 원인을 알 수 있게 한다.
   *   no-runtime : 아티팩트 뷰어가 아님 (파일이나 다른 서버로 연 화면)
   *   no-sample  : 뷰어가 Claude 호출을 지원하지 않거나 허용되지 않음
   *   no-images  : 호출은 되지만 이 뷰어에서는 이미지를 보낼 수 없음
   */
  function probeSample() {
    if (samplePromise) return samplePromise;

    if (typeof window === 'undefined' || !window.claude || typeof window.claude.use !== 'function') {
      samplePromise = Promise.resolve({ backend: null, reason: 'no-runtime' });
      return samplePromise;
    }

    samplePromise = window.claude.use('sample').then(function (sample) {
      if (!sample || typeof sample.limits !== 'function') {
        return { backend: null, reason: 'no-sample' };
      }
      return sample.limits().then(function (limits) {
        if (!limits || !limits.images) return { backend: null, reason: 'no-images' };
        return { backend: { kind: 'sample', sample: sample, images: limits.images }, reason: null };
      }, function () {
        return { backend: null, reason: 'no-images' };
      });
    }, function () {
      return { backend: null, reason: 'no-sample' };
    });

    return samplePromise;
  }

  /** 지금 쓸 수 있는 경로. { kind: 'sample' | 'endpoint' | 'none', reason? } */
  function resolveBackend() {
    return probeSample().then(function (probe) {
      if (probe.backend) return probe.backend;
      var config = loadConfig();
      if (config.endpoint) return { kind: 'endpoint', endpoint: config.endpoint, model: config.model };
      return { kind: 'none', reason: probe.reason };
    });
  }

  /* ---------------- 파일 ---------------- */

  function validateFile(file, backend) {
    if (!file) return '이미지를 선택하세요.';

    var types = ALLOWED_TYPES;
    var maxBytes = MAX_BYTES;
    if (backend && backend.kind === 'sample') {
      types = backend.images.mediaTypes || types;
      maxBytes = backend.images.maxInputBytes || maxBytes;
    }

    if (types.indexOf(file.type) === -1) {
      return types.map(function (t) { return t.replace('image/', '').toUpperCase(); }).join(', ') +
        ' 이미지만 올릴 수 있습니다.';
    }
    if (file.size > maxBytes) {
      return '이미지가 너무 큽니다. ' + Math.floor(maxBytes / (1024 * 1024)) + 'MB 이하로 올려주세요.';
    }
    return null;
  }

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('이미지를 읽지 못했습니다.')); };
      reader.onload = function () {
        var result = String(reader.result || '');
        var comma = result.indexOf(',');
        resolve({
          dataUrl: result,
          base64: comma === -1 ? result : result.slice(comma + 1),
          mediaType: file.type
        });
      };
      reader.readAsDataURL(file);
    });
  }

  /** 서버에서 Claude Messages API 로 그대로 넘길 수 있는 요청 본문 (endpoint 구현 참고용) */
  function buildClaudeRequest(base64, mediaType, options) {
    options = options || {};
    return {
      model: options.model || DEFAULT_MODEL,
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: options.prompt || buildPrompt(options.hint) }
        ]
      }]
    };
  }

  /* ---------------- 실행 ---------------- */

  var SAMPLE_MESSAGES = {
    cancelled: null,
    not_granted: '이미지 인식 사용을 허용해야 읽을 수 있습니다. 다시 눌러 허용해 주세요.',
    sampling_disabled: '이 계정에서는 Claude 이미지 인식을 쓸 수 없습니다.',
    not_declared: '이 화면에서는 이미지 인식을 쓸 수 없습니다.',
    capability_disabled: '이 화면에서는 이미지 인식을 쓸 수 없습니다.',
    capability_removed: '이 화면에서는 이미지 인식을 쓸 수 없습니다.',
    images_unavailable: '이 화면에서는 이미지를 보낼 수 없습니다. 텍스트 붙여넣기를 써주세요.',
    image_rejected: '이미지를 읽지 못했습니다. 다른 파일이나 더 작은 화면으로 시도해 보세요.',
    rate_limited: '요청이 몰렸습니다. 잠시 후 다시 눌러주세요.',
    session_expired: '로그인이 만료됐습니다. 다시 로그인한 뒤 시도해 주세요.',
    refused: '이 이미지는 읽지 않았습니다. 스케줄 화면인지 확인하고 다시 올려주세요.',
    empty_completion: '이미지에서 읽어낸 내용이 없습니다. 더 또렷하게 캡처해 보세요.',
    invalid_request: '요청을 만들지 못했습니다.',
    transform_error: '요청을 만들지 못했습니다.',
    prompt_too_large: '요청이 너무 큽니다.',
    upstream_error: '일시적인 오류입니다. 다시 시도해 주세요.'
  };

  function sampleError(err) {
    var code = (err && err.code) || 'upstream_error';
    var message = SAMPLE_MESSAGES.hasOwnProperty(code) ? SAMPLE_MESSAGES[code] : SAMPLE_MESSAGES.upstream_error;
    if (message === null) {
      var cancelled = new Error('중지했습니다.');
      cancelled.code = 'CANCELLED';
      return cancelled;
    }
    var out = new Error(message);
    out.code = code;
    return out;
  }

  function analyzeWithSample(backend, file, options) {
    var callOptions = {
      images: file,
      modelTier: 'default'
    };
    if (options.signal) callOptions.signal = options.signal;
    if (options.onText) callOptions.onText = options.onText;

    return backend.sample(buildPrompt(options), callOptions).then(function (result) {
      var text = String((result && result.text) || '').trim();
      if (!text) {
        throw new Error('이미지에서 일정을 읽지 못했습니다. 더 또렷한 화면을 올려보세요.');
      }
      return { text: text, entries: null };
    }, function (err) {
      throw sampleError(err);
    });
  }

  function analyzeWithEndpoint(backend, file, options) {
    return fileToBase64(file).then(function (image) {
      return fetch(backend.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: image.base64,
          media_type: image.mediaType,
          prompt: buildPrompt(options),
          model: backend.model,
          hint: { year: options.year || null, month: options.month || null }
        }),
        signal: options.signal
      });
    }).then(function (res) {
      if (!res.ok) throw new Error('이미지 인식 요청이 실패했습니다. (HTTP ' + res.status + ')');
      return res.json();
    }).then(function (data) {
      if (data && typeof data.text === 'string') return { text: data.text, entries: null };
      if (data && Array.isArray(data.entries)) return { text: null, entries: data.entries };
      throw new Error('서버 응답 형식을 이해하지 못했습니다. text 또는 entries 가 필요합니다.');
    });
  }

  /**
   * 스크린샷 한 장을 읽는다.
   * options: { year, month, signal, onText }
   * 성공하면 { text } 또는 { entries } 를 돌려주고, 호출부가 미리보기로 넘긴다.
   */
  function analyze(file, options) {
    options = options || {};

    return resolveBackend().then(function (backend) {
      if (backend.kind === 'none') {
        var err = new Error('이미지 인식을 쓸 수 없는 화면입니다. 텍스트 붙여넣기를 쓰거나, 설정에 인식 서버 주소를 넣어주세요.');
        err.code = 'NOT_CONFIGURED';
        throw err;
      }

      var invalid = validateFile(file, backend);
      if (invalid) throw new Error(invalid);

      return backend.kind === 'sample'
        ? analyzeWithSample(backend, file, options)
        : analyzeWithEndpoint(backend, file, options);
    });
  }

  return {
    CONFIG_KEY: CONFIG_KEY,
    DEFAULT_MODEL: DEFAULT_MODEL,
    buildPrompt: buildPrompt,
    loadConfig: loadConfig,
    saveConfig: saveConfig,
    resolveBackend: resolveBackend,
    validateFile: validateFile,
    fileToBase64: fileToBase64,
    buildClaudeRequest: buildClaudeRequest,
    analyze: analyze
  };
});
