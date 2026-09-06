import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import TopBar from '../components/TopBar.tsx';
import { hasApiKey } from '../api/molit.ts';
import { countPhotos, countProperties } from '../db/repo.ts';
import { db } from '../db/db.ts';
import { download, exportZip, importZip } from '../lib/backup.ts';
import { formatBytes, round } from '../lib/format.ts';
import { requestPersist, storageUsage } from '../lib/storage.ts';
import { TILE_SOURCE_NAME, clearTileCache, tileCacheCount } from '../lib/tiles.ts';
import type { StorageUsage } from '../lib/storage.ts';

export default function SettingsPage() {
  const [usage, setUsage] = useState<StorageUsage>({ supported: false });
  const [tiles, setTiles] = useState<number>();
  const [note, setNote] = useState<string>();
  const [busy, setBusy] = useState(false);

  const counts = useLiveQuery(async () => ({
    properties: await countProperties(),
    photos: await countPhotos(),
    prices: await db.priceRecords.count(),
  }), []);

  useEffect(() => {
    void storageUsage().then(setUsage);
    void tileCacheCount().then(setTiles);
  }, [note]);

  const ratio = usage.ratio ?? 0;
  const warn = ratio >= 0.8;

  return (
    <>
      <TopBar title="설정" back="/" />
      {note && <div className="note">{note}</div>}

      <main className="main">
        <section className="section">
          <h2>저장된 것</h2>
          <table className="facts num">
            <tbody>
              <tr>
                <th>매물</th>
                <td>{counts?.properties ?? 0}건</td>
              </tr>
              <tr>
                <th>사진</th>
                <td>{counts?.photos ?? 0}장</td>
              </tr>
              <tr>
                <th>실거래가 캐시</th>
                <td>{counts?.prices ?? 0}건</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="section">
          <h2>기기 저장 공간</h2>
          {usage.supported ? (
            <>
              <div className={`bar${warn ? ' warn' : ''}`}>
                <i style={{ width: `${Math.min(100, round(ratio * 100, 1))}%` }} />
              </div>
              <p className="hint num" style={{ marginTop: 8 }}>
                {formatBytes(usage.usage)} / {formatBytes(usage.quota)} ({round(ratio * 100, 1)}%)
              </p>
              {warn && (
                <p className="hint" style={{ color: 'var(--stamp)' }}>
                  80%를 넘었습니다. 백업을 내보낸 뒤 오래된 매물의 사진을 지우세요.
                </p>
              )}
            </>
          ) : (
            <p className="hint">이 브라우저는 사용량을 알려주지 않습니다.</p>
          )}
          <button
            type="button"
            className="btn btn-small"
            style={{ marginTop: 12 }}
            onClick={async () => {
              const ok = await requestPersist();
              setNote(ok ? '저장 공간을 보호하도록 설정했습니다.' : '브라우저가 거부했습니다.');
            }}
          >
            데이터 보호 요청
          </button>
        </section>

        <section className="section">
          <h2>지도</h2>
          <p className="hint">
            지도 출처 <strong>{TILE_SOURCE_NAME}</strong>
          </p>
          <p className="hint num">저장해 둔 지도 칸 {tiles ?? 0}개</p>
          <p className="hint">
            지도에서 "이 지역 저장" 을 누른 구역은 오프라인에서도 뜹니다. 사진 넣을 자리가 모자라면 여기서 비우세요.
          </p>
          <button
            type="button"
            className="btn btn-small"
            style={{ marginTop: 12 }}
            disabled={!tiles}
            onClick={async () => {
              await clearTileCache();
              setNote('저장해 둔 지도를 비웠습니다.');
            }}
          >
            지도 캐시 비우기
          </button>
        </section>

        <section className="section">
          <h2>백업</h2>
          <p className="hint">
            서버가 없습니다. 기기를 잃으면 전부 사라집니다. 임장 다녀온 날엔 내보내기를 눌러 두세요.
          </p>
          <div className="field-row" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setNote('백업 만드는 중…');
                try {
                  const { blob, filename } = await exportZip();
                  download(blob, filename);
                  setNote(`${filename} (${formatBytes(blob.size)}) 을 내보냈습니다.`);
                } catch (e) {
                  setNote(`내보내기 실패: ${(e as Error).message}`);
                } finally {
                  setBusy(false);
                }
              }}
            >
              내보내기 (ZIP)
            </button>
            <label className="btn">
              가져오기
              <input
                type="file"
                accept=".zip,application/zip"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  setBusy(true);
                  setNote('복원하는 중…');
                  try {
                    const result = await importZip(await file.arrayBuffer());
                    setNote(
                      `복원 완료 — 매물 ${result.properties}건, 사진 ${result.photos}장, 실거래가 ${result.priceRecords}건`,
                    );
                  } catch (err) {
                    setNote(`가져오기 실패: ${(err as Error).message}`);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
          </div>
        </section>

        <section className="section">
          <h2>실거래가 API</h2>
          <p className="hint">
            {hasApiKey()
              ? '키가 설정돼 있습니다. 매물 상세에서 "실거래가 불러오기" 로 조회합니다.'
              : '키가 없습니다. .env 에 VITE_MOLIT_KEY 를 넣고 다시 빌드하면 켜집니다.'}
          </p>
        </section>

        <section className="section">
          <h2>이 앱에 대해</h2>
          <p className="hint">
            데이터는 전부 이 기기 안(IndexedDB)에만 있습니다. 서버로 보내지 않고, 계정도 없습니다.
            네트워크를 쓰는 곳은 매물 담기(파싱)와 실거래가 조회 둘뿐이며, 둘 다 직접 누를 때만 움직입니다.
          </p>
        </section>
      </main>
    </>
  );
}
