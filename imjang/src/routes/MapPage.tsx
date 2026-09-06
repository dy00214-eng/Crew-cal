import { useLiveQuery } from 'dexie-react-hooks';
import { Suspense, lazy, useCallback, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TopBar from '../components/TopBar.tsx';
import type { MapState } from '../components/MapView.tsx';
import { db } from '../db/db.ts';
import { patchProperty } from '../db/repo.ts';
import { PREFETCH_CAP, TILE_MAX_ZOOM, prefetchTiles, tilesForBounds } from '../lib/tiles.ts';
import { useOnline } from '../lib/useOnline.ts';

// 지도(leaflet)는 이 화면에서만 쓴다. 목록 첫 진입이 무거워지지 않게 떼어 둔다.
const MapView = lazy(() => import('../components/MapView.tsx'));

export default function MapPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const online = useOnline();

  const pickId = params.get('pick') ?? undefined;
  const focusId = params.get('focus') ?? undefined;
  const properties = useLiveQuery(() => db.properties.toArray(), []) ?? [];
  const target = properties.find((p) => p.id === (pickId ?? focusId));

  const stateRef = useRef<MapState>();
  const [provisional, setProvisional] = useState<[number, number]>();
  const [focus, setFocus] = useState<[number, number]>();
  const [note, setNote] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [tileTrouble, setTileTrouble] = useState(false);

  const located = properties.filter((p) => p.lat != null && p.lng != null);
  const missing = properties.length - located.length;

  const onMove = useCallback((s: MapState) => {
    stateRef.current = s;
  }, []);

  const onTileTrouble = useCallback(() => setTileTrouble(true), []);

  const onPick = useCallback((lat: number, lng: number) => {
    setProvisional([lat, lng]);
  }, []);

  const onSelect = useCallback(
    (id: string) => {
      if (!pickId) navigate(`/p/${id}`);
    },
    [navigate, pickId],
  );

  /** 지금 보고 있는 구역의 타일을 미리 받아 둔다. 다음엔 오프라인에서도 이 구역이 뜬다. */
  const saveArea = async () => {
    const state = stateRef.current;
    if (!state || saving) return;
    setSaving(true);
    const zooms = [state.zoom, state.zoom + 1].filter((z) => z >= 1 && z <= TILE_MAX_ZOOM);
    const tiles = tilesForBounds(state.bounds, zooms, PREFETCH_CAP);
    setNote(`지도 ${tiles.length}칸 저장 중… 0%`);
    try {
      const result = await prefetchTiles(tiles, (p) =>
        setNote(`지도 ${p.total}칸 저장 중… ${Math.round((p.done / p.total) * 100)}%`),
      );
      setNote(
        result.failed
          ? `${result.done}칸 저장했습니다. ${result.failed}칸은 받지 못했습니다.`
          : `${result.done}칸 저장했습니다. 이제 이 구역은 오프라인에서도 보입니다.`,
      );
    } catch {
      setNote('지도를 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setNote('이 기기는 현재 위치를 알려주지 않습니다.');
      return;
    }
    setNote('현재 위치 확인 중…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFocus([pos.coords.latitude, pos.coords.longitude]);
        setNote(undefined);
      },
      () => setNote('현재 위치를 가져오지 못했습니다. (위치 권한을 확인하세요)'),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const confirmPin = async () => {
    if (!pickId) return;
    const point = provisional ?? stateRef.current?.center;
    if (!point) return;
    await patchProperty(pickId, { lat: point[0], lng: point[1] });
    navigate(`/p/${pickId}`, { replace: true });
  };

  return (
    <>
      <TopBar
        title={pickId ? '위치 찍기' : '지도'}
        back={pickId ? `/p/${pickId}` : '/'}
        right={
          <button type="button" onClick={locate}>
            내 위치
          </button>
        }
      />

      <div className="maptools">
        <span className="num">
          {pickId
            ? `${target?.title || '이 매물'} 의 위치를 지도에서 누르세요`
            : `지도 위 ${located.length}건${missing ? ` · 위치 없음 ${missing}건` : ''}`}
        </span>
        <button type="button" className="btn btn-small" disabled={!online || saving} onClick={() => void saveArea()}>
          {online ? '이 지역 저장' : '오프라인'}
        </button>
      </div>

      {tileTrouble && online && (
        <div className="note">
          {import.meta.env.VITE_ARTIFACT ? (
            <>
              <strong>이 미리보기에서는 지도 타일이 차단됩니다.</strong> 매물 말풍선과 위치 찍기는 그대로
              동작하고, 실제로 배포하면 지도도 정상으로 뜹니다.
            </>
          ) : (
            <>
              <strong>지도 타일을 불러오지 못했습니다.</strong> 인증키와 발급할 때 등록한 도메인을 확인하세요.
            </>
          )}
        </div>
      )}
      {note && <div className="note">{note}</div>}
      {!pickId && !note && online && (
        <div className="note">
          지금 보이는 구역을 저장해 두면 오프라인에서도 지도가 뜹니다. 한 번에 최대 {PREFETCH_CAP}칸까지만 받습니다.
        </div>
      )}
      {!online && (
        <div className="note">
          오프라인입니다. <strong>미리 저장해 둔 구역</strong>만 지도가 뜨고, 매물 말풍선은 전부 그대로 보입니다.
        </div>
      )}

      <Suspense fallback={<div className="mapcanvas mapcanvas-loading">지도 여는 중…</div>}>
        <MapView
          properties={pickId ? located.filter((p) => p.id !== pickId) : located}
          picking={Boolean(pickId)}
          provisional={provisional}
          focus={focus ?? (target?.lat != null ? [target.lat, target.lng as number] : undefined)}
          onPick={onPick}
          onSelect={onSelect}
          onMove={onMove}
          onTileTrouble={onTileTrouble}
        />
      </Suspense>

      {pickId && (
        <div className="bottombar">
          <button type="button" className="btn" onClick={() => navigate(`/p/${pickId}`)}>
            취소
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void confirmPin()}>
            {provisional ? '여기로 지정' : '화면 가운데로 지정'}
          </button>
        </div>
      )}
    </>
  );
}
