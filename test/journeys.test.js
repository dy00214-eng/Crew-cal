const test = require('node:test');
const assert = require('node:assert');
const journeys = require('../src/journeys.js');

const SCHEDULE = {
  '2026-02-10': [{ type: 'flight', code: 'KE0035', route: 'ICN/ATL' }],
  '2026-02-11': [{ type: 'duty', code: 'LO', category: 'layover' }],
  '2026-02-12': [{ type: 'flight', code: 'KE0036', route: 'ATL/ICN' }],
  '2026-05-01': [{ type: 'flight', code: 'KE0035', route: 'ICN/ATL' }],
  '2026-05-03': [{ type: 'flight', code: 'KE0036', route: 'ATL/ICN' }],
  '2026-06-01': [{ type: 'flight', code: 'KE0901', route: 'ICN/CDG' }],
  '2026-06-03': [{ type: 'flight', code: 'KE0902', route: 'CDG/ICN' }],
  '2027-01-05': [{ type: 'flight', code: 'KE0081', route: 'ICN/JFK' }]
};

test('다녀온 곳을 횟수 순으로 모은다', () => {
  const out = journeys.collect(SCHEDULE);
  assert.deepStrictEqual(out.places.map((p) => [p.city, p.count]),
    [['애틀랜타', 2], ['뉴욕', 1], ['파리', 1]]);
  assert.strictEqual(out.places[0].firstDate, '2026-02-10');
  assert.strictEqual(out.places[0].lastDate, '2026-05-01');
  assert.strictEqual(out.places[0].flag, '🇺🇸');
});

test('항로와 총합을 낸다', () => {
  const out = journeys.collect(SCHEDULE);
  assert.strictEqual(out.totals.flights, 7);
  assert.strictEqual(out.totals.trips, 4);          // 나가는 편만 넷
  assert.strictEqual(out.totals.cities, 3);
  assert.strictEqual(out.totals.countries, 2);      // 미국, 프랑스
  assert.deepStrictEqual(out.years, ['2026', '2027']);

  const atl = out.legs.find((l) => l.from === 'ICN' && l.to === 'ATL');
  assert.strictEqual(atl.count, 2);

  // 인천-애틀랜타 왕복 두 번 + 인천-파리 왕복 + 인천-뉴욕 편도 ≈ 76,000km
  assert.ok(out.totals.km > 70000 && out.totals.km < 82000, out.totals.km + 'km');
  assert.ok(out.totals.laps > 1.7 && out.totals.laps < 2.1);
});

test('기간을 주면 그 안만 센다', () => {
  const year = journeys.collect(SCHEDULE, { from: '2026-01-01', to: '2026-12-31' });
  assert.strictEqual(year.totals.trips, 3);
  assert.strictEqual(year.totals.cities, 2);
  assert.deepStrictEqual(year.years, ['2026']);
});

test('이틀에 걸쳐 적힌 도착편은 한 번만 센다', () => {
  const arrival = { type: 'flight', code: 'KE0036', route: 'ATL/ICN', endOffset: 1 };
  const out = journeys.collect({
    '2026-03-04': [{ type: 'duty', code: 'LO', category: 'layover' }, arrival],
    '2026-03-05': [arrival]
  });
  assert.strictEqual(out.totals.flights, 1);
  assert.strictEqual(out.legs.length, 1);
});

test('비행이 아니거나 구간이 없으면 세지 않는다', () => {
  const out = journeys.collect({
    '2026-09-01': [{ type: 'duty', code: 'ATDO', category: 'off' }],
    '2026-09-02': [{ type: 'flight', code: 'KE0035' }]
  });
  assert.strictEqual(out.totals.flights, 0);
  assert.deepStrictEqual(out.places, []);
  assert.strictEqual(out.totals.km, 0);
});

test('일정이 걸쳐 있는 해를 알려준다', () => {
  assert.deepStrictEqual(journeys.yearsOf(SCHEDULE), ['2026', '2027']);
  assert.deepStrictEqual(journeys.yearsOf({ '2026-01-01': [] }), []);
  assert.deepStrictEqual(journeys.yearsOf(), []);
});
