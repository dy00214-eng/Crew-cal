import { DEAL_TYPE_LABEL, PROPERTY_TYPE_LABEL } from '../db/types.ts';
import type { DealType, Property, PropertyType, Status } from '../db/types.ts';
import { formatMan } from '../lib/format.ts';
import Choices from './Choices.tsx';
import NumberField from './NumberField.tsx';

const TYPES = (Object.keys(PROPERTY_TYPE_LABEL) as PropertyType[]).map((value) => ({
  value,
  label: PROPERTY_TYPE_LABEL[value],
}));
const DEALS = (Object.keys(DEAL_TYPE_LABEL) as DealType[]).map((value) => ({
  value,
  label: DEAL_TYPE_LABEL[value],
}));
const STATUSES: { value: Status; label: string }[] = [
  { value: 'candidate', label: '후보' },
  { value: 'visited', label: '방문완료' },
  { value: 'rejected', label: '제외' },
];

export default function PropertyForm({
  value,
  onChange,
  showStatus,
}: {
  value: Property;
  onChange: (next: Property) => void;
  showStatus?: boolean;
}) {
  const set = <K extends keyof Property>(key: K, next: Property[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <>
      <div className="section">
        <h2>유형</h2>
        <Choices label="매물 유형" value={value.type} choices={TYPES} onChange={(t) => set('type', t)} />
      </div>

      <div className="section">
        <label className="field">
          <span>제목</span>
          <input
            value={value.title}
            placeholder="○○아파트 101동 1503호"
            onChange={(e) => set('title', e.target.value)}
          />
        </label>
        <label className="field">
          <span>주소</span>
          <input
            value={value.address}
            placeholder="서울 강남구 ○○동"
            onChange={(e) => set('address', e.target.value)}
          />
        </label>
      </div>

      <div className="section">
        <h2>가격</h2>
        <Choices
          label="거래 형태"
          value={value.dealType}
          choices={DEALS}
          onChange={(d) => set('dealType', d)}
        />
        <div style={{ height: 12 }} />
        <NumberField
          label={value.dealType === 'monthly' ? '보증금' : '가격'}
          suffix="만원"
          value={value.price || undefined}
          onChange={(n) => set('price', n ?? 0)}
        />
        {value.dealType === 'monthly' && (
          <NumberField
            label="월세"
            suffix="만원"
            value={value.monthlyRent}
            onChange={(n) => set('monthlyRent', n)}
          />
        )}
        <p className="hint num">
          {value.dealType === 'monthly'
            ? `${formatMan(value.price)} / ${formatMan(value.monthlyRent ?? 0)}`
            : formatMan(value.price)}
        </p>
      </div>

      <div className="section">
        <h2>면적·층·향</h2>
        <div className="field-row">
          <NumberField
            label="공급면적"
            suffix="㎡"
            step="decimal"
            value={value.areaSupply}
            onChange={(n) => set('areaSupply', n)}
          />
          <NumberField
            label="전용면적"
            suffix="㎡"
            step="decimal"
            value={value.areaExclusive}
            onChange={(n) => set('areaExclusive', n)}
          />
        </div>
        <div className="field-row">
          <label className="field">
            <span>층</span>
            <input
              value={value.floor ?? ''}
              placeholder="15/25"
              onChange={(e) => set('floor', e.target.value || undefined)}
            />
          </label>
          <label className="field">
            <span>향</span>
            <input
              value={value.direction ?? ''}
              placeholder="남향"
              onChange={(e) => set('direction', e.target.value || undefined)}
            />
          </label>
        </div>
      </div>

      <div className="section">
        <h2>실거래가 조회용 (선택)</h2>
        <div className="field-row">
          <label className="field">
            <span>단지명</span>
            <input
              value={value.complexName ?? ''}
              placeholder="래미안"
              onChange={(e) => set('complexName', e.target.value || undefined)}
            />
          </label>
          <label className="field">
            <span>법정동코드 5자리</span>
            <input
              className="num"
              inputMode="numeric"
              value={value.lawdCd ?? ''}
              placeholder="11680"
              onChange={(e) => set('lawdCd', e.target.value.replace(/\D/g, '').slice(0, 5) || undefined)}
            />
          </label>
        </div>
        <p className="hint">비워두면 실거래가만 못 부를 뿐, 나머지 기능은 전부 그대로 동작합니다.</p>
      </div>

      <div className="section">
        <label className="field">
          <span>원본 링크</span>
          <input
            type="url"
            value={value.sourceUrl ?? ''}
            placeholder="https://…"
            onChange={(e) => set('sourceUrl', e.target.value || undefined)}
          />
        </label>
      </div>

      {showStatus && (
        <div className="section">
          <h2>상태</h2>
          <Choices
            label="상태"
            value={value.status}
            choices={STATUSES}
            onChange={(s) =>
              onChange({
                ...value,
                status: s,
                visitedAt: s === 'visited' ? (value.visitedAt ?? Date.now()) : value.visitedAt,
              })
            }
          />
        </div>
      )}
    </>
  );
}
