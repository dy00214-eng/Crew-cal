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

test('아는 항공사가 아닌 편명 꼴은 칸에 띄우지 않는다', () => {
  const entries = [
    store.decorate({ date: '2026-03-09', code: 'ATDO' }),
    store.decorate({ date: '2026-03-09', code: 'AS0016' })
  ];
  const cells = draw({ year: 2026, month: 3, entriesByDate: { '2026-03-09': entries } });
  const text = textOf(cells['2026-03-09']);
  assert.ok(text.includes('휴무'), text);
  assert.ok(!text.includes('AS0016'), '달력 칸에는 안 뜬다: ' + text);
  assert.ok(!cells['2026-03-09'].classList.contains('needs-route'), '비행이 아니니 노선도 안 묻는다');

  // 데이터에서 지우지는 않는다. 날짜를 누르면 원래 글자를 볼 수 있어야 한다.
  assert.strictEqual(calendar.cellItems(entries).length, 1);
  assert.strictEqual(entries[1].code, 'AS0016');
});

test('같은 날 오가는 두 편은 왕복 하나로 묶는다', () => {
  const go = store.enrich(store.decorate({ date: '2026-03-01', code: 'KE1807' }));
  const back = store.enrich(store.decorate({ date: '2026-03-01', code: 'KE1810' }));
  assert.strictEqual(go.route, 'GMP/PUS');
  assert.strictEqual(back.route, 'PUS/GMP');

  const merged = calendar.mergeRoundTrip([go, back]);
  assert.strictEqual(merged.length, 1);
  assert.deepStrictEqual(merged[0].roundTrip.map((e) => e.code), ['KE1807', 'KE1810']);

  const cells = draw({ year: 2026, month: 3, entriesByDate: { '2026-03-01': [go, back] } });
  const text = textOf(cells['2026-03-01']);
  assert.ok(text.includes('부산 왕복'), text);
  assert.ok(text.includes('KE1807 · KE1810'), text);
  assert.ok(text.includes('추정'), '표에 없어 짐작한 구간임을 밝힌다: ' + text);
  assert.ok(!text.includes('노선 미등록'), text);

  // 오가는 짝이 아니면 묶지 않는다
  const other = store.enrich(store.decorate({ date: '2026-03-01', code: 'KE1811' }));
  assert.strictEqual(calendar.mergeRoundTrip([go, other]).length, 2);
});

test('추정 휴무를 휴무 집계에 넣되 몇 날인지 밝힌다', () => {
  const byDate = { '2026-03-01': [store.decorate({ date: '2026-03-01', code: 'DO' })] };
  const plain = calendar.summarize(byDate, 2026, 3);
  assert.strictEqual(plain.dayCounts.off, 1);
  assert.strictEqual(plain.assumedOff, 0);

  const guessed = calendar.summarize(byDate, 2026, 3, { assumeOff: true });
  assert.strictEqual(guessed.dayCounts.off, 31, '3월 31일 가운데 30일이 추정');
  assert.strictEqual(guessed.assumedOff, 30);
  assert.strictEqual(guessed.days, 1, '일정 있는 날은 그대로');
});

test('왕복으로 묶을 때 앞뒤가 맞지 않는 시각은 잇지 않는다', () => {
  const mk = (code, route, start, end) =>
    store.decorate({ date: '2026-03-29', code, route, start, end });

  // 오전에 들어오고 오후에 나가는 편을 잇지 않는다 (13:25 → 08:15 은 말이 안 된다)
  const odd = calendar.mergeRoundTrip([
    mk('KE1121', 'GMP/CJU', '13:25', null), mk('KE1118', 'CJU/GMP', null, '08:15')
  ]);
  assert.strictEqual(odd[0].start, '13:25');
  assert.strictEqual(odd[0].end, null);

  const good = calendar.mergeRoundTrip([
    mk('KE1807', 'GMP/PUS', '08:05', '09:10'), mk('KE1810', 'PUS/GMP', '10:30', '11:35')
  ]);
  assert.strictEqual(good[0].start, '08:05');
  assert.strictEqual(good[0].end, '11:35');
});

test('국내선 왕복은 집이 아닌 쪽을 간 곳으로 본다', () => {
  const airports = require('../src/airports.js');
  assert.strictEqual(airports.outstation('GMP/PUS'), 'PUS');
  assert.strictEqual(airports.outstation('PUS/GMP'), 'PUS', '김포는 드나드는 집이다');
  assert.strictEqual(airports.outstation('CJU/ICN'), 'CJU');
  assert.strictEqual(airports.outstation('PUS/CJU'), 'CJU', '둘 다 집이 아니면 도착지');
  assert.strictEqual(airports.outstation('ICN/ATL'), 'ATL');
});
