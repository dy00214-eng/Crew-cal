/**
 * 비행기 안이나 로밍이 안 되는 곳에서도 열리도록, 앱 파일을 기기에 담아둔다.
 *
 * 방식은 "일단 담아둔 걸 보여주고, 뒤에서 새 파일을 받아 갈아끼우기".
 * 그래서 두 번째로 열 때부터는 네트워크가 없어도 바로 뜨고,
 * 새 버전이 올라오면 다음 번에 열 때 반영된다. 일정 자체는 여기 담기지 않고
 * 브라우저 저장소(localStorage)에 그대로 남는다.
 */
var VERSION = 'crew-cal-v13';
var SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './src/codes.js',
  './src/airports.js',
  './src/clock.js',
  './src/holidays-lunar.js',
  './src/holidays.js',
  './src/schedule.js',
  './src/parser.js',
  './src/store.js',
  './src/calendar.js',
  './src/ics.js',
  './src/poster.js',
  './src/ocrlayout.js',
  './src/ocr.js',
  './src/vision.js',
  './src/feedback.js',
  './src/app.js',
  './map/',
  './map/index.html',
  './map/map.css',
  './map/map.js',
  './src/geo.js',
  './src/worldmap.js',
  './src/journeys.js',
  './src/mapdraw.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(VERSION).then(function (cache) {
      return cache.addAll(SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        return key === VERSION ? null : caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 앱을 이루는 파일(화면·코드·모양)은 새것부터 찾는다. 담아둔 것을 먼저 보여주면
  // 고친 것이 다음에 열 때까지 반영되지 않아, 왜 안 되는지 알 수 없게 된다.
  // 네트워크가 없거나 느리면 곧바로 담아둔 것으로 돌아간다.
  if (isShell(url)) {
    event.respondWith(freshFirst(request));
    return;
  }

  // 그 밖(아이콘, 글자 인식기처럼 바뀌지 않는 큰 파일)은 담아둔 것을 먼저 쓴다
  event.respondWith(
    caches.match(request).then(function (hit) {
      var fresh = fetch(request).then(function (response) {
        keep(request, response);
        return response;
      }).catch(function () {
        return hit || caches.match('./index.html');
      });
      return hit || fresh;
    })
  );
});

/** 앱을 이루는 파일인지. 인식기처럼 무거운 곁다리는 뺀다. */
function isShell(url) {
  if (url.pathname.indexOf('/vendor/') !== -1) return false;
  return /\/$/.test(url.pathname) || /\.(html|js|css|webmanifest)$/.test(url.pathname);
}

/** 새것을 먼저, 안 되면 담아둔 것을. 너무 오래 기다리지는 않는다. */
function freshFirst(request) {
  var cached = caches.match(request);
  return new Promise(function (resolve) {
    var settled = false;
    function fallback() {
      if (settled) return;
      settled = true;
      cached.then(function (hit) {
        resolve(hit || fetch(request).catch(function () { return caches.match('./index.html'); }));
      });
    }

    var timer = setTimeout(fallback, 4000);      // 기내 와이파이처럼 느린 곳을 위해

    // 브라우저가 따로 갖고 있는 사본까지 건너뛰고 받아 온다. 그러지 않으면 새로
    // 올린 파일을 두고도 몇 분 묵은 것을 받아, 고친 것이 바로 오지 않는다.
    fetch(request.url, { cache: 'no-store', credentials: 'same-origin' }).then(function (response) {
      clearTimeout(timer);
      if (!response || !response.ok) { fallback(); return; }
      keep(request, response);
      if (settled) return;
      settled = true;
      resolve(response);
    }).catch(function () {
      clearTimeout(timer);
      fallback();
    });
  });
}

/** 받아온 것을 담아 둔다. 다음에 네트워크가 없어도 열리도록. */
function keep(request, response) {
  if (!response || !response.ok) return;
  var copy = response.clone();
  caches.open(VERSION).then(function (cache) { cache.put(request, copy); });
}
