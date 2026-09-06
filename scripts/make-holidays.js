/**
 * 설날 · 부처님오신날 · 추석 날짜를 음력 계산으로 뽑아 src/holidays-lunar.js 를 만든다.
 *
 *   node scripts/make-holidays.js [시작연도] [끝연도]      (기본 2020~2100)
 *
 * 왜 계산하나: 음력 공휴일은 해마다 양력 날짜가 달라 손으로 적을 수 없다.
 * 어떻게 계산하나: 한국 음력은 중국식 태음태양력과 같은 규칙을 쓰고, 달의 시작은
 * 삭(합삭)이 든 날, 윤달은 중기(태양 황경이 30도의 배수가 되는 순간)가 없는 달이다.
 * 삭의 순간은 Meeus 의 주기항으로, 태양 황경은 저정밀 공식으로 구한다.
 * 모두 한국 표준시(UTC+9) 자정 기준으로 날짜를 가른다.
 *
 * 계산이 맞는지는 이미 아는 해의 날짜(ANCHORS)와 맞춰 보고, 하나라도 어긋나면 멈춘다.
 */
const fs = require('fs');
const path = require('path');

const RAD = Math.PI / 180;
const J2000 = 2451545.0;
const SYNODIC = 29.530588861;

/** TT - UT (초). Espenak · Meeus 근사식. */
function deltaT(year) {
  let u;
  if (year >= 2005 && year < 2050) {
    const t = year - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t * t;
  }
  if (year >= 2050 && year <= 2150) {
    return -20 + 32 * Math.pow((year - 1820) / 100, 2) - 0.5628 * (2150 - year);
  }
  if (year >= 1986 && year < 2005) {
    const t = year - 2000;
    return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * Math.pow(t, 3) +
      0.000651814 * Math.pow(t, 4) + 0.00002373599 * Math.pow(t, 5);
  }
  if (year >= 1961 && year < 1986) {
    const t = year - 1975;
    return 45.45 + 1.067 * t - t * t / 260 - Math.pow(t, 3) / 718;
  }
  u = (year - 1820) / 100;
  return -20 + 32 * u * u;
}

function sin(deg) { return Math.sin(deg * RAD); }

/** k 번째 삭(합삭)의 순간. 역학시(TT) 기준 율리우스일. Meeus, Astronomical Algorithms 49장. */
function newMoonJDE(k) {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;

  let jde = 2451550.09766 + SYNODIC * k + 0.00015437 * T2 - 0.000000150 * T3 + 0.00000000073 * T4;

  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const M = 2.5534 + 29.10535670 * k - 0.0000014 * T2 - 0.00000011 * T3;          // 태양 평균근점이각
  const Mp = 201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4; // 달 평균근점이각
  const F = 160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4;  // 달 위도 인수
  const O = 124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3;         // 승교점 황경

  jde +=
    -0.40720 * sin(Mp) +
    0.17241 * E * sin(M) +
    0.01608 * sin(2 * Mp) +
    0.01039 * sin(2 * F) +
    0.00739 * E * sin(Mp - M) +
    -0.00514 * E * sin(Mp + M) +
    0.00208 * E * E * sin(2 * M) +
    -0.00111 * sin(Mp - 2 * F) +
    -0.00057 * sin(Mp + 2 * F) +
    0.00056 * E * sin(2 * Mp + M) +
    -0.00042 * sin(3 * Mp) +
    0.00042 * E * sin(M + 2 * F) +
    0.00038 * E * sin(M - 2 * F) +
    -0.00024 * E * sin(2 * Mp - M) +
    -0.00017 * sin(O) +
    -0.00007 * sin(Mp + 2 * M) +
    0.00004 * sin(2 * Mp - 2 * F) +
    0.00004 * sin(3 * M) +
    0.00003 * sin(Mp + M - 2 * F) +
    0.00003 * sin(2 * Mp + 2 * F) +
    -0.00003 * sin(Mp + M + 2 * F) +
    0.00003 * sin(Mp - M + 2 * F) +
    -0.00002 * sin(Mp - M - 2 * F) +
    -0.00002 * sin(3 * Mp + M) +
    0.00002 * sin(4 * Mp);

  // 행성 섭동에서 오는 잔여항 (Meeus 표 49.A 아래의 추가 보정)
  const A = [
    [299.77 + 0.107408 * k - 0.009173 * T2, 0.000325],
    [251.88 + 0.016321 * k, 0.000165],
    [251.83 + 26.651886 * k, 0.000164],
    [349.42 + 36.412478 * k, 0.000126],
    [84.66 + 18.206239 * k, 0.000110],
    [141.74 + 53.303771 * k, 0.000062],
    [207.14 + 2.453732 * k, 0.000060],
    [154.84 + 7.306860 * k, 0.000056],
    [34.52 + 27.261239 * k, 0.000047],
    [207.19 + 0.121824 * k, 0.000042],
    [291.34 + 1.844379 * k, 0.000040],
    [161.72 + 24.198154 * k, 0.000037],
    [239.56 + 25.513099 * k, 0.000035],
    [331.55 + 3.592518 * k, 0.000023]
  ];
  A.forEach(([angle, coef]) => { jde += coef * sin(angle); });

  return jde;
}

/** 역학시 율리우스일 -> 한국 표준시 율리우스일 */
function toKst(jde) {
  const year = 2000 + (jde - J2000) / 365.25;
  return jde - deltaT(year) / 86400 + 9 / 24;
}

/** 한국 표준시 자정 기준 날짜 번호(정수). 같은 날이면 같은 값이 나온다. */
function dayNumber(jdKst) {
  return Math.floor(jdKst + 0.5);
}

/** 태양의 겉보기 황경(도). Meeus 25장 저정밀 공식. */
function sunLongitude(jde) {
  const T = (jde - J2000) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) +
    (0.019993 - 0.000101 * T) * sin(2 * M) +
    0.000289 * sin(3 * M);
  const omega = 125.04 - 1934.136 * T;
  const apparent = L0 + C - 0.00569 - 0.00478 * sin(omega);
  return ((apparent % 360) + 360) % 360;
}

/** 태양 황경이 target 도가 되는 순간(TT 율리우스일). guess 근처를 뒤진다. */
function solveSunLongitude(target, guessJde) {
  let jde = guessJde;
  for (let i = 0; i < 40; i++) {
    const diff = ((sunLongitude(jde) - target + 540) % 360) - 180;
    if (Math.abs(diff) < 1e-7) break;
    jde -= diff * 365.2422 / 360;   // 하루에 약 1도씩 움직인다
  }
  return jde;
}

/** 그 해 12월의 동지 순간(TT) */
function winterSolstice(year) {
  const guess = gregorianToJd(year, 12, 21);
  return solveSunLongitude(270, guess);
}

function gregorianToJd(y, m, d) {
  if (m <= 2) { y -= 1; m += 12; }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
}

function jdToGregorian(jd) {
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;
  let a = z;
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e) + f;
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  return { year: year, month: month, day: Math.floor(day) };
}

/** 어떤 순간 직전(또는 그 순간)의 삭. 그 달이 시작하는 날 번호를 준다. */
function newMoonDayBefore(jdeInstant) {
  let k = Math.round((jdeInstant - 2451550.09766) / SYNODIC) + 1;
  while (newMoonJDE(k) > jdeInstant) k -= 1;
  return k;
}

/**
 * 그 해의 음력 달 목록을 만든다.
 * 전년 동지가 든 달(11월)부터 그 해 동지가 든 달(11월)까지를 한 묶음으로 보고,
 * 묶음 안의 달이 13개면 윤달이 있는 해다. 윤달은 중기가 없는 첫 번째 달이다.
 */
function lunarMonths(year) {
  const ws0 = winterSolstice(year - 1);
  const ws1 = winterSolstice(year);
  const k0 = newMoonDayBefore(ws0);
  const k1 = newMoonDayBefore(ws1);
  const count = k1 - k0;                 // 11월과 11월 사이의 달 수
  const leapYear = count === 13;

  const starts = [];
  for (let i = 0; i <= count; i++) starts.push(dayNumber(toKst(newMoonJDE(k0 + i))));

  // 각 달 시작일의 태양 황경 구간 번호. 앞뒤가 같으면 그 달에는 중기가 없다.
  const zone = starts.map((dayNo) => {
    const jde = dayNo - 0.5 + deltaT(year) / 86400 - 9 / 24; // 그 날 한국 자정의 TT
    return Math.floor(sunLongitude(jde) / 30);
  });

  // 달 i 는 starts[i] 부터 starts[i+1] 까지다. 그 사이에 구간 번호가 안 바뀌면
  // 그 달에는 중기가 없다는 뜻이고, 그런 첫 번째 달이 윤달이다.
  // (0번 달은 동지가 든 11월이라 언제나 중기를 갖는다)
  let leapIndex = -1;
  if (leapYear) {
    for (let i = 1; i < count; i++) {
      if (zone[i + 1] === zone[i]) { leapIndex = i; break; }
    }
    if (leapIndex === -1) leapIndex = count - 1; // 이론상 오지 않는 경우
  }

  const months = [];
  let number = 11;
  for (let i = 0; i < count; i++) {
    const isLeap = leapYear && i === leapIndex;
    if (!isLeap) {
      months.push({ number: number, leap: false, start: starts[i] });
      number = number === 12 ? 1 : number + 1;
    } else {
      months.push({ number: number === 1 ? 12 : number - 1, leap: true, start: starts[i] });
    }
  }
  return months;
}

/** 그 해의 음력 (달, 일)에 해당하는 양력 날짜. 윤달은 쓰지 않는다. */
function lunarToSolar(year, monthNumber, day) {
  const months = lunarMonths(year);
  const hit = months.find((m) => m.number === monthNumber && !m.leap);
  if (!hit) throw new Error(year + '년 음력 ' + monthNumber + '월을 찾지 못했습니다.');
  const g = jdToGregorian(hit.start + day - 1);
  return pad(g.year, 4) + '-' + pad(g.month, 2) + '-' + pad(g.day, 2);
}

function pad(n, width) {
  let s = String(n);
  while (s.length < width) s = '0' + s;
  return s;
}

/** 계산이 맞는지 대볼 이미 아는 날짜들 (설날, 부처님오신날, 추석) */
const ANCHORS = {
  2020: ['2020-01-25', '2020-04-30', '2020-10-01'],
  2021: ['2021-02-12', '2021-05-19', '2021-09-21'],
  2022: ['2022-02-01', '2022-05-08', '2022-09-10'],
  2023: ['2023-01-22', '2023-05-27', '2023-09-29'],
  2024: ['2024-02-10', '2024-05-15', '2024-09-17'],
  2025: ['2025-01-29', '2025-05-05', '2025-10-06'],
  2026: ['2026-02-17', '2026-05-24', '2026-09-25'],
  2027: ['2027-02-07', '2027-05-13', '2027-09-15']
};

function computeYear(year) {
  return [
    lunarToSolar(year, 1, 1),     // 설날
    lunarToSolar(year, 4, 8),     // 부처님오신날
    lunarToSolar(year, 8, 15)     // 추석
  ];
}

function main() {
  const from = +(process.argv[2] || 2020);
  const to = +(process.argv[3] || 2100);

  // 아는 해와 대조. 하나라도 어긋나면 만들지 않는다.
  let bad = 0;
  Object.keys(ANCHORS).forEach((y) => {
    const got = computeYear(+y);
    const want = ANCHORS[y];
    got.forEach((date, i) => {
      if (date !== want[i]) {
        console.error('어긋남 ' + y + '년 [' + ['설날', '부처님오신날', '추석'][i] + '] 계산 ' + date + ' / 알려진 값 ' + want[i]);
        bad++;
      }
    });
  });
  if (bad) {
    console.error('맞지 않는 날짜가 ' + bad + '개 있어 만들지 않았습니다.');
    process.exit(1);
  }
  console.log('아는 해 ' + Object.keys(ANCHORS).length + '개(' + Object.keys(ANCHORS).length * 3 + '일) 모두 일치');

  const rows = [];
  for (let year = from; year <= to; year++) {
    const [seol, buddha, chuseok] = computeYear(year);
    rows.push('    ' + year + ": '" + seol.slice(5).replace('-', '') +
      ' ' + buddha.slice(5).replace('-', '') +
      ' ' + chuseok.slice(5).replace('-', '') + "'");
  }

  const out = `/**
 * 음력에서 오는 공휴일의 양력 날짜. 해마다 [설날, 부처님오신날, 추석] 을 MMDD 로 적었다.
 *
 * 손으로 적은 것이 아니라 scripts/make-holidays.js 가 음력 계산으로 뽑은 값이다.
 *   node scripts/make-holidays.js ${from} ${to}
 * 이미 아는 해(2020~2027)의 날짜와 맞는지 대조한 뒤에만 만들어진다.
 * 연휴와 대체공휴일은 여기서 정하지 않고 holidays.js 가 규칙으로 계산한다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.holidayLunar = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  return {
    FROM: ${from},
    TO: ${to},
    DATES: {
${rows.join(',\n')}
    }
  };
});
`;

  const target = path.join(__dirname, '..', 'src', 'holidays-lunar.js');
  fs.writeFileSync(target, out);
  console.log('만들었습니다: src/holidays-lunar.js (' + from + '~' + to + '년, ' + rows.length + '개 해)');
}

if (require.main === module) main();

// 검사용으로 안쪽 함수도 내보낸다
module.exports = {
  lunarMonths: lunarMonths,
  lunarToSolar: lunarToSolar,
  jdToGregorian: jdToGregorian,
  computeYear: computeYear,
  winterSolstice: winterSolstice,
  ANCHORS: ANCHORS
};
