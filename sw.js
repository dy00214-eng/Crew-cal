/**
 * 비행기 안이나 로밍이 안 되는 곳에서도 열리도록, 앱 파일을 기기에 담아둔다.
 *
 * 방식은 "일단 담아둔 걸 보여주고, 뒤에서 새 파일을 받아 갈아끼우기".
 * 그래서 두 번째로 열 때부터는 네트워크가 없어도 바로 뜨고,
 * 새 버전이 올라오면 다음 번에 열 때 반영된다. 일정 자체는 여기 담기지 않고
 * 브라우저 저장소(localStorage)에 그대로 남는다.
 */
var VERSION = 'crew-cal-v8';
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
  './src/vision.js',
  './src/feedback.js',
  './src/app.js',
  './map/',
  './map/index.html',
  './map/map.css',
  './map/map.js',
  './src/geo.js',
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
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(function (hit) {
      var fresh = fetch(request).then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(VERSION).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      }).catch(function () {
        // 오프라인. 담아둔 게 있으면 그걸 쓰고, 없으면 첫 화면이라도 보여준다.
        return hit || caches.match('./index.html');
      });
      return hit || fresh;
    })
  );
});
