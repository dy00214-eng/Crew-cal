const test = require('node:test');
const assert = require('node:assert');
const calendar = require('../src/calendar.js');
const store = require('../src/store.js');

/** 달력을 그려 보기 위한 아주 작은 문서 흉내. 필요한 것만 있다. */
function element(tag) {
  const el = {
    tag: tag,
    className: '',
    textContent: '',
    title: '',
    tabIndex: 0,
    children: [],
    attrs: {},
    set innerHTML(v) { if (!v) el.children.length = 0; },
    get innerHTML() { return ''; },
    appendChild(child) { el.children.push(child); return child; },
    setAttribute(k, v) { el.attrs[k] = String(v); },
    getAttribute(k) { return el.attrs[k]; },
    addEventListener() {},
    classList: {
      add(name) { if (!el.className.split(' ').includes(name)) el.className = (el.className + ' ' + name).trim(); },
      contains(name) { return el.className.split(' ').includes(name); }
    }
  };
  return el;
}

global.document = { createElement: element };

/** 그린 결과를 훑어 조건에 맞는 요소를 모은다. */
function walk(node, out) {
  out = out || [];
  out.push(node);
  node.children.forEach((c) => walk(c, out));
  return out;
}

function draw(options) {
  const container = element('div');
  calendar.render(container, Object.assign({ year: 2026, month: 4 }, options));
  const cells = walk(container).filter((n) => n.classList.contains('cal-cell'));
  const byDate = {};
  cells.forEach((c) => { byDate[c.getAttribute('data-date')] = c; });
  return byDate;
}

function textOf(cell) {
  return walk(cell).map((n) => n.textContent).filter(Boolean).join(' ');
}

test('코드가 없는 이 달의 날도 칸을 그리고 휴무로 적는다', () => {
  const cells = draw({ entriesByDate: {} });
  const day19 = cells['2026-04-19'];
  assert.ok(day19.classList.contains('in-month'), '이 달 칸임을 표시한다');
  assert.ok(day19.classList.contains('assumed'), '넘겨짚은 칸임을 표시한다');
  assert.ok(day19.classList.contains('day-off'), '쉬는 날 색으로 칠한다');
  assert.ok(textOf(day19).includes('휴무'), textOf(day19));

  // 앞뒤 달 날짜는 흐린 채로, 휴무를 지어 넣지 않는다
  const before = cells['2026-03-31'];
  assert.ok(before.classList.contains('outside'));
  assert.ok(!before.classList.contains('in-month'));
  assert.ok(!textOf(before).includes('휴무'), textOf(before));
});

test('코드가 있는 날은 넘겨짚지 않는다', () => {
  const cells = draw({ entriesByDate: { '2026-04-19': [store.decorate({ date: '2026-04-19', code: 'STBY' })] } });
  const cell = cells['2026-04-19'];
  assert.ok(cell.classList.contains('in-month'));
  assert.ok(!cell.classList.contains('assumed'));
  assert.ok(textOf(cell).includes('대기'), textOf(cell));
});

test('설정을 끄면 빈 날을 휴무로 적지 않는다', () => {
  const cells = draw({ entriesByDate: {}, assumeOff: false });
  const cell = cells['2026-04-19'];
  assert.ok(cell.classList.contains('in-month'), '칸은 그대로 그린다');
  assert.ok(!cell.classList.contains('assumed'));
  assert.ok(!textOf(cell).includes('휴무'), textOf(cell));
});

test('구간을 모르는 비행에는 노선 미등록 표를 붙인다', () => {
  const known = store.decorate({ date: '2026-04-24', code: 'KE2179', route: 'ICN/KOJ' });
  const unknown = store.decorate({ date: '2026-04-25', code: 'KE9994' });
  const cells = draw({ entriesByDate: { '2026-04-24': [known], '2026-04-25': [unknown] } });

  assert.ok(!textOf(cells['2026-04-24']).includes('노선 미등록'), textOf(cells['2026-04-24']));
  assert.ok(textOf(cells['2026-04-25']).includes('노선 미등록'), textOf(cells['2026-04-25']));
  assert.ok(cells['2026-04-25'].classList.contains('needs-route'));
});

test('가고시마 KE2179 / KE2180 은 기본 시간표에 있다', () => {
  const schedule = require('../src/schedule.js');
  assert.strictEqual(schedule.lookup('KE2179').route, 'ICN/KOJ');
  assert.strictEqual(schedule.lookup('KE2180').route, 'KOJ/ICN');
  assert.strictEqual(schedule.lookup('KE2179').derived, false, '짐작이 아니라 표에 든 값이다');
  assert.strictEqual(calendar.needsRoute(store.decorate({ date: '2026-04-24', code: 'KE2179' })), true);

  // 저장소를 거치면 시간표에서 구간이 붙는다
  const filled = store.enrich(store.decorate({ date: '2026-04-24', code: 'KE2179' }));
  assert.strictEqual(filled.route, 'ICN/KOJ');
  assert.strictEqual(calendar.needsRoute(filled), false);
});
