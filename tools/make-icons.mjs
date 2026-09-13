#!/usr/bin/env node
/**
 * The extension's toolbar and store icons.
 *
 * MV3 will not take an SVG, so these have to be rasters, and a raster in a repo
 * is a binary nobody can review. Hence a generator: the mark is described once
 * as geometry and colour here, the PNGs are reproducible from it, and a change
 * to the brand is a diff in this file rather than an opaque blob swap.
 *
 * No image dependency. `sharp` left with the Cloudflare residue in Phase 3 and
 * is not worth reinstating for four flat shapes — `node:zlib` is a PNG encoder
 * once you wrap it in the chunk framing below.
 *
 *   node tools/make-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "apps", "ext", "public", "icons");
const SIZES = [16, 32, 48, 128];
/** Sub-samples per axis. The bowls of the B are curved; 4x4 is enough at 16px. */
const SS = 4;

/* ------------------------------------------------------------------ colour */

/**
 * The side panel's own header, so the toolbar button and the panel it opens are
 * visibly the same product: `.panel-bar`'s 135° navy gradient, ruled underneath
 * in the same accent as its 2px bottom border.
 */
const GRADIENT = [
  { at: 0.0, rgb: [0x0d, 0x21, 0x37] },
  { at: 0.6, rgb: [0x1a, 0x3c, 0x5e] },
  { at: 1.0, rgb: [0x2a, 0x2a, 0x6e] },
];
const GLYPH = [0xff, 0xff, 0xff];
const ACCENT = [0xe6, 0x7e, 0x22];

function gradientAt(t) {
  let lo = GRADIENT[0], hi = GRADIENT[GRADIENT.length - 1];
  for (let i = 0; i < GRADIENT.length - 1; i++) {
    if (t >= GRADIENT[i].at && t <= GRADIENT[i + 1].at) { lo = GRADIENT[i]; hi = GRADIENT[i + 1]; break; }
  }
  const span = hi.at - lo.at || 1;
  const k = Math.min(1, Math.max(0, (t - lo.at) / span));
  return [0, 1, 2].map(i => Math.round(lo.rgb[i] + (hi.rgb[i] - lo.rgb[i]) * k));
}

/* ---------------------------------------------------------------- geometry */

/** Everything below is in a 0..1 square, so one description serves every size. */
const TILE_RADIUS = 0.22;
const STEM = { x0: 0.300, x1: 0.395, y0: 0.180, y1: 0.683, r: 0.020 };
/**
 * The bowls are elliptical, not circular. A circular bowl wide enough to balance
 * the stem is also tall enough to leave the tile, which is what made the first
 * cut of this mark read as a narrow 13.
 */
const UPPER = { cx: 0.380, cy: 0.305, rx: 0.245, ry: 0.125, tx: 0.095, ty: 0.058 };
const LOWER = { cx: 0.380, cy: 0.555, rx: 0.265, ry: 0.128, tx: 0.095, ty: 0.058 };
const RULE = { x0: 0.300, x1: 0.660, y0: 0.755, y1: 0.815, r: 0.030 };

const inRoundedRect = (x, y, x0, y0, x1, y1, r) => {
  const dx = Math.max(x0 + r - x, 0, x - (x1 - r));
  const dy = Math.max(y0 + r - y, 0, y - (y1 - r));
  return x >= x0 && x <= x1 && y >= y0 && y <= y1 && dx * dx + dy * dy <= r * r;
};

const inEllipse = (x, y, cx, cy, rx, ry) => {
  const dx = (x - cx) / rx, dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
};

/** A bowl is the right half of an elliptical ring, so it springs from the stem. */
const inBowl = (x, y, b) =>
  x >= b.cx &&
  inEllipse(x, y, b.cx, b.cy, b.rx, b.ry) &&
  !inEllipse(x, y, b.cx, b.cy, b.rx - b.tx, b.ry - b.ty);

const inGlyph = (x, y) =>
  inRoundedRect(x, y, STEM.x0, STEM.y0, STEM.x1, STEM.y1, STEM.r) ||
  inBowl(x, y, UPPER) || inBowl(x, y, LOWER);

/* ----------------------------------------------------------- PNG container */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** 8-bit RGBA, no interlace, every scanline filtered "none". */
function encodePng(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ render */

function render(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const samples = SS * SS;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let tile = 0, glyph = 0, rule = 0, gr = 0, gg = 0, gb = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / size;
          const y = (py + (sy + 0.5) / SS) / size;
          if (!inRoundedRect(x, y, 0, 0, 1, 1, TILE_RADIUS)) continue;
          tile++;
          const [r, g, b] = gradientAt((x + y) / 2);
          gr += r; gg += g; gb += b;
          if (inGlyph(x, y)) glyph++;
          else if (inRoundedRect(x, y, RULE.x0, RULE.y0, RULE.x1, RULE.y1, RULE.r)) rule++;
        }
      }
      const offset = (py * size + px) * 4;
      if (!tile) continue;
      // Coverages are disjoint by construction, so each one's share of the
      // sub-samples is its share of the pixel.
      const base = tile - glyph - rule;
      const r = (gr / tile) * base + GLYPH[0] * glyph + ACCENT[0] * rule;
      const g = (gg / tile) * base + GLYPH[1] * glyph + ACCENT[1] * rule;
      const b = (gb / tile) * base + GLYPH[2] * glyph + ACCENT[2] * rule;
      rgba[offset] = Math.round(r / tile);
      rgba[offset + 1] = Math.round(g / tile);
      rgba[offset + 2] = Math.round(b / tile);
      rgba[offset + 3] = Math.round((tile / samples) * 255);
    }
  }
  return encodePng(size, rgba);
}

mkdirSync(outDir, { recursive: true });
for (const size of SIZES) {
  const file = join(outDir, `icon-${size}.png`);
  writeFileSync(file, render(size));
  console.log(`wrote apps/ext/public/icons/icon-${size}.png`);
}
