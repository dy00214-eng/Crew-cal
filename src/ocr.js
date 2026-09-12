/**
 * 스케줄 캡처에서 글자를 읽는다. 기기 안에서만.
 *
 * 서버도 API 키도 쓰지 않는다. 글자 인식기(Tesseract)를 앱 안에 담아 두고 브라우저에서
 * 돌리기 때문에, 사진이 밖으로 나가지 않고 비행기 안에서도 된다. 대신 무거워서
 * 처음 한 번 쓸 때만 내려받는다(6MB 남짓). 그 뒤로는 담아 둔 것을 쓴다.
 *
 * 인식 결과는 글자와 그 자리(네모)로 받아서 ocrlayout 이 달력 칸을 되짚고,
 * 그 글을 붙여넣기와 똑같은 미리보기로 넘긴다. 눈으로 확인하고 고친 뒤 반영한다.
 *
 * 그림 손질은 따로 떼어 놨다(enhance, scaleFor). 캔버스 없이도 검사할 수 있게.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./ocrlayout.js'));
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.ocr = factory(root.CrewCal.ocrlayout);
  }
})(typeof self !== 'undefined' ? self : this, function (ocrlayout) {
  'use strict';

  var BASE = 'vendor/tesseract/';
  var SCRIPT = BASE + 'tesseract.min.js';
  var MIN_SIDE = 1100;      // 이보다 작으면 키워서 읽는다. 작은 글씨는 그냥은 못 읽는다.
  var MAX_SIDE = 2800;      // 이보다 크면 줄인다. 더 키워봐야 느리기만 하다.
  var MAX_SCALE = 3;

  var loading = null;
  var worker = null;

  /** 얼마나 키우거나 줄여서 읽을지. */
  function scaleFor(width, height) {
    if (!width || !height) return 1;
    var scale = 1;
    var min = Math.min(width, height);
    var max = Math.max(width, height);
    if (min < MIN_SIDE) scale = Math.min(MAX_SCALE, MIN_SIDE / min);
    if (max * scale > MAX_SIDE) scale = MAX_SIDE / max;
    return scale;
  }

  /**
   * 흑백으로 바꾸고, 어두운 화면(흰 글씨)이면 뒤집고, 옅은 글자는 진하게 편다.
   * 픽셀 배열을 그 자리에서 고치고 무엇을 했는지 알려준다.
   */
  function enhance(data) {
    var i;
    var gray = new Uint8Array(data.length / 4);
    var sum = 0;
    for (i = 0; i < gray.length; i++) {
      var r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      var value = (r * 299 + g * 587 + b * 114) / 1000;
      gray[i] = value;
      sum += value;
    }
    var mean = sum / gray.length;

    var histogram = new Uint32Array(256);
    for (i = 0; i < gray.length; i++) histogram[gray[i]]++;

    // 어두운 화면인지는 가장 넓은 면(바탕)을 보고 가른다. 평균으로 재면 흰 글씨가
    // 많은 화면에서 밝은 쪽으로 끌려가, 뒤집어야 할 그림을 그냥 두게 된다.
    var background = 0;
    for (i = 1; i < 256; i++) if (histogram[i] > histogram[background]) background = i;
    var inverted = background < 128;

    // 아주 밝은 쪽과 아주 어두운 쪽을 잘라 낸 범위로 폅니다 (양 끝 2%)
    var cut = Math.floor(gray.length * 0.02);
    var low = 0, high = 255, acc = 0;
    for (i = 0; i < 256; i++) { acc += histogram[i]; if (acc > cut) { low = i; break; } }
    acc = 0;
    for (i = 255; i >= 0; i--) { acc += histogram[i]; if (acc > cut) { high = i; break; } }
    if (high - low < 32) { low = 0; high = 255; }              // 밋밋한 그림은 그대로 둔다

    var span = high - low;
    for (i = 0; i < gray.length; i++) {
      var v = Math.max(0, Math.min(255, Math.round(((gray[i] - low) / span) * 255)));
      if (inverted) v = 255 - v;
      data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
      data[i * 4 + 3] = 255;
    }
    return {
      inverted: inverted,
      background: background,
      mean: Math.round(mean),
      low: low,
      high: high
    };
  }

  /** 이 브라우저에서 기기 안 인식을 쓸 수 있는지. */
  function available() {
    return typeof document !== 'undefined' &&
      typeof WebAssembly === 'object' &&
      typeof Worker === 'function' &&
      !!document.createElement('canvas').getContext;
  }

  /** 인식기를 처음 쓸 때 한 번만 내려받는다. */
  function load() {
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      if (typeof window !== 'undefined' && window.Tesseract) return resolve(window.Tesseract);
      var script = document.createElement('script');
      script.src = SCRIPT;
      script.async = true;
      script.onload = function () {
        if (window.Tesseract) resolve(window.Tesseract);
        else reject(new Error('글자 인식기를 불러오지 못했습니다.'));
      };
      script.onerror = function () {
        reject(new Error('글자 인식기를 내려받지 못했습니다. 연결을 확인해 주세요.'));
      };
      document.head.appendChild(script);
    });
    return loading;
  }

  function getWorker(onProgress) {
    if (worker) return Promise.resolve(worker);
    return load().then(function (Tesseract) {
      return Tesseract.createWorker('eng', 1, {
        workerPath: BASE + 'worker.min.js',
        corePath: BASE,
        langPath: BASE,
        gzip: true,
        logger: function (m) {
          if (!onProgress) return;
          if (m.status === 'loading tesseract core' || m.status === 'loading language traineddata') {
            onProgress({ phase: 'load', ratio: m.progress });
          } else if (m.status === 'recognizing text') {
            onProgress({ phase: 'read', ratio: m.progress });
          }
        }
      });
    }).then(function (created) {
      worker = created;
      // 칸이 여럿인 표도 줄 단위로 고르게 읽도록 한다
      return worker.setParameters({ tessedit_pageseg_mode: '6' }).then(function () { return worker; });
    });
  }

  /** 그림 파일을 손질해 캔버스에 올린다. */
  function toCanvas(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var image = new Image();
      image.onload = function () {
        try {
          var scale = scaleFor(image.width, image.height);
          var canvas = document.createElement('canvas');
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);
          var ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          var pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
          var how = enhance(pixels.data);
          ctx.putImageData(pixels, 0, 0);
          URL.revokeObjectURL(url);
          resolve({ canvas: canvas, scale: scale, how: how });
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(e);
        }
      };
      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('그림을 열지 못했습니다.'));
      };
      image.src = url;
    });
  }

  /** 인식 결과에서 글자와 자리만 뽑는다. */
  function wordsOf(data) {
    var out = [];
    (data.blocks || []).forEach(function (block) {
      (block.paragraphs || []).forEach(function (para) {
        (para.lines || []).forEach(function (line) {
          (line.words || []).forEach(function (word) {
            if (!word.text || !word.bbox) return;
            out.push({
              text: word.text,
              conf: Math.round(word.confidence),
              x0: word.bbox.x0, y0: word.bbox.y0, x1: word.bbox.x1, y1: word.bbox.y1
            });
          });
        });
      });
    });
    return out;
  }

  /**
   * read(file, { year, month, onProgress }) -> { text, shape, unsure, confidence }
   * 읽은 글은 붙여넣기 미리보기로 그대로 넘길 수 있는 형태다.
   */
  function read(file, options) {
    var opts = options || {};
    if (!available()) return Promise.reject(new Error('이 브라우저에서는 기기 안 글자 인식을 쓸 수 없습니다.'));

    return toCanvas(file).then(function (prepared) {
      return getWorker(opts.onProgress).then(function (w) {
        return w.recognize(prepared.canvas, {}, { blocks: true, text: true });
      }).then(function (result) {
        var data = result.data || {};
        var words = wordsOf(data);
        var laid = ocrlayout.toText(words, { year: opts.year, month: opts.month });
        return {
          text: laid.text,
          shape: laid.shape,
          unsure: laid.unsure,
          dropped: laid.dropped,
          words: words.length,
          confidence: Math.round(data.confidence || 0),
          prepared: prepared.how
        };
      });
    });
  }

  /** 다 쓴 인식기를 놓아준다. 메모리를 꽤 쓰기 때문이다. */
  function release() {
    if (!worker) return Promise.resolve();
    var done = worker.terminate();
    worker = null;
    return Promise.resolve(done);
  }

  return {
    available: available,
    read: read,
    release: release,
    scaleFor: scaleFor,
    enhance: enhance,
    BASE: BASE
  };
});
