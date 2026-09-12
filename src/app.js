/** 화면 조립: 캘린더 + 3가지 입력 방식(직접 입력 / 붙여넣기 / 스크린샷) */
(function () {
  'use strict';

  var codes = CrewCal.codes;
  var parser = CrewCal.parser;
  var store = CrewCal.store;
  var calendar = CrewCal.calendar;
  var vision = CrewCal.vision;
  var ocr = CrewCal.ocr;
  var feedback = CrewCal.feedback;
  var ics = CrewCal.ics;
  var poster = CrewCal.poster;
  var airports = CrewCal.airports;
  var holidays = CrewCal.holidays;
  var clock = CrewCal.clock;
  var verify = CrewCal.verify;
  var routes = CrewCal.routes;
  var routelookup = CrewCal.routelookup;

  var $ = function (id) { return document.getElementById(id); };

  var state = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    selectedDate: calendar.todayIso(),
    preview: null,
    imageFile: null,
    view: 'calendar',
    hideTimes: {},
    assumeOff: true,
    autoLookup: true,
    cleaning: false,
    cleanupAbort: null,
    backend: null,
    ocrGaps: null,
    analyzing: false,
    abort: null
  };

  var SAMPLE = [
    '2026-09-01\tKE0035\tICN/JFK\t1030-1420',
    '09/02  LO',
    '3  KE0036  JFK/ICN  2350-0620+1',
    '9월 4일 (금)  ATDO',
    '05SEP26  STBY  0900-1700',
    '2026-09-10 ~ 2026-09-12  VAC',
    '2026-09-15',
    '  KE0081  ICN/LAX  STD 1420  STA 0850+1',
    '  LO'
  ].join('\n');

  /* ---------------- 공통 ---------------- */

  var VIEW_KEY = 'crew-cal.view.v1';
  var ASSUME_OFF_KEY = 'crew-cal.assume-off.v1';

  var AIRLINES_KEY = 'crew-cal.airlines.v1';

  /** 편명으로 읽을 항공사. 저장된 값이 없으면 대한항공만. */
  function loadAirlines() {
    try {
      var saved = localStorage.getItem(AIRLINES_KEY);
      if (saved) return codes.setAirlines(saved.split(/[,\s]+/));
    } catch (e) { /* 못 읽으면 기본값 */ }
    return codes.setAirlines(codes.DEFAULT_AIRLINES);
  }

  function saveAirlines(list) {
    try { localStorage.setItem(AIRLINES_KEY, list.join(',')); } catch (e) { /* 무시 */ }
  }

  /** 코드 없는 날을 휴무로 볼지. 기본은 켬. */
  function loadAssumeOff() {
    try {
      var saved = localStorage.getItem(ASSUME_OFF_KEY);
      if (saved === '0') return false;
    } catch (e) { /* 저장소를 못 읽으면 켠 채로 */ }
    return true;
  }

  function saveAssumeOff(on) {
    try { localStorage.setItem(ASSUME_OFF_KEY, on ? '1' : '0'); } catch (e) { /* 무시 */ }
  }

  function loadView() {
    try {
      var saved = localStorage.getItem(VIEW_KEY);
      if (saved === 'list' || saved === 'calendar' || saved === 'year') return saved;
    } catch (e) { /* 저장소를 못 읽으면 달력으로 */ }
    return 'calendar';
  }

  function saveView(view) {
    try { localStorage.setItem(VIEW_KEY, view); } catch (e) { /* 저장 실패는 무시 */ }
  }

  var toastTimer = null;
  function toast(message) {
    var el = $('toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2600);
  }

  function monthLabel(year, month) {
    return year + '년 ' + month + '월';
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function detailText(entry, date) {
    var bits = [];
    var place = calendar.placeLabel(entry);
    if (place) bits.push(place);
    var hidden = date && state.hideTimes[date + '|' + entry.code];
    var times = hidden ? '' : calendar.describeTimes(entry);
    if (times) bits.push(times);
    if (entry.memo) bits.push(entry.memo);
    return bits.join(' · ');
  }

  /** 미리보기 표의 출발/도착 칸. 체류는 달력과 마찬가지로 시각을 쓰지 않는다. */
  function timeCellText(entry, which) {
    if (calendar.skipTime(entry)) return '';
    if (which === 'start') return entry.start || '';
    if (!entry.end) return '';
    return entry.end + (entry.endOffset ? ' (익일)' : '');
  }

  function looksLikeFlight(code) {
    return /^[A-Z]{2}\s?-?\d{1,4}[A-Z]?$/.test(String(code || '').trim().toUpperCase())
      && !codes.lookup(code);
  }

  /* ---------------- 렌더 ---------------- */

  function refresh() {
    var entriesByDate = store.getAll();
    // 편명 -> 노선 세 단계. 1·2단계로 안 풀린 편명만 모아 3단계로 넘긴다.
    var unresolved = routes.apply(entriesByDate);
    // 이어진 날의 같은 편은 한 비행이다. 편수도 표시도 그에 맞춘다.
    routes.linkDays(entriesByDate, CrewCal.resolve);
    markPending(entriesByDate);
    $('monthLabel').textContent = monthLabel(state.year, state.month);

    state.hideTimes = calendar.suppressedTimes(entriesByDate);

    var viewOptions = {
      year: state.year,
      month: state.month,
      entriesByDate: entriesByDate,
      selectedDate: state.selectedDate,
      hideTimes: state.hideTimes,
      assumeOff: state.assumeOff,
      onSelect: selectDate
    };

    var mode = state.view;
    $('calendar').hidden = mode !== 'calendar';
    $('listView').hidden = mode !== 'list';
    $('yearView').hidden = mode !== 'year';
    if (mode === 'list') calendar.renderList($('listView'), viewOptions);
    else if (mode === 'year') calendar.renderYear($('yearView'), { year: state.year, entriesByDate: entriesByDate, onSelect: goToDate });
    else calendar.render($('calendar'), viewOptions);

    askForRoutes(unresolved);

    // 연간 화면에서는 달 이름 대신 해를 보여준다
    if (mode === 'year') $('monthLabel').textContent = state.year + '년';
    renderYearSummary(mode === 'year' ? entriesByDate : null);

    renderMonthSummary(entriesByDate);
    renderNextDuty(entriesByDate);
    renderDayDetail();
  }

  /* ---------------- 편명 노선 자동 조회 (3단계) ---------------- */

  var LOOKUP_KEY = 'crew-cal.auto-lookup.v1';

  function loadAutoLookup() {
    try {
      if (localStorage.getItem(LOOKUP_KEY) === '0') return false;
    } catch (e) { /* 못 읽으면 켠 채로 */ }
    return true;
  }

  function saveAutoLookup(on) {
    try { localStorage.setItem(LOOKUP_KEY, on ? '1' : '0'); } catch (e) { /* 무시 */ }
  }

  /** 지금 물어보고 있는 편은 그 칸만 '조회 중' 으로 둔다. 달력은 막지 않는다. */
  function markPending(entriesByDate) {
    Object.keys(entriesByDate).forEach(function (date) {
      entriesByDate[date].forEach(function (entry) {
        entry.routePending = !entry.routeSource && entry.type === 'flight' &&
          !entry.strange && routelookup.pending(entry.code);
      });
    });
  }

  var lookupRunning = false;

  /** 못 푼 편명을 한꺼번에 물어본다. 결과가 오는 대로 다시 그린다. */
  function askForRoutes(codes) {
    if (!state.autoLookup || lookupRunning || !codes || !codes.length) return;
    lookupRunning = true;
    routelookup.run(codes, function (code, found) {
      refreshRouteCache();
      if (found) refresh();
    }).then(function (out) {
      lookupRunning = false;
      if (out.filled) toast('노선을 못 찾던 편 ' + out.filled + '개를 찾아 채웠습니다.');
      refresh();
    }).catch(function () {
      lookupRunning = false;
    });
  }

  /** 캐시에 든 노선 목록. 직접 고칠 수 있다. */
  function refreshRouteCache() {
    var list = routes.cacheList();
    $('routeCacheCount').textContent = list.length;
    var box = $('routeCacheList');
    box.innerHTML = '';
    if (!list.length) {
      var empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = '아직 없습니다.';
      box.appendChild(empty);
      return;
    }
    list.forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'route-row';

      var code = document.createElement('span');
      code.className = 'code';
      code.textContent = item.code;
      row.appendChild(code);

      var input = document.createElement('input');
      input.type = 'text';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.placeholder = 'ICN/KIX';
      input.value = item.from && item.to ? item.from + '/' + item.to : '';
      input.addEventListener('change', function () {
        var parts = airports.splitRoute(input.value.replace(/\s+/g, ''));
        var from = airports.findCode(parts.from);
        var to = airports.findCode(parts.to);
        if (!from || !to) return toast('ICN/KIX 처럼 넣어 주세요.');
        routes.remember(item.code, from, to, 'user');
        refreshRouteCache();
        refresh();
        toast(item.code + ' 노선을 ' + from + '/' + to + ' 로 바꿨습니다.');
      });
      row.appendChild(input);

      var tag = document.createElement('span');
      tag.className = 'tag' + (item.fail ? ' fail' : '');
      tag.textContent = item.fail ? '못 찾음' : (item.source === 'user' ? '직접' : '조회');
      row.appendChild(tag);

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'icon-btn';
      del.title = '지우기';
      del.setAttribute('aria-label', item.code + ' 지우기');
      del.textContent = '\u00D7';
      del.addEventListener('click', function () {
        routes.forget(item.code);
        refreshRouteCache();
        refresh();
      });
      row.appendChild(del);

      box.appendChild(row);
    });
  }

  function initRouteLookup() {
    var box = $('autoLookup');
    state.autoLookup = loadAutoLookup();
    if (box) {
      box.checked = state.autoLookup;
      box.addEventListener('change', function () {
        state.autoLookup = box.checked;
        saveAutoLookup(state.autoLookup);
        if (state.autoLookup) refresh();
      });
    }
    $('routeCacheClear').addEventListener('click', function () {
      routes.forgetAll();
      refreshRouteCache();
      refresh();
      toast('저장해 둔 노선을 지웠습니다.');
    });
    refreshRouteCache();
  }

  function renderMonthSummary(entriesByDate) {
    var s = calendar.summarize(entriesByDate, state.year, state.month, { assumeOff: state.assumeOff });
    var box = $('monthSummary');
    box.innerHTML = '';

    // 일정이 없는 달에도 알려야 하므로 요약보다 먼저 붙인다
    if (!holidays.covered(state.year)) {
      var range = holidays.coveredRange();
      var note = document.createElement('div');
      note.className = 'sum-cities';
      note.textContent = state.year + '년은 설날·추석 같은 음력 공휴일이 안 들어 있습니다' +
        (range ? ' (' + range.from + '~' + range.to + '년만 들어 있음).' : '.');
      box.appendChild(note);
    }

    if (!s.days) return;

    var bits = [];
    // 비행은 몇 편인지가, 나머지는 며칠인지가 궁금한 값이다
    if (s.flights) bits.push(['비행', s.flights + '편']);
    ['layover', 'standby', 'training', 'vacation', 'off', 'other', 'unknown'].forEach(function (key) {
      if (!s.dayCounts[key]) return;
      // 코드가 없어 휴무로 넘겨짚은 날은 몇 날인지 갈라 적는다
      var suffix = (key === 'off' && s.assumedOff) ? '일 (추정 ' + s.assumedOff + '일 포함)' : '일';
      bits.push([codes.CATEGORY_LABELS[key], s.dayCounts[key] + suffix]);
    });
    bits.push(['일정 있는 날', s.days + '일']);

    bits.forEach(function (pair, i) {
      if (i) {
        var dot = document.createElement('span');
        dot.className = 'sum-item';
        dot.setAttribute('aria-hidden', 'true');
        dot.textContent = '·';
        box.appendChild(dot);
      }
      var item = document.createElement('span');
      item.className = 'sum-item';
      item.appendChild(document.createTextNode(pair[0] + ' '));
      var strong = document.createElement('b');
      strong.textContent = pair[1];
      item.appendChild(strong);
      box.appendChild(item);
    });

    if (s.cities.length) {
      var line = document.createElement('div');
      line.className = 'sum-cities';
      line.textContent = '간 곳 · ' + s.cities.map(function (c) {
        return (c.flag ? c.flag + ' ' : '') + c.city;
      }).join(', ');
      box.appendChild(line);
    }
  }

  /** 연간 보기 아래에 한 해를 정리해 붙인다. 어디를 몇 번 갔는지가 궁금한 자리다. */
  function renderYearSummary(entriesByDate) {
    var box = $('yearSummary');
    if (!box) return;
    box.innerHTML = '';
    if (!entriesByDate) { box.hidden = true; return; }

    var s = calendar.summarizeYear(entriesByDate, state.year);
    box.hidden = false;
    if (!s.days) {
      var empty = document.createElement('div');
      empty.className = 'sum-cities';
      empty.textContent = state.year + '년에 등록된 일정이 없습니다.';
      box.appendChild(empty);
      return;
    }

    var bits = [];
    if (s.flights) bits.push(['비행', s.flights + '편']);
    ['layover', 'standby', 'training', 'vacation', 'off', 'other', 'unknown'].forEach(function (key) {
      if (s.dayCounts[key]) bits.push([codes.CATEGORY_LABELS[key], s.dayCounts[key] + '일']);
    });
    bits.push(['일정 있는 날', s.days + '일']);

    bits.forEach(function (pair, i) {
      if (i) {
        var dot = document.createElement('span');
        dot.className = 'sum-item';
        dot.setAttribute('aria-hidden', 'true');
        dot.textContent = '·';
        box.appendChild(dot);
      }
      var item = document.createElement('span');
      item.className = 'sum-item';
      item.appendChild(document.createTextNode(pair[0] + ' '));
      var strong = document.createElement('b');
      strong.textContent = pair[1];
      item.appendChild(strong);
      box.appendChild(item);
    });

    if (s.places.length) {
      var line = document.createElement('div');
      line.className = 'sum-cities';
      line.textContent = '다녀온 곳 · ' + s.places.map(function (p) {
        return (p.flag ? p.flag + ' ' : '') + p.city + ' ' + p.count + '번';
      }).join(', ');
      box.appendChild(line);
    }
  }

  /* ---------------- 지난 일정 찾기 ---------------- */

  function renderSearch(query) {
    var box = $('searchResults');
    var text = String(query || '').trim();
    $('searchClear').hidden = !text;
    if (!text) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }

    var hits = calendar.search(store.getAll(), text, 60);
    box.innerHTML = '';
    box.hidden = false;

    if (!hits.length) {
      var none = document.createElement('p');
      none.className = 'sr-empty';
      none.textContent = '"' + text + '" 으로 찾은 일정이 없습니다.';
      box.appendChild(none);
      return;
    }

    var count = document.createElement('p');
    count.className = 'sr-count';
    count.textContent = hits.length + '건 (최근 것부터)';
    box.appendChild(count);

    hits.forEach(function (hit) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'sr-item';

      var date = document.createElement('span');
      date.className = 'sr-date';
      date.textContent = hit.date.slice(2).replace(/-/g, '.') + ' (' + calendar.weekdayOf(hit.date) + ')';
      item.appendChild(date);

      var chip = document.createElement('span');
      chip.className = 'chip cat-' + (hit.entry.category || 'other');
      chip.textContent = hit.entry.code;
      item.appendChild(chip);

      var what = document.createElement('span');
      what.className = 'sr-what';
      what.textContent = [
        calendar.placeLabel(hit.entry) || hit.entry.label || '',
        calendar.describeTimes(hit.entry)
      ].filter(Boolean).join(' · ');
      item.appendChild(what);

      item.addEventListener('click', function () { goToDate(hit.date); });
      box.appendChild(item);
    });
  }

  function initSearch() {
    var input = $('searchInput');
    if (!input) return;
    var timer = null;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { renderSearch(input.value); }, 120);
    });
    $('searchClear').addEventListener('click', function () {
      input.value = '';
      renderSearch('');
      input.focus();
    });
  }

  function renderDayDetail() {
    var date = state.selectedDate;
    var list = store.getByDate(date);
    var holiday = holidays.nameOf(date);
    $('dayTitle').textContent = date + ' (' + calendar.weekdayOf(date) + ')' +
      (holiday ? ' · ' + holiday : '') + ' · ' + list.length + '건';
    renderLocalClock(date);

    var ul = $('dayList');
    ul.innerHTML = '';
    if (!list.length) {
      var empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = '등록된 일정이 없습니다.';
      ul.appendChild(empty);
      return;
    }

    list.forEach(function (entry) {
      var li = document.createElement('li');

      var chip = document.createElement('span');
      chip.className = 'chip cat-' + (entry.category || 'other');
      chip.textContent = entry.code;
      li.appendChild(chip);

      var main = document.createElement('span');
      main.className = 'entry-main';
      main.textContent = entry.label || '';
      var detail = detailText(entry, date);
      if (detail) {
        var sub = document.createElement('span');
        sub.className = 'entry-sub';
        sub.textContent = ' ' + detail;
        main.appendChild(sub);
      }
      li.appendChild(main);

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'icon-btn';
      del.title = '삭제';
      del.setAttribute('aria-label', entry.code + ' 삭제');
      del.textContent = '×';
      del.addEventListener('click', function () {
        store.removeEntry(date, entry.id);
        refresh();
        toast('삭제했습니다.');
      });
      li.appendChild(del);

      ul.appendChild(li);
    });
  }

  function selectDate(date) {
    state.selectedDate = date;
    $('singleDate').value = date;
    refresh();
  }

  function goMonth(delta) {
    // 연간 화면에서는 화살표가 해를 넘긴다
    if (state.view === 'year') {
      state.year += delta;
      syncPasteBase();
      refresh();
      return;
    }
    var m = state.month + delta;
    var y = state.year;
    while (m > 12) { m -= 12; y++; }
    while (m < 1) { m += 12; y--; }
    state.year = y;
    state.month = m;
    syncPasteBase();
    refresh();
  }

  function syncPasteBase() {
    $('pasteBase').value = state.year + '-' + pad2(state.month);
  }

  /* ---------------- 탭 ---------------- */

  function initViewToggle() {
    state.view = loadView();
    Array.prototype.forEach.call(document.querySelectorAll('.seg-btn'), function (btn) {
      btn.addEventListener('click', function () {
        state.view = btn.getAttribute('data-view');
        saveView(state.view);
        syncViewButtons();
        refresh();
      });
    });
    syncViewButtons();
  }

  /** 코드 없는 날을 휴무로 볼지 켜고 끈다. */
  function initAssumeOff() {
    var box = $('assumeOff');
    state.assumeOff = loadAssumeOff();
    if (!box) return;
    box.checked = state.assumeOff;
    box.addEventListener('change', function () {
      state.assumeOff = box.checked;
      saveAssumeOff(state.assumeOff);
      refresh();
    });
  }

  /** 편명으로 읽을 항공사를 고친다. 이미 저장된 일정은 건드리지 않는다. */
  function initAirlines() {
    var box = $('airlineList');
    var current = loadAirlines();
    if (!box) return;
    box.value = current.join(', ');
    box.addEventListener('change', function () {
      var next = codes.setAirlines(box.value.split(/[,\s]+/));
      saveAirlines(next);
      box.value = next.join(', ');
      refresh();
      toast('편명으로 읽을 항공사: ' + next.join(', ') + ' (다음 인식부터 반영됩니다)');
    });
  }

  function syncViewButtons() {
    Array.prototype.forEach.call(document.querySelectorAll('.seg-btn'), function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-view') === state.view);
    });
  }

  function initTabs() {
    var tabs = document.querySelectorAll('.tab');
    Array.prototype.forEach.call(tabs, function (tab) {
      tab.addEventListener('click', function () { showTab(tab.getAttribute('data-tab')); });
    });
  }

  function showTab(name) {
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.panel'), function (p) {
      p.classList.toggle('active', p.id === 'panel-' + name);
    });
  }

  /* ---------------- 1) 날짜별 개별 입력 ---------------- */

  function initSingleForm() {
    var datalist = $('codeList');
    codes.knownCodeList().forEach(function (code) {
      var opt = document.createElement('option');
      opt.value = code;
      opt.label = codes.DUTY_CODES[code].label;
      datalist.appendChild(opt);
    });

    $('singleDate').value = state.selectedDate;
    $('singleDate').addEventListener('change', function () {
      if (this.value) selectDate(this.value);
    });

    $('singleCode').addEventListener('input', syncTimeLabels);
    $('singleEnd').addEventListener('input', syncNextDayBox);
    syncTimeLabels();

    $('singleForm').addEventListener('submit', function (event) {
      event.preventDefault();
      var date = $('singleDate').value;
      var code = $('singleCode').value.trim().toUpperCase();
      if (!date || !code) return;

      try {
        store.addEntry({
          date: date,
          code: code,
          route: $('singleRoute').value.trim().toUpperCase() || null,
          start: $('singleStart').value || null,
          end: $('singleEnd').value || null,
          endOffset: ($('singleEnd').value && $('singleNextDay').checked) ? 1 : 0,
          memo: $('singleMemo').value.trim() || null
        });
      } catch (e) {
        toast(e.message);
        return;
      }

      state.selectedDate = date;
      state.year = +date.slice(0, 4);
      state.month = +date.slice(5, 7);

      $('singleCode').value = '';
      $('singleRoute').value = '';
      $('singleStart').value = '';
      $('singleEnd').value = '';
      $('singleNextDay').checked = false;
      $('singleMemo').value = '';
      syncTimeLabels();
      $('singleCode').focus();

      syncPasteBase();
      refresh();
        toast(date + ' 에 ' + code + ' 추가');
    });
  }

  /** 편명이면 출발/도착, 그 밖의 근무면 시작/종료로 라벨을 바꾼다. */
  function syncTimeLabels() {
    var flight = looksLikeFlight($('singleCode').value);
    $('startLabel').innerHTML = (flight ? '출발 시각' : '시작 시각') + ' <em>(선택)</em>';
    $('endLabel').innerHTML = (flight ? '도착 시각' : '종료 시각') + ' <em>(선택)</em>';
    syncNextDayBox();
  }

  function syncNextDayBox() {
    var box = $('singleNextDay');
    var hasEnd = !!$('singleEnd').value;
    box.disabled = !hasEnd;
    if (!hasEnd) box.checked = false;
  }

  /* ---------------- 2) 붙여넣기 ---------------- */

  function initPaste() {
    syncPasteBase();

    $('sampleBtn').addEventListener('click', function () {
      $('pasteInput').value = SAMPLE;
      $('pasteBase').value = '2026-09';
      runParse();
    });

    $('clearPasteBtn').addEventListener('click', function () {
      $('pasteInput').value = '';
      setPasteStatus('', '');
      hidePreview();
    });

    $('parseBtn').addEventListener('click', runParse);
    $('cleanupBtn').addEventListener('click', runCleanup);

    // 텍스트 정리는 Claude 를 부를 수 있는 화면에서만 쓸 수 있다
    vision.canCleanupText().then(function (usable) {
      $('cleanupBtn').hidden = !usable;
    });
    $('cancelPreviewBtn').addEventListener('click', function () {
      hidePreview();
      toast('반영을 취소했습니다.');
    });
    $('applyBtn').addEventListener('click', applyPreview);

    $('checkAll').addEventListener('change', function () {
      var on = this.checked;
      Array.prototype.forEach.call(document.querySelectorAll('#previewBody input[type=checkbox]'), function (cb) {
        cb.checked = on;
      });
      updateApplyButton();
    });
  }

  function setPasteStatus(message, kind) {
    var el = $('pasteStatus');
    el.textContent = message;
    el.className = 'status' + (kind ? ' ' + kind : '');
  }

  /**
   * 사진 앱에서 인식한 글자나 화면을 통째로 복사한 글은 줄이 뒤섞여 있다.
   * Claude 에게 날짜 + 코드 형식으로 다시 정리해 달라고 한 뒤 그대로 미리보기에 태운다.
   */
  function runCleanup() {
    if (state.cleaning) {
      if (state.cleanupAbort) state.cleanupAbort.abort();
      return;
    }

    var text = $('pasteInput').value;
    if (!text.trim()) {
      setPasteStatus('정리할 내용이 없습니다. 먼저 텍스트를 붙여넣으세요.', 'error');
      return;
    }

    var base = baseYearMonth();
    state.cleanupAbort = typeof AbortController === 'function' ? new AbortController() : null;
    state.cleaning = true;
    $('cleanupBtn').textContent = '중지';
    $('parseBtn').disabled = true;
    setPasteStatus('Claude 가 정리하는 중… 10~60초쯤 걸립니다.', '');

    vision.cleanupText(text, {
      year: base.year,
      month: base.month,
      signal: state.cleanupAbort ? state.cleanupAbort.signal : null,
      onText: function (chunk) {
        var lines = String(chunk.text || '').split('\n').filter(function (l) { return l.trim(); }).length;
        setPasteStatus('정리하는 중… ' + lines + '줄', '');
      }
    }).then(function (cleaned) {
      $('pasteInput').value = cleaned;
      runParse();
      setPasteStatus('정리한 내용으로 미리보기를 만들었습니다. 확인하고 반영하세요.', 'ok');
    }, function (err) {
      if (err && err.code === 'CANCELLED') {
        setPasteStatus('중지했습니다.', '');
        return;
      }
      setPasteStatus(err.message, 'error');
    }).then(function () {
      state.cleaning = false;
      state.cleanupAbort = null;
      $('cleanupBtn').textContent = 'Claude로 정리';
      $('parseBtn').disabled = false;
    });
  }

  function baseYearMonth() {
    var raw = $('pasteBase').value;
    if (/^\d{4}-\d{2}$/.test(raw)) {
      return { year: +raw.slice(0, 4), month: +raw.slice(5, 7) };
    }
    return { year: state.year, month: state.month };
  }

  function runParse(keepGaps) {
    if (!keepGaps) state.ocrGaps = null;
    var text = $('pasteInput').value;
    if (!text.trim()) {
      hidePreview();
      toast('붙여넣은 내용이 없습니다.');
      return;
    }
    var base = baseYearMonth();
    var result = parser.parse(text, base);
    // 미리보기에도 노선을 채워 보여준다. 1·2단계만 — 조회(3단계)는 달력에 반영한 뒤에 돈다.
    var byDate = {};
    result.entries.forEach(function (entry) {
      (byDate[entry.date] = byDate[entry.date] || []).push(entry);
    });
    routes.apply(byDate);
    showPreview(result);
  }

  function showPreview(result) {
    state.preview = result;

    if (!result.entries.length) {
      hidePreview();
      toast('날짜와 코드를 찾지 못했습니다. 형식을 확인해 주세요.');
      return;
    }

    // 원본에 구간이 없어 시드·대역으로 채운 건수. 점선을 그어 구분해 준다.
    var autoFilled = result.entries.filter(function (e) { return e.routeSource === 'db'; }).length;
    var s = result.stats;
    $('previewSummary').innerHTML =
      '<b>' + s.dateCount + '일</b> · <b>' + s.entryCount + '건</b>' +
      (s.firstDate ? ' · ' + s.firstDate + ' ~ ' + s.lastDate : '') +
      (result.warnings.length ? ' · 확인 필요 ' + result.warnings.length + '건' : '');

    // 한국 쪽 시각을 모르는 편을 짚어준다. 등록해두면 다음부터 자동으로 붙는다.
    var noTime = {};
    result.entries.forEach(function (e) {
      if (e.type === 'flight' && !calendar.formatTimeRange(e)) noTime[e.code] = true;
    });
    var noTimeList = Object.keys(noTime).sort();

    var memoBox = $('previewMemo');
    if (autoFilled) {
      memoBox.textContent = '원본에 구간이 없어 ' + autoFilled + '건을 편명으로 채웠습니다(노선표와 등록해둔 값). ' +
        '점선 친 칸이 채워 넣은 값이니 확인하고, 다르면 텍스트에 직접 적어주세요.';
      memoBox.hidden = false;
    } else {
      memoBox.hidden = true;
    }

    showMissingDays();

    var gapBox = $('previewGaps');
    if (noTimeList.length) {
      gapBox.textContent = '시각을 모르는 편: ' + noTimeList.join(', ') +
        ' — 아래 "편명 시각"에 한 줄씩 등록하면 다음부터 자동으로 붙습니다.';
      gapBox.hidden = false;
    } else {
      gapBox.hidden = true;
    }

    var warnBox = $('previewWarnings');
    if (result.warnings.length) {
      var items = result.warnings.slice(0, 8).map(function (w) {
        return '<li>' + w.line + '행: ' + escapeHtml(w.message) + ' <code>' + escapeHtml(w.text) + '</code></li>';
      }).join('');
      var more = result.warnings.length > 8 ? '<li>… 외 ' + (result.warnings.length - 8) + '건</li>' : '';
      warnBox.innerHTML = '확인이 필요한 줄이 있습니다.<ul>' + items + more + '</ul>';
      warnBox.hidden = false;
    } else {
      warnBox.hidden = true;
      warnBox.innerHTML = '';
    }

    var skipped = result.skippedLines || [];
    $('previewSkipped').hidden = skipped.length === 0;
    $('skippedCount').textContent = skipped.length;
    var skippedList = $('skippedList');
    skippedList.innerHTML = '';
    skipped.slice(0, 40).forEach(function (item) {
      var li = document.createElement('li');
      li.textContent = item.line + '행: ' + item.text;
      skippedList.appendChild(li);
    });
    if (skipped.length > 40) {
      var more = document.createElement('li');
      more.textContent = '… 외 ' + (skipped.length - 40) + '줄';
      skippedList.appendChild(more);
    }

    var tbody = $('previewBody');
    tbody.innerHTML = '';
    result.entries.forEach(function (entry) {
      var tr = document.createElement('tr');
      if (!entry.known) tr.className = 'unknown-row';

      var tdCheck = document.createElement('td');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = entry.known !== false; // 미확인 코드는 기본 해제
      cb.setAttribute('data-entry-id', entry.id);
      cb.addEventListener('change', updateApplyButton);
      tdCheck.appendChild(cb);
      tr.appendChild(tdCheck);

      tr.appendChild(cell(entry.date + ' (' + calendar.weekdayOf(entry.date) + ')'));

      var tdCode = document.createElement('td');
      var chip = document.createElement('span');
      chip.className = 'chip cat-' + (entry.category || 'other');
      chip.textContent = entry.code;
      tdCode.appendChild(chip);
      tr.appendChild(tdCode);

      tr.appendChild(cell(entry.label || ''));
      tr.appendChild(autoCell(calendar.placeLabel(entry) || entry.route || '', entry, 'route'));
      tr.appendChild(autoCell(timeCellText(entry, 'start'), entry, 'start'));
      tr.appendChild(autoCell(timeCellText(entry, 'end'), entry, 'end'));

      var tdSrc = cell(entry.source || '');
      tdSrc.className = 'src';
      tdSrc.title = entry.source || '';
      tr.appendChild(tdSrc);

      tbody.appendChild(tr);
    });

    $('checkAll').checked = result.entries.every(function (e) { return e.known !== false; });
    $('preview').hidden = false;
    updateApplyButton();
    $('preview').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    function cell(text) {
      var td = document.createElement('td');
      td.textContent = text;
      return td;
    }

    /** 원본이 아니라 노선표로 채운 칸은 점선을 그어 구분한다. */
    function autoCell(text, entry, field) {
      var td = cell(text);
      if (field === 'route' && entry.routeSource && entry.routeSource !== 'original') {
        td.className = 'auto-filled';
        td.title = entry.code + ' 의 구간을 ' +
          (entry.routeSource === 'lookup' ? '자동으로 찾아' : '노선표에서') + ' 채웠습니다.';
      }
      return td;
    }
  }

  /**
   * 읽기에 실패한 날이 있으면 알리고 반영을 막는다.
   * 크루넷 달력은 날마다 코드가 있으니, 빈 날은 못 읽은 날이다.
   * 조용히 반영해 버리면 그 날이 '추정 휴무' 로 덮여 잘못을 알아볼 수 없다.
   */
  function showMissingDays() {
    var box = $('previewMissing');
    var apply = $('applyBtn');
    var gaps = state.ocrGaps;
    if (!gaps || (!gaps.missingDays.length && !gaps.strayDays.length)) {
      box.hidden = true;
      apply.disabled = false;
      apply.title = '';
      return;
    }
    var parts = [];
    if (gaps.missingDays.length) {
      parts.push('못 읽은 날 ' + gaps.missingDays.length + '일: ' +
        gaps.missingDays.join(', ') + '일');
    }
    if (gaps.strayDays.length) {
      parts.push('칸 가르기가 어긋났습니다(' +
        gaps.strayDays.map(function (x) { return x.day + '일 칸에 "' + x.token + '"'; }).join(', ') + ')');
    }
    box.textContent = parts.join(' · ') +
      ' — 더 또렷하게 다시 찍거나, 아래 글을 직접 고친 뒤 다시 읽기를 누르세요.';
    box.hidden = false;
    apply.disabled = true;
    apply.title = '못 읽은 날이 있어 반영할 수 없습니다.';
  }

  function hidePreview() {
    state.preview = null;
    $('preview').hidden = true;
    $('previewBody').innerHTML = '';
    $('previewSkipped').hidden = true;
    $('previewGaps').hidden = true;
  }

  function selectedPreviewEntries() {
    if (!state.preview) return [];
    var checked = {};
    Array.prototype.forEach.call(document.querySelectorAll('#previewBody input[type=checkbox]'), function (cb) {
      if (cb.checked) checked[cb.getAttribute('data-entry-id')] = true;
    });
    return state.preview.entries.filter(function (e) { return checked[e.id]; });
  }

  function updateApplyButton() {
    var n = selectedPreviewEntries().length;
    var btn = $('applyBtn');
    btn.disabled = n === 0;
    btn.textContent = n ? '캘린더에 반영 (' + n + '건)' : '캘린더에 반영';
  }

  function applyPreview() {
    var entries = selectedPreviewEntries();
    if (!entries.length) return;

    var mode = document.querySelector('input[name=applyMode]:checked').value;
    // 덮어쓰기는 그 달을 읽은 대로 새로 맞춘다. 예전에 잘못 들어간 날이 남지 않도록.
    var opts = mode === 'replace' ? { clearMonth: entries[0].date.slice(0, 7) } : {};
    if (mode === 'replace') {
      var span = store.dateSpan(entries, opts);
      var existing = store.countInRange(span);
      if (existing > 0) {
        var what = opts.clearMonth
          ? opts.clearMonth.replace('-', '년 ') + '월 전체'
          : span.from + ' ~ ' + span.to;
        var ok = window.confirm(what + ' 의 기존 일정 ' + existing + '건을 지우고 ' +
          entries.length + '건으로 새로 맞춥니다. 계속할까요?');
        if (!ok) return;
      }
    }

    var res = store.applyEntries(entries, mode, opts);
    assertStoredMatchesPreview(entries, mode);
    var first = entries[0].date;
    state.year = +first.slice(0, 4);
    state.month = +first.slice(5, 7);
    state.selectedDate = first;
    $('singleDate').value = first;

    hidePreview();
    syncPasteBase();
    refresh();
    toast(res.added + '건 반영' + (res.removed ? ' · 기존 ' + res.removed + '건 교체' : ''));
  }

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------------- 3) 스크린샷 업로드 ---------------- */

  function initImage() {
    var config = vision.loadConfig();
    $('visionEndpoint').value = config.endpoint;
    $('visionModel').value = config.model;

    refreshBackend();

    var dropZone = $('dropZone');
    var input = $('imageInput');

    dropZone.addEventListener('click', function () { input.click(); });
    dropZone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    ['dragenter', 'dragover'].forEach(function (type) {
      dropZone.addEventListener(type, function (e) {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach(function (type) {
      dropZone.addEventListener(type, function (e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
      });
    });
    dropZone.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        setImageFile(e.dataTransfer.files[0]);
      }
    });
    input.addEventListener('change', function () {
      if (input.files && input.files.length) setImageFile(input.files[0]);
    });

    $('removeImageBtn').addEventListener('click', clearImage);
    $('analyzeBtn').addEventListener('click', runAnalyze);

    $('saveVisionConfig').addEventListener('click', function () {
      var saved = vision.saveConfig({
        endpoint: $('visionEndpoint').value,
        model: $('visionModel').value
      });
      $('visionEndpoint').value = saved.endpoint;
      $('visionModel').value = saved.model;
      refreshBackend();
      toast(saved.endpoint ? '연동 설정을 저장했습니다.' : '엔드포인트를 비웠습니다.');
    });

    updateAnalyzeButton();
  }

  /** 이미지 인식을 어느 경로로 할 수 있는지 확인하고 안내 문구를 맞춘다. */
  function refreshBackend() {
    setStatus('이미지 인식을 쓸 수 있는지 확인하는 중…', '');
    vision.resolveBackend().then(function (backend) {
      // 부를 곳이 없으면 기기 안에서 읽는다. 서버도 키도 없이 되는 마지막 길이다.
      // 인식기 파일은 주소가 있는 웹 버전에만 딸려 있으므로 거기서만 쓴다.
      if (backend.kind === 'none' && ocr && ocr.available() && isWebBuild()) {
        backend = { kind: 'ocr' };
      }
      state.backend = backend;
      updateAnalyzeButton();
      $('imageFallback').hidden = true;
      if (backend.kind === 'sample') {
        setStatus('Claude 가 이미지를 바로 읽습니다. 스케줄 화면을 올려보세요.', 'ok');
      } else if (backend.kind === 'endpoint') {
        setStatus('설정해 둔 인식 서버로 보냅니다.', 'ok');
      } else if (backend.kind === 'ocr') {
        setStatus('이 기기 안에서 글자를 읽습니다. 사진은 어디로도 보내지 않습니다.', 'ok');
      } else {
        setStatus(unavailableMessage(backend.reason), 'error');
        showFallbackGuide();
      }
    });
  }

  /** 인식이 안 될 때, 손으로 옮기는 두 가지 방법을 펼쳐 보여준다. */
  function showFallbackGuide() {
    $('imageFallback').hidden = false;
    vision.diagnose().then(function (d) {
      var bits = [];
      bits.push('뷰어 연결 ' + (d.runtime ? '있음' : (d.legacy ? '옛 방식' : '없음')));
      if (d.runtime) {
        bits.push('Claude 호출 ' + (d.sample ? '가능' : '불가'));
        bits.push('이미지 전송 ' + (d.images ? '가능' : '불가'));
      }
      $('imageDiag').textContent = '진단: ' + bits.join(' · ');
    });
  }

  /** 이미지 인식을 못 쓸 때, 원인별로 다음에 뭘 하면 되는지 알려준다. */
  function unavailableMessage(reason) {
    if (reason === 'no-images') {
      return '지금 보고 있는 화면에서는 이미지를 보낼 수 없습니다. claude.ai 를 웹 브라우저에서 열어 같은 링크로 들어오면 됩니다. ' +
        '아니면 스케줄 스크린샷을 Claude 대화창에 보내 텍스트로 받은 뒤, 붙여넣기 탭에 넣으세요.';
    }
    if (reason === 'no-sample') {
      return '지금 보고 있는 화면에서는 Claude 를 부를 수 없습니다. claude.ai 를 웹 브라우저에서 열어 같은 링크로 들어오면 됩니다. ' +
        '아니면 스케줄 스크린샷을 Claude 대화창에 보내 텍스트로 받은 뒤, 붙여넣기 탭에 넣으세요.';
    }
    return '이 화면은 Claude 아티팩트가 아니라 이미지 인식을 쓸 수 없습니다. ' +
      '붙여넣기 탭을 쓰거나, 직접 서버를 운영한다면 아래 설정에 그 주소를 넣으세요.';
  }

  function setImageFile(file) {
    var invalid = state.backend && state.backend.kind === 'ocr'
      ? validateForOcr(file)
      : vision.validateFile(file, state.backend);
    if (invalid) {
      setStatus(invalid, 'error');
      return;
    }
    state.imageFile = file;
    $('imageName').textContent = file.name + ' · ' + Math.round(file.size / 1024) + 'KB';
    vision.fileToBase64(file).then(function (image) {
      $('imageThumb').src = image.dataUrl;
      $('imagePreview').hidden = false;
    });
    setStatus('', '');
    updateAnalyzeButton();
  }

  /** 기기 안에서 읽을 때의 검사. 보내는 게 아니라 용량은 넉넉히 받는다. */
  function validateForOcr(file) {
    if (!file) return '이미지를 선택하세요.';
    if (file.type.indexOf('image/') !== 0) return '이미지 파일만 올릴 수 있습니다.';
    if (file.size > 25 * 1024 * 1024) return '25MB 이하 이미지만 읽을 수 있습니다.';
    return null;
  }

  function clearImage() {
    state.imageFile = null;
    $('imageInput').value = '';
    $('imageThumb').removeAttribute('src');
    $('imagePreview').hidden = true;
    setStatus('', '');
    updateAnalyzeButton();
  }

  function updateAnalyzeButton() {
    var btn = $('analyzeBtn');

    if (state.analyzing) {
      btn.disabled = false;
      btn.textContent = '중지';
      btn.title = '';
      return;
    }

    btn.textContent = '이미지에서 일정 읽기';

    if (!state.backend) {              // 아직 확인 중
      btn.disabled = true;
      btn.title = '';
      return;
    }

    var usable = state.backend.kind !== 'none';
    btn.disabled = !state.imageFile || !usable;
    // 못 쓰는 이유 안내는 refreshBackend 가 이미 띄워 두었으므로 여기서 덮어쓰지 않는다.
    btn.title = usable ? '' : '이미지 인식을 쓸 수 없는 화면입니다.';
  }

  function setStatus(message, kind) {
    var el = $('imageStatus');
    el.textContent = message;
    el.className = 'status' + (kind ? ' ' + kind : '');
  }

  function runAnalyze() {
    if (state.analyzing) {                 // 다시 누르면 중지
      if (state.abort) state.abort.abort();
      return;
    }
    if (!state.imageFile) return;

    var base = baseYearMonth();
    state.abort = typeof AbortController === 'function' ? new AbortController() : null;
    state.analyzing = true;
    updateAnalyzeButton();

    if (state.backend && state.backend.kind === 'ocr') {
      runOcr(base);
      return;
    }

    setStatus('이미지를 읽는 중… 10~60초쯤 걸립니다.', '');

    vision.analyze(state.imageFile, {
      year: base.year,
      month: base.month,
      signal: state.abort ? state.abort.signal : null,
      onText: function (chunk) {
        var lines = String(chunk.text || '').split('\n').filter(function (l) { return l.trim(); }).length;
        setStatus('읽는 중… ' + lines + '줄 확인', '');
      }
    })
      .then(function (result) {
        if (result.text) {
          $('pasteInput').value = result.text;
          showTab('paste');
          state.ocrGaps = { missingDays: result.missingDays || [], strayDays: result.strayDays || [] };
      runParse(true);
          setStatus('읽은 내용을 붙여넣기 탭의 미리보기로 넘겼습니다. 틀린 곳은 고친 뒤 반영하세요.', 'ok');
          return;
        }
        var normalized = (result.entries || []).map(function (e) {
          return store.decorate({
            date: e.date,
            code: e.code,
            route: e.route || null,
            start: e.start || e.dep || null,
            end: e.end || e.arr || null,
            endOffset: e.endOffset || 0
          });
        }).filter(function (e) { return /^\d{4}-\d{2}-\d{2}$/.test(e.date) && e.code; });

        normalized.forEach(function (e, i) {
          e.id = 'v' + (i + 1);
          e.known = e.category !== 'unknown';
          e.source = '스크린샷 인식';
        });

        showTab('paste');
        showPreview({
          entries: normalized,
          warnings: [],
          ignoredLines: [],
          stats: statsOf(normalized)
        });
        setStatus('인식 결과를 미리보기로 넘겼습니다.', 'ok');
      })
      .catch(function (err) {
        if (err && err.code === 'CANCELLED') {
          setStatus('중지했습니다.', '');
          return;
        }
        setStatus(err.message, 'error');
      })
      .then(function () {
        state.analyzing = false;
        state.abort = null;
        updateAnalyzeButton();
      });
  }

  /**
   * 기기 안에서 읽기. 처음 한 번은 인식기를 내려받느라 좀 걸리고, 그 뒤로는 빠르다.
   * 읽은 글은 붙여넣기 미리보기로 넘겨, 사람이 확인하고 고친 뒤 반영한다.
   */
  function runOcr(base) {
    setStatus('글자 인식기를 준비하는 중…', '');

    ocr.read(state.imageFile, {
      year: base.year,
      month: base.month,
      onProgress: function (step) {
        var percent = Math.round((step.ratio || 0) * 100);
        setStatus(step.phase === 'load'
          ? '글자 인식기를 준비하는 중… ' + percent + '% (처음 한 번만 받습니다)'
          : '캡처를 읽는 중… ' + percent + '%', '');
      }
    }).then(function (result) {
      // 화면에서 몇 월인지 읽었으면 기준 연·월도 그것으로 맞춘다
      if (result.month) {
        $('pasteBase').value = result.month.year + '-' + pad2(result.month.month);
      }
      if (!result.text.trim()) {
        setStatus('글자를 찾지 못했습니다. 더 또렷한 캡처로 다시 해보거나, 아래 방법으로 옮겨 주세요.', 'error');
        showFallbackGuide();
        return;
      }

      $('pasteInput').value = result.text;
      showTab('paste');
      runParse();

      var notes = [];
      if (result.month) {
        notes.push(result.month.year + '년 ' + result.month.month + '월 스케줄로 읽었습니다.');
      } else {
        notes.push('화면에서 연·월을 못 찾아 ' + base.year + '년 ' + base.month + '월로 넣었습니다. 다르면 기준 연·월을 고쳐 주세요.');
      }
      notes.push(result.shape === 'calendar' ? '달력 모양으로 읽었습니다.'
        : result.shape === 'list' ? '목록 모양으로 읽었습니다.' : '글줄로 읽었습니다.');
      if (result.unsure.length) {
        notes.push('자신 없는 글자: ' + result.unsure.slice(0, 6).join(', ') +
          (result.unsure.length > 6 ? ' 외 ' + (result.unsure.length - 6) + '개' : ''));
      }
      if (result.missed) {
        notes.push('근무 ' + result.chips + '개 가운데 ' + result.missed +
          '개는 글자를 못 읽었습니다. 달력에서 빈 날이 있는지 봐주세요.');
      }
      if (result.dropped) notes.push('앞뒤 달 칸 ' + result.dropped + '개는 건너뛰었습니다.');
      notes.push('미리보기에서 확인하고 고친 뒤 반영하세요.');
      setStatus(notes.join(' '), result.unsure.length ? '' : 'ok');
      setPasteStatus('캡처에서 읽었습니다. 틀린 칸은 고치고, 아닌 줄은 체크를 풀어 주세요.', '');
    }).catch(function (err) {
      setStatus(err.message || '읽지 못했습니다.', 'error');
      showFallbackGuide();
    }).then(function () {
      state.analyzing = false;
      state.abort = null;
      updateAnalyzeButton();
    });
  }

  function statsOf(entries) {
    var dates = {};
    var counts = {};
    entries.forEach(function (e) {
      dates[e.date] = true;
      counts[e.category] = (counts[e.category] || 0) + 1;
    });
    var keys = Object.keys(dates).sort();
    return {
      dateCount: keys.length,
      entryCount: entries.length,
      firstDate: keys[0] || null,
      lastDate: keys[keys.length - 1] || null,
      counts: counts
    };
  }

  /* ---------------- 백업 도구 ---------------- */

  /**
   * 백업 파일 저장.
   * 아티팩트로 열렸을 때는 뷰어가 저장을 중개하므로 링크 클릭이 동작하지 않는다.
   * 그래서 뷰어가 있으면 뷰어에 맡기고, 파일이나 서버로 직접 열었을 때만 링크로 내려받는다.
   */
  var downloadsReady = null;

  function initDownloads() {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    downloadsReady = window.claude.use('downloads').then(function (api) {
      if (!api) $('exportBtn').hidden = true;
      return api;
    }, function () {
      $('exportBtn').hidden = true;
      return null;
    });
  }

  function exportBackup() {
    var filename = 'crew-cal-' + calendar.todayIso() + '.json';
    var json = store.exportJson();

    if (!downloadsReady) {
      saveViaLink(filename, json);
      return;
    }

    downloadsReady.then(function (api) {
      if (!api) {
        toast('이 화면에서는 백업 저장을 지원하지 않습니다.');
        return;
      }
      return api.save({ filename: filename, data: json }).then(function (result) {
        if (!result || result.status === 'saved') toast('백업을 저장했습니다.');
      }, function (err) {
        var code = err && err.code;
        if (code === 'declined') return;
        if (code === 'rate_limited') {
          toast('저장 창이 이미 열려 있습니다. 잠시 후 다시 눌러주세요.');
          return;
        }
        toast('백업을 저장하지 못했습니다.');
      });
    });
  }

  /**
   * 보고 있는 달의 일정을 폰 캘린더가 읽는 파일로 내보낸다.
   * 아이폰은 이 파일을 열면 "캘린더에 추가" 가 뜬다.
   */
  function exportIcs() {
    var last = calendar.daysInMonth(state.year, state.month);
    var from = state.year + '-' + calendar.pad2(state.month) + '-01';
    var to = state.year + '-' + calendar.pad2(state.month) + '-' + calendar.pad2(last);
    var made = ics.build(store.getAll(), { from: from, to: to });
    if (!made.count) {
      toast('이 달에 내보낼 일정이 없습니다.');
      return;
    }
    var name = ics.filename(from, to);

    if (downloadsReady) {
      downloadsReady.then(function (api) {
        if (!api) {
          toast('이 화면에서는 파일 저장을 지원하지 않습니다.');
          return;
        }
        return api.save({ filename: name, data: made.text }).then(function (result) {
          if (!result || result.status === 'saved') toast(made.count + '건을 캘린더 파일로 저장했습니다.');
        }, function (err) {
          if (err && err.code === 'declined') return;
          toast('저장하지 못했습니다.');
        });
      });
      return;
    }
    saveViaLink(name, made.text, 'text/calendar;charset=utf-8');
    toast(made.count + '건 · 받은 파일을 열면 캘린더에 추가됩니다.');
  }

  /**
   * 보고 있는 달을 그림 한 장으로 만들어 공유하거나 저장한다.
   * 폰에서는 공유창이 열려 카톡·사진으로 바로 넘길 수 있고, 안 되면 내려받는다.
   */
  function exportImage() {
    var entriesByDate = store.getAll();
    var canvas = document.createElement('canvas');
    try {
      poster.draw(canvas, {
        year: state.year,
        month: state.month,
        entriesByDate: entriesByDate,
        hideTimes: state.hideTimes
      });
    } catch (e) {
      toast('그림을 만들지 못했습니다.');
      return;
    }

    var name = poster.filename(state.year, state.month);
    if (!canvas.toBlob) {
      openImageTab(canvas.toDataURL('image/png'));
      return;
    }

    canvas.toBlob(function (blob) {
      if (!blob) { toast('그림을 만들지 못했습니다.'); return; }

      var file = null;
      try { file = new File([blob], name, { type: 'image/png' }); } catch (e) { file = null; }
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: state.year + '년 ' + state.month + '월 스케줄' })
          .catch(function () { /* 공유창을 닫은 경우 */ });
        return;
      }

      // 아티팩트 뷰어처럼 내려받기가 막힌 화면에서는 새 탭으로 열어 길게 눌러 저장하게 한다
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
    win.document.write('<title>스케줄 이미지</title>' +
      '<body style="margin:0;background:#111"><img src="' + src + '" style="width:100%">');
    win.document.close();
    toast('사진을 길게 눌러 저장하세요.');
  }

  function saveViaLink(filename, text, type) {
    var blob = new Blob([text], { type: type || 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /** 기억해둔 편명 목록을 그린다. */
  /**
   * 반영한 뒤 저장된 것이 미리보기와 같은지 확인한다.
   * 미리보기에는 ADO 하나뿐인데 달력에는 비행이 붙어 있던 일이 있었다.
   * 미리보기에 보인 배열이 곧 저장되는 배열이어야 한다. 어긋나면 터뜨린다.
   */
  function assertStoredMatchesPreview(entries, mode) {
    if (mode !== 'replace') return;          // 이어 붙이기는 기존 것이 함께 남는다
    var want = {};
    entries.forEach(function (e) {
      (want[e.date] = want[e.date] || []).push(store.normalizeCode(e.code));
    });
    var got = store.getRange(store.dateSpan(entries, {}).from, store.dateSpan(entries, {}).to);
    var wrong = [];
    Object.keys(want).forEach(function (date) {
      var a = want[date].slice().sort().join(',');
      var b = (got[date] || []).map(function (e) { return e.code; }).sort().join(',');
      if (a !== b) wrong.push(date + ' 미리보기[' + a + '] 저장[' + b + ']');
    });
    Object.keys(got).forEach(function (date) {
      if (!want[date] && got[date].length) {
        wrong.push(date + ' 미리보기에 없는데 저장됨[' +
          got[date].map(function (e) { return e.code; }).join(',') + ']');
      }
    });
    if (wrong.length) {
      throw new Error('미리보기와 저장된 일정이 다릅니다: ' + wrong.join(' / '));
    }
  }

  /** 보고 있는 달만 비운다. 꼬인 달을 한 번에 정리할 때 쓴다. */
  function clearThisMonth() {
    var month = state.year + '-' + pad2(state.month);
    var label = monthLabel(state.year, state.month);
    var count = store.countInRange(store.dateSpan([], { clearMonth: month }));
    if (!count) return toast(label + ' 에는 일정이 없습니다.');
    if (!window.confirm(label + ' 일정 ' + count + '건을 지웁니다. 계속할까요?')) return;
    store.applyEntries([], 'replace', { clearMonth: month });
    refresh();
    toast(count + '건을 지웠습니다. 다시 읽어 넣으세요.');
  }

  function initDataTools() {
    $('clearMonthBtn').addEventListener('click', clearThisMonth);



    $('exportBtn').addEventListener('click', exportBackup);
    $('icsBtn').addEventListener('click', exportIcs);
    $('imageBtn').addEventListener('click', exportImage);

    $('importBtn').addEventListener('click', function () { $('importInput').click(); });
    $('importInput').addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          store.importJson(String(reader.result));
          refresh();
          toast('백업을 불러왔습니다.');
        } catch (e) {
          toast('불러오기 실패: ' + e.message);
        }
      };
      reader.readAsText(file);
      this.value = '';
    });

    $('clearAllBtn').addEventListener('click', function () {
      if (!window.confirm('저장된 모든 일정을 삭제합니다. 계속할까요?')) return;
      store.clearAll();
      refresh();
      toast('전체 삭제했습니다.');
    });
  }

  /* ---------------- 시작 ---------------- */

  /* ---------------- 다음 근무 · 체류지 시각 ---------------- */

  /** "다음 · 9/8(화) KE0035 인천 → 애틀랜타 10:35 · 이틀 뒤" */
  function renderNextDuty(entriesByDate) {
    var box = $('nextDuty');
    if (!box) return;
    var next = calendar.upcoming(entriesByDate, calendar.todayIso());
    if (!next) {
      box.hidden = true;
      return;
    }

    var when = (+next.date.slice(5, 7)) + '/' + (+next.date.slice(8, 10)) +
      '(' + calendar.weekdayOf(next.date) + ')';
    var what = [];
    if (next.entry.type === 'flight') {
      what.push(next.entry.code);
      var place = calendar.placeLabel(next.entry);
      if (place) what.push(place);
      var time = calendar.formatTimeRange(next.entry);
      if (time) what.push(time);
    } else {
      what.push(next.entry.label || next.entry.code);
    }
    if (next.all.length > 1) what.push('외 ' + (next.all.length - 1) + '건');

    var away = next.days === 0 ? '오늘' : next.days === 1 ? '내일'
      : next.days === 2 ? '모레' : next.days + '일 뒤';

    box.innerHTML = '';
    [['nd-tag', '다음'], ['nd-when', when], ['nd-what', what.join(' ')], ['nd-away', away]]
      .forEach(function (pair) {
        var span = document.createElement('span');
        span.className = pair[0];
        span.textContent = pair[1];
        box.appendChild(span);
      });
    box.hidden = false;
    box.onclick = function () { goToDate(next.date); };
    box.onkeydown = function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToDate(next.date); }
    };
  }

  function goToDate(date) {
    if (state.view === 'year') {
      state.view = 'calendar';
      saveView(state.view);
      syncViewButtons();
    }
    state.year = +date.slice(0, 4);
    state.month = +date.slice(5, 7);
    state.selectedDate = date;
    $('singleDate').value = date;
    syncPasteBase();
    refresh();
  }

  /**
   * 그날 머무는 곳이 지금 몇 시인지. 브라우저가 서머타임까지 맞춰 주므로 표만 있으면 된다.
   * 집에 전화 걸기 전에 보라고 만든 줄이다.
   */
  /**
   * 해외에 있는 날이면 현지 시각과 한국 시각을 나란히 보여주는 배너.
   *
   * "지금 어디에 있나" 는 그날 일정만으로는 알 수 없다. 체류하는 날에는 구간이 없기
   * 때문이다. 그래서 그 날짜로부터 거슬러 올라가 가장 가까운 비행을 찾고, 그 편이
   * 내린 공항을 지금 있는 곳으로 본다. 한국에 내렸으면 배너를 띄우지 않는다.
   */
  function whereOn(date) {
    for (var back = 0; back <= 7; back++) {
      var day = shiftDate(date, -back);
      var list = store.getByDate(day);
      for (var i = list.length - 1; i >= 0; i--) {
        var entry = list[i];
        if (entry.type !== 'flight' || !entry.route) continue;
        var ends = airports.splitRoute(entry.route);
        if (!ends.to) continue;
        if (airports.countryOf(ends.to) === 'KR') return null;   // 한국에 돌아와 있다
        return {
          iata: ends.to,
          city: airports.cityOf(ends.to),
          flag: airports.flagOf(ends.to)
        };
      }
    }
    return null;
  }

  function shiftDate(date, days) {
    var d = new Date(date + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function renderLocalClock(date) {
    var box = $('tzBanner');
    if (!box) return;

    var place = whereOn(date);
    var zone = place && airports.zoneOf(place.iata);
    var there = zone && clock.now(zone);
    var here = clock.now(clock.KOREA);
    if (!zone || zone === clock.KOREA || !there || !here) {
      box.hidden = true;
      return;
    }

    $('tzPlace').textContent = (place.flag ? place.flag + ' ' : '') + place.city;
    $('tzGap').textContent = clock.describeGap(clock.gapMinutes(zone));
    $('tzThereLabel').textContent = (place.flag ? place.flag + ' ' : '') + '현지';
    $('tzThereTime').textContent = there.time;
    $('tzHereTime').textContent = here.time;

    var shift = clock.dayShift(zone);
    $('tzThereDate').textContent = there.month + '/' + there.day + '(' + there.weekday + ')' +
      (shift < 0 ? ' · 어제' : shift > 0 ? ' · 내일' : '');
    $('tzHereDate').textContent = here.month + '/' + here.day + '(' + here.weekday + ')';
    box.hidden = false;
  }

  /** 배너의 시계는 1분마다 다시 그린다. */
  function initClockTick() {
    setInterval(function () {
      if ($('tzBanner') && !$('tzBanner').hidden) renderLocalClock(state.selectedDate);
    }, 60000);
  }

  /* ---------------- 동료가 보내는 의견 ---------------- */

  // 화면 아래와 의견 보내기에 적히는 판 번호. sw.js 의 VERSION 과 함께 올린다.
  var APP_VERSION = 'v31';

  /**
   * 의견을 받을 메일 주소. 저장소가 공개라 통짜로 적어두면 스팸 크롤러가 긁어가므로
   * 조각으로 나눠 두고 쓸 때 합친다. 완전히 숨는 건 아니고, 기계가 훑는 걸 막는 정도다.
   */
  var MAIL_TO = ['dy00214', 'gmail', 'com'].join('\u0000')
    .replace('\u0000', '@').replace('\u0000', '.');

  /**
   * 의견이 모이는 카톡 오픈채팅방 주소.
   * 채워 넣으면 메일 대신 이 방을 연다. 둘 다 비우면 폰 공유창을 쓴다.
   */
  var OPEN_CHAT = '';

  function feedbackContext() {
    var now = new Date();
    var at = now.getFullYear() + '-' + calendar.pad2(now.getMonth() + 1) + '-' + calendar.pad2(now.getDate()) +
      ' ' + calendar.pad2(now.getHours()) + ':' + calendar.pad2(now.getMinutes());
    var entries = 0;
    var byDate = store.getAll();
    Object.keys(byDate).forEach(function (date) { entries += byDate[date].length; });
    return {
      at: at,
      version: APP_VERSION,
      entries: entries,
      screen: window.innerWidth + 'x' + window.innerHeight,
      standalone: !!(window.navigator.standalone ||
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)),
      ua: navigator.userAgent
    };
  }

  function currentFeedback() {
    var kind = $('feedbackKind').value;
    var withSchedule = $('feedbackSchedule').checked && !$('feedbackScheduleField').hidden;
    return {
      kind: kind,
      message: $('feedbackMessage').value,
      schedule: withSchedule ? $('pasteInput').value : '',
      context: feedbackContext()
    };
  }

  /** 안 읽히는 문제일 때만, 그리고 붙여넣은 글이 있을 때만 원문 첨부를 권한다. */
  function syncFeedbackSchedule() {
    var kind = $('feedbackKind').value;
    var has = !!$('pasteInput').value.trim();
    var show = has && feedback.suggestsSchedule(kind);
    $('feedbackScheduleField').hidden = !show;
    if (show) $('feedbackSchedule').checked = true;
  }

  function openFeedback() {
    $('feedbackStatus').textContent = '';
    syncFeedbackSchedule();
    $('feedbackSheet').hidden = false;
    $('feedbackMessage').focus();
  }

  function closeFeedback() {
    $('feedbackSheet').hidden = true;
  }

  function sendFeedback(copyOnly) {
    var data = currentFeedback();
    if (!feedback.isSendable(data)) {
      $('feedbackStatus').textContent = '내용을 한 줄이라도 적어 주세요.';
      $('feedbackStatus').className = 'status error';
      $('feedbackMessage').focus();
      return;
    }
    var text = feedback.compose(data);

    function copied() {
      $('feedbackStatus').textContent = '글을 복사했습니다. 카톡이나 메시지에 붙여넣어 보내주세요.';
      $('feedbackStatus').className = 'status ok';
      $('feedbackMessage').value = '';
    }

    // 메일 주소가 정해져 있으면 내용이 채워진 채로 메일 앱을 연다. 보내기만 누르면 된다.
    if (!copyOnly && MAIL_TO && !OPEN_CHAT) {
      window.location.href = feedback.mailtoUrl(MAIL_TO, text);
      $('feedbackStatus').textContent = '메일 앱을 열었습니다. 그대로 보내기만 누르시면 됩니다.';
      $('feedbackStatus').className = 'status ok';
      $('feedbackMessage').value = '';
      return;
    }

    // 오픈채팅방이 정해져 있으면, 글을 복사해 주고 그 방을 열어준다.
    // 복사와 방 열기를 같은 누름 안에서 시작해야 사파리가 창을 막지 않는다.
    if (!copyOnly && OPEN_CHAT) {
      var copying = navigator.clipboard && navigator.clipboard.writeText
        ? navigator.clipboard.writeText(text)
        : Promise.reject();
      window.open(OPEN_CHAT, '_blank', 'noopener');
      copying.then(function () {
        $('feedbackStatus').textContent = '글을 복사했습니다. 열린 채팅방에 붙여넣기만 하면 됩니다.';
        $('feedbackStatus').className = 'status ok';
        $('feedbackMessage').value = '';
      }, function () {
        $('feedbackMessage').value = text;
        $('feedbackStatus').textContent = '복사가 막혀 있습니다. 이 글을 직접 복사해 채팅방에 붙여넣어 주세요.';
        $('feedbackStatus').className = 'status error';
      });
      return;
    }

    if (!copyOnly && navigator.share) {
      navigator.share({ title: '크루캘 의견', text: text }).then(function () {
        $('feedbackMessage').value = '';
        closeFeedback();
        toast('의견을 보냈습니다. 고맙습니다!');
      }, function () { /* 공유창을 닫은 경우 */ });
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(copied, function () {
        $('feedbackStatus').textContent = '복사가 막혀 있습니다. 아래 글을 직접 복사해 주세요.';
        $('feedbackStatus').className = 'status error';
        $('feedbackMessage').value = text;
      });
      return;
    }
    $('feedbackMessage').value = text;
    $('feedbackStatus').textContent = '이 글을 복사해 보내주세요.';
    $('feedbackStatus').className = 'status';
  }

  function initFeedback() {
    var select = $('feedbackKind');
    if (!select) return;
    // 아무것도 안 고르고 보내면 첫 항목으로 잘못 분류되니, 고르기 전에는 빈 칸을 둔다
    var blank = document.createElement('option');
    blank.value = '';
    blank.textContent = '골라주세요';
    select.appendChild(blank);
    feedback.KINDS.forEach(function (kind) {
      var option = document.createElement('option');
      option.value = kind.value;
      option.textContent = kind.label;
      select.appendChild(option);
    });
    select.addEventListener('change', syncFeedbackSchedule);
    if (OPEN_CHAT) {
      $('feedbackSend').textContent = '카톡 방에 보내기';
      $('feedbackHint').textContent =
        '쓰다가 이상한 점이 있으면 적어 주세요. 보내기를 누르면 글이 복사되고 ' +
        '크루캘 오픈채팅방이 열립니다. 방에 붙여넣기만 하면 됩니다.';
    } else if (MAIL_TO) {
      $('feedbackSend').textContent = '메일로 보내기';
      $('feedbackHint').textContent =
        '쓰다가 이상한 점이 있으면 적어 주세요. 보내기를 누르면 내용이 채워진 채로 ' +
        '메일 앱이 열립니다. 그대로 보내기만 누르시면 만든 사람에게 갑니다.';
      // 메일은 보낸 사람 주소가 함께 가므로, 익명이라고 적어두면 거짓말이 된다
      $('feedbackPrivacy').textContent =
        '메일로 가기 때문에 보내는 분의 메일 주소가 함께 보입니다. ' +
        '그 밖에는 위에 적은 내용과 브라우저 종류·화면 크기만 들어갑니다.';
    }
    $('feedbackBtn').addEventListener('click', openFeedback);
    $('feedbackClose').addEventListener('click', closeFeedback);
    $('feedbackBackdrop').addEventListener('click', closeFeedback);
    $('feedbackSend').addEventListener('click', function () { sendFeedback(false); });
    $('feedbackCopy').addEventListener('click', function () { sendFeedback(true); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('feedbackSheet').hidden) closeFeedback();
    });
  }

  /* ---------------- 파싱 검증 (개발용) ----------------
   * 3월 1일 국내선 네 편이 소리 없이 사라진 일이 있었다. 고칠 때마다 여기로 먼저
   * 확인한다. 주소 끝에 #verify 를 붙이거나 보기 설정에서 연다.
   */

  function openVerify() {
    $('verifyPanel').hidden = false;
    if (!$('verifySource').value.trim()) fillVerifyFromPaste();
    $('verifyPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function fillVerifyFromPaste() {
    $('verifySource').value = $('pasteInput').value;
  }

  function runVerify() {
    var base = baseYearMonth();
    var text = $('verifySource').value;
    var source = verify.readSource(text, base);
    var parsed = verify.readEntries(parser.parse(text, base).entries);
    var stored = verify.readByDate(store.getAll());
    var prefix = base.year + '-' + pad2(base.month);
    var result = verify.compare(source, parsed, stored, { prefix: prefix });

    var head = $('verifyHead');
    head.textContent = verify.headline(result);
    head.className = 'status ' + (result.ok ? 'ok' : 'error');
    renderVerifyTable(result);
  }

  function renderVerifyTable(result) {
    var box = $('verifyTable');
    box.innerHTML = '';
    var table = document.createElement('table');
    var head = document.createElement('tr');
    ['날짜', '원본', '파싱', '저장됨'].forEach(function (label) {
      var th = document.createElement('th');
      th.textContent = label;
      head.appendChild(th);
    });
    table.appendChild(head);

    result.rows.forEach(function (row) {
      var tr = document.createElement('tr');
      if (!row.ok) tr.className = 'bad';
      [String(row.day) + '일',
        row.source.join(' ') || '—',
        row.parsed.join(' ') || '—',
        row.stored == null ? '—' : (row.stored.join(' ') || '—')
      ].forEach(function (text, i) {
        var td = document.createElement('td');
        td.textContent = text;
        if (i === 0 && !row.ok) {
          td.title = (row.missing.length ? '없어짐: ' + row.missing.join(', ') : '') +
            (row.extra.length ? ' 군더더기: ' + row.extra.join(', ') : '');
        }
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });
    box.appendChild(table);
  }

  function initVerify() {
    $('verifyOpen').addEventListener('click', openVerify);
    $('verifyClose').addEventListener('click', function () { $('verifyPanel').hidden = true; });
    $('verifyRun').addEventListener('click', runVerify);
    $('verifyFromPaste').addEventListener('click', fillVerifyFromPaste);
    if (/(^|#|&)verify\b/.test(location.hash) || /[?&]verify=1/.test(location.search)) openVerify();
  }

  /* ---------------- 처음 온 사람 · 공유 · 오프라인 ---------------- */

  var WELCOME_KEY = 'crew-cal.welcome.v1';

  /**
   * 한 파일로 묶은 아티팩트 버전인지, 주소가 있는 웹 버전인지 가른다.
   * manifest 는 index.html 에만 있고 build.js 는 body 만 옮기므로, 이걸로 구분한다.
   */
  function isWebBuild() {
    return !!document.querySelector('link[rel="manifest"]') &&
      (location.protocol === 'http:' || location.protocol === 'https:');
  }

  function seenWelcome() {
    try { return localStorage.getItem(WELCOME_KEY) === '1'; } catch (e) { return false; }
  }

  function markWelcomeSeen() {
    try { localStorage.setItem(WELCOME_KEY, '1'); } catch (e) { /* 저장 실패는 무시 */ }
  }

  function showWelcome(force) {
    var card = $('welcome');
    if (!card) return;
    var empty = !Object.keys(store.getAll()).length;
    card.hidden = !(force || (empty && !seenWelcome()));
    if (force) card.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function hideWelcome() {
    markWelcomeSeen();
    if ($('welcome')) $('welcome').hidden = true;
  }

  function initWelcome() {
    var ios = /iP(hone|ad|od)/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    // "홈 화면에 추가" 안내는 주소로 연 웹 버전에서만 말이 된다
    if (ios && isWebBuild()) document.body.classList.add('is-ios');
    if ($('welcomeClose')) $('welcomeClose').addEventListener('click', hideWelcome);
    if ($('welcomeDismiss')) $('welcomeDismiss').addEventListener('click', hideWelcome);
    if ($('welcomeStart')) {
      $('welcomeStart').addEventListener('click', function () {
        hideWelcome();
        showTab('paste');
        $('pasteInput').focus();
      });
    }
    if ($('helpBtn')) $('helpBtn').addEventListener('click', function () { showWelcome(true); });
    showWelcome(false);
  }

  /** 가본 도시 지도. 따로 있는 화면이라 주소로 연 웹 버전에서만 보여준다. */
  function initMapLink() {
    var link = $('mapLink');
    if (!link || !isWebBuild()) return;
    link.hidden = false;
  }

  /** 같이 타는 동료에게 이 앱 주소를 넘겨준다. 주소가 없는 아티팩트에서는 감춘다. */
  function initShare() {
    var btn = $('shareBtn');
    if (!btn || !isWebBuild()) return;
    btn.hidden = false;
    btn.addEventListener('click', function () {
      var url = location.origin + location.pathname;
      var payload = { title: '크루캘', text: '크루넷 스케줄을 붙여넣으면 달력으로 정리해 주는 앱', url: url };
      if (navigator.share) {
        navigator.share(payload).catch(function () { /* 사용자가 닫은 경우 */ });
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(
          function () { toast('링크를 복사했습니다.'); },
          function () { toast(url); }
        );
        return;
      }
      toast(url);
    });
  }

  /** 두 번째부터는 네트워크 없이도 열리게 앱 파일을 기기에 담아둔다. */
  function initOffline() {
    if (!isWebBuild() || !('serviceWorker' in navigator)) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function (registration) {
        watchForUpdate(registration);
        // 열어 둔 채로 며칠이 지나는 일이 있어, 한 시간에 한 번 새 버전을 확인한다
        setInterval(function () { registration.update().catch(function () {}); }, 3600 * 1000);
        registration.update().catch(function () {});
      }).catch(function () { /* 안 되면 그냥 온라인으로 */ });
    });
  }

  /**
   * 새 버전을 알려준다.
   *
   * 담아둔 파일을 먼저 보여주는 방식이라, 새 버전을 올려도 다음에 열 때까지 옛 화면이
   * 그대로다. 바뀐 걸 모른 채 "왜 안 되지" 하게 되므로, 새 것이 준비되면 띠를 띄워
   * 새로고침을 권한다. 지금 하던 일이 날아가지 않도록 누를 때만 새로고침한다.
   */
  function watchForUpdate(registration) {
    function offer(worker) {
      if (!worker) return;
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        showUpdateBar();
        return;
      }
      worker.addEventListener('statechange', function () {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdateBar();
      });
    }

    offer(registration.waiting);
    registration.addEventListener('updatefound', function () { offer(registration.installing); });
  }

  function showUpdateBar() {
    var bar = $('updateBar');
    if (!bar || !bar.hidden) return;
    bar.hidden = false;
  }

  function initUpdateBar() {
    var bar = $('updateBar');
    if (!bar) return;
    $('updateReload').addEventListener('click', function () {
      bar.hidden = true;
      location.reload();
    });
    $('updateLater').addEventListener('click', function () { bar.hidden = true; });
    var stamp = $('appVersion');
    if (stamp) stamp.textContent = APP_VERSION;
  }

  function init() {
    $('prevMonth').addEventListener('click', function () { goMonth(-1); });
    $('nextMonth').addEventListener('click', function () { goMonth(1); });
    $('todayBtn').addEventListener('click', function () {
      var today = calendar.todayIso();
      state.year = +today.slice(0, 4);
      state.month = +today.slice(5, 7);
      state.selectedDate = today;
      $('singleDate').value = today;
      syncPasteBase();
      refresh();
    });

    initDownloads();
    initViewToggle();
    initAssumeOff();
    initAirlines();
    initRouteLookup();
    initVerify();
    initTabs();
    initSingleForm();
    initPaste();
    initImage();
    initDataTools();
    initWelcome();
    initSearch();
    initClockTick();
    initFeedback();
    initShare();
    initMapLink();
    initOffline();
    initUpdateBar();
    refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
