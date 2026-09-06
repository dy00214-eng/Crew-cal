import type { PropertyType } from '../db/types.ts';

export interface ChecklistItem {
  /** ratings/checks 의 키. 한 번 정하면 바꾸지 않는다 (기존 기록이 키로 붙어 있다). */
  key: string;
  label: string;
  hint?: string;
}

export interface ChecklistSection {
  key: string;
  title: string;
  items: ChecklistItem[];
}

/** 공통 (전 유형, 1~5 평점) */
export const COMMON_ITEMS: ChecklistItem[] = [
  { key: 'light', label: '채광·향' },
  { key: 'noise', label: '소음' },
  { key: 'damp', label: '결로·곰팡이 흔적', hint: '창틀 아래, 붙박이장 뒤, 천장 모서리' },
  { key: 'water', label: '수압', hint: '주방·욕실 동시에 틀어본다' },
  { key: 'parking', label: '주차' },
  { key: 'transit', label: '역·정류장 거리' },
  { key: 'upkeep', label: '관리상태' },
  { key: 'impression', label: '첫인상' },
];

/** 유형별 추가 항목 */
export const TYPE_ITEMS: Record<PropertyType, ChecklistItem[]> = {
  apartment: [
    { key: 'apt_position', label: '동·층·향 조합' },
    { key: 'apt_view', label: '조망' },
    { key: 'apt_community', label: '커뮤니티 시설' },
    { key: 'apt_parking_ratio', label: '세대당 주차대수' },
    { key: 'apt_redevelop', label: '재건축·리모델링 이슈' },
    { key: 'apt_school', label: '학군' },
  ],
  house: [
    { key: 'house_boundary', label: '대지 경계와 지적도 일치' },
    { key: 'house_age', label: '건물 노후도', hint: '지붕·외벽·기초' },
    { key: 'house_heating', label: '단열·난방 방식' },
    { key: 'house_water', label: '상하수도·정화조' },
    { key: 'house_access', label: '진입로 폭·접도 조건' },
    { key: 'house_illegal', label: '위반건축물 여부' },
    { key: 'house_zoning', label: '토지 용도지역' },
  ],
  villa: [
    { key: 'villa_builder', label: '시공사·건축주' },
    { key: 'villa_units', label: '총 세대수', hint: '적을수록 세대당 관리비 부담이 커진다' },
    { key: 'villa_elevator', label: '엘리베이터' },
    { key: 'villa_manager', label: '관리주체 유무' },
    { key: 'villa_liquidity', label: '환금성 — 인근 실거래 사례 건수' },
    { key: 'villa_landshare', label: '대지지분' },
  ],
};

/** 서류 확인 (단독·빌라만, 체크박스) */
export const DOC_ITEMS: ChecklistItem[] = [
  { key: 'doc_registry', label: '등기부등본' },
  { key: 'doc_building', label: '건축물대장' },
  { key: 'doc_landuse', label: '토지이용계획확인원' },
];

export function checklistFor(type: PropertyType): ChecklistSection[] {
  return [
    { key: 'common', title: '공통', items: COMMON_ITEMS },
    { key: type, title: `${TYPE_SECTION_TITLE[type]} 항목`, items: TYPE_ITEMS[type] },
  ];
}

/** 서류 확인은 단독·빌라만 붙는다. */
export function docChecksFor(type: PropertyType): ChecklistItem[] {
  return type === 'apartment' ? [] : DOC_ITEMS;
}

export function allItemsFor(type: PropertyType): ChecklistItem[] {
  return [...COMMON_ITEMS, ...TYPE_ITEMS[type]];
}

export function itemLabel(type: PropertyType, key: string): string {
  return allItemsFor(type).find((i) => i.key === key)?.label ?? key;
}

const TYPE_SECTION_TITLE: Record<PropertyType, string> = {
  apartment: '아파트',
  house: '단독주택',
  villa: '고급빌라',
};
