import { describe, expect, it } from 'vitest';
import {
  areaForCompare,
  firstLine,
  formatArea,
  formatBytes,
  formatDeal,
  formatMan,
  formatYearMonth,
  pricePerPyeong,
  round,
  toPyeong,
} from '../src/lib/format.ts';

describe('formatMan', () => {
  it('억과 만원으로 끊는다', () => {
    expect(formatMan(128000)).toBe('12억 8,000');
    expect(formatMan(120000)).toBe('12억');
    expect(formatMan(8000)).toBe('8,000');
    expect(formatMan(0)).toBe('0');
    expect(formatMan(undefined)).toBe('—');
  });
});

describe('formatDeal', () => {
  it('월세는 보증금/월세로 적는다', () => {
    expect(formatDeal({ dealType: 'monthly', price: 5000, monthlyRent: 150 })).toBe('5,000/150');
    expect(formatDeal({ dealType: 'sale', price: 128000 })).toBe('12억 8,000');
  });
});

describe('면적', () => {
  it('평 환산', () => {
    expect(round(toPyeong(84.98), 1)).toBe(25.7);
    expect(formatArea(84.98)).toBe('84.98㎡');
    expect(formatArea(undefined)).toBe('—');
  });

  it('평당가는 전용면적을 우선한다', () => {
    const p = { areaExclusive: 84.98, areaSupply: 114.68 };
    expect(areaForCompare(p).basis).toBe('전용');
    expect(areaForCompare({ areaSupply: 114.68 }).basis).toBe('공급');
    expect(areaForCompare({}).basis).toBe('—');
    const per = pricePerPyeong(128000, 84.98);
    expect(per && round(per, 0)).toBe(4979);
  });

  it('면적이 없으면 평당가도 없다', () => {
    expect(pricePerPyeong(128000, undefined)).toBeUndefined();
    expect(pricePerPyeong(0, 84)).toBeUndefined();
  });
});

describe('기타', () => {
  it('연월 표기', () => {
    expect(formatYearMonth('202601')).toBe('26.01');
    expect(formatYearMonth('이상한값')).toBe('이상한값');
  });

  it('메모 첫 줄', () => {
    expect(firstLine('\n\n채광 좋음, 소음 큼\n2층 계단')).toBe('채광 좋음, 소음 큼');
    expect(firstLine('')).toBe('');
  });

  it('용량 표기', () => {
    expect(formatBytes(1024)).toBe('1KB');
    expect(formatBytes(1536 * 1024)).toBe('1.5MB');
    expect(formatBytes(undefined)).toBe('—');
  });
});
