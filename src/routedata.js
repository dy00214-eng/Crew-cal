/**
 * 노선·공항 자료. data/ke-routes.json 과 data/airports.json 에서 옮겨 적은 것이다.
 * 손으로 고치지 말 것 — scripts/make-routes.js 가 다시 쓴다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.routedata = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ROUTES = {
    "KE0005": {
      "from": "ICN",
      "to": "LAS",
      "city": "라스베이거스",
      "country": "US",
      "flag": "🇺🇸",
      "start": "21:00",
      "end": null,
      "endOffset": 0
    },
    "KE0006": {
      "from": "LAS",
      "to": "ICN",
      "city": "라스베이거스",
      "country": "US",
      "flag": "🇺🇸",
      "start": null,
      "end": "04:40",
      "endOffset": 1
    },
    "KE0011": {
      "from": "ICN",
      "to": "LAX",
      "city": "로스앤젤레스",
      "country": "US",
      "flag": "🇺🇸",
      "start": "19:40",
      "end": null,
      "endOffset": 0
    },
    "KE0012": {
      "from": "LAX",
      "to": "ICN",
      "city": "로스앤젤레스",
      "country": "US",
      "flag": "🇺🇸",
      "start": null,
      "end": "04:40",
      "endOffset": 1
    },
    "KE0017": {
      "from": "ICN",
      "to": "LAX",
      "city": "로스앤젤레스",
      "country": "US",
      "flag": "🇺🇸",
      "start": "14:30",
      "end": null,
      "endOffset": 0
    },
    "KE0018": {
      "from": "LAX",
      "to": "ICN",
      "city": "로스앤젤레스",
      "country": "US",
      "flag": "🇺🇸",
      "start": null,
      "end": "17:50",
      "endOffset": 1
    },
    "KE0023": {
      "from": "ICN",
      "to": "SFO",
      "city": "샌프란시스코",
      "country": "US",
      "flag": "🇺🇸",
      "start": "16:00",
      "end": null,
      "endOffset": 0
    },
    "KE0024": {
      "from": "SFO",
      "to": "ICN",
      "city": "샌프란시스코",
      "country": "US",
      "flag": "🇺🇸",
      "start": null,
      "end": "17:20",
      "endOffset": 1
    },
    "KE0031": {
      "from": "ICN",
      "to": "DFW",
      "city": "댈러스",
      "country": "US",
      "flag": "🇺🇸",
      "start": "09:30",
      "end": null,
      "endOffset": 0
    },
    "KE0032": {
      "from": "DFW",
      "to": "ICN",
      "city": "댈러스",
      "country": "US",
      "flag": "🇺🇸",
      "start": null,
      "end": "16:40",
      "endOffset": 1
    },
    "KE0033": {
      "from": "ICN",
      "to": "ATL",
      "city": "애틀랜타",
      "country": "US",
      "flag": "🇺🇸",
      "start": "08:45",
      "end": null,
      "endOffset": 0
    },
    "KE0034": {
      "from": "ATL",
      "to": "ICN",
      "city": "애틀랜타",
      "country": "US",
      "flag": "🇺🇸",
      "start": null,
      "end": "15:55",
      "endOffset": 1
    },
    "KE0035": {
      "from": "ICN",
      "to": "ATL",
      "city": "애틀랜타",
      "country": "US",
      "flag": "🇺🇸",
      "start": "10:35",
      "end": null,
      "endOffset": 0
    },
    "KE0036": {
      "from": "ATL",
      "to": "ICN",
      "city": "애틀랜타",
      "country": "US",
      "flag": "🇺🇸",
      "start": null,
      "end": "17:50",
      "endOffset": 1
    },
    "KE0037": {
      "from": "ICN",
      "to": "ORD",
      "city": "시카고",
      "country": "US",
      "flag": "🇺🇸",
      "start": "10:40",
      "end": null,
      "endOffset": 0
    },
    "KE0038": {
      "from": "ORD",
      "to": "ICN",
      "city": "시카고",
      "country": "US",
      "flag": "🇺🇸",
      "start": null,
      "end": "16:50",
      "endOffset": 1
    },
    "KE0041": {
      "from": "ICN",
      "to": "SEA",
      "city": "시애틀",
      "country": "US",
      "flag": "🇺🇸",
      "start": "16:40",
      "end": null,
      "endOffset": 0
    },
    "KE0042": {
      "from": "SEA",
      "to": "ICN",
      "city": "시애틀",
      "country": "US",
      "flag": "🇺🇸",
      "start": null,
      "end": "16:40",
      "endOffset": 1
    },
    "KE0053": {
      "from": "ICN",
      "to": "HNL",
      "city": "호놀룰루",
      "country": "US",
      "flag": "🇺🇸",
      "start": "21:05",
      "end": null,
      "endOffset": 0
    },
    "KE0054": {
      "from": "HNL",
      "to": "ICN",
      "city": "호놀룰루",
      "country": "US",
      "flag": "🇺🇸",
      "start": null,
      "end": "17:40",
      "endOffset": 1
    },
    "KE0071": {
      "from": "ICN",
      "to": "YVR",
      "city": "밴쿠버",
      "country": "CA",
      "flag": "🇨🇦",
      "start": "18:45",
      "end": null,
      "endOffset": 0
    },
    "KE0072": {
      "from": "YVR",
      "to": "ICN",
      "city": "밴쿠버",
      "country": "CA",
      "flag": "🇨🇦",
      "start": null,
      "end": "17:50",
      "endOffset": 1
    },
    "KE0075": {
      "from": "ICN",
      "to": "YVR",
      "city": "밴쿠버",
      "country": "CA",
      "flag": "🇨🇦",
      "start": "22:40",
      "end": null,
      "endOffset": 0
    },
    "KE0076": {
      "from": "YVR",
      "to": "ICN",
      "city": "밴쿠버",
      "country": "CA",
      "flag": "🇨🇦",
      "start": null,
      "end": "04:25",
      "endOffset": 1
    },
    "KE0077": {
      "from": "ICN",
      "to": "YYZ",
      "city": "토론토",
      "country": "CA",
      "flag": "🇨🇦",
      "start": "10:00",
      "end": null,
      "endOffset": 0
    },
    "KE0078": {
      "from": "YYZ",
      "to": "ICN",
      "city": "토론토",
      "country": "CA",
      "flag": "🇨🇦",
      "start": null,
      "end": "16:30",
      "endOffset": 1
    },
    "KE0081": {
      "from": "ICN",
      "to": "JFK",
      "city": "뉴욕",
      "country": "US",
      "flag": "🇺🇸",
      "start": "10:00",
      "end": null,
      "endOffset": 0
    },
    "KE0082": {
      "from": "JFK",
      "to": "ICN",
      "city": "뉴욕",
      "country": "US",
      "flag": "🇺🇸",
      "start": null,
      "end": "17:50",
      "endOffset": 1
    },
    "KE0085": {
      "from": "ICN",
      "to": "JFK",
      "city": "뉴욕",
      "country": "US",
      "flag": "🇺🇸",
      "start": "19:30",
      "end": null,
      "endOffset": 0
    },
    "KE0086": {
      "from": "JFK",
      "to": "ICN",
      "city": "뉴욕",
      "country": "US",
      "flag": "🇺🇸",
      "start": null,
      "end": "05:10",
      "endOffset": 1
    },
    "KE0092": {
      "from": "BOS",
      "to": "ICN",
      "city": "보스턴",
      "country": "US",
      "flag": "🇺🇸",
      "start": null,
      "end": "17:25",
      "endOffset": 1
    },
    "KE0093": {
      "from": "ICN",
      "to": "IAD",
      "city": "워싱턴",
      "country": "US",
      "flag": "🇺🇸",
      "start": "10:25",
      "end": null,
      "endOffset": 0
    },
    "KE0094": {
      "from": "IAD",
      "to": "ICN",
      "city": "워싱턴",
      "country": "US",
      "flag": "🇺🇸",
      "start": null,
      "end": "17:40",
      "endOffset": 1
    },
    "KE0101": {
      "from": "ICN",
      "to": "NKG",
      "city": "난징",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "10:25",
      "end": null,
      "endOffset": 0
    },
    "KE0102": {
      "from": "NKG",
      "to": "ICN",
      "city": "난징",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "16:15",
      "endOffset": 0
    },
    "KE0115": {
      "from": "ICN",
      "to": "YNJ",
      "city": "옌지",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "09:25",
      "end": null,
      "endOffset": 0
    },
    "KE0116": {
      "from": "YNJ",
      "to": "ICN",
      "city": "옌지",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "15:25",
      "endOffset": 0
    },
    "KE0125": {
      "from": "ICN",
      "to": "XMN",
      "city": "샤먼",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "10:20",
      "end": null,
      "endOffset": 0
    },
    "KE0126": {
      "from": "XMN",
      "to": "ICN",
      "city": "샤먼",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "18:05",
      "endOffset": 0
    },
    "KE0127": {
      "from": "ICN",
      "to": "FOC",
      "city": "푸저우",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "08:10",
      "end": null,
      "endOffset": 0
    },
    "KE0134": {
      "from": "CGO",
      "to": "ICN",
      "city": "정저우",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "14:20",
      "endOffset": 0
    },
    "KE0141": {
      "from": "ICN",
      "to": "XIY",
      "city": "시안",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "09:10",
      "end": null,
      "endOffset": 0
    },
    "KE0142": {
      "from": "XIY",
      "to": "ICN",
      "city": "시안",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "16:40",
      "endOffset": 0
    },
    "KE0155": {
      "from": "ICN",
      "to": "HFE",
      "city": "허페이",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "13:25",
      "end": null,
      "endOffset": 0
    },
    "KE0156": {
      "from": "HFE",
      "to": "ICN",
      "city": "허페이",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "19:45",
      "endOffset": 0
    },
    "KE0164": {
      "from": "DYG",
      "to": "ICN",
      "city": "장자제",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "04:05",
      "endOffset": 0
    },
    "KE0165": {
      "from": "ICN",
      "to": "WUH",
      "city": "우한",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "08:40",
      "end": null,
      "endOffset": 0
    },
    "KE0166": {
      "from": "WUH",
      "to": "ICN",
      "city": "우한",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "16:00",
      "endOffset": 0
    },
    "KE0213": {
      "from": "ICN",
      "to": "LAX",
      "city": "로스앤젤레스",
      "country": "US",
      "flag": "🇺🇸",
      "start": "02:20",
      "end": null,
      "endOffset": 0
    },
    "KE0214": {
      "from": "SFO",
      "to": "ICN",
      "city": "샌프란시스코",
      "country": "US",
      "flag": "🇺🇸",
      "start": null,
      "end": "08:25",
      "endOffset": 1
    },
    "KE0224": {
      "from": "NRT",
      "to": "ICN",
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "22:15",
      "endOffset": 0
    },
    "KE0234": {
      "from": "SEA",
      "to": "ICN",
      "city": "시애틀",
      "country": "US",
      "flag": "🇺🇸",
      "start": null,
      "end": "09:45",
      "endOffset": 1
    },
    "KE0250": {
      "from": "JFK",
      "to": "ICN",
      "city": "뉴욕",
      "country": "US",
      "flag": "🇺🇸",
      "start": null,
      "end": "16:35",
      "endOffset": 1
    },
    "KE0257": {
      "from": "ICN",
      "to": "ANC",
      "city": "앵커리지",
      "country": "US",
      "flag": "🇺🇸",
      "start": "22:05",
      "end": null,
      "endOffset": 0
    },
    "KE0278": {
      "from": "YVR",
      "to": "ICN",
      "city": "밴쿠버",
      "country": "CA",
      "flag": "🇨🇦",
      "start": null,
      "end": "18:50",
      "endOffset": 1
    },
    "KE0283": {
      "from": "ICN",
      "to": "ANC",
      "city": "앵커리지",
      "country": "US",
      "flag": "🇺🇸",
      "start": "04:00",
      "end": null,
      "endOffset": 0
    },
    "KE0313": {
      "from": "ICN",
      "to": "HKG",
      "city": "홍콩",
      "country": "HK",
      "flag": "🇭🇰",
      "start": "22:25",
      "end": null,
      "endOffset": 0
    },
    "KE0314": {
      "from": "HKG",
      "to": "ICN",
      "city": "홍콩",
      "country": "HK",
      "flag": "🇭🇰",
      "start": null,
      "end": "07:40",
      "endOffset": 0
    },
    "KE0317": {
      "from": "ICN",
      "to": "ANC",
      "city": "앵커리지",
      "country": "US",
      "flag": "🇺🇸",
      "start": "01:45",
      "end": null,
      "endOffset": 0
    },
    "KE0319": {
      "from": "ICN",
      "to": "CAN",
      "city": "광저우",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "00:05",
      "end": null,
      "endOffset": 0
    },
    "KE0320": {
      "from": "CAN",
      "to": "ICN",
      "city": "광저우",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "09:20",
      "endOffset": 0
    },
    "KE0321": {
      "from": "ICN",
      "to": "CAN",
      "city": "광저우",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "00:35",
      "end": null,
      "endOffset": 0
    },
    "KE0322": {
      "from": "CAN",
      "to": "ICN",
      "city": "광저우",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "09:55",
      "endOffset": 0
    },
    "KE0343": {
      "from": "ICN",
      "to": "MNL",
      "city": "마닐라",
      "country": "PH",
      "flag": "🇵🇭",
      "start": "22:40",
      "end": null,
      "endOffset": 0
    },
    "KE0344": {
      "from": "SIN",
      "to": "ICN",
      "city": "싱가포르",
      "country": "SG",
      "flag": "🇸🇬",
      "start": null,
      "end": "16:35",
      "endOffset": 0
    },
    "KE0349": {
      "from": "ICN",
      "to": "CGK",
      "city": "자카르타",
      "country": "ID",
      "flag": "🇮🇩",
      "start": "22:20",
      "end": null,
      "endOffset": 0
    },
    "KE0350": {
      "from": "PEN",
      "to": "ICN",
      "city": "페낭",
      "country": "MY",
      "flag": "🇲🇾",
      "start": null,
      "end": "18:15",
      "endOffset": 0
    },
    "KE0361": {
      "from": "ICN",
      "to": "HAN",
      "city": "하노이",
      "country": "VN",
      "flag": "🇻🇳",
      "start": "23:30",
      "end": null,
      "endOffset": 0
    },
    "KE0362": {
      "from": "HAN",
      "to": "ICN",
      "city": "하노이",
      "country": "VN",
      "flag": "🇻🇳",
      "start": null,
      "end": "10:20",
      "endOffset": 0
    },
    "KE0402": {
      "from": "SYD",
      "to": "ICN",
      "city": "시드니",
      "country": "AU",
      "flag": "🇦🇺",
      "start": null,
      "end": "17:35",
      "endOffset": 0
    },
    "KE0408": {
      "from": "BNE",
      "to": "ICN",
      "city": "브리즈번",
      "country": "AU",
      "flag": "🇦🇺",
      "start": null,
      "end": "17:35",
      "endOffset": 0
    },
    "KE0411": {
      "from": "ICN",
      "to": "AKL",
      "city": "오클랜드",
      "country": "NZ",
      "flag": "🇳🇿",
      "start": "18:00",
      "end": null,
      "endOffset": 0
    },
    "KE0415": {
      "from": "ICN",
      "to": "GUM",
      "city": "괌",
      "country": "GU",
      "flag": "🇬🇺",
      "start": "10:05",
      "end": null,
      "endOffset": 0
    },
    "KE0416": {
      "from": "GUM",
      "to": "ICN",
      "city": "괌",
      "country": "GU",
      "flag": "🇬🇺",
      "start": null,
      "end": "21:00",
      "endOffset": 0
    },
    "KE0417": {
      "from": "ICN",
      "to": "GUM",
      "city": "괌",
      "country": "GU",
      "flag": "🇬🇺",
      "start": "18:25",
      "end": null,
      "endOffset": 0
    },
    "KE0418": {
      "from": "GUM",
      "to": "ICN",
      "city": "괌",
      "country": "GU",
      "flag": "🇬🇺",
      "start": null,
      "end": "05:40",
      "endOffset": 0
    },
    "KE0427": {
      "from": "ICN",
      "to": "KUL",
      "city": "쿠알라룸푸르",
      "country": "MY",
      "flag": "🇲🇾",
      "start": "16:20",
      "end": null,
      "endOffset": 0
    },
    "KE0428": {
      "from": "KUL",
      "to": "ICN",
      "city": "쿠알라룸푸르",
      "country": "MY",
      "flag": "🇲🇾",
      "start": null,
      "end": "07:00",
      "endOffset": 0
    },
    "KE0431": {
      "from": "ICN",
      "to": "DPS",
      "city": "발리",
      "country": "ID",
      "flag": "🇮🇩",
      "start": "16:10",
      "end": null,
      "endOffset": 0
    },
    "KE0432": {
      "from": "DPS",
      "to": "ICN",
      "city": "발리",
      "country": "ID",
      "flag": "🇮🇩",
      "start": null,
      "end": "07:55",
      "endOffset": 0
    },
    "KE0433": {
      "from": "ICN",
      "to": "DPS",
      "city": "발리",
      "country": "ID",
      "flag": "🇮🇩",
      "start": "18:00",
      "end": null,
      "endOffset": 0
    },
    "KE0434": {
      "from": "DPS",
      "to": "ICN",
      "city": "발리",
      "country": "ID",
      "flag": "🇮🇩",
      "start": null,
      "end": "09:25",
      "endOffset": 0
    },
    "KE0437": {
      "from": "ICN",
      "to": "CGK",
      "city": "자카르타",
      "country": "ID",
      "flag": "🇮🇩",
      "start": null,
      "end": null,
      "endOffset": 0
    },
    "KE0441": {
      "from": "ICN",
      "to": "HAN",
      "city": "하노이",
      "country": "VN",
      "flag": "🇻🇳",
      "start": "08:00",
      "end": null,
      "endOffset": 0
    },
    "KE0442": {
      "from": "HAN",
      "to": "ICN",
      "city": "하노이",
      "country": "VN",
      "flag": "🇻🇳",
      "start": null,
      "end": "18:35",
      "endOffset": 0
    },
    "KE0458": {
      "from": "DAD",
      "to": "ICN",
      "city": "다낭",
      "country": "VN",
      "flag": "🇻🇳",
      "start": null,
      "end": "22:30",
      "endOffset": 0
    },
    "KE0468": {
      "from": "CXR",
      "to": "ICN",
      "city": "나트랑",
      "country": "VN",
      "flag": "🇻🇳",
      "start": null,
      "end": "07:25",
      "endOffset": 0
    },
    "KE0471": {
      "from": "ICN",
      "to": "SGN",
      "city": "호치민",
      "country": "VN",
      "flag": "🇻🇳",
      "start": "09:05",
      "end": null,
      "endOffset": 0
    },
    "KE0472": {
      "from": "SGN",
      "to": "ICN",
      "city": "호치민",
      "country": "VN",
      "flag": "🇻🇳",
      "start": null,
      "end": "21:25",
      "endOffset": 0
    },
    "KE0475": {
      "from": "ICN",
      "to": "SGN",
      "city": "호치민",
      "country": "VN",
      "flag": "🇻🇳",
      "start": "18:50",
      "end": null,
      "endOffset": 0
    },
    "KE0476": {
      "from": "SGN",
      "to": "ICN",
      "city": "호치민",
      "country": "VN",
      "flag": "🇻🇳",
      "start": null,
      "end": "07:00",
      "endOffset": 0
    },
    "KE0479": {
      "from": "ICN",
      "to": "SGN",
      "city": "호치민",
      "country": "VN",
      "flag": "🇻🇳",
      "start": "19:35",
      "end": null,
      "endOffset": 0
    },
    "KE0480": {
      "from": "SGN",
      "to": "ICN",
      "city": "호치민",
      "country": "VN",
      "flag": "🇻🇳",
      "start": null,
      "end": "14:55",
      "endOffset": 0
    },
    "KE0486": {
      "from": "PQC",
      "to": "ICN",
      "city": "푸꾸옥",
      "country": "VN",
      "flag": "🇻🇳",
      "start": null,
      "end": "07:50",
      "endOffset": 0
    },
    "KE0497": {
      "from": "ICN",
      "to": "DEL",
      "city": "델리",
      "country": "IN",
      "flag": "🇮🇳",
      "start": "12:50",
      "end": null,
      "endOffset": 0
    },
    "KE0498": {
      "from": "DEL",
      "to": "ICN",
      "city": "델리",
      "country": "IN",
      "flag": "🇮🇳",
      "start": null,
      "end": "05:20",
      "endOffset": 1
    },
    "KE0504": {
      "from": "CDG",
      "to": "ICN",
      "city": "파리",
      "country": "FR",
      "flag": "🇫🇷",
      "start": null,
      "end": "20:55",
      "endOffset": 1
    },
    "KE0509": {
      "from": "ICN",
      "to": "AMS",
      "city": "암스테르담",
      "country": "NL",
      "flag": "🇳🇱",
      "start": "11:05",
      "end": null,
      "endOffset": 0
    },
    "KE0538": {
      "from": "FRA",
      "to": "ICN",
      "city": "프랑크푸르트",
      "country": "DE",
      "flag": "🇩🇪",
      "start": null,
      "end": "15:15",
      "endOffset": 1
    },
    "KE0551": {
      "from": "ICN",
      "to": "NRT",
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "13:35",
      "end": null,
      "endOffset": 0
    },
    "KE0552": {
      "from": "NRT",
      "to": "ICN",
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "21:20",
      "endOffset": 0
    },
    "KE0601": {
      "from": "ICN",
      "to": "CEB",
      "city": "세부",
      "country": "PH",
      "flag": "🇵🇭",
      "start": "18:50",
      "end": null,
      "endOffset": 0
    },
    "KE0602": {
      "from": "CEB",
      "to": "ICN",
      "city": "세부",
      "country": "PH",
      "flag": "🇵🇭",
      "start": null,
      "end": "06:30",
      "endOffset": 0
    },
    "KE0619": {
      "from": "ICN",
      "to": "MNL",
      "city": "마닐라",
      "country": "PH",
      "flag": "🇵🇭",
      "start": "22:35",
      "end": null,
      "endOffset": 0
    },
    "KE0620": {
      "from": "MNL",
      "to": "ICN",
      "city": "마닐라",
      "country": "PH",
      "flag": "🇵🇭",
      "start": null,
      "end": "08:20",
      "endOffset": 0
    },
    "KE0622": {
      "from": "MNL",
      "to": "ICN",
      "city": "마닐라",
      "country": "PH",
      "flag": "🇵🇭",
      "start": null,
      "end": "17:25",
      "endOffset": 0
    },
    "KE0624": {
      "from": "MNL",
      "to": "ICN",
      "city": "마닐라",
      "country": "PH",
      "flag": "🇵🇭",
      "start": null,
      "end": "04:35",
      "endOffset": 0
    },
    "KE0626": {
      "from": "MNL",
      "to": "ICN",
      "city": "마닐라",
      "country": "PH",
      "flag": "🇵🇭",
      "start": null,
      "end": "06:15",
      "endOffset": 0
    },
    "KE0644": {
      "from": "SIN",
      "to": "ICN",
      "city": "싱가포르",
      "country": "SG",
      "flag": "🇸🇬",
      "start": null,
      "end": "05:35",
      "endOffset": 0
    },
    "KE0646": {
      "from": "SIN",
      "to": "ICN",
      "city": "싱가포르",
      "country": "SG",
      "flag": "🇸🇬",
      "start": null,
      "end": "08:50",
      "endOffset": 0
    },
    "KE0647": {
      "from": "ICN",
      "to": "SIN",
      "city": "싱가포르",
      "country": "SG",
      "flag": "🇸🇬",
      "start": "23:35",
      "end": null,
      "endOffset": 0
    },
    "KE0648": {
      "from": "SIN",
      "to": "ICN",
      "city": "싱가포르",
      "country": "SG",
      "flag": "🇸🇬",
      "start": null,
      "end": "15:00",
      "endOffset": 0
    },
    "KE0651": {
      "from": "ICN",
      "to": "BKK",
      "city": "방콕",
      "country": "TH",
      "flag": "🇹🇭",
      "start": "18:05",
      "end": null,
      "endOffset": 0
    },
    "KE0652": {
      "from": "BKK",
      "to": "ICN",
      "city": "방콕",
      "country": "TH",
      "flag": "🇹🇭",
      "start": null,
      "end": "06:55",
      "endOffset": 0
    },
    "KE0656": {
      "from": "BKK",
      "to": "ICN",
      "city": "방콕",
      "country": "TH",
      "flag": "🇹🇭",
      "start": null,
      "end": "10:15",
      "endOffset": 0
    },
    "KE0658": {
      "from": "BKK",
      "to": "ICN",
      "city": "방콕",
      "country": "TH",
      "flag": "🇹🇭",
      "start": null,
      "end": "05:05",
      "endOffset": 0
    },
    "KE0660": {
      "from": "BKK",
      "to": "ICN",
      "city": "방콕",
      "country": "TH",
      "flag": "🇹🇭",
      "start": null,
      "end": "17:20",
      "endOffset": 0
    },
    "KE0677": {
      "from": "ICN",
      "to": "HKT",
      "city": "푸껫",
      "country": "TH",
      "flag": "🇹🇭",
      "start": "17:50",
      "end": null,
      "endOffset": 0
    },
    "KE0678": {
      "from": "HKT",
      "to": "ICN",
      "city": "푸껫",
      "country": "TH",
      "flag": "🇹🇭",
      "start": null,
      "end": "07:35",
      "endOffset": 0
    },
    "KE0690": {
      "from": "PNH",
      "to": "ICN",
      "city": "프놈펜",
      "country": "KH",
      "flag": "🇰🇭",
      "start": null,
      "end": "07:00",
      "endOffset": 0
    },
    "KE0703": {
      "from": "ICN",
      "to": "NRT",
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "10:10",
      "end": null,
      "endOffset": 0
    },
    "KE0704": {
      "from": "NRT",
      "to": "ICN",
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "16:30",
      "endOffset": 0
    },
    "KE0706": {
      "from": "NRT",
      "to": "ICN",
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "11:45",
      "endOffset": 0
    },
    "KE0707": {
      "from": "ICN",
      "to": "NRT",
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "14:45",
      "end": null,
      "endOffset": 0
    },
    "KE0708": {
      "from": "NRT",
      "to": "ICN",
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "21:30",
      "endOffset": 0
    },
    "KE0711": {
      "from": "ICN",
      "to": "NRT",
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "13:00",
      "end": null,
      "endOffset": 0
    },
    "KE0712": {
      "from": "NRT",
      "to": "ICN",
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "20:00",
      "endOffset": 0
    },
    "KE0713": {
      "from": "ICN",
      "to": "NRT",
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "17:15",
      "end": null,
      "endOffset": 0
    },
    "KE0714": {
      "from": "NRT",
      "to": "ICN",
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "23:25",
      "endOffset": 0
    },
    "KE0722": {
      "from": "KIX",
      "to": "ICN",
      "city": "오사카",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "10:55",
      "endOffset": 0
    },
    "KE0723": {
      "from": "ICN",
      "to": "KIX",
      "city": "오사카",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "09:35",
      "end": null,
      "endOffset": 0
    },
    "KE0724": {
      "from": "KIX",
      "to": "ICN",
      "city": "오사카",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "14:25",
      "endOffset": 0
    },
    "KE0725": {
      "from": "ICN",
      "to": "KIX",
      "city": "오사카",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "15:05",
      "end": null,
      "endOffset": 0
    },
    "KE0726": {
      "from": "KIX",
      "to": "ICN",
      "city": "오사카",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "20:05",
      "endOffset": 0
    },
    "KE0727": {
      "from": "ICN",
      "to": "KIX",
      "city": "오사카",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": null,
      "endOffset": 0
    },
    "KE0728": {
      "from": "KIX",
      "to": "ICN",
      "city": "오사카",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": null,
      "endOffset": 0
    },
    "KE0738": {
      "from": "KIX",
      "to": "ICN",
      "city": "오사카",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "04:05",
      "endOffset": 0
    },
    "KE0741": {
      "from": "ICN",
      "to": "NGO",
      "city": "나고야",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "10:35",
      "end": null,
      "endOffset": 0
    },
    "KE0742": {
      "from": "NGO",
      "to": "ICN",
      "city": "나고야",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "15:40",
      "endOffset": 0
    },
    "KE0743": {
      "from": "ICN",
      "to": "NGO",
      "city": "나고야",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "18:50",
      "end": null,
      "endOffset": 0
    },
    "KE0744": {
      "from": "NGO",
      "to": "ICN",
      "city": "나고야",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "11:20",
      "endOffset": 0
    },
    "KE0766": {
      "from": "CTS",
      "to": "ICN",
      "city": "삿포로",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "17:55",
      "endOffset": 0
    },
    "KE0769": {
      "from": "ICN",
      "to": "CTS",
      "city": "삿포로",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "12:35",
      "end": null,
      "endOffset": 0
    },
    "KE0770": {
      "from": "CTS",
      "to": "ICN",
      "city": "삿포로",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "19:30",
      "endOffset": 0
    },
    "KE0782": {
      "from": "FUK",
      "to": "ICN",
      "city": "후쿠오카",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "22:35",
      "endOffset": 0
    },
    "KE0787": {
      "from": "ICN",
      "to": "FUK",
      "city": "후쿠오카",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "08:00",
      "end": null,
      "endOffset": 0
    },
    "KE0788": {
      "from": "FUK",
      "to": "ICN",
      "city": "후쿠오카",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "12:00",
      "endOffset": 0
    },
    "KE0791": {
      "from": "ICN",
      "to": "FUK",
      "city": "후쿠오카",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "11:05",
      "end": null,
      "endOffset": 0
    },
    "KE0792": {
      "from": "FUK",
      "to": "ICN",
      "city": "후쿠오카",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "16:30",
      "endOffset": 0
    },
    "KE0795": {
      "from": "ICN",
      "to": "FUK",
      "city": "후쿠오카",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "16:25",
      "end": null,
      "endOffset": 0
    },
    "KE0796": {
      "from": "FUK",
      "to": "ICN",
      "city": "후쿠오카",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "21:35",
      "endOffset": 0
    },
    "KE0804": {
      "from": "TSN",
      "to": "ICN",
      "city": "톈진",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "17:35",
      "endOffset": 0
    },
    "KE0805": {
      "from": "ICN",
      "to": "TSN",
      "city": "톈진",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "09:10",
      "end": null,
      "endOffset": 0
    },
    "KE0806": {
      "from": "TSN",
      "to": "ICN",
      "city": "톈진",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "14:20",
      "endOffset": 0
    },
    "KE0831": {
      "from": "ICN",
      "to": "SHE",
      "city": "선양",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "08:05",
      "end": null,
      "endOffset": 0
    },
    "KE0832": {
      "from": "SHE",
      "to": "ICN",
      "city": "선양",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "13:15",
      "endOffset": 0
    },
    "KE0833": {
      "from": "ICN",
      "to": "SHE",
      "city": "선양",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "14:35",
      "end": null,
      "endOffset": 0
    },
    "KE0834": {
      "from": "SHE",
      "to": "ICN",
      "city": "선양",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "19:50",
      "endOffset": 0
    },
    "KE0835": {
      "from": "ICN",
      "to": "SZX",
      "city": "선전",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "08:40",
      "end": null,
      "endOffset": 0
    },
    "KE0841": {
      "from": "ICN",
      "to": "TAO",
      "city": "칭다오",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "07:50",
      "end": null,
      "endOffset": 0
    },
    "KE0842": {
      "from": "TAO",
      "to": "ICN",
      "city": "칭다오",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "12:25",
      "endOffset": 0
    },
    "KE0843": {
      "from": "ICN",
      "to": "TAO",
      "city": "칭다오",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "13:05",
      "end": null,
      "endOffset": 0
    },
    "KE0844": {
      "from": "TAO",
      "to": "ICN",
      "city": "칭다오",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "17:30",
      "endOffset": 0
    },
    "KE0851": {
      "from": "ICN",
      "to": "PEK",
      "city": "베이징",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "08:15",
      "end": null,
      "endOffset": 0
    },
    "KE0852": {
      "from": "PEK",
      "to": "ICN",
      "city": "베이징",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "21:40",
      "endOffset": 0
    },
    "KE0855": {
      "from": "ICN",
      "to": "PEK",
      "city": "베이징",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "10:40",
      "end": null,
      "endOffset": 0
    },
    "KE0856": {
      "from": "PEK",
      "to": "ICN",
      "city": "베이징",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "16:30",
      "endOffset": 0
    },
    "KE0863": {
      "from": "ICN",
      "to": "PEK",
      "city": "베이징",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "20:00",
      "end": null,
      "endOffset": 0
    },
    "KE0864": {
      "from": "PEK",
      "to": "ICN",
      "city": "베이징",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "04:40",
      "endOffset": 0
    },
    "KE0867": {
      "from": "ICN",
      "to": "CAN",
      "city": "광저우",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "08:50",
      "end": null,
      "endOffset": 0
    },
    "KE0868": {
      "from": "CAN",
      "to": "ICN",
      "city": "광저우",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "17:15",
      "endOffset": 0
    },
    "KE0873": {
      "from": "ICN",
      "to": "DLC",
      "city": "다롄",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "13:00",
      "end": null,
      "endOffset": 0
    },
    "KE0874": {
      "from": "DLC",
      "to": "ICN",
      "city": "다롄",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "16:55",
      "endOffset": 0
    },
    "KE0881": {
      "from": "ICN",
      "to": "PVG",
      "city": "상하이",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "08:25",
      "end": null,
      "endOffset": 0
    },
    "KE0882": {
      "from": "PVG",
      "to": "ICN",
      "city": "상하이",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "14:20",
      "endOffset": 0
    },
    "KE0887": {
      "from": "ICN",
      "to": "PVG",
      "city": "상하이",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "11:10",
      "end": null,
      "endOffset": 0
    },
    "KE0888": {
      "from": "PVG",
      "to": "ICN",
      "city": "상하이",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "16:45",
      "endOffset": 0
    },
    "KE0892": {
      "from": "PVG",
      "to": "ICN",
      "city": "상하이",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "11:55",
      "endOffset": 0
    },
    "KE0901": {
      "from": "ICN",
      "to": "CDG",
      "city": "파리",
      "country": "FR",
      "flag": "🇫🇷",
      "start": "12:05",
      "end": null,
      "endOffset": 0
    },
    "KE0902": {
      "from": "CDG",
      "to": "ICN",
      "city": "파리",
      "country": "FR",
      "flag": "🇫🇷",
      "start": null,
      "end": "15:50",
      "endOffset": 1
    },
    "KE0907": {
      "from": "ICN",
      "to": "LHR",
      "city": "런던",
      "country": "GB",
      "flag": "🇬🇧",
      "start": "10:55",
      "end": null,
      "endOffset": 0
    },
    "KE0908": {
      "from": "LHR",
      "to": "ICN",
      "city": "런던",
      "country": "GB",
      "flag": "🇬🇧",
      "start": null,
      "end": "16:15",
      "endOffset": 1
    },
    "KE0913": {
      "from": "ICN",
      "to": "MAD",
      "city": "마드리드",
      "country": "ES",
      "flag": "🇪🇸",
      "start": "10:13",
      "end": null,
      "endOffset": 0
    },
    "KE0918": {
      "from": "ZRH",
      "to": "ICN",
      "city": "취리히",
      "country": "CH",
      "flag": "🇨🇭",
      "start": null,
      "end": "14:10",
      "endOffset": 1
    },
    "KE0921": {
      "from": "ICN",
      "to": "LIS",
      "city": "리스본",
      "country": "PT",
      "flag": "🇵🇹",
      "start": "12:45",
      "end": null,
      "endOffset": 0
    },
    "KE0926": {
      "from": "AMS",
      "to": "ICN",
      "city": "암스테르담",
      "country": "NL",
      "flag": "🇳🇱",
      "start": null,
      "end": "16:40",
      "endOffset": 1
    },
    "KE0927": {
      "from": "ICN",
      "to": "MXP",
      "city": "밀라노",
      "country": "IT",
      "flag": "🇮🇹",
      "start": "15:25",
      "end": null,
      "endOffset": 0
    },
    "KE0931": {
      "from": "ICN",
      "to": "FCO",
      "city": "로마",
      "country": "IT",
      "flag": "🇮🇹",
      "start": "14:05",
      "end": null,
      "endOffset": 0
    },
    "KE0932": {
      "from": "FCO",
      "to": "ICN",
      "city": "로마",
      "country": "IT",
      "flag": "🇮🇹",
      "start": null,
      "end": "15:55",
      "endOffset": 1
    },
    "KE0945": {
      "from": "ICN",
      "to": "FRA",
      "city": "프랑크푸르트",
      "country": "DE",
      "flag": "🇩🇪",
      "start": "10:50",
      "end": null,
      "endOffset": 0
    },
    "KE0956": {
      "from": "IST",
      "to": "ICN",
      "city": "이스탄불",
      "country": "TR",
      "flag": "🇹🇷",
      "start": null,
      "end": "13:25",
      "endOffset": 1
    },
    "KE0964": {
      "from": "BUD",
      "to": "ICN",
      "city": "부다페스트",
      "country": "HU",
      "flag": "🇭🇺",
      "start": null,
      "end": "13:40",
      "endOffset": 1
    },
    "KE0970": {
      "from": "PRG",
      "to": "ICN",
      "city": "프라하",
      "country": "CZ",
      "flag": "🇨🇿",
      "start": null,
      "end": "13:20",
      "endOffset": 1
    },
    "KE1007": {
      "from": "GMP",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "06:35",
      "end": "07:50",
      "endOffset": 0
    },
    "KE1017": {
      "from": "GMP",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "07:05",
      "end": "08:20",
      "endOffset": 0
    },
    "KE1019": {
      "from": "GMP",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "07:10",
      "end": "08:25",
      "endOffset": 0
    },
    "KE1023": {
      "from": "GMP",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "07:20",
      "end": null,
      "endOffset": 0
    },
    "KE1045": {
      "from": "GMP",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "08:20",
      "end": "09:35",
      "endOffset": 0
    },
    "KE1073": {
      "from": "GMP",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "10:10",
      "end": "11:25",
      "endOffset": 0
    },
    "KE1075": {
      "from": "GMP",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "10:40",
      "end": "11:55",
      "endOffset": 0
    },
    "KE1079": {
      "from": "GMP",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "10:35",
      "end": "11:50",
      "endOffset": 0
    },
    "KE1081": {
      "from": "GMP",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "11:10",
      "end": "12:25",
      "endOffset": 0
    },
    "KE1107": {
      "from": "GMP",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "12:45",
      "end": "14:00",
      "endOffset": 0
    },
    "KE1113": {
      "from": "GMP",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "13:15",
      "end": "14:30",
      "endOffset": 0
    },
    "KE1118": {
      "from": "CJU",
      "to": "GMP",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": null,
      "end": "08:15",
      "endOffset": 0
    },
    "KE1121": {
      "from": "GMP",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "13:25",
      "end": null,
      "endOffset": 0
    },
    "KE1136": {
      "from": "CJU",
      "to": "GMP",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "08:35",
      "end": "09:50",
      "endOffset": 0
    },
    "KE1141": {
      "from": "GMP",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "14:00",
      "end": "15:15",
      "endOffset": 0
    },
    "KE1143": {
      "from": "GMP",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "14:55",
      "end": "16:10",
      "endOffset": 0
    },
    "KE1150": {
      "from": "CJU",
      "to": "GMP",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "09:00",
      "end": "10:15",
      "endOffset": 0
    },
    "KE1165": {
      "from": "GMP",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "16:35",
      "end": "17:50",
      "endOffset": 0
    },
    "KE1174": {
      "from": "CJU",
      "to": "GMP",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "10:25",
      "end": "11:40",
      "endOffset": 0
    },
    "KE1177": {
      "from": "GMP",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "17:30",
      "end": "18:45",
      "endOffset": 0
    },
    "KE1178": {
      "from": "CJU",
      "to": "GMP",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": null,
      "end": "12:05",
      "endOffset": 0
    },
    "KE1185": {
      "from": "GMP",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "17:45",
      "end": null,
      "endOffset": 0
    },
    "KE1188": {
      "from": "CJU",
      "to": "GMP",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "11:20",
      "end": "12:35",
      "endOffset": 0
    },
    "KE1195": {
      "from": "GMP",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "18:15",
      "end": null,
      "endOffset": 0
    },
    "KE1205": {
      "from": "GMP",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "18:45",
      "end": null,
      "endOffset": 0
    },
    "KE1206": {
      "from": "CJU",
      "to": "GMP",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "12:05",
      "end": "13:20",
      "endOffset": 0
    },
    "KE1214": {
      "from": "CJU",
      "to": "GMP",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "13:05",
      "end": "14:20",
      "endOffset": 0
    },
    "KE1238": {
      "from": "CJU",
      "to": "GMP",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "14:40",
      "end": "15:55",
      "endOffset": 0
    },
    "KE1244": {
      "from": "CJU",
      "to": "GMP",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "15:20",
      "end": "16:35",
      "endOffset": 0
    },
    "KE1246": {
      "from": "CJU",
      "to": "GMP",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "15:35",
      "end": "16:50",
      "endOffset": 0
    },
    "KE1264": {
      "from": "CJU",
      "to": "GMP",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "16:05",
      "end": "17:20",
      "endOffset": 0
    },
    "KE1268": {
      "from": "CJU",
      "to": "GMP",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "16:50",
      "end": "18:05",
      "endOffset": 0
    },
    "KE1272": {
      "from": "CJU",
      "to": "GMP",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "17:00",
      "end": "18:15",
      "endOffset": 0
    },
    "KE1294": {
      "from": "CJU",
      "to": "GMP",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "18:15",
      "end": "19:30",
      "endOffset": 0
    },
    "KE1401": {
      "from": "ICN",
      "to": "PUS",
      "city": "부산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "06:35",
      "end": "07:45",
      "endOffset": 0
    },
    "KE1402": {
      "from": "PUS",
      "to": "ICN",
      "city": "부산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "07:00",
      "end": "08:10",
      "endOffset": 0
    },
    "KE1403": {
      "from": "ICN",
      "to": "PUS",
      "city": "부산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": null,
      "end": "09:30",
      "endOffset": 0
    },
    "KE1404": {
      "from": "PUS",
      "to": "ICN",
      "city": "부산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "08:00",
      "end": "09:10",
      "endOffset": 0
    },
    "KE1405": {
      "from": "ICN",
      "to": "PUS",
      "city": "부산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "17:10",
      "end": "18:20",
      "endOffset": 0
    },
    "KE1406": {
      "from": "PUS",
      "to": "ICN",
      "city": "부산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "08:45",
      "end": "09:55",
      "endOffset": 0
    },
    "KE1407": {
      "from": "ICN",
      "to": "PUS",
      "city": "부산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": null,
      "end": "19:35",
      "endOffset": 0
    },
    "KE1408": {
      "from": "PUS",
      "to": "ICN",
      "city": "부산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "10:40",
      "end": "11:50",
      "endOffset": 0
    },
    "KE1410": {
      "from": "PUS",
      "to": "ICN",
      "city": "부산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "16:30",
      "end": "17:40",
      "endOffset": 0
    },
    "KE1431": {
      "from": "ICN",
      "to": "TAE",
      "city": "대구",
      "country": "KR",
      "flag": "🇰🇷",
      "start": null,
      "end": "19:55",
      "endOffset": 0
    },
    "KE1432": {
      "from": "TAE",
      "to": "ICN",
      "city": "대구",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "07:55",
      "end": "09:00",
      "endOffset": 0
    },
    "KE1505": {
      "from": "PUS",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "07:00",
      "end": "08:00",
      "endOffset": 0
    },
    "KE1512": {
      "from": "CJU",
      "to": "PUS",
      "city": "부산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "08:45",
      "end": "09:45",
      "endOffset": 0
    },
    "KE1515": {
      "from": "PUS",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "09:55",
      "end": "10:55",
      "endOffset": 0
    },
    "KE1517": {
      "from": "PUS",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "10:25",
      "end": "11:25",
      "endOffset": 0
    },
    "KE1538": {
      "from": "CJU",
      "to": "PUS",
      "city": "부산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "15:00",
      "end": "15:55",
      "endOffset": 0
    },
    "KE1543": {
      "from": "PUS",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "16:40",
      "end": "17:40",
      "endOffset": 0
    },
    "KE1550": {
      "from": "CJU",
      "to": "PUS",
      "city": "부산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "18:20",
      "end": "19:20",
      "endOffset": 0
    },
    "KE1558": {
      "from": "CJU",
      "to": "PUS",
      "city": "부산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": null,
      "end": "21:30",
      "endOffset": 0
    },
    "KE1562": {
      "from": "CJU",
      "to": "PUS",
      "city": "부산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": null,
      "end": "22:05",
      "endOffset": 0
    },
    "KE1569": {
      "from": "TAE",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "11:05",
      "end": "12:10",
      "endOffset": 0
    },
    "KE1570": {
      "from": "CJU",
      "to": "TAE",
      "city": "대구",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "09:15",
      "end": "10:20",
      "endOffset": 0
    },
    "KE1575": {
      "from": "TAE",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "18:40",
      "end": null,
      "endOffset": 0
    },
    "KE1576": {
      "from": "CJU",
      "to": "TAE",
      "city": "대구",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "16:35",
      "end": "17:45",
      "endOffset": 0
    },
    "KE1585": {
      "from": "HIN",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "15:25",
      "end": "16:25",
      "endOffset": 0
    },
    "KE1586": {
      "from": "CJU",
      "to": "HIN",
      "city": "사천",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "13:20",
      "end": "14:25",
      "endOffset": 0
    },
    "KE1595": {
      "from": "USN",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "15:00",
      "end": "16:10",
      "endOffset": 0
    },
    "KE1596": {
      "from": "CJU",
      "to": "USN",
      "city": "울산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "13:10",
      "end": "14:15",
      "endOffset": 0
    },
    "KE1607": {
      "from": "KWJ",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "10:40",
      "end": "11:35",
      "endOffset": 0
    },
    "KE1608": {
      "from": "CJU",
      "to": "KWJ",
      "city": "광주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "09:10",
      "end": "10:05",
      "endOffset": 0
    },
    "KE1610": {
      "from": "CJU",
      "to": "KWJ",
      "city": "광주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "11:35",
      "end": "12:30",
      "endOffset": 0
    },
    "KE1611": {
      "from": "KWJ",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "13:10",
      "end": "14:05",
      "endOffset": 0
    },
    "KE1612": {
      "from": "CJU",
      "to": "KWJ",
      "city": "광주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "13:05",
      "end": "14:00",
      "endOffset": 0
    },
    "KE1613": {
      "from": "KWJ",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "14:35",
      "end": "15:30",
      "endOffset": 0
    },
    "KE1619": {
      "from": "KWJ",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "17:35",
      "end": "18:30",
      "endOffset": 0
    },
    "KE1620": {
      "from": "CJU",
      "to": "KWJ",
      "city": "광주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "16:05",
      "end": "17:00",
      "endOffset": 0
    },
    "KE1635": {
      "from": "RSU",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "13:15",
      "end": "14:10",
      "endOffset": 0
    },
    "KE1636": {
      "from": "CJU",
      "to": "RSU",
      "city": "여수",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "11:40",
      "end": "12:35",
      "endOffset": 0
    },
    "KE1704": {
      "from": "CJU",
      "to": "CJJ",
      "city": "청주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "07:20",
      "end": "08:30",
      "endOffset": 0
    },
    "KE1712": {
      "from": "CJU",
      "to": "CJJ",
      "city": "청주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "12:15",
      "end": "13:25",
      "endOffset": 0
    },
    "KE1717": {
      "from": "CJJ",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "14:05",
      "end": "15:15",
      "endOffset": 0
    },
    "KE1722": {
      "from": "CJU",
      "to": "CJJ",
      "city": "청주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "14:50",
      "end": "16:05",
      "endOffset": 0
    },
    "KE1725": {
      "from": "CJJ",
      "to": "CJU",
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "17:20",
      "end": "18:30",
      "endOffset": 0
    },
    "KE1762": {
      "from": "CJU",
      "to": "CJJ",
      "city": "청주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": null,
      "end": "07:45",
      "endOffset": 0
    },
    "KE1766": {
      "from": "CJU",
      "to": "CJJ",
      "city": "청주",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "18:25",
      "end": null,
      "endOffset": 0
    },
    "KE1803": {
      "from": "GMP",
      "to": "PUS",
      "city": "부산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "07:00",
      "end": "08:05",
      "endOffset": 0
    },
    "KE1806": {
      "from": "PUS",
      "to": "GMP",
      "city": "부산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "08:45",
      "end": "09:50",
      "endOffset": 0
    },
    "KE1807": {
      "from": "GMP",
      "to": "PUS",
      "city": "부산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "08:05",
      "end": "09:10",
      "endOffset": 0
    },
    "KE1811": {
      "from": "GMP",
      "to": "PUS",
      "city": "부산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "10:30",
      "end": "11:35",
      "endOffset": 0
    },
    "KE1814": {
      "from": "PUS",
      "to": "GMP",
      "city": "부산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": null,
      "end": "13:20",
      "endOffset": 0
    },
    "KE1819": {
      "from": "GMP",
      "to": "PUS",
      "city": "부산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "14:00",
      "end": "15:05",
      "endOffset": 0
    },
    "KE1822": {
      "from": "PUS",
      "to": "GMP",
      "city": "부산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "15:50",
      "end": "16:55",
      "endOffset": 0
    },
    "KE1827": {
      "from": "GMP",
      "to": "PUS",
      "city": "부산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "17:35",
      "end": "18:40",
      "endOffset": 0
    },
    "KE1843": {
      "from": "GMP",
      "to": "USN",
      "city": "울산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "07:20",
      "end": null,
      "endOffset": 0
    },
    "KE1844": {
      "from": "USN",
      "to": "GMP",
      "city": "울산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": null,
      "end": "10:00",
      "endOffset": 0
    },
    "KE1847": {
      "from": "GMP",
      "to": "USN",
      "city": "울산",
      "country": "KR",
      "flag": "🇰🇷",
      "start": "18:55",
      "end": "19:55",
      "endOffset": 0
    },
    "KE2002": {
      "from": "HKG",
      "to": "ICN",
      "city": "홍콩",
      "country": "HK",
      "flag": "🇭🇰",
      "start": null,
      "end": "17:05",
      "endOffset": 0
    },
    "KE2005": {
      "from": "ICN",
      "to": "HKG",
      "city": "홍콩",
      "country": "HK",
      "flag": "🇭🇰",
      "start": "13:25",
      "end": null,
      "endOffset": 0
    },
    "KE2006": {
      "from": "HKG",
      "to": "ICN",
      "city": "홍콩",
      "country": "HK",
      "flag": "🇭🇰",
      "start": null,
      "end": "22:45",
      "endOffset": 0
    },
    "KE2011": {
      "from": "ICN",
      "to": "HKG",
      "city": "홍콩",
      "country": "HK",
      "flag": "🇭🇰",
      "start": null,
      "end": null,
      "endOffset": 0
    },
    "KE2012": {
      "from": "HKG",
      "to": "ICN",
      "city": "홍콩",
      "country": "HK",
      "flag": "🇭🇰",
      "start": null,
      "end": null,
      "endOffset": 0
    },
    "KE2015": {
      "from": "ICN",
      "to": "MFM",
      "city": "마카오",
      "country": "MO",
      "flag": "🇲🇴",
      "start": "10:10",
      "end": null,
      "endOffset": 0
    },
    "KE2016": {
      "from": "MFM",
      "to": "ICN",
      "city": "마카오",
      "country": "MO",
      "flag": "🇲🇴",
      "start": null,
      "end": "19:00",
      "endOffset": 0
    },
    "KE2021": {
      "from": "ICN",
      "to": "TPE",
      "city": "타이베이",
      "country": "TW",
      "flag": "🇹🇼",
      "start": "10:30",
      "end": null,
      "endOffset": 0
    },
    "KE2022": {
      "from": "TPE",
      "to": "ICN",
      "city": "타이베이",
      "country": "TW",
      "flag": "🇹🇼",
      "start": null,
      "end": "16:50",
      "endOffset": 0
    },
    "KE2027": {
      "from": "ICN",
      "to": "TPE",
      "city": "타이베이",
      "country": "TW",
      "flag": "🇹🇼",
      "start": "16:10",
      "end": null,
      "endOffset": 0
    },
    "KE2028": {
      "from": "TPE",
      "to": "ICN",
      "city": "타이베이",
      "country": "TW",
      "flag": "🇹🇼",
      "start": null,
      "end": "22:35",
      "endOffset": 0
    },
    "KE2041": {
      "from": "ICN",
      "to": "ULN",
      "city": "울란바토르",
      "country": "MN",
      "flag": "🇲🇳",
      "start": "08:35",
      "end": null,
      "endOffset": 0
    },
    "KE2042": {
      "from": "ULN",
      "to": "ICN",
      "city": "울란바토르",
      "country": "MN",
      "flag": "🇲🇳",
      "start": null,
      "end": "17:10",
      "endOffset": 0
    },
    "KE2051": {
      "from": "GMP",
      "to": "PEK",
      "city": "베이징",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "09:05",
      "end": null,
      "endOffset": 0
    },
    "KE2052": {
      "from": "PEK",
      "to": "GMP",
      "city": "베이징",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "15:00",
      "endOffset": 0
    },
    "KE2057": {
      "from": "GMP",
      "to": "PVG",
      "city": "상하이",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "16:00",
      "end": null,
      "endOffset": 0
    },
    "KE2061": {
      "from": "PUS",
      "to": "PEK",
      "city": "베이징",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "22:20",
      "end": null,
      "endOffset": 0
    },
    "KE2062": {
      "from": "PEK",
      "to": "PUS",
      "city": "베이징",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "06:30",
      "endOffset": 0
    },
    "KE2065": {
      "from": "CJU",
      "to": "PEK",
      "city": "베이징",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "15:35",
      "end": null,
      "endOffset": 0
    },
    "KE2066": {
      "from": "PEK",
      "to": "CJU",
      "city": "베이징",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "14:25",
      "endOffset": 0
    },
    "KE2071": {
      "from": "PUS",
      "to": "PVG",
      "city": "상하이",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "08:35",
      "end": null,
      "endOffset": 0
    },
    "KE2072": {
      "from": "PVG",
      "to": "PUS",
      "city": "상하이",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "14:00",
      "endOffset": 0
    },
    "KE2081": {
      "from": "PUS",
      "to": "TAO",
      "city": "칭다오",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "11:00",
      "end": null,
      "endOffset": 0
    },
    "KE2082": {
      "from": "TAO",
      "to": "PUS",
      "city": "칭다오",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "16:10",
      "endOffset": 0
    },
    "KE2085": {
      "from": "PUS",
      "to": "TPE",
      "city": "타이베이",
      "country": "TW",
      "flag": "🇹🇼",
      "start": "09:00",
      "end": null,
      "endOffset": 0
    },
    "KE2086": {
      "from": "TPE",
      "to": "PUS",
      "city": "타이베이",
      "country": "TW",
      "flag": "🇹🇼",
      "start": null,
      "end": "15:30",
      "endOffset": 0
    },
    "KE2101": {
      "from": "GMP",
      "to": "HND",
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "09:00",
      "end": null,
      "endOffset": 0
    },
    "KE2102": {
      "from": "HND",
      "to": "GMP",
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "14:55",
      "endOffset": 0
    },
    "KE2103": {
      "from": "GMP",
      "to": "HND",
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "16:20",
      "end": null,
      "endOffset": 0
    },
    "KE2105": {
      "from": "GMP",
      "to": "HND",
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "18:40",
      "end": null,
      "endOffset": 0
    },
    "KE2106": {
      "from": "HND",
      "to": "GMP",
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "11:45",
      "endOffset": 0
    },
    "KE2117": {
      "from": "GMP",
      "to": "KIX",
      "city": "오사카",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "09:15",
      "end": null,
      "endOffset": 0
    },
    "KE2118": {
      "from": "KIX",
      "to": "GMP",
      "city": "오사카",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "14:20",
      "endOffset": 0
    },
    "KE2119": {
      "from": "GMP",
      "to": "KIX",
      "city": "오사카",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "16:30",
      "end": null,
      "endOffset": 0
    },
    "KE2125": {
      "from": "CJU",
      "to": "NRT",
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "12:55",
      "end": null,
      "endOffset": 0
    },
    "KE2126": {
      "from": "NRT",
      "to": "CJU",
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "19:05",
      "endOffset": 0
    },
    "KE2129": {
      "from": "PUS",
      "to": "NRT",
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "09:20",
      "end": null,
      "endOffset": 0
    },
    "KE2130": {
      "from": "NRT",
      "to": "PUS",
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "14:55",
      "endOffset": 0
    },
    "KE2131": {
      "from": "PUS",
      "to": "NRT",
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "16:00",
      "end": null,
      "endOffset": 0
    },
    "KE2132": {
      "from": "NRT",
      "to": "PUS",
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "21:35",
      "endOffset": 0
    },
    "KE2133": {
      "from": "PUS",
      "to": "NGO",
      "city": "나고야",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "17:30",
      "end": null,
      "endOffset": 0
    },
    "KE2134": {
      "from": "NGO",
      "to": "PUS",
      "city": "나고야",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "21:30",
      "endOffset": 0
    },
    "KE2147": {
      "from": "ICN",
      "to": "OKA",
      "city": "오키나와",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "09:20",
      "end": null,
      "endOffset": 0
    },
    "KE2148": {
      "from": "OKA",
      "to": "ICN",
      "city": "오키나와",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "15:10",
      "endOffset": 0
    },
    "KE2155": {
      "from": "ICN",
      "to": "KMJ",
      "city": "구마모토",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "17:05",
      "end": null,
      "endOffset": 0
    },
    "KE2156": {
      "from": "KMJ",
      "to": "ICN",
      "city": "구마모토",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "21:20",
      "endOffset": 0
    },
    "KE2171": {
      "from": "ICN",
      "to": "UKB",
      "city": "고베",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "09:05",
      "end": null,
      "endOffset": 0
    },
    "KE2172": {
      "from": "KIX",
      "to": "ICN",
      "city": "오사카",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "13:40",
      "endOffset": 0
    },
    "KE2173": {
      "from": "ICN",
      "to": "KIX",
      "city": "오사카",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "15:50",
      "end": null,
      "endOffset": 0
    },
    "KE2179": {
      "from": "ICN",
      "to": "KOJ",
      "city": "가고시마",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": null,
      "endOffset": 0
    },
    "KE2180": {
      "from": "KOJ",
      "to": "ICN",
      "city": "가고시마",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": null,
      "endOffset": 0
    },
    "KE2185": {
      "from": "ICN",
      "to": "OKJ",
      "city": "오카야마",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "10:30",
      "end": null,
      "endOffset": 0
    },
    "KE2186": {
      "from": "OKJ",
      "to": "ICN",
      "city": "오카야마",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "14:55",
      "endOffset": 0
    },
    "KE2190": {
      "from": "KMQ",
      "to": "ICN",
      "city": "고마쓰",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "12:10",
      "endOffset": 0
    },
    "KE2193": {
      "from": "ICN",
      "to": "AOJ",
      "city": "아오모리",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "09:05",
      "end": null,
      "endOffset": 0
    },
    "KE2194": {
      "from": "AOJ",
      "to": "ICN",
      "city": "아오모리",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "15:30",
      "endOffset": 0
    },
    "KE2197": {
      "from": "ICN",
      "to": "KIJ",
      "city": "니가타",
      "country": "JP",
      "flag": "🇯🇵",
      "start": "17:10",
      "end": null,
      "endOffset": 0
    },
    "KE2198": {
      "from": "KIJ",
      "to": "ICN",
      "city": "니가타",
      "country": "JP",
      "flag": "🇯🇵",
      "start": null,
      "end": "22:55",
      "endOffset": 0
    },
    "KE8053": {
      "from": "ICN",
      "to": "HNL",
      "city": "호놀룰루",
      "country": "US",
      "flag": "🇺🇸",
      "start": "22:35",
      "end": null,
      "endOffset": 0
    },
    "KE8054": {
      "from": "HNL",
      "to": "ICN",
      "city": "호놀룰루",
      "country": "US",
      "flag": "🇺🇸",
      "start": null,
      "end": "19:10",
      "endOffset": 0
    },
    "KE8204": {
      "from": "LAX",
      "to": "ICN",
      "city": "로스앤젤레스",
      "country": "US",
      "flag": "🇺🇸",
      "start": null,
      "end": "00:45",
      "endOffset": 1
    },
    "KE8207": {
      "from": "ICN",
      "to": "LAX",
      "city": "로스앤젤레스",
      "country": "US",
      "flag": "🇺🇸",
      "start": "16:10",
      "end": null,
      "endOffset": 0
    },
    "KE8315": {
      "from": "ICN",
      "to": "PVG",
      "city": "상하이",
      "country": "CN",
      "flag": "🇨🇳",
      "start": "01:40",
      "end": null,
      "endOffset": 0
    },
    "KE8316": {
      "from": "PVG",
      "to": "ICN",
      "city": "상하이",
      "country": "CN",
      "flag": "🇨🇳",
      "start": null,
      "end": "08:10",
      "endOffset": 0
    }
  };

  var AIRPORTS = {
    "ABQ": {
      "city": "앨버커키",
      "country": "US",
      "flag": "🇺🇸"
    },
    "ABV": {
      "city": "아부자",
      "country": "NG",
      "flag": "🇳🇬"
    },
    "ADB": {
      "city": "이즈미르",
      "country": "TR",
      "flag": "🇹🇷"
    },
    "ADD": {
      "city": "아디스아바바",
      "country": "ET",
      "flag": "🇪🇹"
    },
    "ADL": {
      "city": "애들레이드",
      "country": "AU",
      "flag": "🇦🇺"
    },
    "AEP": {
      "city": "부에노스아이레스",
      "country": "AR",
      "flag": "🇦🇷"
    },
    "AGP": {
      "city": "말라가",
      "country": "ES",
      "flag": "🇪🇸"
    },
    "AKL": {
      "city": "오클랜드",
      "country": "NZ",
      "flag": "🇳🇿"
    },
    "ALA": {
      "city": "알마티",
      "country": "KZ",
      "flag": "🇰🇿"
    },
    "AMD": {
      "city": "아마다바드",
      "country": "IN",
      "flag": "🇮🇳"
    },
    "AMM": {
      "city": "암만",
      "country": "JO",
      "flag": "🇯🇴"
    },
    "AMS": {
      "city": "암스테르담",
      "country": "NL",
      "flag": "🇳🇱"
    },
    "ANC": {
      "city": "앵커리지",
      "country": "US",
      "flag": "🇺🇸"
    },
    "AOJ": {
      "city": "아오모리",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "APW": {
      "city": "아피아",
      "country": "WS",
      "flag": "🇼🇸"
    },
    "ARN": {
      "city": "스톡홀름",
      "country": "SE",
      "flag": "🇸🇪"
    },
    "ASJ": {
      "city": "아마미",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "ATH": {
      "city": "아테네",
      "country": "GR",
      "flag": "🇬🇷"
    },
    "ATL": {
      "city": "애틀랜타",
      "country": "US",
      "flag": "🇺🇸"
    },
    "AUH": {
      "city": "아부다비",
      "country": "AE",
      "flag": "🇦🇪"
    },
    "AUS": {
      "city": "오스틴",
      "country": "US",
      "flag": "🇺🇸"
    },
    "AXT": {
      "city": "아키타",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "AYT": {
      "city": "안탈리아",
      "country": "TR",
      "flag": "🇹🇷"
    },
    "BAH": {
      "city": "바레인",
      "country": "BH",
      "flag": "🇧🇭"
    },
    "BCN": {
      "city": "바르셀로나",
      "country": "ES",
      "flag": "🇪🇸"
    },
    "BEG": {
      "city": "베오그라드",
      "country": "RS",
      "flag": "🇷🇸"
    },
    "BER": {
      "city": "베를린",
      "country": "DE",
      "flag": "🇩🇪"
    },
    "BGO": {
      "city": "베르겐",
      "country": "NO",
      "flag": "🇳🇴"
    },
    "BGW": {
      "city": "바그다드",
      "country": "IQ",
      "flag": "🇮🇶"
    },
    "BHX": {
      "city": "버밍엄",
      "country": "GB",
      "flag": "🇬🇧"
    },
    "BKI": {
      "city": "코타키나발루",
      "country": "MY",
      "flag": "🇲🇾"
    },
    "BKK": {
      "city": "방콕",
      "country": "TH",
      "flag": "🇹🇭"
    },
    "BLL": {
      "city": "빌룬",
      "country": "DK",
      "flag": "🇩🇰"
    },
    "BLQ": {
      "city": "볼로냐",
      "country": "IT",
      "flag": "🇮🇹"
    },
    "BLR": {
      "city": "벵갈루루",
      "country": "IN",
      "flag": "🇮🇳"
    },
    "BNA": {
      "city": "내슈빌",
      "country": "US",
      "flag": "🇺🇸"
    },
    "BNE": {
      "city": "브리즈번",
      "country": "AU",
      "flag": "🇦🇺"
    },
    "BOD": {
      "city": "보르도",
      "country": "FR",
      "flag": "🇫🇷"
    },
    "BOG": {
      "city": "보고타",
      "country": "CO",
      "flag": "🇨🇴"
    },
    "BOI": {
      "city": "보이시",
      "country": "US",
      "flag": "🇺🇸"
    },
    "BOM": {
      "city": "뭄바이",
      "country": "IN",
      "flag": "🇮🇳"
    },
    "BOS": {
      "city": "보스턴",
      "country": "US",
      "flag": "🇺🇸"
    },
    "BRU": {
      "city": "브뤼셀",
      "country": "BE",
      "flag": "🇧🇪"
    },
    "BSB": {
      "city": "브라질리아",
      "country": "BR",
      "flag": "🇧🇷"
    },
    "BSL": {
      "city": "바젤",
      "country": "CH",
      "flag": "🇨🇭"
    },
    "BTH": {
      "city": "바탐",
      "country": "ID",
      "flag": "🇮🇩"
    },
    "BTS": {
      "city": "브라티슬라바",
      "country": "SK",
      "flag": "🇸🇰"
    },
    "BUD": {
      "city": "부다페스트",
      "country": "HU",
      "flag": "🇭🇺"
    },
    "BUR": {
      "city": "버뱅크",
      "country": "US",
      "flag": "🇺🇸"
    },
    "BWI": {
      "city": "볼티모어",
      "country": "US",
      "flag": "🇺🇸"
    },
    "BWN": {
      "city": "반다르스리브가완",
      "country": "BN",
      "flag": "🇧🇳"
    },
    "CAI": {
      "city": "카이로",
      "country": "EG",
      "flag": "🇪🇬"
    },
    "CAN": {
      "city": "광저우",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "CCU": {
      "city": "콜카타",
      "country": "IN",
      "flag": "🇮🇳"
    },
    "CDG": {
      "city": "파리",
      "country": "FR",
      "flag": "🇫🇷"
    },
    "CEB": {
      "city": "세부",
      "country": "PH",
      "flag": "🇵🇭"
    },
    "CEI": {
      "city": "치앙라이",
      "country": "TH",
      "flag": "🇹🇭"
    },
    "CGK": {
      "city": "자카르타",
      "country": "ID",
      "flag": "🇮🇩"
    },
    "CGN": {
      "city": "쾰른",
      "country": "DE",
      "flag": "🇩🇪"
    },
    "CGO": {
      "city": "정저우",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "CGQ": {
      "city": "창춘",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "CHC": {
      "city": "크라이스트처치",
      "country": "NZ",
      "flag": "🇳🇿"
    },
    "CJJ": {
      "city": "청주",
      "country": "KR",
      "flag": "🇰🇷"
    },
    "CJU": {
      "city": "제주",
      "country": "KR",
      "flag": "🇰🇷"
    },
    "CKG": {
      "city": "충칭",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "CLE": {
      "city": "클리블랜드",
      "country": "US",
      "flag": "🇺🇸"
    },
    "CLJ": {
      "city": "클루지",
      "country": "RO",
      "flag": "🇷🇴"
    },
    "CLT": {
      "city": "샬럿",
      "country": "US",
      "flag": "🇺🇸"
    },
    "CMB": {
      "city": "콜롬보",
      "country": "LK",
      "flag": "🇱🇰"
    },
    "CMN": {
      "city": "카사블랑카",
      "country": "MA",
      "flag": "🇲🇦"
    },
    "CNF": {
      "city": "벨루오리존치",
      "country": "BR",
      "flag": "🇧🇷"
    },
    "CNS": {
      "city": "케언스",
      "country": "AU",
      "flag": "🇦🇺"
    },
    "CNX": {
      "city": "치앙마이",
      "country": "TH",
      "flag": "🇹🇭"
    },
    "COK": {
      "city": "코치",
      "country": "IN",
      "flag": "🇮🇳"
    },
    "CPH": {
      "city": "코펜하겐",
      "country": "DK",
      "flag": "🇩🇰"
    },
    "CPT": {
      "city": "케이프타운",
      "country": "ZA",
      "flag": "🇿🇦"
    },
    "CRK": {
      "city": "클락",
      "country": "PH",
      "flag": "🇵🇭"
    },
    "CRL": {
      "city": "브뤼셀",
      "country": "BE",
      "flag": "🇧🇪"
    },
    "CSX": {
      "city": "창사",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "CTA": {
      "city": "카타니아",
      "country": "IT",
      "flag": "🇮🇹"
    },
    "CTG": {
      "city": "카르타헤나",
      "country": "CO",
      "flag": "🇨🇴"
    },
    "CTS": {
      "city": "삿포로",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "CTU": {
      "city": "청두",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "CUN": {
      "city": "칸쿤",
      "country": "MX",
      "flag": "🇲🇽"
    },
    "CVG": {
      "city": "신시내티",
      "country": "US",
      "flag": "🇺🇸"
    },
    "CXR": {
      "city": "나트랑",
      "country": "VN",
      "flag": "🇻🇳"
    },
    "DAC": {
      "city": "다카",
      "country": "BD",
      "flag": "🇧🇩"
    },
    "DAD": {
      "city": "다낭",
      "country": "VN",
      "flag": "🇻🇳"
    },
    "DAR": {
      "city": "다르에스살람",
      "country": "TZ",
      "flag": "🇹🇿"
    },
    "DBV": {
      "city": "두브로브니크",
      "country": "HR",
      "flag": "🇭🇷"
    },
    "DCA": {
      "city": "워싱턴",
      "country": "US",
      "flag": "🇺🇸"
    },
    "DEL": {
      "city": "델리",
      "country": "IN",
      "flag": "🇮🇳"
    },
    "DEN": {
      "city": "덴버",
      "country": "US",
      "flag": "🇺🇸"
    },
    "DFW": {
      "city": "댈러스",
      "country": "US",
      "flag": "🇺🇸"
    },
    "DIL": {
      "city": "딜리",
      "country": "TL",
      "flag": "🇹🇱"
    },
    "DLC": {
      "city": "다롄",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "DME": {
      "city": "모스크바",
      "country": "RU",
      "flag": "🇷🇺"
    },
    "DMK": {
      "city": "방콕",
      "country": "TH",
      "flag": "🇹🇭"
    },
    "DMM": {
      "city": "담맘",
      "country": "SA",
      "flag": "🇸🇦"
    },
    "DOH": {
      "city": "도하",
      "country": "QA",
      "flag": "🇶🇦"
    },
    "DPS": {
      "city": "발리",
      "country": "ID",
      "flag": "🇮🇩"
    },
    "DRW": {
      "city": "다윈",
      "country": "AU",
      "flag": "🇦🇺"
    },
    "DTW": {
      "city": "디트로이트",
      "country": "US",
      "flag": "🇺🇸"
    },
    "DUB": {
      "city": "더블린",
      "country": "IE",
      "flag": "🇮🇪"
    },
    "DUR": {
      "city": "더반",
      "country": "ZA",
      "flag": "🇿🇦"
    },
    "DUS": {
      "city": "뒤셀도르프",
      "country": "DE",
      "flag": "🇩🇪"
    },
    "DVO": {
      "city": "다바오",
      "country": "PH",
      "flag": "🇵🇭"
    },
    "DXB": {
      "city": "두바이",
      "country": "AE",
      "flag": "🇦🇪"
    },
    "DYG": {
      "city": "장자제",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "EBL": {
      "city": "에르빌",
      "country": "IQ",
      "flag": "🇮🇶"
    },
    "EDI": {
      "city": "에든버러",
      "country": "GB",
      "flag": "🇬🇧"
    },
    "EIN": {
      "city": "에인트호번",
      "country": "NL",
      "flag": "🇳🇱"
    },
    "ESB": {
      "city": "앙카라",
      "country": "TR",
      "flag": "🇹🇷"
    },
    "EVN": {
      "city": "예레반",
      "country": "AM",
      "flag": "🇦🇲"
    },
    "EWR": {
      "city": "뉴욕",
      "country": "US",
      "flag": "🇺🇸"
    },
    "EZE": {
      "city": "부에노스아이레스",
      "country": "AR",
      "flag": "🇦🇷"
    },
    "FCO": {
      "city": "로마",
      "country": "IT",
      "flag": "🇮🇹"
    },
    "FLL": {
      "city": "포트로더데일",
      "country": "US",
      "flag": "🇺🇸"
    },
    "FLR": {
      "city": "피렌체",
      "country": "IT",
      "flag": "🇮🇹"
    },
    "FNC": {
      "city": "마데이라",
      "country": "PT",
      "flag": "🇵🇹"
    },
    "FOC": {
      "city": "푸저우",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "FRA": {
      "city": "프랑크푸르트",
      "country": "DE",
      "flag": "🇩🇪"
    },
    "FRU": {
      "city": "비슈케크",
      "country": "KG",
      "flag": "🇰🇬"
    },
    "FSZ": {
      "city": "시즈오카",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "FUK": {
      "city": "후쿠오카",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "GDL": {
      "city": "과달라하라",
      "country": "MX",
      "flag": "🇲🇽"
    },
    "GDN": {
      "city": "그단스크",
      "country": "PL",
      "flag": "🇵🇱"
    },
    "GIG": {
      "city": "리우데자네이루",
      "country": "BR",
      "flag": "🇧🇷"
    },
    "GLA": {
      "city": "글래스고",
      "country": "GB",
      "flag": "🇬🇧"
    },
    "GMP": {
      "city": "김포",
      "country": "KR",
      "flag": "🇰🇷"
    },
    "GOT": {
      "city": "예테보리",
      "country": "SE",
      "flag": "🇸🇪"
    },
    "GRU": {
      "city": "상파울루",
      "country": "BR",
      "flag": "🇧🇷"
    },
    "GUM": {
      "city": "괌",
      "country": "GU",
      "flag": "🇬🇺"
    },
    "GVA": {
      "city": "제네바",
      "country": "CH",
      "flag": "🇨🇭"
    },
    "GYD": {
      "city": "바쿠",
      "country": "AZ",
      "flag": "🇦🇿"
    },
    "GYE": {
      "city": "과야킬",
      "country": "EC",
      "flag": "🇪🇨"
    },
    "HAJ": {
      "city": "하노버",
      "country": "DE",
      "flag": "🇩🇪"
    },
    "HAK": {
      "city": "하이커우",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "HAM": {
      "city": "함부르크",
      "country": "DE",
      "flag": "🇩🇪"
    },
    "HAN": {
      "city": "하노이",
      "country": "VN",
      "flag": "🇻🇳"
    },
    "HAV": {
      "city": "아바나",
      "country": "CU",
      "flag": "🇨🇺"
    },
    "HEL": {
      "city": "헬싱키",
      "country": "FI",
      "flag": "🇫🇮"
    },
    "HER": {
      "city": "크레타",
      "country": "GR",
      "flag": "🇬🇷"
    },
    "HET": {
      "city": "후허하오터",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "HFE": {
      "city": "허페이",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "HGH": {
      "city": "항저우",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "HIJ": {
      "city": "히로시마",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "HIN": {
      "city": "사천",
      "country": "KR",
      "flag": "🇰🇷"
    },
    "HKD": {
      "city": "하코다테",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "HKG": {
      "city": "홍콩",
      "country": "HK",
      "flag": "🇭🇰"
    },
    "HKT": {
      "city": "푸껫",
      "country": "TH",
      "flag": "🇹🇭"
    },
    "HND": {
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "HNL": {
      "city": "호놀룰루",
      "country": "US",
      "flag": "🇺🇸"
    },
    "HPH": {
      "city": "하이퐁",
      "country": "VN",
      "flag": "🇻🇳"
    },
    "HRB": {
      "city": "하얼빈",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "HRG": {
      "city": "후르가다",
      "country": "EG",
      "flag": "🇪🇬"
    },
    "HYD": {
      "city": "하이데라바드",
      "country": "IN",
      "flag": "🇮🇳"
    },
    "IAD": {
      "city": "워싱턴",
      "country": "US",
      "flag": "🇺🇸"
    },
    "IAH": {
      "city": "휴스턴",
      "country": "US",
      "flag": "🇺🇸"
    },
    "ICN": {
      "city": "인천",
      "country": "KR",
      "flag": "🇰🇷"
    },
    "IEV": {
      "city": "키이우",
      "country": "UA",
      "flag": "🇺🇦"
    },
    "IKA": {
      "city": "테헤란",
      "country": "IR",
      "flag": "🇮🇷"
    },
    "IKT": {
      "city": "이르쿠츠크",
      "country": "RU",
      "flag": "🇷🇺"
    },
    "INC": {
      "city": "인촨",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "IND": {
      "city": "인디애나폴리스",
      "country": "US",
      "flag": "🇺🇸"
    },
    "ISB": {
      "city": "이슬라마바드",
      "country": "PK",
      "flag": "🇵🇰"
    },
    "ISG": {
      "city": "이시가키",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "IST": {
      "city": "이스탄불",
      "country": "TR",
      "flag": "🇹🇷"
    },
    "ITM": {
      "city": "오사카",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "IZO": {
      "city": "이즈모",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "JAX": {
      "city": "잭슨빌",
      "country": "US",
      "flag": "🇺🇸"
    },
    "JED": {
      "city": "제다",
      "country": "SA",
      "flag": "🇸🇦"
    },
    "JFK": {
      "city": "뉴욕",
      "country": "US",
      "flag": "🇺🇸"
    },
    "JHB": {
      "city": "조호르바루",
      "country": "MY",
      "flag": "🇲🇾"
    },
    "JJN": {
      "city": "취안저우",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "JNB": {
      "city": "요하네스버그",
      "country": "ZA",
      "flag": "🇿🇦"
    },
    "JOG": {
      "city": "족자카르타",
      "country": "ID",
      "flag": "🇮🇩"
    },
    "JRO": {
      "city": "킬리만자로",
      "country": "TZ",
      "flag": "🇹🇿"
    },
    "JTR": {
      "city": "산토리니",
      "country": "GR",
      "flag": "🇬🇷"
    },
    "KBP": {
      "city": "키이우",
      "country": "UA",
      "flag": "🇺🇦"
    },
    "KBV": {
      "city": "끄라비",
      "country": "TH",
      "flag": "🇹🇭"
    },
    "KCH": {
      "city": "쿠칭",
      "country": "MY",
      "flag": "🇲🇾"
    },
    "KCZ": {
      "city": "고치",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "KEF": {
      "city": "레이캬비크",
      "country": "IS",
      "flag": "🇮🇸"
    },
    "KHH": {
      "city": "가오슝",
      "country": "TW",
      "flag": "🇹🇼"
    },
    "KHI": {
      "city": "카라치",
      "country": "PK",
      "flag": "🇵🇰"
    },
    "KHV": {
      "city": "하바롭스크",
      "country": "RU",
      "flag": "🇷🇺"
    },
    "KIJ": {
      "city": "니가타",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "KIX": {
      "city": "오사카",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "KLO": {
      "city": "칼리보",
      "country": "PH",
      "flag": "🇵🇭"
    },
    "KMG": {
      "city": "쿤밍",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "KMI": {
      "city": "미야자키",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "KMJ": {
      "city": "구마모토",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "KMQ": {
      "city": "고마쓰",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "KOA": {
      "city": "코나",
      "country": "US",
      "flag": "🇺🇸"
    },
    "KOJ": {
      "city": "가고시마",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "KPO": {
      "city": "포항",
      "country": "KR",
      "flag": "🇰🇷"
    },
    "KRK": {
      "city": "크라쿠프",
      "country": "PL",
      "flag": "🇵🇱"
    },
    "KTM": {
      "city": "카트만두",
      "country": "NP",
      "flag": "🇳🇵"
    },
    "KUL": {
      "city": "쿠알라룸푸르",
      "country": "MY",
      "flag": "🇲🇾"
    },
    "KUV": {
      "city": "군산",
      "country": "KR",
      "flag": "🇰🇷"
    },
    "KWE": {
      "city": "구이양",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "KWI": {
      "city": "쿠웨이트",
      "country": "KW",
      "flag": "🇰🇼"
    },
    "KWJ": {
      "city": "광주",
      "country": "KR",
      "flag": "🇰🇷"
    },
    "KWL": {
      "city": "구이린",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "KZN": {
      "city": "카잔",
      "country": "RU",
      "flag": "🇷🇺"
    },
    "LAS": {
      "city": "라스베이거스",
      "country": "US",
      "flag": "🇺🇸"
    },
    "LAX": {
      "city": "로스앤젤레스",
      "country": "US",
      "flag": "🇺🇸"
    },
    "LCA": {
      "city": "라르나카",
      "country": "CY",
      "flag": "🇨🇾"
    },
    "LCY": {
      "city": "런던",
      "country": "GB",
      "flag": "🇬🇧"
    },
    "LED": {
      "city": "상트페테르부르크",
      "country": "RU",
      "flag": "🇷🇺"
    },
    "LEJ": {
      "city": "라이프치히",
      "country": "DE",
      "flag": "🇩🇪"
    },
    "LGA": {
      "city": "뉴욕",
      "country": "US",
      "flag": "🇺🇸"
    },
    "LGK": {
      "city": "랑카위",
      "country": "MY",
      "flag": "🇲🇾"
    },
    "LGW": {
      "city": "런던",
      "country": "GB",
      "flag": "🇬🇧"
    },
    "LHE": {
      "city": "라호르",
      "country": "PK",
      "flag": "🇵🇰"
    },
    "LHR": {
      "city": "런던",
      "country": "GB",
      "flag": "🇬🇧"
    },
    "LHW": {
      "city": "란저우",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "LIH": {
      "city": "카우아이",
      "country": "US",
      "flag": "🇺🇸"
    },
    "LIM": {
      "city": "리마",
      "country": "PE",
      "flag": "🇵🇪"
    },
    "LIN": {
      "city": "밀라노",
      "country": "IT",
      "flag": "🇮🇹"
    },
    "LIS": {
      "city": "리스본",
      "country": "PT",
      "flag": "🇵🇹"
    },
    "LJU": {
      "city": "류블랴나",
      "country": "SI",
      "flag": "🇸🇮"
    },
    "LOS": {
      "city": "라고스",
      "country": "NG",
      "flag": "🇳🇬"
    },
    "LPQ": {
      "city": "루앙프라방",
      "country": "LA",
      "flag": "🇱🇦"
    },
    "LUX": {
      "city": "룩셈부르크",
      "country": "LU",
      "flag": "🇱🇺"
    },
    "LYS": {
      "city": "리옹",
      "country": "FR",
      "flag": "🇫🇷"
    },
    "MAA": {
      "city": "첸나이",
      "country": "IN",
      "flag": "🇮🇳"
    },
    "MAD": {
      "city": "마드리드",
      "country": "ES",
      "flag": "🇪🇸"
    },
    "MAN": {
      "city": "맨체스터",
      "country": "GB",
      "flag": "🇬🇧"
    },
    "MBA": {
      "city": "몸바사",
      "country": "KE",
      "flag": "🇰🇪"
    },
    "MCI": {
      "city": "캔자스시티",
      "country": "US",
      "flag": "🇺🇸"
    },
    "MCO": {
      "city": "올랜도",
      "country": "US",
      "flag": "🇺🇸"
    },
    "MCT": {
      "city": "무스카트",
      "country": "OM",
      "flag": "🇴🇲"
    },
    "MDG": {
      "city": "무단장",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "MDL": {
      "city": "만달레이",
      "country": "MM",
      "flag": "🇲🇲"
    },
    "MEL": {
      "city": "멜버른",
      "country": "AU",
      "flag": "🇦🇺"
    },
    "MEM": {
      "city": "멤피스",
      "country": "US",
      "flag": "🇺🇸"
    },
    "MEX": {
      "city": "멕시코시티",
      "country": "MX",
      "flag": "🇲🇽"
    },
    "MFM": {
      "city": "마카오",
      "country": "MO",
      "flag": "🇲🇴"
    },
    "MIA": {
      "city": "마이애미",
      "country": "US",
      "flag": "🇺🇸"
    },
    "MLA": {
      "city": "몰타",
      "country": "MT",
      "flag": "🇲🇹"
    },
    "MLE": {
      "city": "몰디브",
      "country": "MV",
      "flag": "🇲🇻"
    },
    "MMY": {
      "city": "미야코",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "MNL": {
      "city": "마닐라",
      "country": "PH",
      "flag": "🇵🇭"
    },
    "MRS": {
      "city": "마르세유",
      "country": "FR",
      "flag": "🇫🇷"
    },
    "MRU": {
      "city": "모리셔스",
      "country": "MU",
      "flag": "🇲🇺"
    },
    "MSP": {
      "city": "미니애폴리스",
      "country": "US",
      "flag": "🇺🇸"
    },
    "MSQ": {
      "city": "민스크",
      "country": "BY",
      "flag": "🇧🇾"
    },
    "MSY": {
      "city": "뉴올리언스",
      "country": "US",
      "flag": "🇺🇸"
    },
    "MTY": {
      "city": "몬테레이",
      "country": "MX",
      "flag": "🇲🇽"
    },
    "MUC": {
      "city": "뮌헨",
      "country": "DE",
      "flag": "🇩🇪"
    },
    "MWX": {
      "city": "무안",
      "country": "KR",
      "flag": "🇰🇷"
    },
    "MXP": {
      "city": "밀라노",
      "country": "IT",
      "flag": "🇮🇹"
    },
    "MYJ": {
      "city": "마쓰야마",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "NAN": {
      "city": "나디",
      "country": "FJ",
      "flag": "🇫🇯"
    },
    "NAP": {
      "city": "나폴리",
      "country": "IT",
      "flag": "🇮🇹"
    },
    "NBO": {
      "city": "나이로비",
      "country": "KE",
      "flag": "🇰🇪"
    },
    "NCE": {
      "city": "니스",
      "country": "FR",
      "flag": "🇫🇷"
    },
    "NGB": {
      "city": "닝보",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "NGO": {
      "city": "나고야",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "NGS": {
      "city": "나가사키",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "NKG": {
      "city": "난징",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "NNG": {
      "city": "난닝",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "NOU": {
      "city": "누메아",
      "country": "NC",
      "flag": "🇳🇨"
    },
    "NQZ": {
      "city": "아스타나",
      "country": "KZ",
      "flag": "🇰🇿"
    },
    "NRT": {
      "city": "도쿄",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "NUE": {
      "city": "뉘른베르크",
      "country": "DE",
      "flag": "🇩🇪"
    },
    "OAK": {
      "city": "오클랜드",
      "country": "US",
      "flag": "🇺🇸"
    },
    "OGG": {
      "city": "마우이",
      "country": "US",
      "flag": "🇺🇸"
    },
    "OIT": {
      "city": "오이타",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "OKA": {
      "city": "오키나와",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "OKJ": {
      "city": "오카야마",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "OMA": {
      "city": "오마하",
      "country": "US",
      "flag": "🇺🇸"
    },
    "ONT": {
      "city": "온타리오",
      "country": "US",
      "flag": "🇺🇸"
    },
    "OOL": {
      "city": "골드코스트",
      "country": "AU",
      "flag": "🇦🇺"
    },
    "OPO": {
      "city": "포르투",
      "country": "PT",
      "flag": "🇵🇹"
    },
    "ORD": {
      "city": "시카고",
      "country": "US",
      "flag": "🇺🇸"
    },
    "ORY": {
      "city": "파리",
      "country": "FR",
      "flag": "🇫🇷"
    },
    "OSL": {
      "city": "오슬로",
      "country": "NO",
      "flag": "🇳🇴"
    },
    "OTP": {
      "city": "부쿠레슈티",
      "country": "RO",
      "flag": "🇷🇴"
    },
    "OVB": {
      "city": "노보시비르스크",
      "country": "RU",
      "flag": "🇷🇺"
    },
    "PBH": {
      "city": "파로",
      "country": "BT",
      "flag": "🇧🇹"
    },
    "PDX": {
      "city": "포틀랜드",
      "country": "US",
      "flag": "🇺🇸"
    },
    "PEK": {
      "city": "베이징",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "PEN": {
      "city": "페낭",
      "country": "MY",
      "flag": "🇲🇾"
    },
    "PER": {
      "city": "퍼스",
      "country": "AU",
      "flag": "🇦🇺"
    },
    "PHL": {
      "city": "필라델피아",
      "country": "US",
      "flag": "🇺🇸"
    },
    "PHX": {
      "city": "피닉스",
      "country": "US",
      "flag": "🇺🇸"
    },
    "PIT": {
      "city": "피츠버그",
      "country": "US",
      "flag": "🇺🇸"
    },
    "PKX": {
      "city": "베이징",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "PMI": {
      "city": "마요르카",
      "country": "ES",
      "flag": "🇪🇸"
    },
    "PNH": {
      "city": "프놈펜",
      "country": "KH",
      "flag": "🇰🇭"
    },
    "POM": {
      "city": "포트모르즈비",
      "country": "PG",
      "flag": "🇵🇬"
    },
    "PPS": {
      "city": "팔라완",
      "country": "PH",
      "flag": "🇵🇭"
    },
    "PPT": {
      "city": "타히티",
      "country": "PF",
      "flag": "🇵🇫"
    },
    "PQC": {
      "city": "푸꾸옥",
      "country": "VN",
      "flag": "🇻🇳"
    },
    "PRG": {
      "city": "프라하",
      "country": "CZ",
      "flag": "🇨🇿"
    },
    "PSA": {
      "city": "피사",
      "country": "IT",
      "flag": "🇮🇹"
    },
    "PTY": {
      "city": "파나마시티",
      "country": "PA",
      "flag": "🇵🇦"
    },
    "PUJ": {
      "city": "푼타카나",
      "country": "DO",
      "flag": "🇩🇴"
    },
    "PUS": {
      "city": "부산",
      "country": "KR",
      "flag": "🇰🇷"
    },
    "PVG": {
      "city": "상하이",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "PVR": {
      "city": "푸에르토바야르타",
      "country": "MX",
      "flag": "🇲🇽"
    },
    "RAK": {
      "city": "마라케시",
      "country": "MA",
      "flag": "🇲🇦"
    },
    "RDU": {
      "city": "롤리",
      "country": "US",
      "flag": "🇺🇸"
    },
    "REP": {
      "city": "씨엠립",
      "country": "KH",
      "flag": "🇰🇭"
    },
    "RGN": {
      "city": "양곤",
      "country": "MM",
      "flag": "🇲🇲"
    },
    "RIX": {
      "city": "리가",
      "country": "LV",
      "flag": "🇱🇻"
    },
    "RMQ": {
      "city": "타이중",
      "country": "TW",
      "flag": "🇹🇼"
    },
    "ROR": {
      "city": "팔라우",
      "country": "PW",
      "flag": "🇵🇼"
    },
    "RSU": {
      "city": "여수",
      "country": "KR",
      "flag": "🇰🇷"
    },
    "RSW": {
      "city": "포트마이어스",
      "country": "US",
      "flag": "🇺🇸"
    },
    "RUH": {
      "city": "리야드",
      "country": "SA",
      "flag": "🇸🇦"
    },
    "RVN": {
      "city": "로바니에미",
      "country": "FI",
      "flag": "🇫🇮"
    },
    "SAN": {
      "city": "샌디에이고",
      "country": "US",
      "flag": "🇺🇸"
    },
    "SAW": {
      "city": "이스탄불",
      "country": "TR",
      "flag": "🇹🇷"
    },
    "SCL": {
      "city": "산티아고",
      "country": "CL",
      "flag": "🇨🇱"
    },
    "SDJ": {
      "city": "센다이",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "SDQ": {
      "city": "산토도밍고",
      "country": "DO",
      "flag": "🇩🇴"
    },
    "SEA": {
      "city": "시애틀",
      "country": "US",
      "flag": "🇺🇸"
    },
    "SEZ": {
      "city": "세이셸",
      "country": "SC",
      "flag": "🇸🇨"
    },
    "SFO": {
      "city": "샌프란시스코",
      "country": "US",
      "flag": "🇺🇸"
    },
    "SGN": {
      "city": "호치민",
      "country": "VN",
      "flag": "🇻🇳"
    },
    "SHA": {
      "city": "상하이",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "SHE": {
      "city": "선양",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "SHJ": {
      "city": "샤르자",
      "country": "AE",
      "flag": "🇦🇪"
    },
    "SIN": {
      "city": "싱가포르",
      "country": "SG",
      "flag": "🇸🇬"
    },
    "SJC": {
      "city": "새너제이",
      "country": "US",
      "flag": "🇺🇸"
    },
    "SJD": {
      "city": "로스카보스",
      "country": "MX",
      "flag": "🇲🇽"
    },
    "SJO": {
      "city": "산호세",
      "country": "CR",
      "flag": "🇨🇷"
    },
    "SJW": {
      "city": "스자좡",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "SKD": {
      "city": "사마르칸트",
      "country": "UZ",
      "flag": "🇺🇿"
    },
    "SKG": {
      "city": "테살로니키",
      "country": "GR",
      "flag": "🇬🇷"
    },
    "SLC": {
      "city": "솔트레이크시티",
      "country": "US",
      "flag": "🇺🇸"
    },
    "SMF": {
      "city": "새크라멘토",
      "country": "US",
      "flag": "🇺🇸"
    },
    "SNA": {
      "city": "오렌지카운티",
      "country": "US",
      "flag": "🇺🇸"
    },
    "SOF": {
      "city": "소피아",
      "country": "BG",
      "flag": "🇧🇬"
    },
    "SPN": {
      "city": "사이판",
      "country": "MP",
      "flag": "🇲🇵"
    },
    "SPU": {
      "city": "스플리트",
      "country": "HR",
      "flag": "🇭🇷"
    },
    "SRG": {
      "city": "스마랑",
      "country": "ID",
      "flag": "🇮🇩"
    },
    "SSH": {
      "city": "샤름엘셰이크",
      "country": "EG",
      "flag": "🇪🇬"
    },
    "STL": {
      "city": "세인트루이스",
      "country": "US",
      "flag": "🇺🇸"
    },
    "STN": {
      "city": "런던",
      "country": "GB",
      "flag": "🇬🇧"
    },
    "STR": {
      "city": "슈투트가르트",
      "country": "DE",
      "flag": "🇩🇪"
    },
    "SUB": {
      "city": "수라바야",
      "country": "ID",
      "flag": "🇮🇩"
    },
    "SVO": {
      "city": "모스크바",
      "country": "RU",
      "flag": "🇷🇺"
    },
    "SVQ": {
      "city": "세비야",
      "country": "ES",
      "flag": "🇪🇸"
    },
    "SWA": {
      "city": "산터우",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "SYD": {
      "city": "시드니",
      "country": "AU",
      "flag": "🇦🇺"
    },
    "SYX": {
      "city": "싼야",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "SZG": {
      "city": "잘츠부르크",
      "country": "AT",
      "flag": "🇦🇹"
    },
    "SZX": {
      "city": "선전",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "TAE": {
      "city": "대구",
      "country": "KR",
      "flag": "🇰🇷"
    },
    "TAG": {
      "city": "보홀",
      "country": "PH",
      "flag": "🇵🇭"
    },
    "TAK": {
      "city": "다카마쓰",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "TAO": {
      "city": "칭다오",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "TAS": {
      "city": "타슈켄트",
      "country": "UZ",
      "flag": "🇺🇿"
    },
    "TBS": {
      "city": "트빌리시",
      "country": "GE",
      "flag": "🇬🇪"
    },
    "TFU": {
      "city": "청두",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "TKS": {
      "city": "도쿠시마",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "TLL": {
      "city": "탈린",
      "country": "EE",
      "flag": "🇪🇪"
    },
    "TLS": {
      "city": "툴루즈",
      "country": "FR",
      "flag": "🇫🇷"
    },
    "TLV": {
      "city": "텔아비브",
      "country": "IL",
      "flag": "🇮🇱"
    },
    "TNA": {
      "city": "지난",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "TOY": {
      "city": "도야마",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "TPA": {
      "city": "탬파",
      "country": "US",
      "flag": "🇺🇸"
    },
    "TPE": {
      "city": "타이베이",
      "country": "TW",
      "flag": "🇹🇼"
    },
    "TRD": {
      "city": "트론헤임",
      "country": "NO",
      "flag": "🇳🇴"
    },
    "TSA": {
      "city": "타이베이",
      "country": "TW",
      "flag": "🇹🇼"
    },
    "TSE": {
      "city": "아스타나",
      "country": "KZ",
      "flag": "🇰🇿"
    },
    "TSN": {
      "city": "톈진",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "TUN": {
      "city": "튀니스",
      "country": "TN",
      "flag": "🇹🇳"
    },
    "TUS": {
      "city": "투손",
      "country": "US",
      "flag": "🇺🇸"
    },
    "TYN": {
      "city": "타이위안",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "UBN": {
      "city": "울란바토르",
      "country": "MN",
      "flag": "🇲🇳"
    },
    "UIO": {
      "city": "키토",
      "country": "EC",
      "flag": "🇪🇨"
    },
    "UKB": {
      "city": "고베",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "ULN": {
      "city": "울란바토르",
      "country": "MN",
      "flag": "🇲🇳"
    },
    "UPG": {
      "city": "마카사르",
      "country": "ID",
      "flag": "🇮🇩"
    },
    "URC": {
      "city": "우루무치",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "USM": {
      "city": "사무이",
      "country": "TH",
      "flag": "🇹🇭"
    },
    "USN": {
      "city": "울산",
      "country": "KR",
      "flag": "🇰🇷"
    },
    "UUS": {
      "city": "유즈노사할린스크",
      "country": "RU",
      "flag": "🇷🇺"
    },
    "VAR": {
      "city": "바르나",
      "country": "BG",
      "flag": "🇧🇬"
    },
    "VCA": {
      "city": "껀터",
      "country": "VN",
      "flag": "🇻🇳"
    },
    "VCE": {
      "city": "베네치아",
      "country": "IT",
      "flag": "🇮🇹"
    },
    "VIE": {
      "city": "빈",
      "country": "AT",
      "flag": "🇦🇹"
    },
    "VKO": {
      "city": "모스크바",
      "country": "RU",
      "flag": "🇷🇺"
    },
    "VLC": {
      "city": "발렌시아",
      "country": "ES",
      "flag": "🇪🇸"
    },
    "VNO": {
      "city": "빌뉴스",
      "country": "LT",
      "flag": "🇱🇹"
    },
    "VTE": {
      "city": "비엔티안",
      "country": "LA",
      "flag": "🇱🇦"
    },
    "VVO": {
      "city": "블라디보스토크",
      "country": "RU",
      "flag": "🇷🇺"
    },
    "WAW": {
      "city": "바르샤바",
      "country": "PL",
      "flag": "🇵🇱"
    },
    "WEH": {
      "city": "웨이하이",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "WJU": {
      "city": "원주",
      "country": "KR",
      "flag": "🇰🇷"
    },
    "WLG": {
      "city": "웰링턴",
      "country": "NZ",
      "flag": "🇳🇿"
    },
    "WNZ": {
      "city": "원저우",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "WUH": {
      "city": "우한",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "XIY": {
      "city": "시안",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "XMN": {
      "city": "샤먼",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "XNN": {
      "city": "시닝",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "YEG": {
      "city": "에드먼턴",
      "country": "CA",
      "flag": "🇨🇦"
    },
    "YGJ": {
      "city": "요나고",
      "country": "JP",
      "flag": "🇯🇵"
    },
    "YHZ": {
      "city": "핼리팩스",
      "country": "CA",
      "flag": "🇨🇦"
    },
    "YNJ": {
      "city": "옌지",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "YNT": {
      "city": "옌타이",
      "country": "CN",
      "flag": "🇨🇳"
    },
    "YNY": {
      "city": "양양",
      "country": "KR",
      "flag": "🇰🇷"
    },
    "YOW": {
      "city": "오타와",
      "country": "CA",
      "flag": "🇨🇦"
    },
    "YUL": {
      "city": "몬트리올",
      "country": "CA",
      "flag": "🇨🇦"
    },
    "YVR": {
      "city": "밴쿠버",
      "country": "CA",
      "flag": "🇨🇦"
    },
    "YWG": {
      "city": "위니펙",
      "country": "CA",
      "flag": "🇨🇦"
    },
    "YYC": {
      "city": "캘거리",
      "country": "CA",
      "flag": "🇨🇦"
    },
    "YYZ": {
      "city": "토론토",
      "country": "CA",
      "flag": "🇨🇦"
    },
    "ZAG": {
      "city": "자그레브",
      "country": "HR",
      "flag": "🇭🇷"
    },
    "ZQN": {
      "city": "퀸스타운",
      "country": "NZ",
      "flag": "🇳🇿"
    },
    "ZRH": {
      "city": "취리히",
      "country": "CH",
      "flag": "🇨🇭"
    },
    "ZUH": {
      "city": "주하이",
      "country": "CN",
      "flag": "🇨🇳"
    }
  };

  return { ROUTES: ROUTES, AIRPORTS: AIRPORTS };
});
