const test = require('node:test');
const assert = require('node:assert');
const poster = require('../src/poster.js');

test('칸 자리는 그 달의 주 수에 맞춰 잡힌다', () => {
  const five = poster.layout(2026, 9);    // 9월은 다섯 주
  assert.strictEqual(five.cells.length, 35);
  assert.strictEqual(five.weeks, 5);
  assert.strictEqual(five.width, poster.WIDTH);

  const six = poster.layout(2026, 8);     // 8월은 여섯 주
  assert.strictEqual(six.weeks, 6);
  assert.ok(six.height > five.height, '주가 늘면 그림도 길어져야 한다');

  // 한 줄에 일곱 칸, 왼쪽에서 오른쪽으로
  assert.strictEqual(five.cells[0].column, 0);
  assert.strictEqual(five.cells[6].column, 6);
  assert.ok(five.cells[7].y > five.cells[0].y);
  assert.strictEqual(five.cells[7].x, five.cells[0].x);
});

test('비행하는 날은 비행기와 도시, 시각, 편명 순으로 적는다', () => {
  const lines = poster.cellLines(
    [{ type: 'flight', code: 'KE0035', route: 'ICN/ATL', start: '10:35', category: 'flight' }],
    { date: '2026-09-02' }
  );
  assert.strictEqual(lines.length, 1);
  assert.strictEqual(lines[0].head, '✈️ 🇺🇸');
  assert.strictEqual(lines[0].title, '애틀랜타');
  assert.strictEqual(lines[0].time, '10:35 출발');
  assert.strictEqual(lines[0].sub, 'KE0035');
});

test('체류하는 날은 비행기 없이 머무는 도시를 적는다', () => {
  const place = { iata: 'ATL', city: '애틀랜타', flag: '🇺🇸' };
  const lines = poster.cellLines(
    [{ type: 'duty', code: 'LO', label: '체류', category: 'layover' }],
    { date: '2026-09-03', place: place }
  );
  assert.strictEqual(lines[0].head, '🇺🇸');
  assert.strictEqual(lines[0].title, '애틀랜타');
  assert.strictEqual(lines[0].sub, '체류');
});

test('쉬는 날은 이름을 크게, 코드를 작게', () => {
  const lines = poster.cellLines(
    [{ type: 'duty', code: 'ATDO', label: '휴무', category: 'off' }],
    { date: '2026-09-06' }
  );
  assert.strictEqual(lines[0].head, '');
  assert.strictEqual(lines[0].title, '휴무');
  assert.strictEqual(lines[0].sub, 'ATDO');
});

test('하루에 네 건이 넘으면 나머지는 개수로 적는다', () => {
  const many = [1, 2, 3, 4, 5].map((n) => ({ type: 'duty', code: 'D' + n, label: '근무' + n, category: 'other' }));
  const lines = poster.cellLines(many, { date: '2026-09-10' });
  assert.strictEqual(lines.length, 4);
  assert.strictEqual(lines[3].title, '+2');
});

test('파일 이름에 연월이 들어간다', () => {
  assert.strictEqual(poster.filename(2026, 9), 'crew-cal-2026-09.png');
  assert.strictEqual(poster.filename(2026, 12), 'crew-cal-2026-12.png');
});
