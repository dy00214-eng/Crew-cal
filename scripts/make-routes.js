/**
 * 노선·공항 자료를 data/*.json 에서 읽어 브라우저가 쓸 src/routedata.js 로 옮긴다.
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
  const routes = read(ROUTES);
  const airports = read(AIRPORTS);
  const body = `/**
 * 노선·공항 자료. data/ke-routes.json 과 data/airports.json 에서 옮겨 적은 것이다.
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

  var ROUTES = ${JSON.stringify(routes, null, 2).replace(/\n/g, '\n  ')};

  var AIRPORTS = ${JSON.stringify(airports, null, 2).replace(/\n/g, '\n  ')};

  return { ROUTES: ROUTES, AIRPORTS: AIRPORTS };
});
`;
  fs.writeFileSync(OUT, body);
  return { routes: Object.keys(routes).length, airports: Object.keys(airports).length };
}

if (require.main === module) {
  const n = build();
  console.log(`src/routedata.js: 노선 ${n.routes}편 · 공항 ${n.airports}곳`);
}

module.exports = { build, ROUTES, AIRPORTS, OUT };
