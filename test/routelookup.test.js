const test = require('node:test');
const assert = require('node:assert');
const lookup = require('../src/routelookup.js');
const routes = require('../src/routes.js');

/** fetch 를 가로채 답을 꾸며 준다. 부른 횟수를 센다. */
function stubFetch(answers) {
  const seen = [];
  global.fetch = (url, opts) => {
    const body = JSON.parse(opts.body);
    const code = /KE\d{4}/.exec(body.messages[0].content)[0];
    seen.push(code);
    const answer = answers[code];
    if (answer === 'error') return Promise.reject(new Error('네트워크 끊김'));
    if (answer === 'http500') return Promise.resolve({ ok: false, status: 500 });
    return Promise.resolve({ ok: true, json: () => Promise.resolve(answer) });
  };
  return seen;
}

/** 검색 결과 덩어리가 섞이고 코드펜스가 붙은, 실제에 가까운 응답 */
function reply(code, from, to, confidence) {
  return {
    content: [
      { type: 'web_search_tool_result', content: [{ type: 'web_search_result', url: 'https://x' }] },
      { type: 'text', text: '```json\n{"flight":"' + code + '","from":' +
        (from ? '"' + from + '"' : 'null') + ',"to":' + (to ? '"' + to + '"' : 'null') +
        ',"confidence":"' + confidence + '"}\n```' }
    ]
  };
}

test.beforeEach(() => { lookup.reset(); routes.forgetAll(); });
test.afterEach(() => { delete global.fetch; });

test('검색을 켜고 최신 도구 판을 쓴다', () => {
  const body = lookup.requestBody('KE0727');
  assert.strictEqual(body.model, 'claude-sonnet-4-6');
  assert.strictEqual(body.max_tokens, 1000);
  assert.deepStrictEqual(body.tools, [{ type: 'web_search_20260209', name: 'web_search' }]);
  assert.match(body.messages[0].content, /JSON만 출력/);
});

test('text 블록만 골라 잇고 코드펜스를 떼어 낸다', () => {
  const text = lookup.textOf(reply('KE0727', 'ICN', 'KIX', 'high'));
  assert.deepStrictEqual(lookup.readJson(text),
    { flight: 'KE0727', from: 'ICN', to: 'KIX', confidence: 'high' });

  // content 가 없거나 모양이 달라도 터지지 않는다
  assert.strictEqual(lookup.textOf(null), '');
  assert.strictEqual(lookup.textOf({ content: 'nope' }), '');
  assert.strictEqual(lookup.readJson('그냥 말'), null);
});

test('confidence 가 high 가 아니면 저장하지 않는다', async () => {
  const seen = stubFetch({
    KE5901: reply('KE5901', 'ICN', 'PVG', 'high'),
    KE5903: reply('KE5903', null, null, 'unknown')
  });
  const out = await lookup.run(['KE5901', 'KE5903']);
  assert.strictEqual(out.filled, 1);
  assert.deepStrictEqual(seen.sort(), ['KE5901', 'KE5903']);
  assert.strictEqual(routes.loadCache().KE5901.to, 'PVG');
  assert.strictEqual(routes.loadCache().KE5903.fail, true, '못 찾은 것도 적어 둔다');
});

test('조회가 실패해도 조용히 넘어간다', async () => {
  stubFetch({ KE5901: 'error', KE5903: 'http500' });
  const warned = [];
  const real = console.warn;
  console.warn = (m) => warned.push(String(m));
  let out;
  try {
    out = await lookup.run(['KE5901', 'KE5903']);
  } finally { console.warn = real; }
  assert.strictEqual(out.filled, 0);
  assert.strictEqual(routes.loadCache().KE5901.fail, true);
  assert.strictEqual(routes.loadCache().KE5903.fail, true);
});

test('같은 편명은 한 번만 묻고, 중복은 미리 지운다', async () => {
  const seen = stubFetch({ KE5901: reply('KE5901', 'ICN', 'PVG', 'high') });
  await lookup.run(['KE5901', 'KE5901', 'ke5901']);
  assert.deepStrictEqual(seen, ['KE5901']);

  await lookup.run(['KE5901']);
  assert.deepStrictEqual(seen, ['KE5901'], '이번 판에서는 두 번 묻지 않는다');
  assert.strictEqual(lookup.stats().calls, 1);
});

test('캐시가 차면 다음 달에는 아예 물어볼 일이 없다', async () => {
  const seen = stubFetch({ KE5901: reply('KE5901', 'ICN', 'PVG', 'high') });
  await lookup.run(['KE5901']);
  lookup.reset();

  // 2단계에서 바로 풀리므로 apply 가 내주는 목록이 비어 있다
  const store = require('../src/store.js');
  const byDate = { '2026-02-01': [store.decorate({ date: '2026-02-01', code: 'KE5901' })] };
  assert.deepStrictEqual(routes.apply(byDate), []);
  const out = await lookup.run(routes.apply(byDate));
  assert.strictEqual(out.asked, 0);
  assert.deepStrictEqual(seen, ['KE5901'], 'API 를 더 부르지 않는다');
});

test('한꺼번에 셋까지만 보낸다', async () => {
  let live = 0;
  let peak = 0;
  global.fetch = () => {
    live++; peak = Math.max(peak, live);
    return new Promise((done) => setTimeout(() => {
      live--;
      done({ ok: true, json: () => Promise.resolve(reply('KE5901', 'ICN', 'PVG', 'high')) });
    }, 5));
  };
  await lookup.run(['KE5901', 'KE5903', 'KE5905', 'KE5907', 'KE5909', 'KE5911']);
  assert.strictEqual(peak, 3, '동시에 셋: ' + peak);
});
