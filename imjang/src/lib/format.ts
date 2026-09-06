import type { DealType, Property } from '../db/types.ts';

const PYEONG = 3.305785;

/** 만원 단위 정수를 "12억 8,000" 처럼 읽는다. */
export function formatMan(man: number | undefined | null): string {
  if (man == null || !Number.isFinite(man)) return '—';
  const n = Math.round(man);
  if (n === 0) return '0';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const eok = Math.floor(abs / 10000);
  const rest = abs % 10000;
  if (eok === 0) return sign + rest.toLocaleString('ko-KR');
  if (rest === 0) return `${sign}${eok.toLocaleString('ko-KR')}억`;
  return `${sign}${eok.toLocaleString('ko-KR')}억 ${rest.toLocaleString('ko-KR')}`;
}

/** 거래 형태까지 붙인 가격 한 줄. 월세는 "5,000/150". */
export function formatDeal(p: Pick<Property, 'dealType' | 'price' | 'monthlyRent'>): string {
  if (p.dealType === 'monthly') {
    return `${formatMan(p.price)}/${formatMan(p.monthlyRent ?? 0)}`;
  }
  return formatMan(p.price);
}

export function dealPrefix(dealType: DealType): string {
  return dealType === 'sale' ? '매매' : dealType === 'jeonse' ? '전세' : '월세';
}

export function toPyeong(m2: number): number {
  return m2 / PYEONG;
}

export function formatArea(m2: number | undefined | null): string {
  if (m2 == null || !Number.isFinite(m2) || m2 <= 0) return '—';
  return `${round(m2, 2)}㎡`;
}

export function formatAreaWithPyeong(m2: number | undefined | null): string {
  if (m2 == null || !Number.isFinite(m2) || m2 <= 0) return '—';
  return `${round(m2, 2)}㎡ · ${round(toPyeong(m2), 1)}평`;
}

/**
 * 평당가(만원). 면적은 전용면적을 우선 쓰고 없으면 공급면적.
 * 전용/공급이 섞이면 비교가 왜곡되므로, 비교 화면은 어느 쪽을 썼는지 함께 보여준다.
 */
export function pricePerPyeong(price: number, m2: number | undefined | null): number | undefined {
  if (!Number.isFinite(price) || price <= 0) return undefined;
  if (m2 == null || !Number.isFinite(m2) || m2 <= 0) return undefined;
  return price / toPyeong(m2);
}

export function areaForCompare(p: Pick<Property, 'areaExclusive' | 'areaSupply'>): {
  m2?: number;
  basis: '전용' | '공급' | '—';
} {
  if (p.areaExclusive && p.areaExclusive > 0) return { m2: p.areaExclusive, basis: '전용' };
  if (p.areaSupply && p.areaSupply > 0) return { m2: p.areaSupply, basis: '공급' };
  return { basis: '—' };
}

export function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function formatDate(ts: number | undefined | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

/** "202601" -> "26.01" */
export function formatYearMonth(ym: string): string {
  if (!/^\d{6}$/.test(ym)) return ym;
  return `${ym.slice(2, 4)}.${ym.slice(4, 6)}`;
}

export function firstLine(text: string): string {
  const line = text.split('\n').map((s) => s.trim()).find(Boolean);
  return line ?? '';
}

export function formatBytes(bytes: number | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${round(n, n < 10 ? 1 : 0)}${units[i]}`;
}
