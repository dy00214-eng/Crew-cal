const test = require('node:test');
const assert = require('node:assert');
const mapdraw = require('../src/mapdraw.js');
const geo = require('../src/geo.js');

/** 캔버스가 없는 곳에서도 검사할 수 있게, 그린 것을 받아 적기만 하는 가짜 캔버스. */
function fakeCanvas() {
  const ops = [];
  const ctx = {
    canvas: null,
    globalAlpha: 1,
    lineWidth: 1,
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
    lineCap: 'butt',
    save() { ops.push(['save']); },
    restore() { ops.push(['restore']); },
    scale(x, y) { ops.push(['scale', x, y]); },
    beginPath() { ops.push(['beginPath']); },
    closePath() { ops.push(['closePath']); },
    moveTo(x, y) { ops.push(['moveTo', x, y]); },
    lineTo(x, y) { ops.push(['lineTo', x, y]); },
    arc(x, y, r) { ops.push(['arc', x, y, r]); },
    fill() { ops.push(['fill', this.fillStyle, this.globalAlpha]); },
    stroke() { ops.push(['stroke', this.strokeStyle, this.lineWidth, this.globalAlpha]); },
    fillRect(x, y, w, h) { ops.push(['fillRect', x, y, w, h, this.fillStyle]); },
    fillText(text, x, y) { ops.push(['fillText', text, x, y]); },
    measureText(text) { return { width: String(text).length * 7 }; }
  };
  return { width: 0, height: 0, ops: ops, getContext() { return ctx; } };
}

const DATA = {
  legs: [
    { from: 'ICN', to: 'ATL', count: 3 },
    { from: 'ICN', to: 'CDG', count: 1 },
    { from: 'ICN', to: 'ZZZ', count: 1 }        // 좌표를 모르는 곳
  ],
  places: [
    { iata: 'ATL', city: '애틀랜타', flag: '🇺🇸', count: 3 },
    { iata: 'CDG', city: '파리', flag: '🇫🇷', count: 1 }
  ],
  totals: { cities: 2, countries: 2 }
};

test('점 크기는 많이 간 곳일수록 크되 한없이 커지지는 않는다', () => {
  assert.ok(mapdraw.dotRadius(1, 10) < mapdraw.dotRadius(5, 10));
  assert.ok(mapdraw.dotRadius(5, 10) < mapdraw.dotRadius(10, 10));
  assert.strictEqual(mapdraw.dotRadius(0, 10), mapdraw.dotRadius(0, 1));
  assert.ok(mapdraw.dotRadius(50, 50) < 12, '아무리 많이 가도 12px 미만');
  // 한 곳만 다녀왔으면 그 한 곳이 가장 큰 점이다
  assert.ok(mapdraw.dotRadius(1, 1) > mapdraw.dotRadius(1, 20));
});

test('이름은 앞쪽 몇 곳만 붙인다', () => {
  const many = Array.from({ length: 40 }, (_, i) => ({ iata: 'A' + i }));
  assert.strictEqual(mapdraw.labelled(many).length, 14);
  assert.strictEqual(mapdraw.labelled(many, 5).length, 5);
  assert.strictEqual(mapdraw.labelled(many, 5)[0].iata, 'A0');
  assert.strictEqual(mapdraw.labelled([]).length, 0);
});

test('바탕을 칠하고 눈금·항로·점·이름을 그린다', () => {
  const canvas = fakeCanvas();
  const plan = mapdraw.draw(canvas, { data: DATA, width: 800, height: 500, scale: 2 });

  assert.strictEqual(plan.width, 800);
  assert.strictEqual(plan.height, 500);
  assert.strictEqual(canvas.width, 1600, '선명하게 뽑으려고 두 배로 그린다');
  assert.strictEqual(canvas.height, 1000);

  const ops = canvas.ops;
  assert.deepStrictEqual(ops[0], ['scale', 2, 2]);
  const first = ops.find((o) => o[0] === 'fillRect');
  assert.deepStrictEqual(first.slice(0, 5), ['fillRect', 0, 0, 800, 500]);

  assert.ok(ops.filter((o) => o[0] === 'stroke').length > 20, '눈금이 그려진다');
  // 도시 둘 + 집(인천) 하나
  assert.strictEqual(ops.filter((o) => o[0] === 'arc').length, 3, '좌표를 아는 도시만 점을 찍는다');

  const labels = ops.filter((o) => o[0] === 'fillText').map((o) => o[1]);
  assert.ok(labels.includes('애틀랜타 3'), '여러 번 갔으면 횟수도 적는다');
  assert.ok(labels.includes('파리'), '한 번 갔으면 이름만');
});

test('대륙을 먼저 깔고 그 위에 항로를 얹는다', () => {
  const canvas = fakeCanvas();
  mapdraw.draw(canvas, { data: DATA, width: 800, height: 500, scale: 1 });
  const ops = canvas.ops;

  const land = ops.findIndex((o) => o[0] === 'closePath');
  const route = ops.findIndex((o) => o[0] === 'stroke' && o[2] > 1);
  assert.ok(land > 0, '대륙 윤곽이 그려진다');
  assert.ok(land < route, '대륙이 항로보다 먼저 그려져 밑에 깔린다');
  assert.ok(ops.filter((o) => o[0] === 'closePath').length > 80, '고리가 여럿 그려진다');

  // 국경은 육지 위, 항로 아래
  const border = ops.filter((o) => o[0] === 'stroke' && o[2] === 0.7).length;
  assert.ok(border > 100, '국경이 ' + border + '줄만 그려졌습니다');
  assert.ok(ops.findIndex((o) => o[0] === 'stroke' && o[2] === 0.7) < route, '국경도 항로 밑에');
});

test('지도 가운데를 옮겨도 걸친 대륙이 끊기지 않는다', () => {
  const ring = require('../src/worldmap.js').rings()[0];
  const box = { width: 1000, height: 600, center: 150 };
  const path = mapdraw.landPath(ring, box);

  // 이어진 경도로 펴므로, 이웃한 점끼리 지도를 가로지르는 일이 없다
  for (let i = 1; i < path.length; i++) {
    assert.ok(Math.abs(path[i].x - path[i - 1].x) < box.width / 2,
      i + '번째 점에서 지도를 가로질렀습니다');
  }
});

test('옅은 색은 밝은 화면이든 어두운 화면이든 따라간다', () => {
  assert.strictEqual(mapdraw.faded('#221f1a', 0.11), 'rgba(34,31,26,0.11)');
  assert.strictEqual(mapdraw.faded('rgba(242, 236, 224, 0.62)', 0.2), 'rgba(242,236,224,0.2)');
  assert.strictEqual(mapdraw.faded('red', 0.2), 'red');
});

test('많이 다닌 항로일수록 굵고 진하게 긋는다', () => {
  const canvas = fakeCanvas();
  mapdraw.draw(canvas, { data: DATA, width: 800, height: 500, scale: 1 });
  // 눈금은 lineWidth 1, 항로는 그보다 굵다
  const routes = canvas.ops.filter((o) => o[0] === 'stroke' && o[2] > 1);
  assert.ok(routes.length >= 2);
  const widest = Math.max(...routes.map((o) => o[2]));
  const thinnest = Math.min(...routes.map((o) => o[2]));
  assert.ok(widest > thinnest, '세 번 간 곳이 한 번 간 곳보다 굵다');
});

test('다녀온 곳이 없어도 지도와 집은 그려진다', () => {
  const canvas = fakeCanvas();
  const plan = mapdraw.draw(canvas, {});
  assert.ok(plan.width > 0 && plan.height > 0);
  assert.strictEqual(canvas.ops.filter((o) => o[0] === 'arc').length, 1, '집만 찍힌다');

  const bare = fakeCanvas();
  mapdraw.draw(bare, { home: false });
  assert.strictEqual(bare.ops.filter((o) => o[0] === 'arc').length, 0);
});

test('한국이 지도 가운데에 온다', () => {
  const box = { width: 1000, height: 600, center: 150 };
  const icn = geo.project(geo.coordOf('ICN'), box);
  const lax = geo.project(geo.coordOf('LAX'), box);
  const cdg = geo.project(geo.coordOf('CDG'), box);

  assert.ok(Math.abs(icn.x - 500) < 90, '인천이 가운데 근처');
  assert.ok(lax.x > icn.x, '로스앤젤레스는 오른쪽');
  assert.ok(cdg.x < icn.x, '파리는 왼쪽');
  // 태평양을 건너도 선이 끊기지 않는다
  assert.strictEqual(geo.arc(geo.coordOf('ICN'), geo.coordOf('LAX'), 48, 150).length, 1);
});

test('이름이 겹치면 자리를 옮기고, 다 막히면 안 쓴다', () => {
  const spot = mapdraw.freeSpot([], { x: 100, y: 100 }, 4, 50, 400, 300);
  assert.deepStrictEqual(spot, { x: 109, y: 100 });

  // 오른쪽이 막히면 왼쪽으로
  const moved = mapdraw.freeSpot([{ x: 105, y: 90, w: 60, h: 20 }], { x: 100, y: 100 }, 4, 50, 400, 300);
  assert.ok(moved.x < 100, '왼쪽으로 비켰다');

  // 화면 밖으로 나갈 자리는 안 쓴다
  const edge = mapdraw.freeSpot([], { x: 398, y: 100 }, 4, 50, 400, 300);
  assert.ok(!edge || edge.x + 50 <= 400);

  const blocked = mapdraw.freeSpot(
    [{ x: 0, y: 0, w: 400, h: 300 }], { x: 100, y: 100 }, 4, 50, 400, 300);
  assert.strictEqual(blocked, null);
});

test('좌표를 모르는 항로는 건너뛴다', () => {
  assert.strictEqual(geo.coordOf('ZZZ'), null);
});
