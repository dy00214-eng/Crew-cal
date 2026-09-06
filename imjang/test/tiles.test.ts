import { describe, expect, it } from 'vitest';
import {
  PREFETCH_CAP,
  latToTileY,
  lonToTileX,
  tileUrl,
  tileUrlTemplate,
  tilesForBounds,
} from '../src/lib/tiles.ts';

const SEOUL = { north: 37.58, south: 37.55, east: 127.0, west: 126.96 };

describe('타일 좌표', () => {
  it('줌 0 은 타일 한 장', () => {
    expect(lonToTileX(126.978, 0)).toBe(0);
    expect(latToTileY(37.5665, 0)).toBe(0);
  });

  it('줌 1 은 사분면으로 갈린다', () => {
    expect(lonToTileX(-1, 1)).toBe(0);
    expect(lonToTileX(1, 1)).toBe(1);
    expect(latToTileY(1, 1)).toBe(0); // 북반구가 위
    expect(latToTileY(-1, 1)).toBe(1);
  });

  it('경도가 커지면 x 도 커진다', () => {
    expect(lonToTileX(126.9, 14)).toBeLessThan(lonToTileX(127.1, 14));
  });

  it('위도가 커지면 y 는 작아진다', () => {
    expect(latToTileY(37.6, 14)).toBeLessThan(latToTileY(37.5, 14));
  });

  it('극지방에서도 범위를 벗어나지 않는다', () => {
    for (const z of [1, 8, 19]) {
      const max = 2 ** z - 1;
      expect(latToTileY(90, z)).toBeGreaterThanOrEqual(0);
      expect(latToTileY(-90, z)).toBeLessThanOrEqual(max);
    }
  });
});

describe('tilesForBounds', () => {
  it('보이는 범위를 덮는다', () => {
    const tiles = tilesForBounds(SEOUL, [13]);
    expect(tiles.length).toBeGreaterThan(0);
    for (const t of tiles) {
      expect(t.z).toBe(13);
      expect(t.x).toBeGreaterThanOrEqual(lonToTileX(SEOUL.west, 13));
      expect(t.x).toBeLessThanOrEqual(lonToTileX(SEOUL.east, 13));
    }
  });

  it('가운데 타일이 먼저 온다', () => {
    const tiles = tilesForBounds(SEOUL, [15]);
    const cx = lonToTileX((SEOUL.east + SEOUL.west) / 2, 15);
    const cy = latToTileY((SEOUL.north + SEOUL.south) / 2, 15);
    expect(tiles[0]).toMatchObject({ x: cx, y: cy });
  });

  it('상한을 넘기지 않는다', () => {
    const wide = { north: 38.5, south: 36.5, east: 128, west: 126 };
    expect(tilesForBounds(wide, [16, 17]).length).toBe(PREFETCH_CAP);
    expect(tilesForBounds(wide, [16], 10).length).toBe(10);
  });

  it('말이 안 되는 줌은 버린다', () => {
    expect(tilesForBounds(SEOUL, [-1, 25])).toEqual([]);
  });
});

describe('tileUrl', () => {
  it('템플릿을 채운다', () => {
    expect(tileUrl({ z: 13, x: 6985, y: 3170 })).toBe(
      tileUrlTemplate().replace('{z}', '13').replace('{x}', '6985').replace('{y}', '3170'),
    );
    expect(tileUrl({ z: 13, x: 6985, y: 3170 })).toMatch(/\/13\/6985\/3170\.png$/);
  });

  it('서비스워커 캐시 규칙과 같은 모양이다', () => {
    // vite.config.ts 의 runtimeCaching urlPattern 과 반드시 맞아야 한다.
    // 교차 오리진에서는 URL 맨 앞(index 0)부터 맞아야 워크박스가 route 로 받아 준다.
    const pattern = /^https?:\/\/[^?#]*\/\d{1,2}\/\d+\/\d+\.(?:png|jpg|jpeg|webp)$/;
    for (const url of [tileUrl({ z: 9, x: 1, y: 2 }), tileUrl({ z: 19, x: 123456, y: 654321 })]) {
      const hit = pattern.exec(url);
      expect(hit).not.toBeNull();
      expect(hit?.index).toBe(0);
    }
    expect(pattern.test('https://example.com/app/index.html')).toBe(false);
  });
});
