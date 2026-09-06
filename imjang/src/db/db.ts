import Dexie, { type Table } from 'dexie';
import type { Photo, PriceRecord, Property } from './types.ts';

export class ImjangDB extends Dexie {
  properties!: Table<Property, string>;
  photos!: Table<Photo, string>;
  priceRecords!: Table<PriceRecord, string>;

  constructor() {
    super('imjang-note');
    this.version(1).stores({
      // 목록 정렬·필터가 전부 인덱스로 끝나야 100건에서도 안 끊긴다.
      properties: 'id, status, type, updatedAt, price',
      photos: 'id, propertyId, takenAt',
      priceRecords: 'id, complexKey, dealYearMonth, [complexKey+dealYearMonth]',
    });
  }
}

export const db = new ImjangDB();
