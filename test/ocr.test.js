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

test('작은 캡처는 키우고, 큰 캡처는 줄인다', () => {
  assert.strictEqual(ocr.scaleFor(2000, 1500), 1, '넉넉한 크기는 그대로');

  const small = ocr.scaleFor(390, 300);
  assert.ok(small > 1 && small <= 3, '작은 캡처는 키운다: ' + small);
  assert.ok(390 * small >= 1000, '키운 뒤에는 읽을 만한 크기');

  const huge = ocr.scaleFor(4000, 3000);
  assert.ok(huge < 1 && 4000 * huge <= 2800, '큰 캡처는 줄인다: ' + huge);

  // 아주 좁고 긴 캡처도 지나치게 커지지 않는다
  const strip = ocr.scaleFor(300, 4000);
  assert.ok(4000 * strip <= 2800);
  assert.strictEqual(ocr.scaleFor(0, 0), 1);
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
