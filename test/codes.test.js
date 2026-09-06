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
