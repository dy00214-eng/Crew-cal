import { describe, expect, it } from 'vitest';
import {
  COMMON_ITEMS,
  DOC_ITEMS,
  TYPE_ITEMS,
  allItemsFor,
  checklistFor,
  docChecksFor,
  itemLabel,
} from '../src/config/checklists.ts';
import type { PropertyType } from '../src/db/types.ts';

const TYPES: PropertyType[] = ['apartment', 'house', 'villa'];

describe('체크리스트', () => {
  it('공통 8항목이 모든 유형에 붙는다', () => {
    expect(COMMON_ITEMS).toHaveLength(8);
    for (const type of TYPES) {
      const sections = checklistFor(type);
      expect(sections[0]?.items).toEqual(COMMON_ITEMS);
      expect(sections[1]?.items).toEqual(TYPE_ITEMS[type]);
    }
  });

  it('키가 전 유형에서 겹치지 않는다 (평점이 섞이면 안 된다)', () => {
    for (const type of TYPES) {
      const keys = allItemsFor(type).map((i) => i.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
    const all = [...COMMON_ITEMS, ...TYPES.flatMap((t) => TYPE_ITEMS[t]), ...DOC_ITEMS].map((i) => i.key);
    expect(new Set(all).size).toBe(all.length);
  });

  it('서류 확인은 단독·빌라만', () => {
    expect(docChecksFor('apartment')).toHaveLength(0);
    expect(docChecksFor('house')).toEqual(DOC_ITEMS);
    expect(docChecksFor('villa')).toEqual(DOC_ITEMS);
    expect(DOC_ITEMS.map((i) => i.label)).toEqual(['등기부등본', '건축물대장', '토지이용계획확인원']);
  });

  it('빌라에는 환금성 항목이 있다', () => {
    expect(TYPE_ITEMS.villa.some((i) => i.label.includes('환금성'))).toBe(true);
    expect(itemLabel('villa', 'villa_liquidity')).toContain('환금성');
    expect(itemLabel('villa', '없는키')).toBe('없는키');
  });
});
