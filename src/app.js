/** 화면 조립: 캘린더 + 3가지 입력 방식(날짜별 / 텍스트 붙여넣기 / 스크린샷) */
(function () {
  'use strict';

  var codes = CrewCal.codes;
  var parser = CrewCal.parser;
  var store = CrewCal.store;
  var calendar = CrewCal.calendar;
  var vision = CrewCal.vision;

  var $ = function (id) { return document.getElementById(id); };

  var state = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    selectedDate: calendar.todayIso(),
    preview: null,
    imageFile: null,
    view: 'calendar',
    backend: null,
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

  function loadView() {
    try {
      var saved = localStorage.getItem(VIEW_KEY);
      if (saved === 'list' || saved === 'calendar') return saved;
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

  function detailText(entry) {
    var bits = [];
    var route = calendar.routeLabel(entry);
    if (route) bits.push(route);
    var times = calendar.describeTimes(entry);
    if (times) bits.push(times);
    if (entry.memo) bits.push(entry.memo);
    return bits.join(' · ');
  }

  /** 미리보기 표의 출발/도착 칸 */
  function timeCellText(entry, which) {
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
    $('monthLabel').textContent = monthLabel(state.year, state.month);

    var viewOptions = {
      year: state.year,
      month: state.month,
      entriesByDate: entriesByDate,
      selectedDate: state.selectedDate,
      onSelect: selectDate
    };

    var listMode = state.view === 'list';
    $('calendar').hidden = listMode;
    $('listView').hidden = !listMode;
    if (listMode) calendar.renderList($('listView'), viewOptions);
    else calendar.render($('calendar'), viewOptions);

    renderMonthSummary(entriesByDate);
    renderDayDetail();
  }

  function renderMonthSummary(entriesByDate) {
    var s = calendar.summarize(entriesByDate, state.year, state.month);
    var order = ['flight', 'layover', 'standby', 'off', 'training', 'other', 'unknown'];
    var parts = ['<span class="sum-item">일정 있는 날 <b>' + s.days + '일</b></span>'];
    order.forEach(function (key) {
      if (s.counts[key]) {
        parts.push('<span class="sum-item">' + codes.CATEGORY_LABELS[key] + ' <b>' + s.counts[key] + '</b></span>');
      }
    });
    $('monthSummary').innerHTML = parts.join('<span class="sum-item" aria-hidden="true">·</span>');
  }

  function renderDayDetail() {
    var date = state.selectedDate;
    var list = store.getByDate(date);
    $('dayTitle').textContent = date + ' (' + calendar.weekdayOf(date) + ') · ' + list.length + '건';

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
      var detail = detailText(entry);
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

  /* ---------------- 2) 텍스트 붙여넣기 ---------------- */

  function initPaste() {
    syncPasteBase();

    $('sampleBtn').addEventListener('click', function () {
      $('pasteInput').value = SAMPLE;
      $('pasteBase').value = '2026-09';
      runParse();
    });

    $('clearPasteBtn').addEventListener('click', function () {
      $('pasteInput').value = '';
      hidePreview();
    });

    $('parseBtn').addEventListener('click', runParse);
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

  function baseYearMonth() {
    var raw = $('pasteBase').value;
    if (/^\d{4}-\d{2}$/.test(raw)) {
      return { year: +raw.slice(0, 4), month: +raw.slice(5, 7) };
    }
    return { year: state.year, month: state.month };
  }

  function runParse() {
    var text = $('pasteInput').value;
    if (!text.trim()) {
      hidePreview();
      toast('붙여넣은 내용이 없습니다.');
      return;
    }
    var base = baseYearMonth();
    var result = parser.parse(text, base);
    showPreview(result);
  }

  function showPreview(result) {
    state.preview = result;

    if (!result.entries.length) {
      hidePreview();
      toast('날짜와 코드를 찾지 못했습니다. 형식을 확인해 주세요.');
      return;
    }

    var s = result.stats;
    $('previewSummary').innerHTML =
      '<b>' + s.dateCount + '일</b> · <b>' + s.entryCount + '건</b>' +
      (s.firstDate ? ' · ' + s.firstDate + ' ~ ' + s.lastDate : '') +
      (result.warnings.length ? ' · 확인 필요 ' + result.warnings.length + '건' : '');

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
      tr.appendChild(cell(calendar.routeLabel(entry)));
      tr.appendChild(cell(timeCellText(entry, 'start')));
      tr.appendChild(cell(timeCellText(entry, 'end')));

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
  }

  function hidePreview() {
    state.preview = null;
    $('preview').hidden = true;
    $('previewBody').innerHTML = '';
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
    if (mode === 'replace') {
      var existing = store.countExisting(entries);
      if (existing > 0) {
        var ok = window.confirm('해당 날짜의 기존 일정 ' + existing + '건을 지우고 ' + entries.length + '건을 반영합니다. 계속할까요?');
        if (!ok) return;
      }
    }

    var res = store.applyEntries(entries, mode);
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
      state.backend = backend;
      updateAnalyzeButton();
      if (backend.kind === 'sample') {
        setStatus('Claude 가 이미지를 바로 읽습니다. 스케줄 화면을 올려보세요.', 'ok');
      } else if (backend.kind === 'endpoint') {
        setStatus('설정해 둔 인식 서버로 보냅니다.', 'ok');
      } else {
        setStatus('이 화면에서는 이미지 인식을 쓸 수 없습니다. 텍스트 붙여넣기를 쓰거나, 아래 설정에 인식 서버 주소를 넣어주세요.', 'error');
      }
    });
  }

  function setImageFile(file) {
    var invalid = vision.validateFile(file, state.backend);
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
    btn.title = usable ? '' : '이미지 인식을 쓸 수 없는 화면입니다.';
    if (!usable && state.imageFile) {
      setStatus('이 화면에서는 이미지 인식을 쓸 수 없습니다. 텍스트 붙여넣기를 쓰거나, 아래 설정에 인식 서버 주소를 넣어주세요.', '');
    }
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
          runParse();
          setStatus('읽은 내용을 텍스트 붙여넣기 탭의 미리보기로 넘겼습니다. 틀린 곳은 고친 뒤 반영하세요.', 'ok');
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

  function saveViaLink(filename, text) {
    var blob = new Blob([text], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function initDataTools() {
    $('exportBtn').addEventListener('click', exportBackup);

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
    initTabs();
    initSingleForm();
    initPaste();
    initImage();
    initDataTools();
    refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
