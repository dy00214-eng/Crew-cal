/**
 * 네이버 부동산 파싱 — 이 파일 하나에 격리한다.
 *
 * 네이버가 페이지 구조를 바꾸면 파싱은 반드시 깨진다. 깨졌을 때 앱이 죽으면 안 되고,
 * 조용히 수동 입력 폼으로 넘어가되 URL 과 제목은 채워둔 상태여야 한다.
 * 그래서 이 파일의 모든 함수는 예외를 밖으로 던지지 않고 warnings 에 담아 돌려준다.
 * 나중에 파싱이 깨지면 이 파일만 고치면 된다.
 */
import type { DealType, PropertyType } from '../db/types.ts';

export interface ParsedListing {
  title?: string;
  address?: string;
  complexName?: string;
  price?: number; // 만원
  monthlyRent?: number; // 만원
  dealType?: DealType;
  areaSupply?: number;
  areaExclusive?: number;
  floor?: string;
  direction?: string;
  type?: PropertyType;
  sourceUrl?: string;
  /** 채워진 항목 수. 0 이면 사실상 실패다. */
  filled: number;
  warnings: string[];
}

export interface ShareInput {
  url?: string;
  title?: string;
  text?: string;
}

const AREA_UNIT = '(?:㎡|m²|m2)';

const SIDO =
  '서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주';
/** "서울 강남구 개포동", "경기 성남시 분당구 정자동" 같은 조각만 집는다. */
const ADDRESS_RE = new RegExp(
  `(?:(?:${SIDO})[가-힣]*\\s*)?[가-힣]{2,10}[시군구]\\s*(?:[가-힣]{2,10}구\\s*)?[가-힣0-9]+[동읍면로길][0-9-]*`,
);

/** "12억 8,000" / "3억5천" / "8,000" 을 만원 단위 숫자로 읽는다. */
export function parseKoreanMoney(input: string): number | undefined {
  const s = input.replace(/\s+/g, '').replace(/원$/, '');
  if (!s) return undefined;

  let man = 0;
  let matched = false;

  const eok = s.match(/(\d+(?:\.\d+)?)억/);
  if (eok?.[1]) {
    man += Number(eok[1]) * 10000;
    matched = true;
  }

  const rest = eok ? s.slice(s.indexOf(eok[0]) + eok[0].length) : s;
  const chunk = rest.match(/(\d[\d,]*(?:\.\d+)?)(천|백)?만?/);
  if (chunk?.[1]) {
    const n = Number(chunk[1].replace(/,/g, ''));
    if (Number.isFinite(n)) {
      const scale = chunk[2] === '천' ? 1000 : chunk[2] === '백' ? 100 : 1;
      man += n * scale;
      matched = true;
    }
  }

  if (!matched) return undefined;
  const rounded = Math.round(man);
  return rounded > 0 ? rounded : undefined;
}

/** 공유로 받은 제목·본문·URL 에서 읽을 수 있는 만큼 읽는다. */
export function parseShare(input: ShareInput): ParsedListing {
  const url = pickUrl(input);
  const text = [input.title, input.text].filter(Boolean).join('\n');
  const parsed = parseListingText(text);
  if (url) parsed.sourceUrl = url;
  if (!parsed.title && input.title) {
    parsed.title = cleanTitle(input.title);
    parsed.filled += parsed.title ? 1 : 0;
  }
  return parsed;
}

/** 매물 설명 텍스트에서 값을 뽑는다. 순수 함수라 테스트로 고정해 둔다. */
export function parseListingText(raw: string): ParsedListing {
  const out: ParsedListing = { filled: 0, warnings: [] };
  const text = (raw ?? '').replace(/ /g, ' ').trim();
  if (!text) {
    out.warnings.push('읽을 내용이 없습니다.');
    return out;
  }

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // 유형
  if (/아파트/.test(text)) out.type = 'apartment';
  else if (/(빌라|연립|다세대|타운하우스)/.test(text)) out.type = 'villa';
  else if (/(단독|다가구|전원주택)/.test(text)) out.type = 'house';

  // 거래 형태
  if (/월세/.test(text)) out.dealType = 'monthly';
  else if (/전세/.test(text)) out.dealType = 'jeonse';
  else if (/(매매|분양권)/.test(text)) out.dealType = 'sale';

  // 층: "15/25층", "15층/25층", "중층"
  const floorPair = text.match(/(\d+)\s*층?\s*\/\s*(\d+)\s*층/);
  const floorWord = text.match(/(저층|중층|고층|탑층|반지하|옥탑)/);
  const floorOne = text.match(/(?:^|[\s,·|(])(-?\d+)\s*층/);
  if (floorPair) out.floor = `${floorPair[1]}/${floorPair[2]}`;
  else if (floorWord) out.floor = floorWord[1];
  else if (floorOne) out.floor = `${floorOne[1]}층`;

  // 면적: "114.68/84.98㎡" 는 공급/전용
  const areaPair = text.match(
    new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${AREA_UNIT}?\\s*/\\s*(\\d+(?:\\.\\d+)?)\\s*${AREA_UNIT}`),
  );
  const areaExc = text.match(new RegExp(`전용\\D{0,4}(\\d+(?:\\.\\d+)?)\\s*${AREA_UNIT}`));
  const areaSup = text.match(new RegExp(`공급\\D{0,4}(\\d+(?:\\.\\d+)?)\\s*${AREA_UNIT}`));
  const areaAny = text.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${AREA_UNIT}`));
  if (areaPair) {
    out.areaSupply = Number(areaPair[1]);
    out.areaExclusive = Number(areaPair[2]);
  }
  if (areaSup?.[1]) out.areaSupply = Number(areaSup[1]);
  if (areaExc?.[1]) out.areaExclusive = Number(areaExc[1]);
  if (!out.areaSupply && !out.areaExclusive && areaAny?.[1]) {
    out.areaSupply = Number(areaAny[1]);
    out.warnings.push('면적이 공급인지 전용인지 알 수 없어 공급면적에 넣었습니다. 확인하세요.');
  }

  // 향
  const dir = text.match(/(남동|남서|북동|북서|남|북|동|서)향/);
  if (dir) out.direction = `${dir[1]}향`;

  // 가격
  const price = parsePrice(text);
  if (price) {
    out.price = price.price;
    if (price.monthlyRent != null) out.monthlyRent = price.monthlyRent;
    if (price.dealType && !out.dealType) out.dealType = price.dealType;
    if (price.dealType === 'monthly') out.dealType = 'monthly';
  }

  // 주소: 시/도 + 시·군·구 + 동/읍/면/로/길 조각만 떼어낸다.
  // 한 줄에 가격·면적이 다 섞여 오는 경우가 많아, 줄 전체를 주소로 쓰면 안 된다.
  const addr = text.match(ADDRESS_RE)?.[0]?.replace(/\s{2,}/g, ' ').trim();
  if (addr) out.address = addr.slice(0, 120);
  else {
    const line = lines.find((l) => l.length <= 40 && /[가-힣]+[시군구]\s*[가-힣0-9]+[동읍면로길]/.test(l));
    if (line) out.address = line.slice(0, 120);
  }

  // 제목·단지명: 첫 줄을 제목으로 쓰고, 거기서 단지명을 뽑는다
  const first = lines[0];
  if (first) out.title = cleanTitle(first);
  const complex = text.match(/([가-힣A-Za-z0-9]{2,20}(?:아파트|자이|푸르지오|래미안|힐스테이트|e편한세상|아이파크|더샵|롯데캐슬|SK뷰|호반베르디움))/);
  if (complex) out.complexName = complex[1];
  else if (out.title) out.complexName = out.title.split(/[\s·,]/)[0];

  out.filled = countFilled(out);
  return out;
}

interface ParsedPrice {
  price: number;
  monthlyRent?: number;
  dealType?: DealType;
}

/** 가격 한 조각. 월세는 "보증금/월세" 형태를 함께 읽는다. */
export function parsePrice(text: string): ParsedPrice | undefined {
  // 월세: "5,000/150", "보증금 5000 월 150"
  // 면적쌍("114.68/84.98㎡")과 층("15/25층")을 먼저 걷어내야 보증금/월세만 남는다.
  const cleaned = text
    .replace(/\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?\s*(?:㎡|m²|m2)/g, ' ')
    .replace(/\d+\s*\/\s*\d+\s*층/g, ' ')
    .replace(/\d+\.\d+/g, ' ');
  const slash = cleaned.match(/(\d[\d,]*)\s*\/\s*(\d[\d,]*)/);
  const monthlyWord = text.match(/월\s*세?\s*(\d[\d,]*)\s*만?/);
  const depositWord = text.match(/보증금\s*([\d,억천만.\s]+)/);

  if (/월세/.test(text)) {
    // "5,000/150" 처럼 슬래시로 온 쪽이 가장 정확하다. 말로 쓴 값은 그 다음.
    const deposit = slash?.[1]
      ? parseKoreanMoney(slash[1])
      : depositWord?.[1]
        ? parseKoreanMoney(depositWord[1])
        : undefined;
    const rent = slash?.[2]
      ? parseKoreanMoney(slash[2])
      : monthlyWord?.[1]
        ? parseKoreanMoney(monthlyWord[1])
        : undefined;
    if (deposit != null) return { price: deposit, monthlyRent: rent, dealType: 'monthly' };
  }

  const labeled = text.match(/(매매|전세)\s*([\d,]+억[\d,천백만\s]*|[\d,]+\s*만?원?|[\d.]+억)/);
  if (labeled?.[2]) {
    const value = parseKoreanMoney(labeled[2]);
    if (value != null) {
      return { price: value, dealType: labeled[1] === '매매' ? 'sale' : 'jeonse' };
    }
  }

  const eok = text.match(/\d+(?:\.\d+)?억(?:\s*[\d,]+)?/);
  if (eok) {
    const value = parseKoreanMoney(eok[0]);
    if (value != null) return { price: value };
  }

  const man = text.match(/([\d,]{3,})\s*만원/);
  if (man?.[1]) {
    const value = parseKoreanMoney(man[1]);
    if (value != null) return { price: value };
  }

  return undefined;
}

/** HTML 에서 og 메타와 눈에 띄는 JSON 값을 긁는다. 실패해도 던지지 않는다. */
export function parseFromHtml(html: string, url?: string): ParsedListing {
  const og = (prop: string): string | undefined => {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`,
      'i',
    );
    const alt = new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`,
      'i',
    );
    return html.match(re)?.[1] ?? html.match(alt)?.[1];
  };

  const title = og('og:title') ?? html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
  const desc = og('og:description') ?? og('description');
  const parsed = parseListingText([title, desc].filter(Boolean).join('\n'));

  // 페이지에 JSON 이 섞여 있으면 몇 개는 그대로 쓸 수 있다.
  const json = {
    articleName: pickJson(html, 'articleName'),
    tradeTypeName: pickJson(html, 'tradeTypeName'),
    dealOrWarrantPrc: pickJson(html, 'dealOrWarrantPrc'),
    rentPrc: pickJson(html, 'rentPrc'),
    area1: pickJson(html, 'area1'),
    area2: pickJson(html, 'area2'),
    floorInfo: pickJson(html, 'floorInfo'),
    direction: pickJson(html, 'direction'),
    exposureAddress: pickJson(html, 'exposureAddress'),
  };

  if (json.articleName) {
    parsed.title = cleanTitle(json.articleName);
    parsed.complexName = parsed.complexName ?? json.articleName.split(/[\s·,]/)[0];
  }
  if (json.exposureAddress) parsed.address = json.exposureAddress;
  if (json.tradeTypeName) {
    parsed.dealType =
      json.tradeTypeName === '월세' ? 'monthly' : json.tradeTypeName === '전세' ? 'jeonse' : 'sale';
  }
  if (json.dealOrWarrantPrc) {
    const value = parseKoreanMoney(json.dealOrWarrantPrc);
    if (value != null) parsed.price = value;
  }
  if (json.rentPrc) {
    const value = parseKoreanMoney(json.rentPrc);
    if (value != null) parsed.monthlyRent = value;
  }
  if (json.area1 && Number(json.area1) > 0) parsed.areaSupply = Number(json.area1);
  if (json.area2 && Number(json.area2) > 0) parsed.areaExclusive = Number(json.area2);
  if (json.floorInfo) parsed.floor = json.floorInfo.replace(/\s/g, '');
  if (json.direction) parsed.direction = json.direction;

  if (url) parsed.sourceUrl = url;
  parsed.filled = countFilled(parsed);
  return parsed;
}

/**
 * URL 한 건만 가져와 파싱한다. 순회하지 않고, 자동 재시도도 하지 않는다.
 * 브라우저에서 네이버는 CORS 를 열어주지 않는 경우가 많다. 그때는 조용히 실패로 돌려준다.
 */
export async function fetchListing(url: string, signal?: AbortSignal): Promise<ParsedListing> {
  const fallback: ParsedListing = { sourceUrl: url, filled: 0, warnings: [] };
  if (!isNaverUrl(url)) {
    fallback.warnings.push('네이버 부동산 링크가 아니라 직접 입력으로 넘어갑니다.');
    return fallback;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    fallback.warnings.push('오프라인이라 매물 정보를 가져오지 못했습니다. 아래에 직접 적어 두세요.');
    return fallback;
  }
  try {
    const res = await fetch(url, { credentials: 'omit', redirect: 'follow', signal });
    if (!res.ok) {
      fallback.warnings.push(`매물 페이지를 읽지 못했습니다 (${res.status}). 직접 입력으로 넘어갑니다.`);
      return fallback;
    }
    const html = await res.text();
    const parsed = parseFromHtml(html, url);
    if (!parsed.filled) {
      parsed.warnings.push('페이지 구조가 바뀐 것 같습니다. 직접 입력으로 넘어갑니다.');
    }
    return parsed;
  } catch {
    fallback.warnings.push(
      '브라우저가 네이버 페이지를 직접 읽지 못했습니다(보안 정책). 링크는 저장해 두었으니 나머지는 직접 적으세요.',
    );
    return fallback;
  }
}

export function isNaverUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return /(^|\.)naver\.(com|me)$/.test(host);
  } catch {
    return false;
  }
}

/** 공유 텍스트 안에 URL 만 섞여 오는 경우가 흔하다. */
export function pickUrl(input: ShareInput): string | undefined {
  if (input.url && /^https?:\/\//.test(input.url.trim())) return input.url.trim();
  const found = [input.text, input.title]
    .filter(Boolean)
    .join(' ')
    .match(/https?:\/\/[^\s"']+/);
  return found?.[0];
}

export function cleanTitle(title: string): string {
  return title
    .replace(/\s*[:|-]\s*네이버\s*부동산.*$/i, '')
    .replace(/\s*네이버부동산\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 80);
}

function pickJson(html: string, key: string): string | undefined {
  // 따옴표로 감싼 값("9억 5,000")과 맨 숫자(114.5) 둘 다 받는다.
  const m = html.match(new RegExp(`"${key}"\\s*:\\s*(?:"([^"]*)"|([^,}\\s]+))`));
  const v = (m?.[1] ?? m?.[2])?.trim();
  return v && v !== 'null' ? v : undefined;
}

function countFilled(p: ParsedListing): number {
  const keys: (keyof ParsedListing)[] = [
    'title',
    'address',
    'price',
    'dealType',
    'areaSupply',
    'areaExclusive',
    'floor',
    'direction',
    'type',
  ];
  return keys.filter((k) => p[k] != null && p[k] !== '').length;
}
