/**
 * 가본 도시 지도.
 *
 * 크루캘이 같은 브라우저에 저장해 둔 일정을 그대로 읽어 쓴다. 따로 넣을 것도, 보낼 것도
 * 없다. 다른 기기의 일정을 보고 싶으면 백업 파일을 열 수 있는데, 그때도 저장은 하지 않고
 * 화면에만 띄운다. 남의 일정으로 내 저장소를 덮어쓰는 사고를 막기 위해서다.
 */
(function () {
  'use strict';

  var store = window.CrewCal.store;
  var journeys = window.CrewCal.journeys;
  var mapdraw = window.CrewCal.mapdraw;

  var state = {
    entries: null,      // 백업 파일로 본 일정. 없으면 저장소를 쓴다
    source: 'device',
    year: 'all'
  };
  var toastTimer = null;

  function $(id) { return document.getElementById(id); }

  function toast(message) {
    var el = $('toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2600);
  }

  function entriesByDate() {
    return state.entries || store.getAll();
  }

  function range() {
    if (state.year === 'all') return {};
    return { from: state.year + '-01-01', to: state.year + '-12-31' };
  }

  /** 12,345 처럼 자릿수를 끊어 준다. */
  function comma(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function period() {
    return state.year === 'all' ? '지금까지' : state.year + '년';
  }

  function headlineText(totals) {
    if (!totals.cities) return period() + ' 다녀온 곳이 아직 없습니다';
    return period() + ' ' + totals.countries + '개 나라 · ' + totals.cities + '개 도시';
  }

  function sublineText(totals) {
    if (!totals.flights) return '';
    var bits = [totals.trips + '번 다녀왔고, ' + comma(totals.km) + 'km 를 날았습니다'];
    if (totals.laps >= 0.1) bits.push('지구 ' + (Math.round(totals.laps * 10) / 10) + '바퀴');
    return bits.join(' · ');
  }

  /* ---------------- 그리기 ---------------- */

  function colors() {
    var style = getComputedStyle(document.documentElement);
    function token(name, fallback) {
      var value = style.getPropertyValue(name);
      return (value && value.trim()) || fallback;
    }
    return {
      bg: token('--surface', '#ffffff'),
      text: token('--text', '#221f1a'),
      muted: token('--muted', 'rgba(72,66,54,0.62)'),
      faint: token('--faint', 'rgba(72,66,54,0.34)'),
      line: token('--line', 'rgba(72,66,54,0.15)'),
      accent: token('--cat-flight', '#33456e')
    };
  }

  /** 화면 폭에 맞춰 그린다. 폰에서는 세로로 조금 길게 잡아야 도시 이름이 안 겹친다. */
  function canvasSize() {
    var frame = document.querySelector('.map-frame');
    var width = Math.max(320, Math.min(1080, frame.clientWidth || 720));
    var ratio = width < 520 ? 0.78 : 0.6;
    return { width: width, height: Math.round(width * ratio) };
  }

  function drawMap(data, canvas, size, forImage) {
    var box = size || canvasSize();
    var totals = data.totals;
    var target = canvas || $('mapCanvas');
    // 선명하게 그리려고 픽셀은 배로 잡으므로, 화면에 차지할 크기는 따로 일러 준다
    target.style.width = box.width + 'px';
    target.style.height = box.height + 'px';
    return mapdraw.draw(target, {
      data: data,
      colors: colors(),
      width: box.width,
      height: box.height,
      scale: forImage ? 2 : (window.devicePixelRatio || 1),
      labels: box.width < 520 ? 8 : 16,
      title: forImage ? headlineText(totals) : '',
      subtitle: forImage ? sublineText(totals) : '',
      footer: forImage ? '크루캘 · 가본 도시' : ''
    });
  }

  /* ---------------- 화면 ---------------- */

  function renderYears(years) {
    var seg = $('yearSeg');
    seg.textContent = '';
    var options = [{ value: 'all', label: '전체' }].concat(years.map(function (y) {
      return { value: y, label: y.slice(2) + '년' };
    }));
    if (options.length === 1) { seg.hidden = true; return; }
    seg.hidden = false;
    options.forEach(function (option) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'seg-btn' + (option.value === state.year ? ' active' : '');
      button.textContent = option.label;
      button.addEventListener('click', function () {
        state.year = option.value;
        render();
      });
      seg.appendChild(button);
    });
  }

  function renderPlaces(places) {
    var card = $('placeCard');
    var list = $('placeList');
    list.textContent = '';
    if (!places.length) { card.hidden = true; return; }
    card.hidden = false;

    places.forEach(function (place) {
      var li = document.createElement('li');
      li.className = 'place-row';

      var flag = document.createElement('span');
      flag.className = 'place-flag';
      flag.textContent = place.flag || '🏳️';

      var name = document.createElement('span');
      name.className = 'place-name';
      name.textContent = place.city;

      var meta = document.createElement('span');
      meta.className = 'place-meta';
      meta.textContent = place.iata + ' · ' + (place.count > 1
        ? place.firstDate.replace(/-/g, '.') + ' ~ ' + place.lastDate.replace(/-/g, '.')
        : place.lastDate.replace(/-/g, '.'));

      var count = document.createElement('span');
      count.className = 'place-count';
      count.textContent = place.count + '번';

      li.appendChild(flag);
      var text = document.createElement('span');
      text.className = 'place-text';
      text.appendChild(name);
      text.appendChild(meta);
      li.appendChild(text);
      li.appendChild(count);
      list.appendChild(li);
    });
  }

  function render() {
    var byDate = entriesByDate();
    var years = journeys.yearsOf(byDate);
    if (state.year !== 'all' && years.indexOf(state.year) === -1) state.year = 'all';
    renderYears(years);

    var data = journeys.collect(byDate, range());
    state.data = data;

    $('headline').textContent = headlineText(data.totals);
    $('subline').textContent = sublineText(data.totals);
    $('emptyNote').hidden = data.totals.flights > 0;
    $('saveBtn').disabled = !data.totals.cities;

    drawMap(data);
    renderPlaces(data.places);
  }

  /* ---------------- 이미지로 저장 ---------------- */

  function saveImage() {
    var canvas = document.createElement('canvas');
    drawMap(state.data, canvas, { width: 1080, height: 700 }, true);
    var name = 'crew-map-' + (state.year === 'all' ? 'all' : state.year) + '.png';

    if (!canvas.toBlob) { openImageTab(canvas.toDataURL('image/png')); return; }
    canvas.toBlob(function (blob) {
      if (!blob) { toast('그림을 만들지 못했습니다.'); return; }

      var file = null;
      try { file = new File([blob], name, { type: 'image/png' }); } catch (e) { file = null; }
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: headlineText(state.data.totals) })
          .catch(function () { /* 공유창을 닫은 경우 */ });
        return;
      }

      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      if ('download' in a) {
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        toast('이미지를 저장했습니다.');
        return;
      }
      openImageTab(url);
    }, 'image/png');
  }

  function openImageTab(src) {
    var win = window.open('', '_blank');
    if (!win) { toast('새 창이 막혀 있습니다. 허용한 뒤 다시 눌러주세요.'); return; }
    win.document.write('<title>가본 도시</title>' +
      '<body style="margin:0;background:#111"><img src="' + src + '" style="width:100%">');
    win.document.close();
    toast('사진을 길게 눌러 저장하세요.');
  }

  /* ---------------- 백업 파일로 보기 ---------------- */

  function readBackup(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(String(reader.result));
        if (!data || !data.entries) throw new Error('올바른 백업 파일이 아닙니다.');
        state.entries = data.entries;
        state.source = 'file';
        state.year = 'all';
        render();
        toast('백업 파일로 보고 있습니다. 저장하지는 않습니다.');
      } catch (e) {
        toast('불러오기 실패: ' + e.message);
      }
    };
    reader.readAsText(file);
  }

  /* ---------------- 시작 ---------------- */

  function start() {
    $('saveBtn').addEventListener('click', saveImage);
    $('loadBtn').addEventListener('click', function () { $('loadInput').click(); });
    $('loadInput').addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (file) readBackup(file);
      this.value = '';
    });

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { if (state.data) drawMap(state.data); }, 150);
    });

    // 밝은 화면/어두운 화면을 바꾸면 색을 다시 읽어 그린다
    if (window.matchMedia) {
      var dark = window.matchMedia('(prefers-color-scheme: dark)');
      var redraw = function () { if (state.data) drawMap(state.data); };
      if (dark.addEventListener) dark.addEventListener('change', redraw);
      else if (dark.addListener) dark.addListener(redraw);
    }

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
