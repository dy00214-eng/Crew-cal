/**
 * 공항(IATA) -> 나라. 편명 옆에 출발하는 나라 국기를 붙이는 데 쓴다.
 * 국기는 나라 코드 두 글자를 리저널 인디케이터로 바꿔 만든다(이미지 파일 없음).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.airports = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 나라별 공항 목록. 대한항공·아시아나 취항지와 자주 쓰는 공항 위주.
  var BY_COUNTRY = {
    KR: 'ICN GMP PUS CJU TAE KWJ RSU USN YNY MWX HIN KUV WJU KPO',
    JP: 'NRT HND KIX ITM UKB NGO CTS FUK OKA KOJ KMJ HIJ TAK KMI OIT AXT SDJ AOJ KMQ TOY FSZ MYJ NGS HKD ISG MMY TKS KCZ IZO YGJ ASJ OKJ',
    CN: 'PEK PKX PVG SHA CAN SZX CTU TFU CKG XIY HGH NKG WUH CSX CGO TNA TAO YNT WEH DLC SHE HRB CGQ TSN KMG NNG HAK SYX XMN FOC JJN NGB HFE WNZ TYN SJW HET INC LHW XNN URC KWE KWL SWA ZUH YNJ MDG',
    HK: 'HKG', MO: 'MFM', TW: 'TPE TSA KHH RMQ', MN: 'ULN UBN',
    TH: 'BKK DMK HKT CNX USM KBV CEI', VN: 'SGN HAN DAD CXR PQC HPH VCA',
    PH: 'MNL CEB CRK KLO PPS TAG DVO', SG: 'SIN', MY: 'KUL PEN BKI LGK JHB KCH',
    ID: 'CGK DPS SUB JOG UPG BTH SRG', MM: 'RGN MDL', KH: 'PNH REP', LA: 'VTE LPQ',
    BN: 'BWN', TL: 'DIL',
    IN: 'DEL BOM MAA BLR HYD CCU COK AMD', LK: 'CMB', NP: 'KTM', BD: 'DAC',
    MV: 'MLE', PK: 'ISB LHE KHI', BT: 'PBH',
    AE: 'DXB AUH SHJ', QA: 'DOH', SA: 'RUH JED DMM', KW: 'KWI', BH: 'BAH',
    OM: 'MCT', IL: 'TLV', JO: 'AMM', IQ: 'BGW EBL', IR: 'IKA',
    TR: 'IST SAW ESB AYT ADB', CY: 'LCA', GE: 'TBS', AM: 'EVN', AZ: 'GYD',
    UZ: 'TAS SKD', KZ: 'ALA NQZ TSE', KG: 'FRU',
    RU: 'SVO DME VKO LED VVO KHV UUS IKT OVB KZN',
    GB: 'LHR LGW LCY STN MAN EDI GLA BHX', IE: 'DUB',
    FR: 'CDG ORY NCE LYS MRS TLS BOD', DE: 'FRA MUC BER DUS HAM CGN STR HAJ NUE LEJ',
    NL: 'AMS EIN', BE: 'BRU CRL', LU: 'LUX', CH: 'ZRH GVA BSL', AT: 'VIE SZG',
    IT: 'FCO MXP LIN VCE NAP BLQ FLR PSA CTA', ES: 'MAD BCN AGP PMI VLC SVQ',
    PT: 'LIS OPO FNC', GR: 'ATH SKG JTR HER', MT: 'MLA',
    CZ: 'PRG', HU: 'BUD', PL: 'WAW KRK GDN', SK: 'BTS', SI: 'LJU',
    HR: 'ZAG DBV SPU', RS: 'BEG', RO: 'OTP CLJ', BG: 'SOF VAR',
    SE: 'ARN GOT', DK: 'CPH BLL', NO: 'OSL BGO TRD', FI: 'HEL RVN', IS: 'KEF',
    EE: 'TLL', LV: 'RIX', LT: 'VNO', UA: 'KBP IEV', BY: 'MSQ',
    US: 'JFK EWR LGA BOS IAD DCA BWI PHL PIT CLT ATL MCO MIA FLL TPA MSY IAH DFW AUS DEN SLC PHX LAS LAX SFO SJC SAN SMF SEA PDX ORD DTW MSP STL MCI CLE CVG IND BNA RDU MEM OAK ANC HNL OGG KOA LIH SNA ONT BUR RSW JAX ABQ OMA BOI TUS',
    CA: 'YYZ YVR YUL YYC YEG YOW YHZ YWG', MX: 'MEX CUN GDL MTY SJD PVR',
    GU: 'GUM', MP: 'SPN', PW: 'ROR',
    BR: 'GRU GIG BSB CNF', AR: 'EZE AEP', CL: 'SCL', PE: 'LIM', CO: 'BOG CTG',
    EC: 'UIO GYE', PA: 'PTY', CR: 'SJO', DO: 'PUJ SDQ', CU: 'HAV',
    AU: 'SYD MEL BNE PER ADL OOL CNS DRW', NZ: 'AKL CHC ZQN WLG',
    FJ: 'NAN', PF: 'PPT', NC: 'NOU', WS: 'APW', PG: 'POM',
    EG: 'CAI HRG SSH', MA: 'CMN RAK', TN: 'TUN', ZA: 'JNB CPT DUR',
    KE: 'NBO MBA', ET: 'ADD', NG: 'LOS ABV', TZ: 'JRO DAR', MU: 'MRU', SC: 'SEZ'
  };

  var COUNTRY_NAMES = {
    KR: '대한민국', JP: '일본', CN: '중국', HK: '홍콩', MO: '마카오', TW: '대만', MN: '몽골',
    TH: '태국', VN: '베트남', PH: '필리핀', SG: '싱가포르', MY: '말레이시아', ID: '인도네시아',
    MM: '미얀마', KH: '캄보디아', LA: '라오스', BN: '브루나이', TL: '동티모르',
    IN: '인도', LK: '스리랑카', NP: '네팔', BD: '방글라데시', MV: '몰디브', PK: '파키스탄', BT: '부탄',
    AE: '아랍에미리트', QA: '카타르', SA: '사우디아라비아', KW: '쿠웨이트', BH: '바레인',
    OM: '오만', IL: '이스라엘', JO: '요르단', IQ: '이라크', IR: '이란',
    TR: '튀르키예', CY: '키프로스', GE: '조지아', AM: '아르메니아', AZ: '아제르바이잔',
    UZ: '우즈베키스탄', KZ: '카자흐스탄', KG: '키르기스스탄', RU: '러시아',
    GB: '영국', IE: '아일랜드', FR: '프랑스', DE: '독일', NL: '네덜란드', BE: '벨기에',
    LU: '룩셈부르크', CH: '스위스', AT: '오스트리아', IT: '이탈리아', ES: '스페인',
    PT: '포르투갈', GR: '그리스', MT: '몰타', CZ: '체코', HU: '헝가리', PL: '폴란드',
    SK: '슬로바키아', SI: '슬로베니아', HR: '크로아티아', RS: '세르비아', RO: '루마니아',
    BG: '불가리아', SE: '스웨덴', DK: '덴마크', NO: '노르웨이', FI: '핀란드', IS: '아이슬란드',
    EE: '에스토니아', LV: '라트비아', LT: '리투아니아', UA: '우크라이나', BY: '벨라루스',
    US: '미국', CA: '캐나다', MX: '멕시코', GU: '괌', MP: '북마리아나제도', PW: '팔라우',
    BR: '브라질', AR: '아르헨티나', CL: '칠레', PE: '페루', CO: '콜롬비아', EC: '에콰도르',
    PA: '파나마', CR: '코스타리카', DO: '도미니카공화국', CU: '쿠바',
    AU: '호주', NZ: '뉴질랜드', FJ: '피지', PF: '프랑스령 폴리네시아', NC: '뉴칼레도니아',
    WS: '사모아', PG: '파푸아뉴기니',
    EG: '이집트', MA: '모로코', TN: '튀니지', ZA: '남아프리카공화국', KE: '케냐',
    ET: '에티오피아', NG: '나이지리아', TZ: '탄자니아', MU: '모리셔스', SC: '세이셸'
  };

  var AIRPORT_COUNTRY = {};
  Object.keys(BY_COUNTRY).forEach(function (country) {
    BY_COUNTRY[country].split(/\s+/).forEach(function (iata) {
      if (iata) AIRPORT_COUNTRY[iata] = country;
    });
  });

  /** 나라 코드 -> 국기 이모지. 'KR' -> 🇰🇷 */
  function flagOfCountry(country) {
    if (!country || !/^[A-Za-z]{2}$/.test(country)) return '';
    var upper = country.toUpperCase();
    return String.fromCodePoint(
      0x1F1E6 + upper.charCodeAt(0) - 65,
      0x1F1E6 + upper.charCodeAt(1) - 65
    );
  }

  function countryOf(iata) {
    if (!iata) return null;
    return AIRPORT_COUNTRY[String(iata).toUpperCase()] || null;
  }

  function countryName(country) {
    return COUNTRY_NAMES[country] || country || '';
  }

  /** 공항 코드 -> 국기. 모르는 공항이면 빈 문자열. */
  function flagOf(iata) {
    return flagOfCountry(countryOf(iata));
  }

  /** 'ICN/JFK' 또는 'ICN-JFK' 에서 출발 공항과 도착 공항을 뽑는다. */
  function splitRoute(route) {
    if (!route) return { from: null, to: null };
    var parts = String(route).toUpperCase().split(/[/\-–>]+/).filter(Boolean);
    return {
      from: parts[0] || null,
      to: parts.length > 1 ? parts[parts.length - 1] : null
    };
  }

  /** 일정 하나의 출발 국기. 구간을 모르면 빈 문자열. */
  function departureFlag(entry) {
    if (!entry || !entry.route) return '';
    return flagOf(splitRoute(entry.route).from);
  }

  /** 툴팁에 쓸 설명. 'ICN 대한민국 → JFK 미국' */
  function describeRoute(route) {
    var parts = splitRoute(route);
    if (!parts.from) return '';
    var out = parts.from;
    var fromCountry = countryOf(parts.from);
    if (fromCountry) out += ' ' + countryName(fromCountry);
    if (parts.to) {
      out += ' → ' + parts.to;
      var toCountry = countryOf(parts.to);
      if (toCountry) out += ' ' + countryName(toCountry);
    }
    return out;
  }

  return {
    AIRPORT_COUNTRY: AIRPORT_COUNTRY,
    COUNTRY_NAMES: COUNTRY_NAMES,
    countryOf: countryOf,
    countryName: countryName,
    flagOf: flagOf,
    flagOfCountry: flagOfCountry,
    splitRoute: splitRoute,
    departureFlag: departureFlag,
    describeRoute: describeRoute
  };
});
