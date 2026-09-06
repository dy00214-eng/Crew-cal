/**
 * 홈 화면 아이콘을 만든다. (외부 라이브러리 없이 zlib 만으로 PNG 를 쓴다)
 *
 *   node scripts/make-icons.js   -> icons/icon-180.png, icon-192.png, icon-512.png
 *
 * 아이폰은 apple-touch-icon 으로 SVG 를 받지 않아서, 실제 PNG 가 필요하다.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0; // filter: none
    rgba.copy(raw, row + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/** 겹쳐 그리기 위한 간단한 캔버스. 좌표는 0~1 비율로 받는다. */
function canvas(size) {
  const buf = Buffer.alloc(size * size * 4);
  const px = (x, y, [r, g, b], a) => {
    if (a <= 0 || x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    const inv = 1 - a;
    buf[i] = Math.round(buf[i] * inv + r * a);
    buf[i + 1] = Math.round(buf[i + 1] * inv + g * a);
    buf[i + 2] = Math.round(buf[i + 2] * inv + b * a);
    buf[i + 3] = Math.round(buf[i + 3] * inv + 255 * a);
  };
  // 모서리가 둥근 사각형. 경계는 4배로 잘게 나눠 계단이 안 보이게 한다.
  const rrect = (x0, y0, x1, y1, r, color, alpha = 1) => {
    const [X0, Y0, X1, Y1, R] = [x0 * size, y0 * size, x1 * size, y1 * size, r * size];
    for (let y = Math.floor(Y0); y < Math.ceil(Y1); y++) {
      for (let x = Math.floor(X0); x < Math.ceil(X1); x++) {
        let hit = 0;
        for (let sy = 0; sy < 4; sy++) {
          for (let sx = 0; sx < 4; sx++) {
            const px0 = x + (sx + 0.5) / 4;
            const py0 = y + (sy + 0.5) / 4;
            if (px0 < X0 || px0 > X1 || py0 < Y0 || py0 > Y1) continue;
            const cx = Math.min(Math.max(px0, X0 + R), X1 - R);
            const cy = Math.min(Math.max(py0, Y0 + R), Y1 - R);
            const dx = px0 - cx;
            const dy = py0 - cy;
            if (dx * dx + dy * dy <= R * R) hit++;
          }
        }
        if (hit) px(x, y, color, (hit / 16) * alpha);
      }
    }
  };
  return { buf, rrect };
}

const BLUE_TOP = [10, 132, 255];
const BLUE_BOTTOM = [47, 111, 237];
const INK = [28, 35, 51];
const WHITE = [255, 255, 255];
const RED = [255, 69, 58];

function icon(size) {
  const c = canvas(size);
  // 바탕: 위아래로 살짝 번지는 파랑 (마스크가 잘려도 괜찮게 꽉 채운다)
  for (let y = 0; y < size; y++) {
    const t = y / (size - 1);
    const color = BLUE_TOP.map((v, i) => v + (BLUE_BOTTOM[i] - v) * t);
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      c.buf[i] = Math.round(color[0]);
      c.buf[i + 1] = Math.round(color[1]);
      c.buf[i + 2] = Math.round(color[2]);
      c.buf[i + 3] = 255;
    }
  }
  // 달력 몸통
  c.rrect(0.2, 0.245, 0.8, 0.775, 0.075, WHITE);
  // 달력 머리띠
  c.rrect(0.2, 0.245, 0.8, 0.385, 0.075, INK);
  c.rrect(0.2, 0.34, 0.8, 0.385, 0.0, INK);
  // 고리 두 개
  c.rrect(0.33, 0.18, 0.395, 0.29, 0.033, WHITE);
  c.rrect(0.605, 0.18, 0.67, 0.29, 0.033, WHITE);
  // 날짜 칸: 3줄 x 4칸, 한 칸만 빨갛게 (비행 표시)
  const cols = 4;
  const rows = 3;
  const left = 0.265;
  const right = 0.735;
  const top = 0.445;
  const bottom = 0.71;
  const cw = (right - left) / cols;
  const ch = (bottom - top) / rows;
  const pad = cw * 0.22;
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const flight = r === 1 && k === 2;
      c.rrect(
        left + k * cw + pad / 2, top + r * ch + pad / 2,
        left + (k + 1) * cw - pad / 2, top + (r + 1) * ch - pad / 2,
        cw * 0.16, flight ? RED : INK, flight ? 1 : 0.32
      );
    }
  }
  return png(size, c.buf);
}

const dir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(dir, { recursive: true });
[180, 192, 512].forEach((size) => {
  const file = path.join(dir, 'icon-' + size + '.png');
  fs.writeFileSync(file, icon(size));
  console.log('만들었습니다: icons/icon-' + size + '.png (' + Math.round(fs.statSync(file).size / 1024) + 'KB)');
});
