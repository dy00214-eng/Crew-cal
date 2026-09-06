/**
 * 사진 처리 — 기기 용량을 날려먹는 지점이다.
 * 저장 전에 반드시 리사이즈하고, 원본은 버린다.
 */

export const MAX_EDGE = 1600;
export const THUMB_EDGE = 200;
export const QUALITY = 0.8;
export const THUMB_QUALITY = 0.7;

export interface ProcessedImage {
  blob: Blob; // 긴 변 1600px, JPEG 0.8
  thumbBlob: Blob; // 긴 변 200px
  width: number;
  height: number;
}

export async function processImage(file: Blob): Promise<ProcessedImage> {
  const bitmap = await decode(file);
  try {
    const full = fit(bitmap.width, bitmap.height, MAX_EDGE);
    const thumb = fit(bitmap.width, bitmap.height, THUMB_EDGE);
    const blob = await draw(bitmap, full.w, full.h, QUALITY);
    const thumbBlob = await draw(bitmap, thumb.w, thumb.h, THUMB_QUALITY);
    return { blob, thumbBlob, width: full.w, height: full.h };
  } finally {
    bitmap.close?.();
  }
}

async function decode(file: Blob): Promise<ImageBitmap> {
  // EXIF 회전을 반영해 읽는다. 옵션을 모르는 브라우저는 두 번째 시도로 넘어간다.
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return await createImageBitmap(file);
  }
}

function fit(w: number, h: number, edge: number): { w: number; h: number } {
  const long = Math.max(w, h);
  if (long <= edge) return { w, h };
  const scale = edge / long;
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

async function draw(bitmap: ImageBitmap, w: number, h: number, quality: number): Promise<Blob> {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('캔버스를 만들지 못했습니다.');
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas.convertToBlob({ type: 'image/jpeg', quality });
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('캔버스를 만들지 못했습니다.');
  ctx.drawImage(bitmap, 0, 0, w, h);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('사진 변환에 실패했습니다.'))),
      'image/jpeg',
      quality,
    );
  });
}
