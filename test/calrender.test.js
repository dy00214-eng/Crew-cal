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

test('하루 네 편도 모두 그린다 — 지우거나 휴무로 덮지 않는다', () => {
  const list = ['KE1807', 'KE1810', 'KE1815', 'KE1820'].map(
    (code) => store.decorate({ date: '2026-03-01', code, route: 'GMP/PUS' }));
  const cells = draw({ year: 2026, month: 3, entriesByDate: { '2026-03-01': list } });
  const cell = cells['2026-03-01'];
  const text = textOf(cell);

  assert.ok(!text.includes('휴무'), '원본에 휴무가 없으면 휴무를 지어내지 않는다: ' + text);
  assert.ok(!cell.classList.contains('assumed'));
  assert.ok(text.includes('KE1807') && text.includes('KE1810'), text);
  assert.ok(text.includes('+1'), '세 개까지 보이고 나머지는 접는다: ' + text);
  assert.strictEqual(calendar.cellItems(list).length, 4, '데이터는 넷 그대로');
  assert.ok(!text.includes('왕복'), '왕복 묶기는 걷어냈다: ' + text);
});

test('코드가 있는 날은 절대 추정 휴무로 덮지 않는다', () => {
  const list = [store.decorate({ date: '2026-03-08', code: 'KE0125', route: 'ICN/XMN', start: '10:20', legRole: 'depart' }),
    store.decorate({ date: '2026-03-08', code: 'KE0126', route: 'XMN/ICN', end: '18:05', legRole: 'arrive' })];
  const cells = draw({ year: 2026, month: 3, entriesByDate: { '2026-03-08': list }, assumeOff: true });
  const text = textOf(cells['2026-03-08']);
  assert.ok(!text.includes('휴무'), text);
  assert.ok(text.includes('샤먼'), text);
  assert.ok(!cells['2026-03-08'].classList.contains('assumed'));
});

test('읽었지만 못 그린 날은 휴무로 덮지 않고 파싱 실패라고 알린다', () => {
  const list = [store.decorate({ date: '2026-03-09', code: 'AS0016' })];
  const cells = draw({ year: 2026, month: 3, entriesByDate: { '2026-03-09': list }, assumeOff: true });
  const cell = cells['2026-03-09'];
  assert.ok(textOf(cell).includes('파싱 실패'), textOf(cell));
  assert.ok(cell.classList.contains('parse-failed'));
  assert.ok(!cell.classList.contains('assumed'), '조용히 휴무로 넘어가지 않는다');
  assert.ok(!textOf(cell).includes('휴무'), textOf(cell));
});

test('휴무와 비행이 겹친 날은 확인 필요 표를 띄운다', () => {
  const list = [store.decorate({ date: '2026-03-01', code: 'ADO' }),
    store.decorate({ date: '2026-03-01', code: 'KE1807', route: 'GMP/PUS' })];
  const cells = draw({ year: 2026, month: 3, entriesByDate: { '2026-03-01': list } });
  const text = textOf(cells['2026-03-01']);
  assert.ok(text.includes('확인 필요'), text);
  assert.ok(text.includes('KE1807') || text.includes('부산'), '비행은 그대로 보인다: ' + text);
  assert.strictEqual(calendar.dayNeedsCheck(list), '휴무와 비행이 같은 날에 있습니다');
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

test('도시는 from·to 가운데 한국이 아닌 쪽으로 고른다', () => {
  const airports = require('../src/airports.js');
  // 한국 출발이면 도착지, 한국 도착이면 출발지. 홀수 편(한국 출발)도 도시가 나와야 한다.
  assert.strictEqual(airports.outstation('ICN/BKK'), 'BKK');
  assert.strictEqual(airports.outstation('BKK/ICN'), 'BKK');
  assert.strictEqual(airports.outstation('ICN/ATL'), 'ATL');
  assert.strictEqual(airports.outstation('CJU/ICN'), 'ICN', '둘 다 한국이면 도착지');
  // 둘 다 한국이거나 둘 다 해외면 도착지
  assert.strictEqual(airports.outstation('GMP/PUS'), 'PUS');
  assert.strictEqual(airports.outstation('PUS/GMP'), 'GMP');
  assert.strictEqual(airports.outstation('PVG/NRT'), 'NRT');
  // 한국인지는 공항표의 country 로만 본다
  assert.strictEqual(airports.countryOf('ICN'), 'KR');
  assert.strictEqual(airports.countryOf('GMP'), 'KR');
});

test('홀수 편명도 시드에서 도시를 찾는다', () => {
  const routes = require('../src/routes.js');
  const airports = require('../src/airports.js');
  [['KE0657', 'ICN/BKK', '방콕'], ['KE0457', 'ICN/DAD', '다낭'], ['KE0401', 'ICN/SYD', '시드니']]
    .forEach(([code, route, city]) => {
      const got = routes.resolve(store.decorate({ date: '2026-01-03', code }));
      assert.strictEqual(got.route, route, code);
      assert.strictEqual(airports.tripPlace({ route: got.route, type: 'flight' }).city, city, code);
    });
});

test('근무가 있는 날에 추정 휴무를 붙이려 하면 예외를 던진다', () => {
  // 1월 11일(KE0006)과 15일(KE2011 LO)이 흐린 '휴무' 로 덮인 일이 있었다.
  assert.strictEqual(calendar.canAssumeOff([]), true);
  assert.strictEqual(calendar.canAssumeOff([{ code: 'KE0006' }]), false);
  assert.throws(
    () => calendar.assertNoEntries([store.decorate({ date: '2026-01-11', code: 'KE0006' })], '2026-01-11'),
    /2026-01-11 에 이미 근무가 1건/);
});

test('근무가 있는 날은 추정 휴무로 덮이지 않는다 — 1월 11·15일', () => {
  const byDate = {
    '2026-01-11': [store.decorate({ date: '2026-01-11', code: 'KE0006' })],
    '2026-01-15': [store.decorate({ date: '2026-01-15', code: 'KE2011' }),
      store.decorate({ date: '2026-01-15', code: 'LO' })]
  };
  const cells = draw({ year: 2026, month: 1, entriesByDate: byDate, assumeOff: true });
  ['2026-01-11', '2026-01-15'].forEach((date) => {
    assert.ok(!cells[date].classList.contains('assumed'), date);
    assert.ok(!textOf(cells[date]).includes('휴무'), date + ': ' + textOf(cells[date]));
  });
  assert.ok(textOf(cells['2026-01-11']).includes('KE0006'), textOf(cells['2026-01-11']));
  assert.ok(cells['2026-01-02'].classList.contains('assumed'), '빈 날은 그대로 추정 휴무');
});

test('시각을 몰라도 그날이 출발인지 기내인지 도착인지 적는다', () => {
  const resolve = require('../src/resolve.js');
  const routes = require('../src/routes.js');
  const byDate = {};
  ['2026-01-10', '2026-01-11', '2026-01-12'].forEach((d) => {
    byDate[d] = [store.decorate({ date: d, code: 'KE0006' })];
  });
  byDate['2026-01-17'] = [store.decorate({ date: '2026-01-17', code: 'KE2012' })];
  byDate['2026-01-03'] = [store.decorate({ date: '2026-01-03', code: 'KE0657' })];
  routes.apply(byDate);
  routes.linkDays(byDate, resolve);

  assert.strictEqual(calendar.formatTimeRange(byDate['2026-01-10'][0]), '출발');
  assert.strictEqual(calendar.formatTimeRange(byDate['2026-01-11'][0]), '', '기내인 날은 시각 줄을 비운다');
  assert.strictEqual(calendar.formatTimeRange(byDate['2026-01-12'][0]), '한국 도착');
  // 하루짜리는 구간이 방향을 알려 준다
  assert.strictEqual(calendar.formatTimeRange(byDate['2026-01-17'][0]), '한국 도착');
  assert.strictEqual(calendar.formatTimeRange(byDate['2026-01-03'][0]), '출발');
});

test('같은 칸의 TVL 은 그날 비행을 탑승 근무로 만든다', () => {
  const resolve = require('../src/resolve.js');
  const byDate = {
    '2026-01-29': [store.decorate({ date: '2026-01-29', code: 'KE0601' }),
      store.decorate({ date: '2026-01-29', code: 'TVL' })]
  };
  resolve.markDeadhead(byDate);
  assert.strictEqual(byDate['2026-01-29'][0].deadhead, true, '비행이 탑승 근무가 된다');
  assert.strictEqual(byDate['2026-01-29'][1].deadhead, false, 'TVL 자신에는 붙지 않는다');
  assert.strictEqual(calendar.summarize(byDate, 2026, 1).flights, 0, '비행 편수에서 뺀다');
});
