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

test('편명으로 인정할 항공사는 흰 목록으로 받는다', () => {
  assert.deepStrictEqual(codes.airlineList(), ['KE'], '기본은 대한항공만');
  assert.strictEqual(codes.isFlightCode('KE0035'), true);
  assert.strictEqual(codes.isFlightCode('AS0016'), false, '모르는 항공사는 편명이 아니다');
  assert.strictEqual(codes.isFlightCode('0035'), false, '숫자만 있는 것은 시각일 수 있다');
  assert.strictEqual(codes.isFlightCode('1020'), false);

  assert.deepStrictEqual(codes.setAirlines(['ke', ' OZ ', '7C', '??', 'KE']), ['KE', 'OZ', '7C']);
  assert.strictEqual(codes.isFlightCode('OZ0201'), true);
  assert.strictEqual(codes.isFlightCode('7C1234'), true);
  assert.strictEqual(codes.isFlightCode('AS0016'), false);

  assert.deepStrictEqual(codes.setAirlines([]), ['KE'], '비우면 기본값으로 돌아온다');
  assert.deepStrictEqual(codes.splitFlight('KE-35'), { airline: 'KE', number: '35', suffix: '' });
  assert.strictEqual(codes.splitFlight('ATDO'), null);
});
