const test = require('node:test');
const assert = require('node:assert');
const codes = require('../src/codes.js');

test('휴가는 휴무와 다른 분류로 읽는다', () => {
  // 달력에서 오프와 휴가가 갈라 보이게 하려는 것
  assert.strictEqual(codes.lookup('YVS').category, 'vacation');
  assert.strictEqual(codes.lookup('VAC').category, 'vacation');
  assert.strictEqual(codes.lookup('ANL').category, 'vacation');
  assert.strictEqual(codes.lookup('ATDO').category, 'off');
  assert.strictEqual(codes.lookup('PDO').category, 'off');
  assert.strictEqual(codes.CATEGORY_LABELS.vacation, '휴가');
});

test('FVC · PVC 도 휴가다', () => {
  assert.strictEqual(codes.lookup('FVC').category, 'vacation');
  assert.strictEqual(codes.lookup('PVC').category, 'vacation');
  assert.strictEqual(codes.lookup('FVC').label, '휴가');
  assert.strictEqual(codes.lookup('fvc').category, 'vacation', '소문자로 적어도 같다');
  assert.ok(codes.knownCodeList().indexOf('FVC') !== -1, '아는 코드 목록에도 들어간다');
});
