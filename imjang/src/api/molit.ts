/**
 * 국토교통부 실거래가 (공공데이터포털) 연동.
 *
 * - 키는 .env 의 VITE_MOLIT_KEY 로 넣는다. 커밋하지 않는다.
 * - 사용자가 "실거래가 불러오기" 를 누를 때만 호출한다. 자동 갱신·재시도 없다.
 * - 결과는 priceRecords 에 캐시하므로, 이후엔 오프라인에서도 그래프가 보인다.
 */
import { nanoid } from 'nanoid';
import type { PriceRecord, PropertyType } from '../db/types.ts';

const BASE = (import.meta.env?.VITE_MOLIT_BASE as string | undefined) ?? 'https://apis.data.go.kr/1613000';
const KEY = import.meta.env?.VITE_MOLIT_KEY as string | undefined;

const ENDPOINT: Record<PropertyType, string> = {
  apartment: 'RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade',
  house: 'RTMSDataSvcSHTrade/getRTMSDataSvcSHTrade',
  villa: 'RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade',
};

export interface MolitItem {
  name: string;
  price: number; // 만원
  areaExclusive: number;
  floor: number;
  dealYearMonth: string; // "202601"
}

export interface MolitFetchResult {
  records: PriceRecord[];
  fetched: number; // 받아온 거래 건수
  matched: number; // 단지명으로 걸러낸 건수
  warnings: string[];
}

export function hasApiKey(): boolean {
  return Boolean(KEY && KEY.trim());
}

/** 최근 N개월치를 한 번에 훑는다. 월별로 요청이 나뉘는 것은 API 구조 때문이다. */
export async function fetchPriceRecords(opts: {
  type: PropertyType;
  lawdCd: string;
  complexKey: string;
  complexName?: string;
  months?: number;
  signal?: AbortSignal;
}): Promise<MolitFetchResult> {
  const out: MolitFetchResult = { records: [], fetched: 0, matched: 0, warnings: [] };
  if (!hasApiKey()) {
    out.warnings.push('실거래가 API 키가 없습니다. .env 에 VITE_MOLIT_KEY 를 넣고 다시 빌드하세요.');
    return out;
  }
  if (!/^\d{5}$/.test(opts.lawdCd)) {
    out.warnings.push('법정동코드(앞 5자리)가 필요합니다.');
    return out;
  }

  const months = opts.months ?? 12;
  const now = new Date();
  const fetchedAt = Date.now();

  for (let i = 0; i < months; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    const url =
      `${BASE}/${ENDPOINT[opts.type]}?serviceKey=${encodeURIComponent(KEY ?? '')}` +
      `&LAWD_CD=${opts.lawdCd}&DEAL_YMD=${ym}&numOfRows=200&pageNo=1`;
    try {
      const res = await fetch(url, { signal: opts.signal });
      if (!res.ok) {
        out.warnings.push(`${ym} 조회 실패 (${res.status})`);
        continue;
      }
      const xml = await res.text();
      const parsed = parseMolitXml(xml);
      if (parsed.error) {
        out.warnings.push(`${ym}: ${parsed.error}`);
        continue;
      }
      out.fetched += parsed.items.length;
      const wanted = normalizeName(opts.complexName);
      for (const item of parsed.items) {
        if (wanted && !normalizeName(item.name).includes(wanted)) continue;
        out.matched += 1;
        out.records.push({
          id: nanoid(),
          complexKey: opts.complexKey,
          dealYearMonth: item.dealYearMonth || ym,
          price: item.price,
          areaExclusive: item.areaExclusive,
          floor: item.floor,
          fetchedAt,
        });
      }
    } catch {
      out.warnings.push(
        '브라우저에서 실거래가 서버에 닿지 못했습니다. (CORS 차단이면 VITE_MOLIT_BASE 로 프록시를 지정하세요)',
      );
      break;
    }
  }

  if (!out.matched) {
    out.warnings.push(
      opts.type === 'apartment'
        ? '이 조건에 맞는 실거래 사례가 없습니다. 단지명·법정동코드를 확인하세요.'
        : '이 지역 실거래 사례가 적습니다. 단독·빌라는 원래 데이터가 희박하고, 그 자체가 환금성 판단에 쓰이는 정보입니다.',
    );
  }
  return out;
}

/** XML 응답 파싱. DOMParser 없이 돌아가야 테스트에서도 쓴다. */
export function parseMolitXml(xml: string): { items: MolitItem[]; error?: string } {
  const code = tag(xml, 'resultCode');
  if (code && !/^0*0$|^00$|^000$/.test(code.trim())) {
    return { items: [], error: tag(xml, 'resultMsg') ?? `오류 코드 ${code}` };
  }
  if (/<OpenAPI_ServiceResponse|<returnReasonCode>/i.test(xml)) {
    const msg = tag(xml, 'returnAuthMsg') ?? tag(xml, 'errMsg') ?? '실거래가 서비스가 오류를 돌려줬습니다.';
    return { items: [], error: msg };
  }

  const items: MolitItem[] = [];
  for (const block of xml.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
    const price = toNumber(tag(block, 'dealAmount'));
    const year = tag(block, 'dealYear');
    const month = tag(block, 'dealMonth');
    const area = toNumber(tag(block, 'excluUseAr') ?? tag(block, 'totalFloorAr') ?? tag(block, 'plottageAr'));
    const floor = toNumber(tag(block, 'floor'));
    const name =
      tag(block, 'aptNm') ?? tag(block, 'mhouseNm') ?? tag(block, 'houseType') ?? tag(block, 'umdNm') ?? '';
    if (price == null || !year || !month) continue;
    items.push({
      name: name.trim(),
      price,
      areaExclusive: area ?? 0,
      floor: floor ?? 0,
      dealYearMonth: `${year.trim()}${month.trim().padStart(2, '0')}`,
    });
  }
  return { items };
}

function tag(xml: string, name: string): string | undefined {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
}

function toNumber(v: string | undefined): number | undefined {
  if (v == null) return undefined;
  const n = Number(v.replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function normalizeName(name: string | undefined): string {
  return (name ?? '').replace(/\s|아파트|주공|APT/gi, '').trim();
}
