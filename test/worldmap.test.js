const test = require('node:test');
const assert = require('node:assert');
const worldmap = require('../src/worldmap.js');

const rings = worldmap.rings();

/** 어느 고리 안에 드는지. 이 자료가 진짜 육지인지 확인하는 데 쓴다. */
function onLand(lat, lon) {
  return rings.some((ring) => {
    let hit = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i];
      const b = ring[j];
      if ((a.lat > lat) !== (b.lat > lat) &&
          lon < ((b.lon - a.lon) * (lat - a.lat)) / (b.lat - a.lat) + a.lon) hit = !hit;
    }
    return hit;
  });
}

test('육지 윤곽이 제대로 풀린다', () => {
  assert.ok(rings.length > 50, '고리가 ' + rings.length + '개뿐입니다');
  assert.strictEqual(rings.length, worldmap.count);
  rings.forEach((ring) => {
    assert.ok(ring.length >= 4);
    ring.forEach((p) => {
      assert.ok(p.lat >= -90 && p.lat <= 90, '위도 ' + p.lat);
      assert.ok(p.lon >= -181 && p.lon <= 181, '경도 ' + p.lon);
    });
  });
  // 두 번 불러도 같은 것을 준다 (한 번만 풀어 두고 쓴다)
  assert.strictEqual(worldmap.rings(), rings);
});

test('땅인 곳은 땅으로 나온다', () => {
  [['서울', 37.5, 127.0], ['대전', 36.3, 127.4], ['도쿄', 35.7, 139.7], ['파리', 48.9, 2.4],
   ['런던', 51.5, -0.1], ['시카고', 41.9, -87.6], ['카이로', 30.0, 31.2], ['델리', 28.6, 77.2],
   ['방콕', 13.8, 100.5], ['상파울루', -23.5, -46.6], ['요하네스버그', -26.2, 28.0],
   ['앨리스스프링스', -23.7, 133.9], ['모스크바', 55.8, 37.6]].forEach(([name, lat, lon]) => {
    assert.ok(onLand(lat, lon), name + ' 이 바다로 나옵니다');
  });
});

test('바다인 곳은 바다로 나온다', () => {
  [['태평양 한가운데', 0, -160], ['북태평양', 40, -160], ['북대서양', 35, -40],
   ['인도양', -20, 80], ['남극해', -55, 100], ['동해', 39, 132]].forEach(([name, lat, lon]) => {
    assert.ok(!onLand(lat, lon), name + ' 이 육지로 나옵니다');
  });
});

test('큰 대륙부터 온다', () => {
  const span = (ring) => {
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    ring.forEach((p) => {
      minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat);
      minLon = Math.min(minLon, p.lon); maxLon = Math.max(maxLon, p.lon);
    });
    return Math.max(maxLat - minLat, maxLon - minLon);
  };
  assert.ok(span(rings[0]) > span(rings[rings.length - 1]));
  assert.ok(span(rings[0]) > 100, '가장 큰 고리는 대륙 하나만 하다');
});
