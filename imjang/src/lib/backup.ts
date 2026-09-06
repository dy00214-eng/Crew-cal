/**
 * 백업 — 서버가 없으므로 기기를 잃으면 전부 사라진다.
 * 전체 데이터 + 사진을 ZIP 하나로 내보내고, 같은 ZIP 으로 복원한다.
 */
import { unzipSync, zipSync } from 'fflate';
import { db } from '../db/db.ts';
import type { Photo, PriceRecord, Property } from '../db/types.ts';

const FORMAT = 'imjang-note-backup';
const VERSION = 1;

interface PhotoMeta {
  id: string;
  propertyId: string;
  caption?: string;
  takenAt: number;
  file: string;
  thumbFile: string;
}

interface BackupData {
  format: string;
  version: number;
  exportedAt: number;
  properties: Property[];
  priceRecords: PriceRecord[];
  photos: PhotoMeta[];
}

export interface ImportResult {
  properties: number;
  photos: number;
  priceRecords: number;
}

export async function exportZip(): Promise<{ blob: Blob; filename: string }> {
  const [properties, photos, priceRecords] = await Promise.all([
    db.properties.toArray(),
    db.photos.toArray(),
    db.priceRecords.toArray(),
  ]);

  const files: Record<string, [Uint8Array, { level: 0 | 6 }]> = {};
  const metas: PhotoMeta[] = [];

  for (const photo of photos) {
    const file = `photos/${photo.id}.jpg`;
    const thumbFile = `photos/${photo.id}.thumb.jpg`;
    // JPEG 는 이미 압축돼 있어 다시 압축하지 않는다.
    files[file] = [new Uint8Array(await photo.blob.arrayBuffer()), { level: 0 }];
    files[thumbFile] = [new Uint8Array(await photo.thumbBlob.arrayBuffer()), { level: 0 }];
    metas.push({
      id: photo.id,
      propertyId: photo.propertyId,
      caption: photo.caption,
      takenAt: photo.takenAt,
      file,
      thumbFile,
    });
  }

  const data: BackupData = {
    format: FORMAT,
    version: VERSION,
    exportedAt: Date.now(),
    properties,
    priceRecords,
    photos: metas,
  };
  files['data.json'] = [new TextEncoder().encode(JSON.stringify(data, null, 2)), { level: 6 }];

  const zipped = zipSync(files as never);
  const bytes = new Uint8Array(zipped);
  const blob = new Blob([bytes], { type: 'application/zip' });
  // 파일 이름은 ASCII 로 둔다. 크로미움은 한글 이름을 blob 다운로드에서 통째로 버려
  // 확장자까지 잃어버린다 (그러면 나중에 가져오기에서 고를 수 없다).
  return { blob, filename: `imjang-note-${stamp()}.zip` };
}

export async function importZip(buffer: ArrayBuffer): Promise<ImportResult> {
  const entries = unzipSync(new Uint8Array(buffer));
  const raw = entries['data.json'];
  if (!raw) throw new Error('백업 파일이 아닙니다 (data.json 없음).');

  const data = JSON.parse(new TextDecoder().decode(raw)) as BackupData;
  if (data.format !== FORMAT) throw new Error('임장 노트 백업 파일이 아닙니다.');
  if (data.version > VERSION) throw new Error('더 새로운 버전의 백업 파일입니다. 앱을 먼저 업데이트하세요.');

  const photos: Photo[] = [];
  for (const meta of data.photos ?? []) {
    const full = entries[meta.file];
    const thumb = entries[meta.thumbFile] ?? full;
    if (!full || !thumb) continue;
    photos.push({
      id: meta.id,
      propertyId: meta.propertyId,
      caption: meta.caption,
      takenAt: meta.takenAt,
      blob: new Blob([full], { type: 'image/jpeg' }),
      thumbBlob: new Blob([thumb], { type: 'image/jpeg' }),
    });
  }

  await db.transaction('rw', db.properties, db.photos, db.priceRecords, async () => {
    if (data.properties?.length) await db.properties.bulkPut(data.properties);
    if (photos.length) await db.photos.bulkPut(photos);
    if (data.priceRecords?.length) await db.priceRecords.bulkPut(data.priceRecords);
  });

  return {
    properties: data.properties?.length ?? 0,
    photos: photos.length,
    priceRecords: data.priceRecords?.length ?? 0,
  };
}

export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  // 다운로드가 시작될 시간을 준 뒤 회수한다. 바로 지우면 파일 이름을 잃는 브라우저가 있다.
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 10_000);
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}
