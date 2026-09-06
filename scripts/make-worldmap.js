/**
 * 세계 육지 윤곽을 src/worldmap.js 로 만든다.
 *
 *   node scripts/make-worldmap.js
 *
 * 자료는 Natural Earth 1:110m 육지(land) — 공공 도메인이다. 지어낸 선이 하나도 없어야
 * 해서, 좌표를 직접 적는 대신 이렇게 받아서 줄인다.
 *
 * 하는 일은 셋.
 *   1) TopoJSON 의 arc 를 풀어 실제 경위도 고리로 만든다
 *   2) 더글러스-포이커로 굽이를 줄이고, 지도에서 점 하나로 보일 작은 섬은 버린다
 *   3) 0.1도 격자에 맞춰 폴리라인 부호화로 눌러 담는다 (원본 55KB → 10KB 남짓)
 *
 * 0.1도면 적도에서 11km 다. 세계지도 한 장에서는 1픽셀도 안 되니 넉넉하다.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SOURCE = 'https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json';
const OUT = path.join(__dirname, '..', 'src', 'worldmap.js');

const TOLERANCE = 0.3;    // 도. 이보다 얕은 굽이는 편다
const MIN_SPAN = 1.2;     // 도. 가로세로가 이보다 작은 섬은 버린다
const MIN_POINTS = 4;

function download() {
  const cache = path.join(__dirname, '.land-110m.json');
  if (fs.existsSync(cache)) return JSON.parse(fs.readFileSync(cache, 'utf8'));
  const body = execFileSync('curl', ['-sSL', SOURCE], { maxBuffer: 1 << 26, encoding: 'utf8' });
  fs.writeFileSync(cache, body);
  return JSON.parse(body);
}

/** TopoJSON arc 하나를 실제 좌표 배열로 편다. */
function decodeArc(topo, index) {
  const reverse = index < 0;
  const arc = topo.arcs[reverse ? ~index : index];
  const { scale, translate } = topo.transform;
  let x = 0, y = 0;
  const out = arc.map(([dx, dy]) => {
    x += dx; y += dy;
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
  });
  return reverse ? out.reverse() : out;
}

function ringOf(topo, arcIndexes) {
  const out = [];
  arcIndexes.forEach((index) => {
    const piece = decodeArc(topo, index);
    piece.forEach((point, i) => {
      if (i === 0 && out.length) return;   // 이어 붙는 점은 한 번만
      out.push(point);
    });
  });
  return out;
}

/** 더글러스-포이커. 선에서 멀리 벗어난 점만 남긴다. */
function simplify(points, tolerance) {
  if (points.length < 3) return points.slice();
  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;

  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [from, to] = stack.pop();
    let far = -1, best = tolerance;
    for (let i = from + 1; i < to; i++) {
      const d = perpendicular(points[i], points[from], points[to]);
      if (d > best) { best = d; far = i; }
    }
    if (far > 0) {
      keep[far] = true;
      stack.push([from, far], [far, to]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function perpendicular(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  if (!dx && !dy) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function span(points) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  points.forEach(([x, y]) => {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  });
  return Math.max(maxX - minX, maxY - minY);
}

/** 구글 폴리라인 부호화. 0.1도 격자에 맞춘 차이값만 담는다. */
function encode(points) {
  let lastLat = 0, lastLon = 0, out = '';
  points.forEach(([lon, lat]) => {
    const y = Math.round(lat * 10), x = Math.round(lon * 10);
    out += chunk(y - lastLat) + chunk(x - lastLon);
    lastLat = y; lastLon = x;
  });
  return out;
}

function chunk(value) {
  let v = value < 0 ? ~(value << 1) : (value << 1);
  let out = '';
  while (v >= 0x20) {
    out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  return out + String.fromCharCode(v + 63);
}

function build() {
  const topo = download();
  const land = topo.objects.land;
  const shapes = land.type === 'GeometryCollection' ? land.geometries : [land];
  const polygons = [];
  shapes.forEach((shape) => {
    if (shape.type === 'MultiPolygon') shape.arcs.forEach((p) => polygons.push(p));
    else if (shape.type === 'Polygon') polygons.push(shape.arcs);
  });

  const rings = [];
  polygons.forEach((polygon) => {
    polygon.forEach((arcIndexes) => {
      const ring = ringOf(topo, arcIndexes);
      if (span(ring) < MIN_SPAN) return;                 // 점으로 보일 섬은 버린다
      const thin = simplify(ring, TOLERANCE);
      if (thin.length < MIN_POINTS) return;
      rings.push(thin);
    });
  });

  rings.sort((a, b) => span(b) - span(a));
  const encoded = rings.map(encode);
  const points = rings.reduce((sum, r) => sum + r.length, 0);

  const body = `/**
 * 세계 육지 윤곽. Natural Earth 1:110m 육지 자료(공공 도메인)를 줄여 담았다.
 *
 * 손으로 적은 좌표가 아니라 scripts/make-worldmap.js 가 만들어 낸 것이다.
 * 고쳐야 할 일이 있으면 그 스크립트를 고치고 \`node scripts/make-worldmap.js\` 를 다시 돌린다.
 *
 * 고리 ${rings.length}개, 점 ${points}개, 0.1도(적도에서 11km) 격자.
 * 세계지도 한 장에서 1픽셀도 안 되는 크기라 대륙 모양을 알아보기에는 넉넉하고,
 * 나라 경계는 담지 않았다. 크루가 보는 건 어느 대륙 어디쯤인지이기 때문이다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.worldmap = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PACKED = [
${encoded.map((line) => '    ' + JSON.stringify(line)).join(',\n')}
  ];

  var cache = null;

  /** 눌러 담은 글을 좌표로 푼다. 처음 부를 때 한 번만 푼다. */
  function decode(line) {
    var points = [];
    var lat = 0, lon = 0, i = 0;
    while (i < line.length) {
      var shift = 0, result = 0, byte;
      do {
        byte = line.charCodeAt(i++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      lat += (result & 1) ? ~(result >> 1) : (result >> 1);

      shift = 0; result = 0;
      do {
        byte = line.charCodeAt(i++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      lon += (result & 1) ? ~(result >> 1) : (result >> 1);

      points.push({ lat: lat / 10, lon: lon / 10 });
    }
    return points;
  }

  /** 육지 고리 목록. 큰 것부터 온다. */
  function rings() {
    if (!cache) cache = PACKED.map(decode);
    return cache;
  }

  return {
    rings: rings,
    count: PACKED.length
  };
});
`;
  fs.writeFileSync(OUT, body);
  console.log('만들었습니다: src/worldmap.js (고리 ' + rings.length + '개, 점 ' + points +
    '개, ' + Math.round(Buffer.byteLength(body) / 1024) + 'KB)');
}

build();
