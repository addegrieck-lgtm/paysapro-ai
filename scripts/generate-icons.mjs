// Génère les icônes PWA (PNG) sans aucune dépendance : node scripts/generate-icons.mjs
// Dessin : feuille stylisée vert clair sur fond vert profond (identique à public/icons/icon.svg).
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

const BG = [31, 92, 68];
const LEAF = [143, 207, 159];

// Contour de la feuille (repère 48×48), courbes de Bézier échantillonnées.
function cubic(p0, p1, p2, p3, n = 40) {
  const pts = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return pts;
}
// M14 34 c0-11 8-19 21-20  -1 13 -9 21 -20 21
const LEAF_POLY = [[14, 34], ...cubic([14, 34], [14, 23], [22, 15], [35, 14]), ...cubic([35, 14], [34, 27], [26, 35], [15, 35])];

function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function inRoundRect(x, y, size, r) {
  const cx = Math.min(Math.max(x, r), size - r);
  const cy = Math.min(Math.max(y, r), size - r);
  return Math.hypot(x - cx, y - cy) <= r;
}

/** Couleur (RGBA) d'un point du repère 48×48. */
function sample(x, y, { rounded, scale }) {
  if (rounded && !inRoundRect(x, y, 48, 11)) return null;
  // mise à l'échelle autour du centre (zone de sécurité des icônes « maskable »)
  const lx = 24 + (x - 24) / scale;
  const ly = 24 + (y - 24) / scale;
  if (distToSegment(lx, ly, [14, 34], [27, 21]) <= 1.1 && inPoly(lx, ly, LEAF_POLY)) return BG;
  if (inPoly(lx, ly, LEAF_POLY)) return LEAF;
  return BG;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) {
    crc ^= b;
    for (let k = 0; k < 8; k++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function render(size, opts) {
  const SS = 4; // suréchantillonnage 4×4 pour l'anticrénelage
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = sample(((px + (sx + 0.5) / SS) / size) * 48, ((py + (sy + 0.5) / SS) / size) * 48, opts);
          if (!c) continue;
          r += c[0]; g += c[1]; b += c[2]; a += 1;
        }
      }
      const o = py * (size * 4 + 1) + 1 + px * 4;
      const n = SS * SS;
      raw[o] = a ? Math.round(r / a) : 0;
      raw[o + 1] = a ? Math.round(g / a) : 0;
      raw[o + 2] = a ? Math.round(b / a) : 0;
      raw[o + 3] = Math.round((a / n) * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // profondeur
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const FILES = [
  ['favicon-32.png', 32, { rounded: true, scale: 1 }],
  ['icon-192.png', 192, { rounded: true, scale: 1 }],
  ['icon-512.png', 512, { rounded: true, scale: 1 }],
  ['icon-maskable-512.png', 512, { rounded: false, scale: 0.8 }],
  ['apple-touch-icon.png', 180, { rounded: false, scale: 0.9 }],
];

for (const [name, size, opts] of FILES) {
  writeFileSync(join(OUT, name), render(size, opts));
  console.log(`✓ ${name}`);
}
