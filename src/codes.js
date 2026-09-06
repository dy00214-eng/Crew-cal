/**
 * 크루 스케줄에서 쓰이는 근무 코드 사전.
 * 브라우저에서는 window.CrewCal.codes, Node 에서는 require('./codes.js') 로 사용한다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.codes = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // category: flight | layover | standby | off | training | other
  var CATEGORY_LABELS = {
    flight: '비행',
    layover: '체류',
    standby: '대기',
    off: '휴무',
    training: '훈련',
    other: '기타',
    unknown: '미확인'
  };

  var DUTY_CODES = {
    // 휴무 계열
    DO: { label: '휴무', category: 'off' },
    OFF: { label: '휴무', category: 'off' },
    X: { label: '휴무', category: 'off' },
    ATDO: { label: '추가 휴무', category: 'off' },
    ADO: { label: '추가 휴무', category: 'off' },
    GDO: { label: '보장 휴무', category: 'off' },
    CDO: { label: '보상 휴무', category: 'off' },
    VAC: { label: '휴가', category: 'off' },
    YVS: { label: '휴가', category: 'off' },
    PDO: { label: '휴무', category: 'off' },
    ANL: { label: '연차 휴가', category: 'off' },
    AL: { label: '연차 휴가', category: 'off' },
    PL: { label: '개인 휴가', category: 'off' },
    UL: { label: '무급 휴가', category: 'off' },

    // 대기 계열
    STBY: { label: '대기', category: 'standby' },
    SBY: { label: '대기', category: 'standby' },
    STB: { label: '대기', category: 'standby' },
    HSBY: { label: '자택 대기', category: 'standby' },
    RF: { label: '자택 대기', category: 'standby' },
    SA: { label: '김포공항 대기', category: 'standby' },
    SB: { label: '김포공항 대기', category: 'standby' },
    SC: { label: '김포공항 대기', category: 'standby' },
    IA: { label: '인천공항 대기', category: 'standby' },
    IB: { label: '인천공항 대기', category: 'standby' },
    IC: { label: '인천공항 대기', category: 'standby' },
    ASBY: { label: '공항 대기', category: 'standby' },
    RES: { label: '예비', category: 'standby' },
    RSV: { label: '예비', category: 'standby' },

    // 비행 근무
    TVL: { label: '비행 근무', category: 'flight' },

    // 체류 / 비행 부속
    LO: { label: '체류', category: 'layover' },
    LAYOVER: { label: '체류', category: 'layover' },
    LOFF: { label: '체류 휴식', category: 'layover' },
    DH: { label: '탑승 이동', category: 'flight' },
    DHD: { label: '탑승 이동', category: 'flight' },
    BRF: { label: '브리핑', category: 'flight' },
    BLK: { label: '블럭', category: 'other' },

    // 훈련 / 교육
    TRN: { label: '훈련', category: 'training' },
    GT: { label: '지상 훈련', category: 'training' },
    SIM: { label: '시뮬레이터', category: 'training' },
    EDU: { label: '교육', category: 'training' },
    CBT: { label: '온라인 교육', category: 'training' },
    OJT: { label: '현장 훈련', category: 'training' },
    RT: { label: '정기 훈련', category: 'training' },
    TFRS: { label: '교육', category: 'training' },

    // 기타
    SICK: { label: '병가', category: 'other' },
    SK: { label: '병가', category: 'other' },
    ML: { label: '병가/모성 휴가', category: 'other' },
    MED: { label: '신체검사', category: 'other' },
    OFC: { label: '사무 근무', category: 'other' },
    MTG: { label: '회의', category: 'other' }
  };

  // 코드로 오인하기 쉬운 단어들 (요일/헤더/시간 관련)
  var IGNORED_TOKENS = {};
  ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN',
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'SEPT', 'OCT', 'NOV', 'DEC',
    'AM', 'PM', 'UTC', 'KST', 'LT', 'STD', 'STA', 'ETD', 'ETA', 'ATD', 'ATA',
    'TO', 'FROM', 'VIA', 'DATE', 'CODE', 'DUTY', 'FLT', 'FLIGHT', 'DEP', 'ARR',
    'NO', 'AC', 'REG', 'PIC', 'CA', 'FA', 'TOTAL', 'REMARK', 'REMARKS'
  ].forEach(function (t) { IGNORED_TOKENS[t] = true; });

  // 시각 앞에 붙는 라벨. 파서가 출발/도착 시각을 구분하는 데 쓴다.
  var TIME_LABELS = {
    STD: 'start', ETD: 'start', ATD: 'start', DEP: 'start', DEPT: 'start',
    DEPARTURE: 'start', OUT: 'start', OFFBLK: 'start',
    '출발': 'start', '출발시각': 'start', '출발시간': 'start', '출': 'start',
    STA: 'end', ETA: 'end', ATA: 'end', ARR: 'end', ARRV: 'end',
    ARRIVAL: 'end', IN: 'end', ONBLK: 'end',
    '도착': 'end', '도착시각': 'end', '도착시간': 'end', '도': 'end'
  };

  var MONTHS = {
    JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
    JUL: 7, AUG: 8, SEP: 9, SEPT: 9, OCT: 10, NOV: 11, DEC: 12
  };

  function timeLabel(token) {
    if (!token) return null;
    var key = String(token).toUpperCase().replace(/[.:\-_]+$/, '');
    return TIME_LABELS[key] || null;
  }

  function lookup(code) {
    if (!code) return null;
    var key = String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');
    return DUTY_CODES[key] || null;
  }

  function describe(code) {
    var hit = lookup(code);
    if (hit) return hit;
    return { label: '미확인 코드', category: 'unknown' };
  }

  function knownCodeList() {
    return Object.keys(DUTY_CODES).sort();
  }

  return {
    DUTY_CODES: DUTY_CODES,
    CATEGORY_LABELS: CATEGORY_LABELS,
    IGNORED_TOKENS: IGNORED_TOKENS,
    TIME_LABELS: TIME_LABELS,
    MONTHS: MONTHS,
    timeLabel: timeLabel,
    lookup: lookup,
    describe: describe,
    knownCodeList: knownCodeList
  };
});
