import { describe, expect, it } from 'vitest';
import { parseMolitXml } from '../src/api/molit.ts';
import { monthlyAverages } from '../src/components/PriceChart.tsx';
import type { PriceRecord } from '../src/db/types.ts';

const OK_XML = `<response><header><resultCode>000</resultCode><resultMsg>OK</resultMsg></header><body><items>
<item><aptNm>래미안</aptNm><dealAmount> 128,000 </dealAmount><dealYear>2026</dealYear><dealMonth>1</dealMonth><dealDay>12</dealDay><excluUseAr>84.98</excluUseAr><floor>15</floor></item>
<item><aptNm>래미안</aptNm><dealAmount>131,500</dealAmount><dealYear>2026</dealYear><dealMonth>2</dealMonth><dealDay>3</dealDay><excluUseAr>84.98</excluUseAr><floor>8</floor></item>
</items></body></response>`;

describe('parseMolitXml', () => {
  it('거래 항목을 읽는다', () => {
    const { items, error } = parseMolitXml(OK_XML);
    expect(error).toBeUndefined();
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      name: '래미안',
      price: 128000,
      areaExclusive: 84.98,
      floor: 15,
      dealYearMonth: '202601',
    });
    expect(items[1]?.dealYearMonth).toBe('202602');
  });

  it('오류 응답은 메시지로 돌려준다', () => {
    const xml = `<response><header><resultCode>030</resultCode><resultMsg>SERVICE KEY IS NOT REGISTERED</resultMsg></header></response>`;
    const parsed = parseMolitXml(xml);
    expect(parsed.items).toHaveLength(0);
    expect(parsed.error).toContain('SERVICE KEY');
  });

  it('인증 오류 XML 도 삼키지 않는다', () => {
    const xml = `<OpenAPI_ServiceResponse><cmmMsgHeader><returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg><returnReasonCode>30</returnReasonCode></cmmMsgHeader></OpenAPI_ServiceResponse>`;
    expect(parseMolitXml(xml).error).toContain('SERVICE_KEY');
  });

  it('빈 응답에도 죽지 않는다', () => {
    expect(parseMolitXml('').items).toEqual([]);
    expect(parseMolitXml('<response><body><items></items></body></response>').items).toEqual([]);
  });
});

describe('monthlyAverages', () => {
  const rec = (ym: string, price: number): PriceRecord => ({
    id: ym + price,
    complexKey: '11680:래미안',
    dealYearMonth: ym,
    price,
    areaExclusive: 84.98,
    floor: 10,
    fetchedAt: 0,
  });

  it('같은 달은 평균으로 접고 시간순으로 세운다', () => {
    const points = monthlyAverages([rec('202602', 130000), rec('202601', 120000), rec('202601', 124000)]);
    expect(points.map((p) => p.ym)).toEqual(['202601', '202602']);
    expect(points[0]).toMatchObject({ price: 122000, count: 2, label: '26.01' });
    expect(points[1]?.count).toBe(1);
  });

  it('빈 배열이면 빈 결과', () => {
    expect(monthlyAverages([])).toEqual([]);
  });
});
