/**
 * 스크린샷(이미지) 인식 모드 - 연동 자리만 잡아둔 어댑터.
 *
 * 실제 이미지 인식은 Claude API 를 붙여서 처리할 예정이다.
 * 브라우저에서 API 키를 직접 들고 있으면 그대로 노출되므로,
 * 키는 반드시 서버(프록시 엔드포인트)에 두고 이 모듈은 그 엔드포인트만 호출한다.
 *
 * 서버가 지켜야 할 규약
 *   POST {endpoint}
 *   요청  { image_base64, media_type, prompt, hint: { year, month } }
 *   응답  { text }        -> 텍스트 파서로 넘겨서 처리
 *      또는 { entries: [{ date, code, route?, start?, end? }] }
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

  // 나중에 Claude API 로 보낼 프롬프트. 응답을 텍스트 붙여넣기 파서가 그대로 먹을 수 있는
  // "날짜 + 코드" 한 줄 형식으로 강제한다.
  var EXTRACTION_PROMPT = [
    '이 이미지는 항공사 승무원 스케줄표입니다.',
    '표에 적힌 날짜와 근무 코드를 빠짐없이 읽어 아래 형식으로만 출력하세요.',
    '',
    '  YYYY-MM-DD<탭>코드 [코드 ...]',
    '',
    '규칙:',
    '- 한 줄에 하루씩, 날짜 오름차순으로 출력합니다.',
    '- 코드는 이미지에 적힌 그대로 대문자로 씁니다(KE0035, LO, ATDO, STBY 등).',
    '- 구간과 시각이 보이면 코드 뒤에 ICN/JFK 1030-1420 형태로 덧붙입니다.',
    '- 설명, 머리말, 코드블록 없이 데이터 줄만 출력합니다.',
    '- 읽을 수 없는 칸은 그 줄을 생략합니다.'
  ].join('\n');

  var MAX_BYTES = 5 * 1024 * 1024;
  var ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

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
    } catch (e) { /* 무시하고 기본값 */ }
    return { endpoint: '', model: DEFAULT_MODEL };
  }

  function saveConfig(config) {
    var next = {
      endpoint: (config && config.endpoint ? String(config.endpoint) : '').trim(),
      model: (config && config.model ? String(config.model) : DEFAULT_MODEL).trim()
    };
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
    } catch (e) { /* 저장 실패해도 이번 세션에는 반환값으로 동작 */ }
    return next;
  }

  function isConfigured() {
    return !!loadConfig().endpoint;
  }

  function validateFile(file) {
    if (!file) return '이미지를 선택하세요.';
    if (ALLOWED_TYPES.indexOf(file.type) === -1) return 'PNG, JPG, WEBP, GIF 이미지만 올릴 수 있습니다.';
    if (file.size > MAX_BYTES) return '이미지가 너무 큽니다. 5MB 이하로 올려주세요.';
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

  /**
   * 서버(프록시)에서 Claude Messages API 로 그대로 넘길 수 있는 요청 본문 형태.
   * 지금은 참고용이자 서버 구현 규약이다.
   */
  function buildClaudeRequest(base64, mediaType, options) {
    options = options || {};
    return {
      model: options.model || DEFAULT_MODEL,
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: options.prompt || EXTRACTION_PROMPT }
        ]
      }]
    };
  }

  /**
   * 스크린샷 분석. 엔드포인트가 설정돼 있지 않으면 NOT_CONFIGURED 로 거절한다.
   * 성공하면 { text } 또는 { entries } 를 돌려주고, 호출부에서 미리보기로 넘긴다.
   */
  function analyze(file, options) {
    options = options || {};
    var config = loadConfig();

    var invalid = validateFile(file);
    if (invalid) return Promise.reject(new Error(invalid));

    if (!config.endpoint) {
      var err = new Error('이미지 인식 서버가 아직 연결되지 않았습니다. (다음 단계에서 Claude API 연동 예정)');
      err.code = 'NOT_CONFIGURED';
      return Promise.reject(err);
    }

    return fileToBase64(file).then(function (image) {
      return fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: image.base64,
          media_type: image.mediaType,
          prompt: options.prompt || EXTRACTION_PROMPT,
          model: config.model,
          hint: { year: options.year || null, month: options.month || null }
        })
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

  return {
    CONFIG_KEY: CONFIG_KEY,
    DEFAULT_MODEL: DEFAULT_MODEL,
    EXTRACTION_PROMPT: EXTRACTION_PROMPT,
    loadConfig: loadConfig,
    saveConfig: saveConfig,
    isConfigured: isConfigured,
    validateFile: validateFile,
    fileToBase64: fileToBase64,
    buildClaudeRequest: buildClaudeRequest,
    analyze: analyze
  };
});
