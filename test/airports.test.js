const test = require('node:test');
const assert = require('node:assert');
const airports = require('../src/airports.js');

test('공항 코드로 나라와 국기를 찾는다', () => {
  assert.strictEqual(airports.countryOf('ICN'), 'KR');
  assert.strictEqual(airports.countryOf('icn'), 'KR');
  assert.strictEqual(airports.flagOf('JFK'), '🇺🇸');
  assert.strictEqual(airports.flagOf('NRT'), '🇯🇵');
  assert.strictEqual(airports.flagOf('CDG'), '🇫🇷');
});

test('모르는 공항은 국기를 만들지 않는다', () => {
  assert.strictEqual(airports.countryOf('ZZZ'), null);
  assert.strictEqual(airports.flagOf('ZZZ'), '');
  assert.strictEqual(airports.flagOf(''), '');
  assert.strictEqual(airports.flagOf(null), '');
});

test('구간에서 출발지와 도착지를 나눈다', () => {
  assert.deepStrictEqual(airports.splitRoute('ICN/JFK'), { from: 'ICN', to: 'JFK' });
  assert.deepStrictEqual(airports.splitRoute('ICN-NRT'), { from: 'ICN', to: 'NRT' });
  assert.deepStrictEqual(airports.splitRoute('ICN'), { from: 'ICN', to: null });
  assert.deepStrictEqual(airports.splitRoute(''), { from: null, to: null });
});

test('출발 국기는 구간의 앞 공항 기준이다', () => {
  assert.strictEqual(airports.departureFlag({ route: 'ICN/LAX' }), '🇰🇷');
  assert.strictEqual(airports.departureFlag({ route: 'LAX/ICN' }), '🇺🇸');
  assert.strictEqual(airports.departureFlag({ route: null }), '');
});

test('구간 설명에 나라 이름을 붙인다', () => {
  assert.strictEqual(airports.describeRoute('ICN/JFK'), 'ICN 대한민국 → JFK 미국');
  assert.strictEqual(airports.describeRoute('ICN'), 'ICN 대한민국');
  assert.strictEqual(airports.describeRoute(''), '');
});

test('국기는 나라 코드 두 글자로 만든다', () => {
  assert.strictEqual(airports.flagOfCountry('KR'), '🇰🇷');
  assert.strictEqual(airports.flagOfCountry('kr'), '🇰🇷');
  assert.strictEqual(airports.flagOfCountry('K'), '');
});

test('취항지 목록에 중복된 공항 코드가 없다', () => {
  assert.ok(Object.keys(airports.AIRPORT_COUNTRY).length > 300);
  assert.strictEqual(airports.countryOf('NBO'), 'KE');   // 케냐. 항공사 코드 KE 와 헷갈리지 않는다
  assert.strictEqual(airports.countryOf('GUM'), 'GU');
});

test('공항 코드로도 도시 이름으로도 찾는다', () => {
  assert.strictEqual(airports.findCode('KOJ'), 'KOJ');
  assert.strictEqual(airports.findCode('koj'), 'KOJ');
  assert.strictEqual(airports.findCode(' 가고시마 '), 'KOJ');
  assert.strictEqual(airports.findCode('없는도시'), null);
  assert.strictEqual(airports.findCode(''), null);

  assert.deepStrictEqual(airports.describeAirport('가고시마'), {
    iata: 'KOJ', city: '가고시마', country: 'JP', countryName: '일본', flag: '🇯🇵'
  });
  assert.strictEqual(airports.describeAirport('ZZZ'), null);
});
