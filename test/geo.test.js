const test = require('node:test');
const assert = require('node:assert');
const geo = require('../src/geo.js');
const airports = require('../src/airports.js');

test('공항 좌표가 그럴듯한 범위 안에 있다', () => {
  const codes = Object.keys(geo.COORD);
  assert.ok(codes.length > 250, '좌표가 ' + codes.length + '개뿐입니다');
  codes.forEach((code) => {
    const c = geo.COORD[code];
    assert.ok(c.lat >= -90 && c.lat <= 90, code + ' 위도가 이상합니다');
    assert.ok(c.lon >= -180 && c.lon <= 180, code + ' 경도가 이상합니다');
    assert.match(code, /^[A-Z]{3}$/);
  });
});

test('아는 노선의 거리가 실제와 맞는다', () => {
  // 널리 알려진 대권 거리와 3% 안쪽으로 맞아야 좌표를 믿을 수 있다
  const known = [
    ['ICN', 'JFK', 11100], ['ICN', 'LAX', 9600], ['ICN', 'CDG', 8950],
    ['ICN', 'SYD', 8330], ['ICN', 'BKK', 3720], ['ICN', 'NRT', 1250],
    ['ICN', 'HNL', 7300], ['ICN', 'FRA', 8600], ['ICN', 'ATL', 11800],
    ['GMP', 'CJU', 450], ['ICN', 'PVG', 820], ['ICN', 'DXB', 6740]
  ];
  known.forEach(([from, to, want]) => {
    const got = geo.distanceKm(geo.coordOf(from), geo.coordOf(to));
    const off = Math.abs(got - want) / want;
    assert.ok(off < 0.03,
      from + '-' + to + ' 가 ' + Math.round(got) + 'km 로 나왔습니다 (알려진 값 ' + want + 'km)');
  });
});

test('한국 공항은 한반도 자리에 있다', () => {
  ['ICN', 'GMP', 'PUS', 'CJU', 'TAE', 'KWJ'].forEach((code) => {
    const c = geo.coordOf(code);
    assert.ok(c.lat > 33 && c.lat < 39, code + ' 위도');
    assert.ok(c.lon > 125 && c.lon < 130, code + ' 경도');
    assert.strictEqual(c.exact, true);
  });
});

test('좌표를 모르는 공항은 나라 가운데로 찍고 그렇다고 알려준다', () => {
  // 도시 목록에는 있지만 좌표를 안 적은 공항
  const guessed = geo.coordOf('YYT') || geo.coordOf('LIN');
  assert.ok(guessed);

  const fake = geo.coordOf('ZZZ');
  assert.strictEqual(fake, null, '나라도 모르면 아예 안 찍는다');

  // 나라만 아는 공항이면 대략의 가운데로
  const country = airports.countryOf('GRU');
  assert.strictEqual(country, 'BR');
  const center = geo.COUNTRY_CENTER.BR;
  assert.ok(center[0] < 0 && center[1] < 0, '브라질은 남서쪽');
});

test('지도 자리는 왼쪽 위가 (0,0), 오른쪽 아래가 (너비, 높이)', () => {
  const size = { width: 1000, height: 500 };
  const seoul = geo.project(geo.coordOf('ICN'), size);
  const ny = geo.project(geo.coordOf('JFK'), size);
  const sydney = geo.project(geo.coordOf('SYD'), size);

  assert.ok(seoul.x > size.width / 2, '서울은 오른쪽 절반에');
  assert.ok(ny.x < size.width / 2, '뉴욕은 왼쪽 절반에');
  assert.ok(sydney.y > seoul.y, '시드니가 서울보다 아래에');
  assert.ok(seoul.x > 0 && seoul.x < size.width);
  assert.ok(seoul.y > 0 && seoul.y < size.height);
});

test('항로는 휜 선으로 쪼개지고, 날짜변경선을 넘으면 토막이 나뉜다', () => {
  const pieces = geo.arc(geo.coordOf('ICN'), geo.coordOf('CDG'));
  assert.strictEqual(pieces.length, 1, '유럽행은 한 토막');
  assert.ok(pieces[0].length > 10);
  // 대권 항로는 북쪽으로 휜다. 가운데 점이 두 끝보다 위에 있어야 한다
  const mid = pieces[0][Math.floor(pieces[0].length / 2)];
  assert.ok(mid.lat > geo.coordOf('ICN').lat, '인천-파리는 북쪽으로 휜다');

  const pacific = geo.arc(geo.coordOf('ICN'), geo.coordOf('LAX'));
  assert.strictEqual(pacific.length, 2, '태평양을 건너면 두 토막');

  assert.deepStrictEqual(geo.arc(null, geo.coordOf('ICN')), []);
});

test('지구 몇 바퀴인지 센다', () => {
  assert.strictEqual(Math.round(geo.laps(geo.EQUATOR_KM) * 100) / 100, 1);
  assert.ok(geo.laps(200000) > 4.9 && geo.laps(200000) < 5.1);
});
