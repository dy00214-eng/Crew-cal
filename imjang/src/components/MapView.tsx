import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import type { Property } from '../db/types.ts';
import { dealPrefix, formatDeal } from '../lib/format.ts';
import { TILE_ATTRIBUTION, TILE_MAX_ZOOM, tileUrlTemplate } from '../lib/tiles.ts';
import type { LatLngBounds } from '../lib/tiles.ts';

export interface MapState {
  center: [number, number];
  zoom: number;
  bounds: LatLngBounds;
}

const SEOUL: [number, number] = [37.5665, 126.978];

export default function MapView({
  properties,
  picking,
  provisional,
  onPick,
  onSelect,
  onMove,
  focus,
}: {
  properties: Property[];
  picking?: boolean;
  provisional?: [number, number] | undefined;
  onPick?: (lat: number, lng: number) => void;
  onSelect?: (id: string) => void;
  onMove?: (state: MapState) => void;
  focus?: [number, number] | undefined;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map>();
  const pinsRef = useRef<L.LayerGroup>();
  const provisionalRef = useRef<L.Marker>();
  const fittedRef = useRef(false);

  // 지도는 한 번만 만든다. 이후엔 레이어만 갈아 끼운다.
  useEffect(() => {
    if (!holder.current || mapRef.current) return;
    const map = L.map(holder.current, {
      center: focus ?? SEOUL,
      zoom: focus ? 16 : 12,
      zoomControl: false,
      attributionControl: true,
    });
    L.tileLayer(tileUrlTemplate(), {
      maxZoom: TILE_MAX_ZOOM,
      attribution: TILE_ATTRIBUTION,
      // 캐시에 없는 타일은 종이색 빈칸으로 남는다. 오프라인이면 화면에서 그대로 보인다.
      className: 'tile',
    }).addTo(map);
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    pinsRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const report = () => {
      const b = map.getBounds();
      const c = map.getCenter();
      onMove?.({
        center: [c.lat, c.lng],
        zoom: map.getZoom(),
        bounds: { north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() },
      });
    };
    map.on('moveend zoomend', report);
    report();

    return () => {
      map.off();
      map.remove();
      mapRef.current = undefined;
    };
    // 최초 1회만. focus/onMove 는 아래 effect 들이 따로 본다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 핀 찍기 모드에서는 지도를 눌러 위치를 정한다.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (e: L.LeafletMouseEvent) => onPick?.(e.latlng.lat, e.latlng.lng);
    if (picking) map.on('click', handler);
    return () => {
      map.off('click', handler);
    };
  }, [picking, onPick]);

  // 매물 말풍선. 목록이 바뀌면 (담기·수정·삭제) 곧바로 다시 그린다.
  useEffect(() => {
    const map = mapRef.current;
    const pins = pinsRef.current;
    if (!map || !pins) return;
    pins.clearLayers();

    const located = properties.filter((p) => p.lat != null && p.lng != null);
    for (const p of located) {
      const marker = L.marker([p.lat as number, p.lng as number], {
        icon: L.divIcon({
          className: 'pin-wrap',
          html: bubbleHtml(p),
          iconSize: undefined as unknown as L.PointExpression,
          iconAnchor: [0, 0],
        }),
        keyboard: true,
        title: p.title || '이름 없는 매물',
      });
      marker.on('click', () => onSelect?.(p.id));
      marker.addTo(pins);
    }

    // 처음 한 번만 전체가 보이게 맞춘다. 그 뒤엔 사용자가 옮긴 화면을 건드리지 않는다.
    if (!fittedRef.current && located.length > 0 && !focus) {
      fittedRef.current = true;
      const group = L.featureGroup(
        located.map((p) => L.marker([p.lat as number, p.lng as number])),
      );
      map.fitBounds(group.getBounds().pad(0.25), { maxZoom: 16 });
    }
  }, [properties, onSelect, focus]);

  // 잠정 핀 (아직 저장 안 한 위치)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    provisionalRef.current?.remove();
    provisionalRef.current = undefined;
    if (!provisional) return;
    provisionalRef.current = L.marker(provisional, {
      icon: L.divIcon({ className: 'pin-wrap', html: '<div class="pin pin-new">여기</div>' }),
    }).addTo(map);
  }, [provisional]);

  // 특정 매물로 이동
  useEffect(() => {
    if (focus && mapRef.current) mapRef.current.setView(focus, Math.max(mapRef.current.getZoom(), 16));
  }, [focus]);

  return <div className="mapcanvas" ref={holder} role="application" aria-label="매물 지도" />;
}

function bubbleHtml(p: Property): string {
  const area = p.areaExclusive ?? p.areaSupply;
  const top = area ? `${Math.round(area)}㎡` : '';
  const price = `${dealPrefix(p.dealType).slice(0, 2)} ${formatDeal(p)}`;
  const cls = p.status === 'visited' ? 'pin pin-visited' : p.status === 'rejected' ? 'pin pin-out' : 'pin';
  return `<div class="${cls}">${top ? `<i>${escapeHtml(top)}</i>` : ''}<b>${escapeHtml(price)}</b></div>`;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;',
  );
}
