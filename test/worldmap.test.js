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

/** 점에서 선까지의 거리(도). 국경이 제자리에 있는지 재는 데 쓴다. */
function distanceToBorders(lat, lon) {
  let best = Infinity;
  worldmap.borders().forEach((line) => {
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1];
      const b = line[i];
      const dx = b.lon - a.lon;
      const dy = b.lat - a.lat;
      let t = (dx || dy) ? ((lon - a.lon) * dx + (lat - a.lat) * dy) / (dx * dx + dy * dy) : 0;
      t = Math.max(0, Math.min(1, t));
      best = Math.min(best, Math.hypot(lon - (a.lon + t * dx), lat - (a.lat + t * dy)));
    }
  });
  return best;
}

test('국경이 제자리에 있다', () => {
  assert.ok(worldmap.borders().length > 100, '국경이 ' + worldmap.borders().length + '줄뿐입니다');
  assert.strictEqual(worldmap.borders().length, worldmap.borderCount);
  assert.strictEqual(worldmap.borders(), worldmap.borders());

  [['미국-캐나다 49도선', 49.0, -110], ['미국-멕시코', 31.8, -106.5],
   ['남북 사이', 38.3, 127.5], ['프랑스-독일', 48.9, 8.0],
   ['인도-네팔', 27.5, 84.0]].forEach(([name, lat, lon]) => {
    assert.ok(distanceToBorders(lat, lon) < 0.5, name + ' 에 국경이 없습니다');
  });
});

test('국경에 바닷가는 섞이지 않았다', () => {
  // 두 나라가 맞댄 선만 담았으므로, 이웃 나라가 없는 곳 근처에는 국경이 없어야 한다
  [['도쿄(섬나라)', 35.7, 139.7], ['호주 한복판', -25, 133],
   ['태평양 한가운데', 0, -160], ['그린란드', 72, -40]].forEach(([name, lat, lon]) => {
    assert.ok(distanceToBorders(lat, lon) > 5, name + ' 근처에 국경이 그려집니다');
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
