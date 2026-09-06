import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Choices from '../components/Choices.tsx';
import Thumb from '../components/Thumb.tsx';
import TopBar from '../components/TopBar.tsx';
import { DEFAULT_FILTER, listProperties, thumbsFor } from '../db/repo.ts';
import type { ListFilter, SortKey } from '../db/repo.ts';
import type { Property, PropertyType, Status } from '../db/types.ts';
import { dealPrefix, firstLine, formatArea, formatDeal } from '../lib/format.ts';

const FILTER_KEY = 'imjang.filter';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'recent', label: '최근순' },
  { value: 'price', label: '가격순' },
  { value: 'score', label: '내 평점순' },
];
const STATUSES: { value: Status | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'candidate', label: '후보' },
  { value: 'visited', label: '방문완료' },
  { value: 'rejected', label: '제외' },
];
const TYPES: { value: PropertyType | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'apartment', label: '아파트' },
  { value: 'house', label: '단독' },
  { value: 'villa', label: '빌라' },
];

export default function ListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ListFilter>(loadFilter);
  const [picking, setPicking] = useState(false);
  const [openFilter, setOpenFilter] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  const rows = useLiveQuery(() => listProperties(filter), [filter]);
  const ids = useMemo(() => (rows ?? []).map((r) => r.id), [rows]);
  const thumbs = useLiveQuery(() => thumbsFor(ids), [ids]);

  const update = (next: ListFilter) => {
    setFilter(next);
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify(next));
    } catch {
      /* 저장 못 해도 그만이다 */
    }
  };

  const toggle = (id: string) => {
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id],
    );
  };

  return (
    <>
      <TopBar
        title={<span className="num">매물 {rows?.length ?? 0}</span>}
        right={
          <>
            <button
              type="button"
              onClick={() => {
                setPicking((p) => !p);
                setPicked([]);
              }}
            >
              {picking ? '취소' : '비교'}
            </button>
            <Link to="/settings">설정</Link>
          </>
        }
      />

      <button
        type="button"
        className="filterbar"
        aria-expanded={openFilter}
        onClick={() => setOpenFilter((v) => !v)}
      >
        <span>{summarize(filter)}</span>
        <span aria-hidden="true">{openFilter ? '접기 ▴' : '정렬·필터 ▾'}</span>
      </button>

      {openFilter && (
        <div className="section">
          <Choices label="정렬" value={filter.sort} choices={SORTS} onChange={(sort) => update({ ...filter, sort })} />
          <div style={{ height: 8 }} />
          <Choices
            label="상태"
            value={filter.status}
            choices={STATUSES}
            onChange={(status) => update({ ...filter, status })}
          />
          <div style={{ height: 8 }} />
          <Choices label="유형" value={filter.type} choices={TYPES} onChange={(type) => update({ ...filter, type })} />
        </div>
      )}

      <main className="main">
        {rows == null ? null : rows.length === 0 ? (
          <p className="empty">
            아직 담은 매물이 없습니다.
            <br />
            네이버 부동산에서 공유하거나 직접 입력해 추가하세요.
          </p>
        ) : (
          <ul className="rows">
            {rows.map((p) => (
              <li key={p.id} className={`row${picked.includes(p.id) ? ' selected' : ''}`}>
                {picking ? (
                  <label className="row-pick" style={{ display: 'flex' }}>
                    <input
                      type="checkbox"
                      checked={picked.includes(p.id)}
                      onChange={() => toggle(p.id)}
                      aria-label={`${p.title || '이름 없는 매물'} 비교 대상으로 선택`}
                      style={{ margin: '0 12px 0 16px', alignSelf: 'center' }}
                    />
                    <RowBody p={p} thumb={thumbs?.get(p.id)} />
                  </label>
                ) : (
                  <Link to={`/p/${p.id}`}>
                    <RowBody p={p} thumb={thumbs?.get(p.id)} />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>

      {picking ? (
        <div className="bottombar">
          <span className="hint" style={{ alignSelf: 'center' }}>
            2~3개 선택 ({picked.length})
          </span>
          <button
            type="button"
            className="btn btn-primary"
            disabled={picked.length < 2}
            onClick={() => navigate(`/compare?ids=${picked.join(',')}`)}
          >
            비교하기
          </button>
        </div>
      ) : (
        <Link className="fab" to="/new">
          + 매물 담기
        </Link>
      )}
    </>
  );
}

function RowBody({ p, thumb }: { p: Property; thumb?: Blob }) {
  const memo = firstLine(p.memo);
  const meta = [
    formatArea(p.areaExclusive ?? p.areaSupply),
    p.floor,
    p.direction?.replace('향', ''),
  ]
    .filter((v) => v && v !== '—')
    .join(' · ');

  return (
    <>
      <Thumb blob={thumb} alt="" />
      <div className="row-body">
        <div className="row-title">
          <strong>{p.title || '이름 없는 매물'}</strong>
          {p.status === 'visited' && <span className="stamp">방문완료</span>}
          {p.status === 'rejected' && <span>제외</span>}
        </div>
        <div className="row-price num">
          <span className="hint" style={{ fontSize: 14, marginRight: 6 }}>
            {dealPrefix(p.dealType)}
          </span>
          {formatDeal(p)}
        </div>
        <div className="row-meta num">{meta || '정보 없음'}</div>
        {memo && <div className="row-memo">{memo}</div>}
      </div>
    </>
  );
}

/** 접혀 있어도 지금 뭘로 보고 있는지는 늘 보인다. */
function summarize(filter: ListFilter): string {
  const label = <T extends string>(list: { value: T; label: string }[], value: T) =>
    list.find((x) => x.value === value)?.label ?? '';
  return [label(SORTS, filter.sort), label(STATUSES, filter.status), label(TYPES, filter.type)].join(' · ');
}

function loadFilter(): ListFilter {
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    if (!raw) return DEFAULT_FILTER;
    return { ...DEFAULT_FILTER, ...(JSON.parse(raw) as Partial<ListFilter>) };
  } catch {
    return DEFAULT_FILTER;
  }
}
