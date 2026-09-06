import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PropertyCreator from '../components/PropertyCreator.tsx';
import { emptyProperty } from '../db/repo.ts';
import type { Property } from '../db/types.ts';
import { fetchListing, isNaverUrl, parseShare } from '../parsers/naver.ts';
import type { ParsedListing } from '../parsers/naver.ts';

type Phase = 'parsing' | 'done';

/**
 * 공유로 담기.
 * 파싱이 깨져도 앱은 살아 있어야 한다 — 실패하면 조용히 수동 입력 폼으로 넘어가되
 * URL 과 제목은 채워둔 상태로 둔다. 요청은 건당 1회, 공유라는 사용자 액션에만 붙는다.
 */
export default function SharePage() {
  const [params] = useSearchParams();
  const [phase, setPhase] = useState<Phase>('parsing');
  const [draft, setDraft] = useState<Property>();
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    const run = async () => {
      const shared = {
        url: params.get('url') ?? undefined,
        title: params.get('title') ?? undefined,
        text: params.get('text') ?? undefined,
      };
      let parsed: ParsedListing;
      try {
        parsed = parseShare(shared);
      } catch {
        parsed = { filled: 0, warnings: ['공유 내용을 읽지 못했습니다.'], sourceUrl: shared.url };
      }

      // 공유 텍스트만으로 부족하면 링크 한 건만 더 시도한다.
      if (parsed.sourceUrl && parsed.filled < 4 && isNaverUrl(parsed.sourceUrl)) {
        const fetched = await fetchListing(parsed.sourceUrl, controller.signal);
        if (fetched.filled > parsed.filled) {
          parsed = { ...fetched, warnings: [...parsed.warnings, ...fetched.warnings] };
        } else {
          parsed = { ...parsed, warnings: [...parsed.warnings, ...fetched.warnings] };
        }
      }

      if (!alive) return;
      setDraft(applyParsed(parsed));
      setWarnings(parsed.warnings);
      setPhase('done');
    };

    void run();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [params]);

  if (phase === 'parsing' || !draft) {
    return (
      <main className="main">
        <p className="empty">공유받은 매물을 읽는 중…</p>
      </main>
    );
  }

  return (
    <PropertyCreator
      initial={draft}
      title="공유로 담기"
      note={
        warnings.length > 0 ? (
          <div className="note">
            <strong>자동으로 다 채우지 못했습니다.</strong>
            <br />
            {warnings.map((w, i) => (
              <span key={i}>
                {w}
                <br />
              </span>
            ))}
          </div>
        ) : (
          <div className="note">가져온 값이 맞는지 확인하고 저장하세요.</div>
        )
      }
    />
  );
}

function applyParsed(parsed: ParsedListing): Property {
  const base = emptyProperty(parsed.type ?? 'apartment');
  return {
    ...base,
    title: parsed.title ?? '',
    address: parsed.address ?? '',
    price: parsed.price ?? 0,
    monthlyRent: parsed.monthlyRent,
    dealType: parsed.dealType ?? 'sale',
    areaSupply: parsed.areaSupply,
    areaExclusive: parsed.areaExclusive,
    floor: parsed.floor,
    direction: parsed.direction,
    complexName: parsed.complexName,
    sourceUrl: parsed.sourceUrl,
    sourceCapturedAt: parsed.sourceUrl ? Date.now() : undefined,
  };
}
