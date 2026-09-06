import { nanoid } from 'nanoid';
import { db } from './db.ts';
import type { Photo, PriceRecord, Property, PropertyType, Status } from './types.ts';

export type SortKey = 'recent' | 'price' | 'score';

export interface ListFilter {
  status: Status | 'all';
  type: PropertyType | 'all';
  sort: SortKey;
}

export const DEFAULT_FILTER: ListFilter = { status: 'all', type: 'all', sort: 'recent' };

/**
 * 목록 읽기. 네트워크를 일절 쓰지 않는다.
 * 정렬은 인덱스로 끝내고, 필터는 메모리에서 건다 (개인 데이터라 수백 건 규모).
 */
export async function listProperties(filter: ListFilter): Promise<Property[]> {
  let rows: Property[];
  if (filter.sort === 'price') {
    rows = await db.properties.orderBy('price').reverse().toArray();
  } else {
    rows = await db.properties.orderBy('updatedAt').reverse().toArray();
  }
  if (filter.status !== 'all') rows = rows.filter((r) => r.status === filter.status);
  if (filter.type !== 'all') rows = rows.filter((r) => r.type === filter.type);
  if (filter.sort === 'score') {
    rows = rows.slice().sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0));
  }
  return rows;
}

export function emptyProperty(type: PropertyType = 'apartment'): Property {
  const now = Date.now();
  return {
    id: nanoid(),
    type,
    status: 'candidate',
    title: '',
    address: '',
    price: 0,
    dealType: 'sale',
    memo: '',
    ratings: {},
    checks: {},
    createdAt: now,
    updatedAt: now,
  };
}

export async function saveProperty(p: Property): Promise<string> {
  const row: Property = { ...p, updatedAt: Date.now() };
  await db.properties.put(row);
  return row.id;
}

export async function patchProperty(id: string, patch: Partial<Property>): Promise<void> {
  await db.properties.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteProperty(id: string): Promise<void> {
  await db.transaction('rw', db.properties, db.photos, async () => {
    await db.photos.where('propertyId').equals(id).delete();
    await db.properties.delete(id);
  });
}

export async function getProperty(id: string): Promise<Property | undefined> {
  return db.properties.get(id);
}

export async function addPhoto(photo: Omit<Photo, 'id'>): Promise<string> {
  const id = nanoid();
  await db.photos.add({ ...photo, id });
  return id;
}

export async function deletePhoto(id: string): Promise<void> {
  await db.photos.delete(id);
}

export async function photosOf(propertyId: string): Promise<Photo[]> {
  const rows = await db.photos.where('propertyId').equals(propertyId).toArray();
  return rows.sort((a, b) => a.takenAt - b.takenAt);
}

/** 목록 행에 쓸 썸네일만 읽는다. 원본 Blob 은 건드리지 않는다. */
export async function thumbsFor(propertyIds: string[]): Promise<Map<string, Blob>> {
  const map = new Map<string, Blob>();
  if (!propertyIds.length) return map;
  const rows = await db.photos.where('propertyId').anyOf(propertyIds).toArray();
  rows.sort((a, b) => a.takenAt - b.takenAt);
  for (const row of rows) {
    if (!map.has(row.propertyId)) map.set(row.propertyId, row.thumbBlob);
  }
  return map;
}

export async function priceRecordsOf(complexKey: string): Promise<PriceRecord[]> {
  const rows = await db.priceRecords.where('complexKey').equals(complexKey).toArray();
  return rows.sort((a, b) => a.dealYearMonth.localeCompare(b.dealYearMonth));
}

export async function putPriceRecords(records: PriceRecord[]): Promise<void> {
  if (!records.length) return;
  await db.priceRecords.bulkPut(records);
}

export async function countProperties(): Promise<number> {
  return db.properties.count();
}

export async function countPhotos(): Promise<number> {
  return db.photos.count();
}
