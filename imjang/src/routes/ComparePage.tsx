import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useSearchParams } from 'react-router-dom';
import TopBar from '../components/TopBar.tsx';
import { COMMON_ITEMS, TYPE_ITEMS } from '../config/checklists.ts';
import type { ChecklistItem } from '../config/checklists.ts';
import { db } from '../db/db.ts';
import { PROPERTY_TYPE_LABEL, STATUS_LABEL } from '../db/types.ts';
import type { Property } from '../db/types.ts';
import { areaForCompare, formatDeal, formatMan, pricePerPyeong, round, toPyeong } from '../lib/format.ts';

type Better = 'high' | 'low' | 'none';

interface Row {
  label: string;
  cells: string[];
  scores: (number | undefined)[];
  better: Better;
}

/**
 * 비교 — 결정은 여기서 난다.
 * 유리한 값(가격은 낮은 쪽, 평점은 높은 쪽)에 --stamp 를 찍는다.
 */
export default function ComparePage() {
  const [params] = useSearchParams();
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean).slice(0, 3);
  const items = useLiveQuery(async () => {
    const rows = await db.properties.bulkGet(ids);
    return rows.filter((r): r is Property => Boolean(r));
  }, [params]);

  if (!items) {
    return (
      <>
        <TopBar title="비교" back="/list" />
        <main className="main" />
      </>
    );
  }

  if (items.length < 2) {
    return (
      <>
        <TopBar title="비교" back="/list" />
        <p className="empty">
          비교할 매물이 부족합니다. 목록에서 <strong>비교</strong> 를 누르고 2~3개를 고르세요.
        </p>
      </>
    );
  }

  const groups = buildGroups(items);

  return (
    <>
      <TopBar title="비교" back="/list" />
      <main className="main">
        <div className="compare-wrap">
          <table className="compare num">
            <thead>
              <tr>
                <th scope="col" />
                {items.map((p) => (
                  <th key={p.id} scope="col">
                    <Link to={`/p/${p.id}`}>{p.title || '이름 없는 매물'}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <ContentGroup key={group.title} title={group.title} rows={group.rows} count={items.length} />
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint" style={{ padding: '12px 16px' }}>
          붉은 값이 유리한 쪽입니다. 가격·평당가는 낮은 값을, 면적과 평점은 높은 값을 표시합니다.
        </p>
      </main>
    </>
  );
}

function ContentGroup({ title, rows, count }: { title: string; rows: Row[]; count: number }) {
  return (
    <>
      <tr className="group">
        <th scope="row" colSpan={count + 1}>
          {title}
        </th>
      </tr>
      {rows.map((row) => {
        const best = bestIndexes(row);
        return (
          <tr key={`${title}-${row.label}`}>
            <th scope="row">{row.label}</th>
            {row.cells.map((cell, i) => (
              <td key={i} className={best.includes(i) ? 'best' : undefined}>
                {cell}
              </td>
            ))}
          </tr>
        );
      })}
    </>
  );
}

function buildGroups(items: Property[]): { title: string; rows: Row[] }[] {
  const basics: Row[] = [
    {
      label: '가격',
      cells: items.map((p) => formatDeal(p)),
      scores: items.map((p) => (p.price > 0 ? p.price : undefined)),
      better: 'low',
    },
    {
      label: '평당가',
      cells: items.map((p) => {
        const v = pricePerPyeong(p.price, areaForCompare(p).m2);
        return v ? `${formatMan(round(v, 0))}` : '—';
      }),
      scores: items.map((p) => pricePerPyeong(p.price, areaForCompare(p).m2)),
      better: 'low',
    },
    {
      label: '면적',
      cells: items.map((p) => {
        const a = areaForCompare(p);
        return a.m2 ? `${round(a.m2, 1)}㎡ (${a.basis})\n${round(toPyeong(a.m2), 1)}평` : '—';
      }),
      scores: items.map((p) => areaForCompare(p).m2),
      better: 'high',
    },
    {
      label: '층',
      cells: items.map((p) => p.floor ?? '—'),
      scores: items.map(() => undefined),
      better: 'none',
    },
    {
      label: '향',
      cells: items.map((p) => p.direction ?? '—'),
      scores: items.map(() => undefined),
      better: 'none',
    },
    {
      label: '유형·상태',
      cells: items.map((p) => `${PROPERTY_TYPE_LABEL[p.type]} · ${STATUS_LABEL[p.status]}`),
      scores: items.map(() => undefined),
      better: 'none',
    },
  ];

  const groups = [{ title: '기본', rows: basics }];

  groups.push({ title: '공통 체크리스트', rows: ratingRows(items, COMMON_ITEMS) });

  // 유형이 같을 때만 그 유형의 항목을 나란히 놓는다. 섞이면 비교가 안 된다.
  const firstType = items[0]?.type;
  if (firstType && items.every((p) => p.type === firstType)) {
    groups.push({
      title: `${PROPERTY_TYPE_LABEL[firstType]} 체크리스트`,
      rows: ratingRows(items, TYPE_ITEMS[firstType]),
    });
  }

  groups.push({
    title: '총평',
    rows: [
      {
        label: '총평 (1~5)',
        cells: items.map((p) => (p.overallScore ? String(p.overallScore) : '—')),
        scores: items.map((p) => p.overallScore),
        better: 'high',
      },
      {
        label: '평가한 항목 평균',
        cells: items.map((p) => {
          const avg = average(Object.values(p.ratings));
          return avg == null ? '—' : avg.toFixed(1);
        }),
        scores: items.map((p) => average(Object.values(p.ratings))),
        better: 'high',
      },
    ],
  });

  return groups;
}

function ratingRows(items: Property[], list: ChecklistItem[]): Row[] {
  return list.map((item) => ({
    label: item.label,
    cells: items.map((p) => (p.ratings[item.key] ? String(p.ratings[item.key]) : '—')),
    scores: items.map((p) => p.ratings[item.key]),
    better: 'high' as Better,
  }));
}

function bestIndexes(row: Row): number[] {
  if (row.better === 'none') return [];
  const values = row.scores.filter((v): v is number => v != null && Number.isFinite(v));
  if (values.length < 2) return [];
  const target = row.better === 'high' ? Math.max(...values) : Math.min(...values);
  // 전부 같은 값이면 아무것도 강조하지 않는다.
  if (values.every((v) => v === target)) return [];
  return row.scores.flatMap((v, i) => (v === target ? [i] : []));
}

function average(values: number[]): number | undefined {
  const nums = values.filter((v) => Number.isFinite(v));
  if (!nums.length) return undefined;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
