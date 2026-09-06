import { describe, expect, it } from 'vitest';
import { DEFAULT_VIEW, parseStart, parseView } from '../src/lib/mapView.ts';

describe('저장된 지도 위치', () => {
  it('제대로 된 값은 그대로 읽는다', () => {
    expect(parseView('{"lat":37.4995,"lng":127.057,"zoom":16}')).toEqual({
      lat: 37.4995,
      lng: 127.057,
      zoom: 16,
    });
  });

  it('줌은 정수로 맞춘다', () => {
    expect(parseView('{"lat":37.5,"lng":127,"zoom":15.7}')?.zoom).toBe(16);
  });

  it('망가진 값은 버린다 (지도가 엉뚱한 데서 열리면 안 된다)', () => {
    expect(parseView(null)).toBeUndefined();
    expect(parseView('')).toBeUndefined();
    expect(parseView('{')).toBeUndefined();
    expect(parseView('{"lat":"서울","lng":127,"zoom":15}')).toBeUndefined();
    expect(parseView('{"lat":37.5,"lng":127}')).toBeUndefined();
    expect(parseView('{"lat":91,"lng":127,"zoom":15}')).toBeUndefined();
    expect(parseView('{"lat":37.5,"lng":999,"zoom":15}')).toBeUndefined();
    expect(parseView('{"lat":37.5,"lng":127,"zoom":0}')).toBeUndefined();
    expect(parseView('{"lat":null,"lng":null,"zoom":null}')).toBeUndefined();
  });

  it('기본 위치는 서울 도심이다', () => {
    expect(DEFAULT_VIEW.lat).toBeCloseTo(37.5665, 3);
    expect(DEFAULT_VIEW.zoom).toBeGreaterThanOrEqual(10);
  });
});

describe('시작 화면', () => {
  it('기본은 지도', () => {
    expect(parseStart(null)).toBe('map');
    expect(parseStart('')).toBe('map');
    expect(parseStart('엉뚱한값')).toBe('map');
    expect(parseStart('map')).toBe('map');
  });

  it('목록으로 바꿔 둘 수 있다', () => {
    expect(parseStart('list')).toBe('list');
  });
});
