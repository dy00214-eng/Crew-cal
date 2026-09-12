const test = require('node:test');
const assert = require('node:assert');
const ocr = require('../src/ocr.js');

/** 한 가지 색으로 채운 그림에 글자 몇 점을 찍어 만든 가짜 캡처. */
function image(background, ink, inkCount) {
  const total = 400;
  const data = new Uint8ClampedArray(total * 4);
  for (let i = 0; i < total; i++) {
    const v = i < inkCount ? ink : background;
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  return data;
}

test('작은 글씨는 키우고, 캔버스가 감당하는 선은 넘지 않는다', () => {
  assert.strictEqual(ocr.scaleFor(2560, 1440), 1, '이미 큰 화면은 그대로');

  // 폰 스케줄 화면. 두 배로 키워야 글씨가 읽힌다.
  const phone = ocr.scaleFor(1284, 955);
  assert.strictEqual(phone, 2, '정수배로 키운다: ' + phone);

  const small = ocr.scaleFor(390, 300);
  assert.ok(small > 1 && small <= 3, '작은 캡처는 키운다: ' + small);

  // 길쭉한 화면은 한 변 4000, 넓이 1200만 픽셀 안으로 (아이폰 사파리가 버티는 선)
  const tall = ocr.scaleFor(1284, 2778);
  assert.ok(2778 * tall <= 4000, '한 변: ' + Math.round(2778 * tall));
  assert.ok(1284 * tall * 2778 * tall <= 12e6);
  assert.strictEqual(ocr.scaleFor(0, 0), 1);
});

/**
 * 색 판 위에 흰 글씨가 적힌 그림. 크루넷 스케줄이 이렇게 생겼다.
 * 폰 캡처와 비슷한 크기로 만든다. 판·글씨의 크기 비율이 실제와 같아야 의미가 있다.
 */
function chipImage(plate, ink) {
  const width = 1200, height = 200;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = 255;      // 흰 종이
    data[i * 4 + 3] = 255;
  }
  // 가운데에 색 판 하나(100~1100 × 40~140), 그 안에 흰 글씨 획 (위아래로 판 색이 남는다)
  for (let y = 40; y < 140; y++) {
    for (let x = 100; x < 1100; x++) {
      const i = (y * width + x) * 4;
      const stroke = x % 60 < 12 && y > 75 && y < 95;   // 글씨 높이는 판 높이의 5분의 1쯤
      const color = stroke ? ink : plate;
      data[i] = color[0]; data[i + 1] = color[1]; data[i + 2] = color[2];
    }
  }
  return { data, width, height };
}

test('색 판 위의 흰 글씨를 흰 바탕 검은 글씨로 되돌린다', () => {
  const { data, width, height } = chipImage([30, 155, 232], [255, 255, 255]);
  const found = ocr.unchip(data, width, height);

  assert.strictEqual(found.plates, 1, '판을 하나 찾는다');
  assert.strictEqual(found.rects[0].tone, 'blue', '판 색도 알려준다');
  const at = (x, y) => data[(y * width + x) * 4];
  assert.strictEqual(at(125, 85), 0, '흰 글씨였던 자리가 검게');   // x % 60 < 12 인 곳이 획
  assert.strictEqual(at(150, 85), 255, '판 바탕이 희게');
  assert.strictEqual(at(2, 2), 255, '판 밖은 그대로');
  assert.ok(found.top < 40 && found.bottom > 140, '판 자리를 알려준다');
});

test('옆 칸의 판까지 이어 붙이지 않는다', () => {
  // 판 두 개를 글자 사이 틈보다도 가깝게(20픽셀) 나란히 둔다. 그래도 틈의 위아래가
  // 흰 종이면 서로 다른 판이다. 이어 붙이면 옆 날 근무가 한 칸에 뭉친다.
  const width = 1200, height = 240;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  [[80, 520], [540, 980]].forEach(([from, to]) => {
    for (let y = 60; y < 180; y++) {
      for (let x = from; x < to; x++) {
        const i = (y * width + x) * 4;
        const stroke = x % 60 < 12 && y > 100 && y < 120;
        data[i] = stroke ? 255 : 30;
        data[i + 1] = stroke ? 255 : 155;
        data[i + 2] = stroke ? 255 : 232;
      }
    }
  });
  const found = ocr.unchip(data, width, height);
  assert.strictEqual(found.plates, 2, '판 두 개로 센다');
  assert.ok(found.rects[0].x1 < found.rects[1].x0 || found.rects[1].x1 < found.rects[0].x0,
    '두 판이 겹치지 않는다');
});

test('색이 옅은 글자는 판으로 보지 않는다', () => {
  // 흰 바탕에 색 글씨만 있는 그림 (일요일 빨간 숫자 같은 것)
  const width = 120, height = 60;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 20; y < 40; y++) {
    for (let x = 20; x < 26; x++) {
      const i = (y * width + x) * 4;
      data[i] = 220; data[i + 1] = 40; data[i + 2] = 40;
    }
  }
  const found = ocr.unchip(data, width, height);
  assert.strictEqual(found.plates, 0, '가는 획은 판이 아니다');
  assert.strictEqual(data[(30 * width + 22) * 4], 220, '건드리지 않는다');
});

test('키울 때 사이 값을 메워 획이 부드럽게 이어진다', () => {
  const src = new Uint8ClampedArray(2 * 1 * 4);
  src[0] = src[1] = src[2] = 0; src[3] = 255;              // 왼쪽 검정
  src[4] = src[5] = src[6] = 255; src[7] = 255;            // 오른쪽 흰색
  const big = ocr.upscale(src, 2, 1, 2);
  assert.strictEqual(big.width, 4);
  assert.strictEqual(big.height, 2);
  const row = [big.data[0], big.data[4], big.data[8], big.data[12]];
  assert.strictEqual(row[0], 0);
  assert.strictEqual(row[3], 255);
  assert.ok(row[1] < row[2], '사이가 차츰 밝아진다: ' + row.join(','));
});

test('어두운 화면은 뒤집어서 읽는다', () => {
  // 바탕이 검고 글씨가 흰 화면 (다크 모드 캡처)
  const dark = ocr.enhance(image(20, 240, 40));
  assert.strictEqual(dark.inverted, true);
  assert.ok(dark.background < 128);

  const light = ocr.enhance(image(245, 30, 40));
  assert.strictEqual(light.inverted, false);
});

test('흰 글씨가 많아도 바탕을 보고 가른다', () => {
  // 평균만 보면 밝은 쪽으로 끌려가지만, 가장 넓은 면은 여전히 어둡다
  const data = image(40, 255, 190);      // 400점 중 190점이 흰 글씨
  const how = ocr.enhance(data);
  assert.ok(how.mean > 110, '평균은 밝다: ' + how.mean);
  assert.strictEqual(how.inverted, true, '그래도 어두운 화면으로 본다');
});

test('옅은 글자는 진하게 편다', () => {
  // 회색 바탕(200)에 흐린 글자(120) 뿐인 그림
  const data = image(200, 120, 100);
  ocr.enhance(data);
  const values = [];
  for (let i = 0; i < data.length; i += 4) values.push(data[i]);
  assert.strictEqual(Math.min.apply(null, values), 0, '가장 어두운 곳은 검게');
  assert.strictEqual(Math.max.apply(null, values), 255, '가장 밝은 곳은 희게');
});

test('색 판을 눌러 둔 그림은 더 늘이지 않는다', () => {
  const data = image(200, 120, 100);
  const how = ocr.enhance(data, { stretch: false });
  assert.strictEqual(how.low, 0);
  assert.strictEqual(how.high, 255);
  const values = [];
  for (let i = 0; i < data.length; i += 4) values.push(data[i]);
  assert.ok(Math.min.apply(null, values) > 0, '어두운 쪽을 더 누르지 않는다');
});

test('한 가지 색뿐인 그림은 건드리지 않는다', () => {
  const data = image(128, 128, 0);
  const how = ocr.enhance(data);
  assert.strictEqual(how.low, 0);
  assert.strictEqual(how.high, 255);
  assert.strictEqual(data[3], 255, '투명한 곳은 남기지 않는다');
});

test('브라우저가 아니면 기기 안 인식을 쓰지 않는다', () => {
  assert.strictEqual(ocr.available(), false);
  return ocr.read({}).then(
    () => assert.fail('되면 안 된다'),
    (err) => assert.match(err.message, /쓸 수 없습니다/)
  );
});
