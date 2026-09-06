import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PriceRecord } from '../db/types.ts';
import { formatMan, formatYearMonth, round } from '../lib/format.ts';

export interface MonthPoint {
  ym: string;
  label: string;
  price: number; // 만원, 월평균
  count: number;
}

/** 월별 평균가로 접는다. 거래가 드문 달은 점 하나로 남는다. */
export function monthlyAverages(records: PriceRecord[]): MonthPoint[] {
  const buckets = new Map<string, { sum: number; count: number }>();
  for (const r of records) {
    const b = buckets.get(r.dealYearMonth) ?? { sum: 0, count: 0 };
    b.sum += r.price;
    b.count += 1;
    buckets.set(r.dealYearMonth, b);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ym, b]) => ({
      ym,
      label: formatYearMonth(ym),
      price: round(b.sum / b.count, 0),
      count: b.count,
    }));
}

export default function PriceChart({ records }: { records: PriceRecord[] }) {
  const points = monthlyAverages(records);
  if (points.length === 0) return null;

  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="var(--rule)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--graphite)', fontSize: 12 }}
            stroke="var(--rule)"
            tickLine={false}
          />
          <YAxis
            width={56}
            tick={{ fill: 'var(--graphite)', fontSize: 12 }}
            stroke="var(--rule)"
            tickLine={false}
            tickFormatter={(v: number) => formatMan(v)}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--paper)',
              border: '1px solid var(--rule)',
              borderRadius: 2,
              fontSize: 14,
            }}
            labelFormatter={(l) => `${l}`}
            formatter={(v: number, _n, item) => [
              `${formatMan(v)} (${(item?.payload as MonthPoint)?.count ?? 0}건)`,
              '평균가',
            ]}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="var(--ink)"
            strokeWidth={1.5}
            dot={{ r: 2, fill: 'var(--ink)' }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
