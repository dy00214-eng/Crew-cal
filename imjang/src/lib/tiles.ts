/**
 * 지도 타일 캐시.
 *
 * 읽기는 서비스워커(CacheFirst)가 맡는다 — 한 번 본 타일은 오프라인에서도 그대로 뜬다.
 * 여기서는 "이 지역 저장" 처럼 사용자가 직접 누를 때만 타일을 미리 받아 둔다.
 * 자동으로 넓은 구역을 긁어오지 않는다 (타일 서버에 대한 예의이자, 기기 용량 문제다).
 */
export const TILE_CACHE = 'map-tiles';

export interface TileSource {
  /** 이름 (설정 화면 표시용) */
  name: string;
  /** {z}/{x}/{y} 자리를 채워 쓰는 템플릿. VWorld 처럼 순서가 {z}/{y}/{x} 여도 된다. */
  url: string;
  attribution: string;
  maxZoom: number;
}

/** import.meta.env 를 받아 타일 출처를 정한다. 순수 함수라 테스트로 고정해 둔다. */
export function resolveTileSource(env: Record<string, string | undefined> = {}): TileSource {
  // 1) 직접 지정한 템플릿이 최우선
  if (env.VITE_TILE_URL) {
    return {
      name: '직접 지정',
      url: env.VITE_TILE_URL,
      attribution: env.VITE_TILE_ATTRIBUTION ?? '',
      maxZoom: toZoom(env.VITE_TILE_MAX_ZOOM, 19),
    };
  }

  // 2) VWorld (국토교통부). 한국 지명·건물·도로명이 제대로 나온다.
  //    WMTS 타일 경로는 {z}/{y}/{x} 순서다 — OSM 과 x, y 가 뒤집혀 있으니 주의.
  if (env.VITE_VWORLD_KEY) {
    const layer = env.VITE_VWORLD_LAYER || 'Base';
    return {
      name: `VWorld ${layer}`,
      url: `https://api.vworld.kr/req/wmts/1.0.0/${env.VITE_VWORLD_KEY}/${layer}/{z}/{y}/{x}.png`,
      attribution: env.VITE_TILE_ATTRIBUTION ?? '© VWorld (국토교통부)',
      maxZoom: toZoom(env.VITE_TILE_MAX_ZOOM, 19),
    };
  }

  // 3) 키 없이도 앱이 그냥 돌아가야 하므로 OSM 이 기본값
  return {
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: env.VITE_TILE_ATTRIBUTION ?? '© OpenStreetMap contributors',
    maxZoom: toZoom(env.VITE_TILE_MAX_ZOOM, 19),
  };
}

function toZoom(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 22 ? n : fallback;
}

const SOURCE = resolveTileSource(import.meta.env as unknown as Record<string, string | undefined>);

export const TILE_ATTRIBUTION = SOURCE.attribution;
export const TILE_MAX_ZOOM = SOURCE.maxZoom;
export const TILE_SOURCE_NAME = SOURCE.name;

/** 한 번에 받아둘 수 있는 타일 수 상한. 넘으면 바깥쪽부터 자른다. */
export const PREFETCH_CAP = 400;

export interface TileRef {
  z: number;
  x: number;
  y: number;
}

export interface LatLngBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function tileUrlTemplate(): string {
  return SOURCE.url;
}

export function tileUrl(ref: TileRef, template: string = SOURCE.url): string {
  return template
    .replace('{z}', String(ref.z))
    .replace('{x}', String(ref.x))
    .replace('{y}', String(ref.y));
}

export function lonToTileX(lon: number, z: number): number {
  const clamped = Math.min(180, Math.max(-180, lon));
  return clampTile(Math.floor(((clamped + 180) / 360) * 2 ** z), z);
}

export function latToTileY(lat: number, z: number): number {
  // 웹 메르카토르는 극지방을 담지 못한다. 가장자리에서 부동소수 오차로
  // -1 이나 2^z 가 나오지 않게 잘라 준다.
  const clamped = Math.min(85.05112878, Math.max(-85.05112878, lat));
  const rad = (clamped * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z;
  return clampTile(Math.floor(y), z);
}

function clampTile(v: number, z: number): number {
  const max = 2 ** z - 1;
  return Math.min(max, Math.max(0, v));
}

/**
 * 화면에 보이는 범위를 타일 목록으로 바꾼다.
 * 가운데(=지금 보고 있는 곳)부터 채우고 상한에서 끊는다.
 */
export function tilesForBounds(bounds: LatLngBounds, zooms: number[], cap = PREFETCH_CAP): TileRef[] {
  const centerLat = (bounds.north + bounds.south) / 2;
  const centerLon = (bounds.east + bounds.west) / 2;
  const out: TileRef[] = [];

  for (const z of zooms) {
    if (!Number.isInteger(z) || z < 0 || z > 19) continue;
    if (out.length >= cap) break;
    const x0 = Math.min(lonToTileX(bounds.west, z), lonToTileX(bounds.east, z));
    const x1 = Math.max(lonToTileX(bounds.west, z), lonToTileX(bounds.east, z));
    const y0 = Math.min(latToTileY(bounds.north, z), latToTileY(bounds.south, z));
    const y1 = Math.max(latToTileY(bounds.north, z), latToTileY(bounds.south, z));
    collectRings(z, x0, x1, y0, y1, lonToTileX(centerLon, z), latToTileY(centerLat, z), cap, out);
  }

  return out;
}

/**
 * 가운데에서 바깥으로 한 겹씩 모은다.
 * 격자를 통째로 만들어 두고 자르면, 넓은 범위에서 수백만 칸이 생겨 앱이 멈춘다.
 */
function collectRings(
  z: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  cx: number,
  cy: number,
  cap: number,
  out: TileRef[],
): void {
  const push = (x: number, y: number) => {
    if (out.length >= cap) return;
    if (x < x0 || x > x1 || y < y0 || y > y1) return;
    out.push({ z, x, y });
  };

  const maxR = Math.max(cx - x0, x1 - cx, cy - y0, y1 - cy);
  for (let r = 0; r <= maxR && out.length < cap; r += 1) {
    if (r === 0) {
      push(cx, cy);
      continue;
    }
    // 이 겹이 범위를 완전히 벗어났으면 더 볼 것이 없다.
    if (cx + r < x0 || cx - r > x1 || cy + r < y0 || cy - r > y1) break;
    for (let x = cx - r; x <= cx + r && out.length < cap; x += 1) {
      push(x, cy - r);
      push(x, cy + r);
    }
    for (let y = cy - r + 1; y <= cy + r - 1 && out.length < cap; y += 1) {
      push(cx - r, y);
      push(cx + r, y);
    }
  }
}

export interface PrefetchProgress {
  done: number;
  total: number;
  failed: number;
}

/** 타일을 순서대로 받아 캐시에 넣는다. 한 번에 몰아치지 않는다. */
export async function prefetchTiles(
  tiles: TileRef[],
  onProgress?: (p: PrefetchProgress) => void,
  signal?: AbortSignal,
): Promise<PrefetchProgress> {
  const state: PrefetchProgress = { done: 0, total: tiles.length, failed: 0 };
  if (!tiles.length) return state;

  const cache = 'caches' in globalThis ? await caches.open(TILE_CACHE) : undefined;
  const queue = [...tiles];
  // 타일 서버에 몰아치지 않는다. 개인용 앱이라 조금 느려도 상관없다.
  const WORKERS = 2;

  const worker = async () => {
    for (;;) {
      if (signal?.aborted) return;
      const tile = queue.shift();
      if (!tile) return;
      const url = tileUrl(tile);
      try {
        if (cache && (await cache.match(url))) {
          state.done += 1;
        } else {
          const res = await fetch(url, { mode: 'no-cors', signal });
          // 서비스워커가 살아 있으면 그쪽이 이미 넣었다. 없을 때만 직접 넣는다.
          if (cache && !navigator.serviceWorker?.controller) await cache.put(url, res.clone());
          state.done += 1;
        }
      } catch {
        state.failed += 1;
      }
      onProgress?.({ ...state });
    }
  };

  await Promise.all(Array.from({ length: WORKERS }, worker));
  return state;
}

export async function tileCacheCount(): Promise<number> {
  if (!('caches' in globalThis)) return 0;
  try {
    const cache = await caches.open(TILE_CACHE);
    return (await cache.keys()).length;
  } catch {
    return 0;
  }
}

export async function clearTileCache(): Promise<void> {
  if (!('caches' in globalThis)) return;
  try {
    await caches.delete(TILE_CACHE);
  } catch {
    /* 지우지 못해도 앱은 그대로 돈다 */
  }
}
