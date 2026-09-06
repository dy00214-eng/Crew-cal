import { useLiveQuery } from 'dexie-react-hooks';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PropertyForm from '../components/PropertyForm.tsx';
import Rating from '../components/Rating.tsx';
import TopBar from '../components/TopBar.tsx';
import { fetchPriceRecords, hasApiKey } from '../api/molit.ts';
import { checklistFor, docChecksFor } from '../config/checklists.ts';
import {
  addPhoto,
  deletePhoto,
  deleteProperty,
  getProperty,
  patchProperty,
  photosOf,
  priceRecordsOf,
  putPriceRecords,
  saveProperty,
} from '../db/repo.ts';
import { DEAL_TYPE_LABEL, PROPERTY_TYPE_LABEL, STATUS_LABEL, complexKeyOf } from '../db/types.ts';
import type { Property, Status } from '../db/types.ts';
import {
  areaForCompare,
  formatArea,
  formatAreaWithPyeong,
  formatDate,
  formatDeal,
  formatMan,
  pricePerPyeong,
  round,
} from '../lib/format.ts';
import { processImage } from '../lib/photos.ts';
import { useObjectUrls } from '../lib/useObjectUrl.ts';
import { useOnline } from '../lib/useOnline.ts';

// 차트(recharts)는 이 화면에서만 쓴다. 앱 첫 진입이 무거워지지 않게 따로 떼어 둔다.
const PriceChart = lazy(() => import('../components/PriceChart.tsx'));

const STATUSES: { value: Status; label: string }[] = [
  { value: 'candidate', label: '후보' },
  { value: 'visited', label: '방문완료' },
  { value: 'rejected', label: '제외' },
];

export default function DetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const online = useOnline();

  // 없는 매물과 '아직 읽는 중'을 구분해야 해서 null 로 눌러 준다.
  const property = useLiveQuery(async () => (await getProperty(id)) ?? null, [id]);
  const photos = useLiveQuery(() => photosOf(id), [id]);
  const complexKey = complexKeyOf(property?.lawdCd, property?.complexName);
  const records = useLiveQuery(
    () => (complexKey ? priceRecordsOf(complexKey) : Promise.resolve([])),
    [complexKey],
  );

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Property>();
  const [busy, setBusy] = useState<string>();
  const [priceNote, setPriceNote] = useState<string>();

  if (property === undefined) {
    return (
      <>
        <TopBar title="매물" back="/" />
        <main className="main" />
      </>
    );
  }
  if (property === null) {
    return (
      <>
        <TopBar title="매물" back="/" />
        <p className="empty">지워졌거나 없는 매물입니다.</p>
      </>
    );
  }

  const p = property;
  const area = areaForCompare(p);
  const perPyeong = pricePerPyeong(p.price, area.m2);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(`사진 ${files.length}장 처리 중…`);
    try {
      for (const file of Array.from(files)) {
        try {
          const processed = await processImage(file);
          await addPhoto({
            propertyId: p.id,
            blob: processed.blob,
            thumbBlob: processed.thumbBlob,
            takenAt: Date.now(),
          });
        } catch {
          setBusy('사진 한 장을 읽지 못해 건너뛰었습니다.');
        }
      }
    } finally {
      setTimeout(() => setBusy(undefined), 600);
    }
  };

  const loadPrices = async () => {
    if (!complexKey || !p.lawdCd) return;
    setBusy('실거래가 불러오는 중…');
    setPriceNote(undefined);
    try {
      const result = await fetchPriceRecords({
        type: p.type,
        lawdCd: p.lawdCd,
        complexKey,
        complexName: p.complexName,
        months: 24,
      });
      await putPriceRecords(result.records);
      setPriceNote(
        result.matched > 0
          ? `${result.matched}건을 저장했습니다. 이제 오프라인에서도 보입니다.`
          : result.warnings.join(' '),
      );
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <>
      <TopBar
        title={p.title || '이름 없는 매물'}
        back="/"
        right={
          <button type="button" onClick={() => (setEditing((v) => !v), setDraft(p))}>
            {editing ? '닫기' : '수정'}
          </button>
        }
      />
      {busy && <div className="note">{busy}</div>}

      <main className="main">
        <Carousel photos={photos ?? []} />

        <section className="section">
          <table className="facts num">
            <tbody>
              <tr>
                <th>거래</th>
                <td>
                  {DEAL_TYPE_LABEL[p.dealType]} {formatDeal(p)}
                </td>
              </tr>
              <tr>
                <th>평당가</th>
                <td>{perPyeong ? `${formatMan(round(perPyeong, 0))} / 평 (${area.basis})` : '—'}</td>
              </tr>
              <tr>
                <th>면적</th>
                <td>
                  공급 {formatArea(p.areaSupply)} · 전용 {formatAreaWithPyeong(p.areaExclusive)}
                </td>
              </tr>
              <tr>
                <th>층·향</th>
                <td>
                  {p.floor ?? '—'} · {p.direction ?? '—'}
                </td>
              </tr>
              <tr>
                <th>주소</th>
                <td>{p.address || '—'}</td>
              </tr>
              <tr>
                <th>유형</th>
                <td>{PROPERTY_TYPE_LABEL[p.type]}</td>
              </tr>
              <tr>
                <th>방문일</th>
                <td>{formatDate(p.visitedAt)}</td>
              </tr>
            </tbody>
          </table>
          {p.sourceUrl && (
            <p style={{ marginBottom: 0 }}>
              <a href={p.sourceUrl} target="_blank" rel="noreferrer">
                네이버에서 열기 ↗
              </a>
            </p>
          )}
        </section>

        <section className="section">
          <h2>상태</h2>
          <div className="choices">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                className="choice"
                aria-pressed={p.status === s.value}
                onClick={() =>
                  void patchProperty(p.id, {
                    status: s.value,
                    visitedAt: s.value === 'visited' ? (p.visitedAt ?? Date.now()) : p.visitedAt,
                  })
                }
              >
                {STATUS_LABEL[s.value]}
              </button>
            ))}
          </div>
        </section>

        <MemoSection property={p} />

        <section className="section">
          <h2>사진</h2>
          <PhotoGrid photos={photos ?? []} />
          <div className="field-row" style={{ marginTop: 12 }}>
            <label className="btn">
              카메라
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => {
                  void onFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
            <label className="btn">
              갤러리
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  void onFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <p className="hint">긴 변 1600px JPEG 로 줄여 저장합니다. 원본은 남기지 않습니다.</p>
        </section>

        {checklistFor(p.type).map((section) => (
          <section className="section" key={section.key}>
            <h2>체크리스트 · {section.title}</h2>
            {section.items.map((item) => (
              <Rating
                key={item.key}
                label={item.label}
                hint={item.hint}
                value={p.ratings[item.key]}
                onChange={(next) => {
                  const ratings = { ...p.ratings };
                  if (next == null) delete ratings[item.key];
                  else ratings[item.key] = next;
                  void patchProperty(p.id, { ratings });
                }}
              />
            ))}
          </section>
        ))}

        {docChecksFor(p.type).length > 0 && (
          <section className="section">
            <h2>서류 확인</h2>
            {docChecksFor(p.type).map((item) => (
              <label className="check" key={item.key}>
                <input
                  type="checkbox"
                  checked={Boolean(p.checks[item.key])}
                  onChange={(e) => void patchProperty(p.id, { checks: { ...p.checks, [item.key]: e.target.checked } })}
                />
                {item.label}
              </label>
            ))}
          </section>
        )}

        <section className="section">
          <h2>총평</h2>
          <Rating
            label="이 집, 전체적으로"
            value={p.overallScore}
            onChange={(next) => void patchProperty(p.id, { overallScore: next })}
          />
        </section>

        <section className="section">
          <h2>실거래가 추이</h2>
          {records && records.length > 0 ? (
            <Suspense fallback={<p className="chart-empty">그래프 그리는 중…</p>}>
              <PriceChart records={records} />
            </Suspense>
          ) : (
            <p className="chart-empty">
              {complexKey
                ? '저장된 실거래가가 없습니다.'
                : '단지명과 법정동코드를 입력하면 실거래가를 불러올 수 있습니다. (수정 → 실거래가 조회용)'}
            </p>
          )}
          {priceNote && <p className="hint">{priceNote}</p>}
          <button
            type="button"
            className="btn btn-small"
            disabled={!online || !complexKey || !hasApiKey()}
            onClick={() => void loadPrices()}
          >
            {online ? '실거래가 불러오기' : '온라인일 때 불러오기'}
          </button>
          {!hasApiKey() && <p className="hint">API 키(VITE_MOLIT_KEY)가 없어 조회는 꺼져 있습니다.</p>}
        </section>

        {editing && draft && (
          <>
            <section className="section">
              <h2>기본 정보 수정</h2>
            </section>
            <PropertyForm value={draft} onChange={setDraft} showStatus />
            <div className="section">
              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  await saveProperty(draft);
                  setEditing(false);
                }}
              >
                수정 내용 저장
              </button>
            </div>
          </>
        )}

        <section className="section">
          <button
            type="button"
            className="btn btn-danger"
            onClick={async () => {
              if (!confirm('이 매물과 사진을 모두 지웁니다. 되돌릴 수 없습니다.')) return;
              await deleteProperty(p.id);
              navigate('/', { replace: true });
            }}
          >
            매물 삭제
          </button>
        </section>
      </main>
    </>
  );
}

/** 임장 메모 — 자유 텍스트, 자동 저장. */
function MemoSection({ property }: { property: Property }) {
  const [text, setText] = useState(property.memo);
  const [saved, setSaved] = useState(true);
  const idRef = useRef(property.id);

  useEffect(() => {
    if (idRef.current !== property.id) {
      idRef.current = property.id;
      setText(property.memo);
    }
  }, [property.id, property.memo]);

  useEffect(() => {
    if (text === property.memo) {
      setSaved(true);
      return;
    }
    setSaved(false);
    const timer = setTimeout(() => {
      void patchProperty(property.id, { memo: text }).then(() => setSaved(true));
    }, 500);
    return () => clearTimeout(timer);
  }, [text, property.id, property.memo]);

  return (
    <section className="section">
      <h2>임장 메모 {saved ? '' : '· 저장 중'}</h2>
      <div className="field">
        <textarea
          aria-label="임장 메모"
          value={text}
          placeholder="지금 눈에 보이는 것부터 적는다. 나중에 기억나지 않는다."
          onChange={(e) => setText(e.target.value)}
        />
      </div>
    </section>
  );
}

function Carousel({ photos }: { photos: { id: string; blob: Blob }[] }) {
  const blobs = useMemo(() => photos.map((p) => p.blob), [photos]);
  const urls = useObjectUrls(blobs);
  if (!urls.length) return null;
  return (
    <div className="carousel">
      {urls.map((url, i) => (
        <img key={photos[i]?.id ?? i} src={url} alt="" />
      ))}
    </div>
  );
}

function PhotoGrid({ photos }: { photos: { id: string; thumbBlob: Blob }[] }) {
  const blobs = useMemo(() => photos.map((p) => p.thumbBlob), [photos]);
  const urls = useObjectUrls(blobs);
  if (!photos.length) return <p className="hint">아직 사진이 없습니다.</p>;
  return (
    <div className="photos">
      {photos.map((photo, i) => (
        <figure key={photo.id}>
          {urls[i] && <img src={urls[i]} alt="" loading="lazy" decoding="async" />}
          <button
            type="button"
            aria-label="사진 삭제"
            onClick={() => {
              if (confirm('이 사진을 지웁니다.')) void deletePhoto(photo.id);
            }}
          >
            삭제
          </button>
        </figure>
      ))}
    </div>
  );
}
