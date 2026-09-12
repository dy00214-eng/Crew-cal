/**
 * 노선 시드와 공항 자료를 data/*.json 에서 읽어 브라우저가 쓸 src/routedata.js 로 옮긴다.
 *
 * 앱은 묶음 도구 없이 <script> 만으로 돌아가고, 아티팩트 판은 파일 하나로 합쳐지므로
 * 실행 중에 JSON 을 받아 올 수가 없다. 그래서 자료는 JSON 에 두고 이 스크립트가
 * 그대로 옮겨 적는다. 노선을 더할 때는 data/ke-routes.json 만 고치면 된다.
 *
 *   node scripts/make-routes.js      (build.js 가 알아서 부른다)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ROUTES = path.join(ROOT, 'data', 'ke-routes.json');
const AIRPORTS = path.join(ROOT, 'data', 'airports.json');
const OUT = path.join(ROOT, 'src', 'routedata.js');

function read(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function build() {
  const seed = read(ROUTES);
  // 공항 이름은 노선 파일이 먼저다. 거기 없는 공항만 예전 표에서 채운다.
  // (노선 파일은 취항지 위주 116곳, 예전 표는 418곳)
  const legacy = read(AIRPORTS);
  const airports = {};
  Object.keys(legacy).forEach((iata) => { airports[iata] = legacy[iata]; });
  Object.keys(seed.airports || {}).forEach((iata) => {
    const row = seed.airports[iata];
    airports[iata] = { city: row.city, country: row.country, flag: row.flag, tz: row.tz || null };
  });
  const body = `/**
 * 노선 시드와 공항 자료. data/ke-routes.json 과 data/airports.json 에서 옮겨 적은 것이다.
 * 손으로 고치지 말 것 — scripts/make-routes.js 가 다시 쓴다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.routedata = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SEED = ${JSON.stringify(seed, null, 2).replace(/\n/g, '\n  ')};

  var AIRPORTS = ${JSON.stringify(airports, null, 2).replace(/\n/g, '\n  ')};

  return { SEED: SEED, AIRPORTS: AIRPORTS };
});
`;
  fs.writeFileSync(OUT, body);
  return { routes: Object.keys(seed.routes || {}).length, airports: Object.keys(airports).length };
}

if (require.main === module) {
  const n = build();
  console.log(`src/routedata.js: 시드 노선 ${n.routes}편 · 공항 ${n.airports}곳`);
}

module.exports = { build, ROUTES, AIRPORTS, OUT };
