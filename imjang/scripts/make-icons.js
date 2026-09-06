/**
 * 홈 화면 아이콘을 만든다. (외부 라이브러리 없이 zlib 만으로 PNG 를 쓴다)
 *
 *   node scripts/make-icons.js
 *     -> public/icons/icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png
 *
 * 아이폰은 apple-touch-icon 으로 SVG 를 받지 않아서, 실제 PNG 가 필요하다.
 * 그림은 4번 디자인 토큰(종이·잉크·도장 빨강) 그대로 간다.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const PAPER = [250, 249, 246];
const INK = [28, 31, 38];
const RULE = [216, 213, 204];
const STAMP = [166, 57, 47];

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
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
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0; // filter: none
    rgba.copy(raw, row + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** 겹쳐 그리기 위한 간단한 캔버스. 좌표는 0~1 비율로 받는다. */
function canvas(size, bg) {
  const buf = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    buf[i * 4] = bg[0];
    buf[i * 4 + 1] = bg[1];
    buf[i * 4 + 2] = bg[2];
    buf[i * 4 + 3] = 255;
  }
  const px = (x, y, [r, g, b], a) => {
    if (a <= 0 || x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    const inv = 1 - a;
    buf[i] = Math.round(buf[i] * inv + r * a);
    buf[i + 1] = Math.round(buf[i + 1] * inv + g * a);
    buf[i + 2] = Math.round(buf[i + 2] * inv + b * a);
    buf[i + 3] = 255;
  };
  // 모서리가 둥근 사각형. 경계는 4배로 잘게 나눠 계단이 안 보이게 한다.
  const rrect = (x0, y0, x1, y1, r, color, alpha = 1) => {
    const [X0, Y0, X1, Y1, R] = [x0 * size, y0 * size, x1 * size, y1 * size, r * size];
    for (let y = Math.floor(Y0); y < Math.ceil(Y1); y += 1) {
      for (let x = Math.floor(X0); x < Math.ceil(X1); x += 1) {
        let hit = 0;
        for (let sy = 0; sy < 4; sy += 1) {
          for (let sx = 0; sx < 4; sx += 1) {
            const cxp = x + (sx + 0.5) / 4;
            const cyp = y + (sy + 0.5) / 4;
            if (cxp < X0 || cxp > X1 || cyp < Y0 || cyp > Y1) continue;
            const cx = Math.min(Math.max(cxp, X0 + R), X1 - R);
            const cy = Math.min(Math.max(cyp, Y0 + R), Y1 - R);
            const dx = cxp - cx;
            const dy = cyp - cy;
            if (dx * dx + dy * dy <= R * R) hit += 1;
          }
        }
        if (hit) px(x, y, color, (hit / 16) * alpha);
      }
    }
  };
  return { buf, rrect };
}

/** inset: 마스크에 잘려도 되는 바깥 여백 비율 */
function icon(size, inset) {
  const c = canvas(size, PAPER);
  const a = inset;
  const b = 1 - inset;
  const w = b - a;

  // 수첩 테두리
  const t = w * 0.035;
  c.rrect(a, a, b, a + t, 0, INK);
  c.rrect(a, b - t, b, b, 0, INK);
  c.rrect(a, a, a + t, b, 0, INK);
  c.rrect(b - t, a, b, b, 0, INK);

  // 머리 줄 (제목 칸)
  c.rrect(a, a + w * 0.2, b, a + w * 0.2 + t * 0.7, 0, INK);

  // 야장의 기입 줄
  for (let i = 0; i < 3; i += 1) {
    const y = a + w * (0.36 + i * 0.15);
    c.rrect(a + w * 0.12, y, b - w * 0.12, y + t * 0.6, 0, RULE);
  }

  // 도장: 붉은 사각 테두리
  const s0 = a + w * 0.56;
  const s1 = a + w * 0.88;
  const ring = w * 0.05;
  c.rrect(s0, s0, s1, s1, w * 0.03, STAMP);
  c.rrect(s0 + ring, s0 + ring, s1 - ring, s1 - ring, w * 0.02, PAPER);
  c.rrect(s0 + ring * 2, s0 + ring * 2, s1 - ring * 2, s1 - ring * 2, w * 0.015, STAMP);

  return png(size, c.buf);
}

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
fs.mkdirSync(dir, { recursive: true });

const targets = [
  ['icon-192.png', 192, 0.06],
  ['icon-512.png', 512, 0.06],
  // 마스커블은 안전 영역(가운데 80%) 안에만 그린다.
  ['icon-maskable-512.png', 512, 0.18],
  ['apple-touch-icon.png', 180, 0.06],
];

for (const [name, size, inset] of targets) {
  const file = path.join(dir, name);
  fs.writeFileSync(file, icon(size, inset));
  console.log(`만들었습니다: public/icons/${name} (${Math.round(fs.statSync(file).size / 1024)}KB)`);
}
