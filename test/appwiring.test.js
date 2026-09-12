const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

/**
 * app.js 가 부르는 함수가 그 모듈에 실제로 있는지 본다.
 * store.enrich 를 지우고도 부르는 데를 남겨, 폰에서 '이미지에서 일정 읽기' 가
 * 통째로 죽은 일이 있었다. 브라우저에서만 드러나던 것을 여기서 잡는다.
 */
const MODULES = {
  store: require('../src/store.js'),
  calendar: require('../src/calendar.js'),
  parser: require('../src/parser.js'),
  codes: require('../src/codes.js'),
  airports: require('../src/airports.js'),
  routes: require('../src/routes.js'),
  routelookup: require('../src/routelookup.js'),
  verify: require('../src/verify.js'),
  crewnet: require('../src/crewnet.js'),
  resolve: require('../src/resolve.js'),
  ics: require('../src/ics.js'),
  poster: require('../src/poster.js'),
  holidays: require('../src/holidays.js'),
  clock: require('../src/clock.js'),
  feedback: require('../src/feedback.js'),
  ocrlayout: require('../src/ocrlayout.js')
};

function callsIn(source) {
  const names = Object.keys(MODULES).join('|');
  // 부르는 자리(뒤에 여는 괄호가 오는 것)만 본다. require('./airports.js') 같은
  // 글자나 같은 이름의 지역 변수에 걸리지 않도록.
  const re = new RegExp("\\b(" + names + ")\\.([A-Za-z_$][\\w$]*)\\s*\\(", 'g');
  const out = [];
  let m;
  while ((m = re.exec(source))) {
    if (source[m.index - 1] === "'" || source[m.index - 1] === '"' || source[m.index - 1] === '/') continue;
    out.push({ module: m[1], member: m[2], at: m.index });
  }
  return out;
}

function lineOf(source, index) {
  return source.slice(0, index).split('\n').length;
}

for (const file of ['app.js', 'journeys.js', 'mapdraw.js', 'vision.js']) {
  const full = path.join(__dirname, '..', 'src', file);
  if (!fs.existsSync(full)) continue;
  test(`${file} 가 부르는 것이 모두 실제로 있다`, () => {
    const source = fs.readFileSync(full, 'utf8');
    const missing = callsIn(source)
      .filter((c) => !(c.member in MODULES[c.module]))
      .map((c) => `${file}:${lineOf(source, c.at)} ${c.module}.${c.member}`);
    assert.deepStrictEqual(missing, [], '없는 함수를 부르고 있습니다:\n  ' + missing.join('\n  '));
  });
}

test('app.js 가 쓰는 DOM 요소가 index.html 에 있다', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const ids = new Set();
  let m;
  const re = /\$\('([A-Za-z][\w-]*)'\)/g;
  while ((m = re.exec(app))) ids.add(m[1]);
  const missing = [...ids].filter((id) => !html.includes('id="' + id + '"')).sort();
  assert.deepStrictEqual(missing, [], 'index.html 에 없는 요소를 찾고 있습니다: ' + missing.join(', '));
});

test('기준 연·월을 고치면 읽어 온 날짜도 그 달로 옮긴다', () => {
  // 1월 캡처가 9월로 읽혔을 때 연·월만 고쳐서는 아무것도 안 바뀌던 것.
  // app.js 안의 함수라 같은 규칙을 여기서 다시 확인한다.
  const retarget = (text, base) => {
    if (!/^\d{4}-\d{2}$/.test(base || '')) return { text, changed: false };
    const months = {};
    String(text || '').replace(/\b(\d{4}-\d{2})-\d{2}\b/g, (all, ym) => { months[ym] = true; return all; });
    const list = Object.keys(months);
    if (list.length !== 1 || list[0] === base) return { text, changed: false };
    return { text: text.replace(new RegExp('\\b' + list[0] + '-', 'g'), base + '-'), changed: true, from: list[0] };
  };
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8');
  assert.ok(src.includes('function retargetMonth'), 'app.js 에 retargetMonth 가 있다');

  const out = retarget('2026-09-04\tLO\n2026-09-05\tKE0658', '2026-01');
  assert.strictEqual(out.changed, true);
  assert.strictEqual(out.text.split('\n')[0], '2026-01-04\tLO');
  // 여러 달이 섞였으면 건드리지 않는다
  assert.strictEqual(retarget('2026-09-04\tLO\n2026-10-05\tDO', '2026-01').changed, false);
  assert.strictEqual(retarget('2026-01-04\tLO', '2026-01').changed, false);
});

test('미리보기 버튼이 클릭 이벤트를 인자로 넘기지 않는다', () => {
  // addEventListener('click', runParse) 로 두면 이벤트 객체가 keepGaps 로 넘어가
  // 읽기 실패 경고가 지워지지 않는다.
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8');
  assert.ok(!/addEventListener\('click', runParse\)/.test(src),
    "runParse 를 그대로 넘기면 안 된다 — function () { runParse(); } 로 감쌀 것");
});
