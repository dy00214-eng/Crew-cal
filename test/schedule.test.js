const test = require('node:test');
const assert = require('node:assert');
const schedule = require('../src/schedule.js');

test('편명 표기가 달라도 같은 편으로 찾는다', () => {
  assert.strictEqual(schedule.normalize('KE35'), 'KE0035');
  assert.strictEqual(schedule.normalize('KE035'), 'KE0035');
  assert.strictEqual(schedule.normalize('KE0035'), 'KE0035');
  assert.strictEqual(schedule.normalize('LO'), null);
});

test('한국으로 들어오는 편은 한국 도착 시각만 담는다', () => {
  const ke36 = schedule.lookup('KE0036');
  assert.strictEqual(ke36.route, 'ATL/ICN');
  assert.strictEqual(ke36.start, null);      // 현지 출발 시각은 화면에 쓰지 않으므로 담지 않는다
  assert.strictEqual(ke36.end, '17:50');
  assert.strictEqual(ke36.endOffset, 1);
});

test('출발만 확인한 편은 도착을 비워 둔다', () => {
  const ke17 = schedule.lookup('KE17');
  assert.strictEqual(ke17.route, 'ICN/LAX');
  assert.strictEqual(ke17.start, '14:30');
  assert.strictEqual(ke17.end, null);
});

test('구간만 추정한 편은 시각을 비워 둔다', () => {
  // KE0127 은 표에 있고 KE0128 은 없다
  const ke128 = schedule.lookup('KE0128');
  assert.strictEqual(ke128.route, 'FOC/ICN');
  assert.strictEqual(ke128.derived, true);
  assert.strictEqual(ke128.start, null);
  assert.strictEqual(ke128.end, null);
});

test('모르는 편은 아무것도 지어내지 않는다', () => {
  assert.strictEqual(schedule.lookup('KE9999'), null);
  assert.strictEqual(schedule.lookup('OZ201'), null);
  assert.strictEqual(schedule.lookup('LO'), null);
});

test('KE8053 은 인천 출발 시각을 갖는다', () => {
  const ke8053 = schedule.lookup('KE8053');
  assert.strictEqual(ke8053.route, 'ICN/HNL');
  assert.strictEqual(ke8053.start, '22:35');
});

test('표에 담긴 모든 편은 구간을 가진다', () => {
  Object.keys(schedule.TABLE).forEach((code) => {
    assert.ok(/^[A-Z]{3}\/[A-Z]{3}$/.test(schedule.TABLE[code].route), code + ' 구간 형식');
    assert.ok(/^KE\d{4}$/.test(code), code + ' 편명 형식');
  });
});

test('인천 출발편은 출발 시각, 도착편은 한국 도착 시각을 갖는다', () => {
  const out = schedule.lookup('KE0037');
  assert.strictEqual(out.route, 'ICN/ORD');
  assert.strictEqual(out.start, '10:40');
  assert.strictEqual(out.end, null);

  const back = schedule.lookup('KE0036');
  assert.strictEqual(back.route, 'ATL/ICN');
  assert.strictEqual(back.end, '17:50');
  assert.strictEqual(back.endOffset, 1);
  assert.strictEqual(back.start, null);
});

test('표에 있는 복편은 한국 도착 시각까지 돌려준다', () => {
  const back = schedule.lookup('KE0038');
  assert.strictEqual(back.route, 'ORD/ICN');
  assert.strictEqual(back.derived, false);
  assert.strictEqual(back.end, '16:50');
  assert.strictEqual(back.endOffset, 1);
});

test('되돌아오는 편 추정은 인천에서 나가는 편에만 적용한다', () => {
  assert.strictEqual(schedule.lookup('KE9998'), null);   // 짝이 표에 없다
  assert.strictEqual(schedule.lookup('KE2072').derived, false);  // 표에 있으면 그대로
});

test('표에 없는 홀수 편은 뒤 짝수 편의 나가는 구간으로 본다', () => {
  const out = schedule.lookup('KE0623');   // KE0624 MNL/ICN 이 표에 있다
  assert.strictEqual(out.route, 'ICN/MNL');
  assert.strictEqual(out.derived, true);
  assert.strictEqual(out.start, null);
});

test('따로 확인한 편은 한국 쪽 시각을 갖는다', () => {
  assert.strictEqual(schedule.lookup('KE0085').start, '19:30');
  assert.strictEqual(schedule.lookup('KE0741').start, '10:35');
  assert.strictEqual(schedule.lookup('KE0601').start, '18:50');
  assert.strictEqual(schedule.lookup('KE0479').start, '19:35');
  assert.strictEqual(schedule.lookup('KE0498').end, '05:20');
  assert.strictEqual(schedule.lookup('KE0498').endOffset, 1);
});

test('김포 출발·도착편도 표에 있다', () => {
  const out = schedule.lookup('KE2101');
  assert.strictEqual(out.route, 'GMP/HND');
  assert.strictEqual(out.start, '09:00');

  const back = schedule.lookup('KE2102');
  assert.strictEqual(back.route, 'HND/GMP');
  assert.strictEqual(back.end, '14:55');
});

test('김포 국내선도 구간을 갖는다', () => {
  assert.strictEqual(schedule.lookup('KE1121').route, 'GMP/CJU');
  assert.strictEqual(schedule.lookup('KE1803').route, 'GMP/PUS');
  assert.strictEqual(schedule.lookup('KE1843').route, 'GMP/USN');
});

test('국내선은 대역 규칙으로 구간을 채운다', () => {
  // 표에 없는 편이라도 대역이 알려 준다. 홀수가 앞에서 뒤로, 짝수가 뒤에서 앞으로.
  const back = schedule.lookup('KE1122');
  assert.strictEqual(back.route, 'CJU/GMP');
  assert.strictEqual(back.derived, 'domestic-band', '짐작이라고 남긴다');

  const busan = schedule.lookup('KE1810');
  assert.strictEqual(busan.route, 'PUS/GMP');
  assert.strictEqual(busan.derived, 'domestic-band');
  assert.strictEqual(schedule.lookup('KE1807').route, 'GMP/PUS');
  assert.strictEqual(schedule.lookup('KE1807').derived, false, '표에 있으면 짐작이 아니다');

  // 대역 규칙은 표에 있는 국내선 편과 하나도 어긋나지 않는다
  Object.keys(schedule.TABLE).forEach((key) => {
    const n = +key.slice(2);
    if (n < 1000 || n > 1999) return;
    const guess = schedule.domesticRoute(n);
    if (guess) assert.strictEqual(guess, schedule.TABLE[key].route, key);
  });
});

test('편명 대역으로 국내선·국제선·화물을 가른다', () => {
  assert.strictEqual(schedule.bandOf(35).kind, 'international');
  assert.strictEqual(schedule.bandOf(1807).kind, 'domestic');
  assert.strictEqual(schedule.bandOf(2179).kind, 'international', '2000번대는 계절편이어도 국제선');
  assert.strictEqual(schedule.bandOf(9001).kind, 'cargo');
  assert.strictEqual(schedule.bandOf(5000), null);

  assert.strictEqual(schedule.isDomestic('KE1810'), true);
  assert.strictEqual(schedule.isDomestic('KE2179'), false);
  assert.strictEqual(schedule.isDomestic('KE0035'), false);
  assert.strictEqual(schedule.lookup('KE2179').kind, 'international');
});

test('어느 쪽인지 확인 못 한 대역은 지어내지 않는다', () => {
  // 1562 는 부산, 1569 는 대구. 그 사이는 비워 둔다.
  assert.strictEqual(schedule.domesticRoute(1562), 'CJU/PUS');
  assert.strictEqual(schedule.domesticRoute(1569), 'TAE/CJU');
  assert.strictEqual(schedule.domesticRoute(1564), null);
  assert.strictEqual(schedule.lookup('KE1564'), null);
});

test('부산 출발·도착편도 표에 있다', () => {
  assert.strictEqual(schedule.lookup('KE2129').route, 'PUS/NRT');
  assert.strictEqual(schedule.lookup('KE2129').start, '09:20');
  assert.strictEqual(schedule.lookup('KE2130').route, 'NRT/PUS');
  assert.strictEqual(schedule.lookup('KE2130').end, '14:55');
  assert.strictEqual(schedule.lookup('KE2085').route, 'PUS/TPE');
});

test('국내선은 두 공항 전광판의 시각을 합쳐 출발·도착을 모두 갖는다', () => {
  const out = schedule.lookup('KE1401');   // 인천 출발판 + 부산 도착판
  assert.strictEqual(out.route, 'ICN/PUS');
  assert.strictEqual(out.start, '06:35');
  assert.strictEqual(out.end, '07:45');

  const gmp = schedule.lookup('KE1803');   // 김포 출발판 + 부산 도착판
  assert.strictEqual(gmp.route, 'GMP/PUS');
  assert.strictEqual(gmp.start, '07:00');
  assert.strictEqual(gmp.end, '08:05');
});

test('제주 출발·도착편도 표에 있다', () => {
  assert.strictEqual(schedule.lookup('KE2125').route, 'CJU/NRT');
  assert.strictEqual(schedule.lookup('KE2125').start, '12:55');
  assert.strictEqual(schedule.lookup('KE2126').route, 'NRT/CJU');
  assert.strictEqual(schedule.lookup('KE1704').route, 'CJU/CJJ');
});

test('김포-제주 국내선은 양쪽 전광판을 합쳐 출발·도착을 모두 갖는다', () => {
  const out = schedule.lookup('KE1007');
  assert.strictEqual(out.route, 'GMP/CJU');
  assert.strictEqual(out.start, '06:35');
  assert.strictEqual(out.end, '07:50');

  const back = schedule.lookup('KE1136');
  assert.strictEqual(back.route, 'CJU/GMP');
  assert.strictEqual(back.start, '08:35');
  assert.strictEqual(back.end, '09:50');
});

test('지방 공항 국내선은 양쪽 전광판이 합쳐져 출발·도착을 모두 갖는다', () => {
  const pairs = [
    ['KE1569', 'TAE/CJU', '11:05', '12:10'],
    ['KE1608', 'CJU/KWJ', '09:10', '10:05'],
    ['KE1704', 'CJU/CJJ', '07:20', '08:30'],
    ['KE1595', 'USN/CJU', '15:00', '16:10'],
    ['KE1586', 'CJU/HIN', '13:20', '14:25'],
    ['KE1432', 'TAE/ICN', '07:55', '09:00']
  ];
  pairs.forEach(([code, route, start, end]) => {
    const hit = schedule.lookup(code);
    assert.strictEqual(hit.route, route, code + ' 구간');
    assert.strictEqual(hit.start, start, code + ' 출발');
    assert.strictEqual(hit.end, end, code + ' 도착');
  });
});
