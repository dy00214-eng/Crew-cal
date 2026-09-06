export type PropertyType = 'apartment' | 'house' | 'villa';
export type Status = 'candidate' | 'visited' | 'rejected';
export type DealType = 'sale' | 'jeonse' | 'monthly';

export interface Property {
  id: string; // nanoid
  type: PropertyType;
  status: Status;

  // 기본 정보
  title: string; // "○○아파트 101동 1503호"
  address: string;
  price: number; // 매매가/보증금 (만원)
  monthlyRent?: number; // 월세 (만원)
  dealType: DealType;
  areaSupply?: number; // 공급면적 ㎡
  areaExclusive?: number; // 전용면적 ㎡
  floor?: string; // "15/25"
  direction?: string; // "남향"

  sourceUrl?: string; // 네이버 부동산 원본 링크
  sourceCapturedAt?: number;

  // 내가 채우는 것
  memo: string;
  ratings: Record<string, number>; // 체크리스트 항목별 1~5
  checks: Record<string, boolean>; // 서류 확인 체크박스
  visitedAt?: number;
  overallScore?: number; // 1~5, 직접 입력

  createdAt: number;
  updatedAt: number;

  // 실거래가 조회용 (스펙의 complexKey = 법정동코드 + 단지명 을 두 조각으로 들고 있는다)
  lawdCd?: string; // 법정동코드 앞 5자리
  complexName?: string; // 단지명 / 아파트명

  // 지도 위 위치. 직접 핀을 찍어 넣는다 (오프라인에서도 되어야 하므로 주소 자동 변환은 쓰지 않는다)
  lat?: number;
  lng?: number;
}

export interface Photo {
  id: string;
  propertyId: string;
  blob: Blob; // 리사이즈 완료된 JPEG
  thumbBlob: Blob; // 목록용 소형 썸네일
  caption?: string;
  takenAt: number;
}

export interface PriceRecord {
  id: string;
  complexKey: string; // 단지 식별 키 (법정동코드+단지명)
  dealYearMonth: string; // "202601"
  price: number; // 만원
  areaExclusive: number;
  floor: number;
  fetchedAt: number;
}

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  apartment: '아파트',
  house: '단독주택',
  villa: '고급빌라',
};

export const STATUS_LABEL: Record<Status, string> = {
  candidate: '후보',
  visited: '방문완료',
  rejected: '제외',
};

export const DEAL_TYPE_LABEL: Record<DealType, string> = {
  sale: '매매',
  jeonse: '전세',
  monthly: '월세',
};

/** 법정동코드 + 단지명 으로 단지 식별 키를 만든다. */
export function complexKeyOf(lawdCd?: string, complexName?: string): string | undefined {
  const code = (lawdCd ?? '').trim();
  const name = (complexName ?? '').trim();
  if (!code || !name) return undefined;
  return `${code}:${name}`;
}
