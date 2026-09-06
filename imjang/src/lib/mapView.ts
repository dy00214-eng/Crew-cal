/**
 * 마지막으로 보던 지도 위치. 앱을 열면 바로 그 자리에서 시작한다.
 * (아무것도 입력하지 않아도 지도가 먼저 보여야 한다)
 */
export interface SavedView {
  lat: number;
  lng: number;
  zoom: number;
}

export const VIEW_KEY = 'imjang.mapView';
export const START_KEY = 'imjang.start';

/** 서울시청. 저장된 위치도 현재 위치도 없을 때의 출발점. */
export const DEFAULT_VIEW: SavedView = { lat: 37.5665, lng: 126.978, zoom: 13 };

export function parseView(raw: string | null | undefined): SavedView | undefined {
  if (!raw) return undefined;
  try {
    const v = JSON.parse(raw) as Partial<SavedView>;
    if (!isLat(v.lat) || !isLng(v.lng) || !isZoom(v.zoom)) return undefined;
    return { lat: v.lat, lng: v.lng, zoom: Math.round(v.zoom) };
  } catch {
    return undefined;
  }
}

export function loadView(): SavedView | undefined {
  try {
    return parseView(localStorage.getItem(VIEW_KEY));
  } catch {
    return undefined;
  }
}

export function saveView(view: SavedView): void {
  if (!isLat(view.lat) || !isLng(view.lng) || !isZoom(view.zoom)) return;
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify(view));
  } catch {
    /* 저장 못 해도 그만이다 */
  }
}

export type StartScreen = 'map' | 'list';

export function parseStart(raw: string | null | undefined): StartScreen {
  return raw === 'list' ? 'list' : 'map';
}

export function loadStart(): StartScreen {
  try {
    return parseStart(localStorage.getItem(START_KEY));
  } catch {
    return 'map';
  }
}

export function saveStart(start: StartScreen): void {
  try {
    localStorage.setItem(START_KEY, start);
  } catch {
    /* 저장 못 해도 그만이다 */
  }
}

const isLat = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 85.05;
const isLng = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 180;
const isZoom = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= 22;
