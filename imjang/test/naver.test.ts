import { describe, expect, it } from 'vitest';
import {
  cleanTitle,
  isNaverUrl,
  parseFromHtml,
  parseKoreanMoney,
  parseListingText,
  parseShare,
  pickUrl,
} from '../src/parsers/naver.ts';

describe('parseKoreanMoney', () => {
  it('억과 만원을 함께 읽는다', () => {
    expect(parseKoreanMoney('12억 8,000')).toBe(128000);
    expect(parseKoreanMoney('12억8천')).toBe(128000);
    expect(parseKoreanMoney('3억5천')).toBe(35000);
    expect(parseKoreanMoney('12억')).toBe(120000);
    expect(parseKoreanMoney('8,000')).toBe(8000);
    expect(parseKoreanMoney('1.5억')).toBe(15000);
  });

  it('읽을 수 없으면 undefined', () => {
    expect(parseKoreanMoney('가격협의')).toBeUndefined();
    expect(parseKoreanMoney('')).toBeUndefined();
  });
});

describe('parseListingText', () => {
  it('매매 아파트 한 줄을 읽는다', () => {
    const p = parseListingText('래미안 강남포레스트 아파트 매매 12억 8,000\n서울 강남구 개포동\n공급/전용 114.68/84.98㎡, 15/25층, 남향');
    expect(p.type).toBe('apartment');
    expect(p.dealType).toBe('sale');
    expect(p.price).toBe(128000);
    expect(p.areaSupply).toBeCloseTo(114.68);
    expect(p.areaExclusive).toBeCloseTo(84.98);
    expect(p.floor).toBe('15/25');
    expect(p.direction).toBe('남향');
    expect(p.address).toContain('강남구');
    expect(p.filled).toBeGreaterThan(5);
  });

  it('월세는 보증금과 월세를 나눠 읽는다', () => {
    const p = parseListingText('빌라 월세 5,000/150 전용 59.9㎡ 3층 동향');
    expect(p.dealType).toBe('monthly');
    expect(p.price).toBe(5000);
    expect(p.monthlyRent).toBe(150);
    expect(p.type).toBe('villa');
    expect(p.areaExclusive).toBeCloseTo(59.9);
  });

  it('전세를 읽는다', () => {
    const p = parseListingText('단독주택 전세 5억 대지 200㎡');
    expect(p.dealType).toBe('jeonse');
    expect(p.price).toBe(50000);
    expect(p.type).toBe('house');
  });

  it('층 표기가 말로 되어 있어도 잡는다', () => {
    expect(parseListingText('아파트 매매 9억 중층 남서향').floor).toBe('중층');
  });

  it('빈 입력에도 죽지 않는다', () => {
    const p = parseListingText('');
    expect(p.filled).toBe(0);
    expect(p.warnings.length).toBeGreaterThan(0);
  });

  it('면적 라벨이 없으면 공급으로 넣고 경고를 남긴다', () => {
    const p = parseListingText('아파트 매매 9억 84.5㎡');
    expect(p.areaSupply).toBeCloseTo(84.5);
    expect(p.warnings.join(' ')).toContain('공급');
  });
});

describe('parseShare', () => {
  it('제목과 본문, URL 을 합쳐 읽는다', () => {
    const p = parseShare({
      title: '래미안 아파트 : 네이버 부동산',
      text: '매매 12억 8,000 전용 84.98㎡ 15/25층',
      url: 'https://m.land.naver.com/article/info/2512345678',
    });
    expect(p.sourceUrl).toContain('land.naver.com');
    expect(p.price).toBe(128000);
    expect(p.title).not.toContain('네이버');
  });

  it('URL 이 본문에만 있어도 찾아낸다', () => {
    expect(pickUrl({ text: '이 매물 봐 https://naver.me/abcd1234 어때?' })).toBe(
      'https://naver.me/abcd1234',
    );
  });
});

describe('parseFromHtml', () => {
  it('og 메타에서 읽는다', () => {
    const html = `<html><head>
      <meta property="og:title" content="힐스테이트 아파트 : 네이버 부동산" />
      <meta property="og:description" content="매매 15억 전용 84.98㎡ 12/20층 남향" />
    </head></html>`;
    const p = parseFromHtml(html, 'https://new.land.naver.com/articles/123');
    expect(p.price).toBe(150000);
    expect(p.areaExclusive).toBeCloseTo(84.98);
    expect(p.sourceUrl).toContain('land.naver.com');
  });

  it('JSON 값이 있으면 그쪽을 믿는다', () => {
    const html = `<script>{"articleName":"래미안퍼스티지","tradeTypeName":"전세","dealOrWarrantPrc":"9억 5,000","area1":114.5,"area2":84.9,"floorInfo":"15/25","direction":"남향"}</script>`;
    const p = parseFromHtml(html);
    expect(p.title).toBe('래미안퍼스티지');
    expect(p.dealType).toBe('jeonse');
    expect(p.price).toBe(95000);
    expect(p.areaSupply).toBeCloseTo(114.5);
    expect(p.floor).toBe('15/25');
  });

  it('구조가 완전히 바뀌어도 던지지 않는다', () => {
    const p = parseFromHtml('<html><body>서비스 점검 중입니다</body></html>', 'https://land.naver.com/x');
    expect(p.sourceUrl).toBe('https://land.naver.com/x');
    expect(p.filled).toBeLessThan(3);
  });
});

describe('보조 함수', () => {
  it('네이버 링크만 참으로 본다', () => {
    expect(isNaverUrl('https://m.land.naver.com/a')).toBe(true);
    expect(isNaverUrl('https://naver.me/x')).toBe(true);
    expect(isNaverUrl('https://example.com')).toBe(false);
    expect(isNaverUrl('그냥 글자')).toBe(false);
  });

  it('제목 꼬리표를 떼어낸다', () => {
    expect(cleanTitle('래미안 101동 : 네이버 부동산')).toBe('래미안 101동');
  });
});

describe('주소 추출', () => {
  it('가격·면적이 한 줄에 섞여 있어도 주소 조각만 떼어낸다', () => {
    const p = parseListingText(
      '아파트 매매 12억 8,000 공급/전용 114.68/84.98㎡ 15/25층 남향 서울 강남구 개포동',
    );
    expect(p.address).toBe('서울 강남구 개포동');
  });

  it('시 + 구 + 동 3단도 읽는다', () => {
    expect(parseListingText('경기 성남시 분당구 정자동 매매 9억').address).toBe(
      '경기 성남시 분당구 정자동',
    );
  });

  it('주소가 없으면 비워 둔다', () => {
    expect(parseListingText('매매 9억 84㎡').address).toBeUndefined();
  });
});
