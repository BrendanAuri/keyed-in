// Draws the Keyed In app icons (three piano keys, two of them lit as a chord)
// and writes them to public/. No dependencies: shapes are rasterised with
// supersampling and PNGs are encoded with Node's built-in zlib. Run with `npm run icons`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const OUT = new URL('../public/', import.meta.url);

// Colours (match src/ui/styles.css).
const BG = [17, 19, 24];
const KEY = [232, 234, 240];
const BLACK_KEY = [58, 63, 77];
const ACCENT = [242, 184, 75];

// Geometry in a unit square. Three white keys with two black keys between them.
const KEYS_LEFT = 0.2;
const KEYS_TOP = 0.24;
const KEYS_BOTTOM = 0.76;
const KEY_WIDTH = 0.18;
const KEY_GAP = 0.03;
const KEY_CORNER = 0.04;
const BLACK_WIDTH = 0.11;
const BLACK_BOTTOM = 0.55;
const BLACK_CORNER = 0.03;
/** A ring of background around each black key, so it stands apart from the white keys. */
const BLACK_BORDER = 0.025;
/** Which white keys are lit: the 1st and 3rd, like the root and third of a chord. */
const LIT = [0, 2];
const CORNER = 0.22;
/** Maskable icons keep content inside the central 80 %. */
const MASKABLE_SCALE = 0.8;
const SAMPLES = 4;

const whiteKeys = [0, 1, 2].map((i) => ({
  x: KEYS_LEFT + i * (KEY_WIDTH + KEY_GAP),
  y: KEYS_TOP,
  w: KEY_WIDTH,
  h: KEYS_BOTTOM - KEYS_TOP,
  r: KEY_CORNER,
  colour: LIT.includes(i) ? ACCENT : KEY,
}));

const blackKeys = [1, 2].map((i) => ({
  x: KEYS_LEFT + i * (KEY_WIDTH + KEY_GAP) - KEY_GAP / 2 - BLACK_WIDTH / 2,
  y: KEYS_TOP,
  w: BLACK_WIDTH,
  h: BLACK_BOTTOM - KEYS_TOP,
  r: BLACK_CORNER,
}));

/** The background cut out around each black key. It starts above the keys, so its rounded top doesn't show. */
const cutouts = blackKeys.map((key) => ({
  x: key.x - BLACK_BORDER,
  y: key.y - BLACK_BORDER * 2,
  w: key.w + BLACK_BORDER * 2,
  h: key.h + BLACK_BORDER * 3,
  r: key.r + BLACK_BORDER,
}));

function inRoundedRect(x, y, rect) {
  if (x < rect.x || x > rect.x + rect.w || y < rect.y || y > rect.y + rect.h) return false;
  const cx = Math.min(Math.max(x, rect.x + rect.r), rect.x + rect.w - rect.r);
  const cy = Math.min(Math.max(y, rect.y + rect.r), rect.y + rect.h - rect.r);
  return Math.hypot(x - cx, y - cy) <= rect.r;
}

/** Colour and alpha of one sample point; `scale` shrinks the keys towards the centre. */
function sample(x, y, { rounded, scale }) {
  if (rounded && !inRoundedRect(x, y, { x: 0, y: 0, w: 1, h: 1, r: CORNER })) return null;
  const kx = 0.5 + (x - 0.5) / scale;
  const ky = 0.5 + (y - 0.5) / scale;
  if (blackKeys.some((key) => inRoundedRect(kx, ky, key))) return BLACK_KEY;
  if (cutouts.some((cutout) => inRoundedRect(kx, ky, cutout))) return BG;
  const white = whiteKeys.find((key) => inRoundedRect(kx, ky, key));
  return white ? white.colour : BG;
}

function render(size, options) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let covered = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const colour = sample((px + (sx + 0.5) / SAMPLES) / size, (py + (sy + 0.5) / SAMPLES) / size, options);
          if (!colour) continue;
          r += colour[0];
          g += colour[1];
          b += colour[2];
          covered++;
        }
      }
      const i = (py * size + px) * 4;
      if (covered > 0) {
        pixels[i] = Math.round(r / covered);
        pixels[i + 1] = Math.round(g / covered);
        pixels[i + 2] = Math.round(b / covered);
      }
      pixels[i + 3] = Math.round((covered / (SAMPLES * SAMPLES)) * 255);
    }
  }
  return pixels;
}

// ── PNG encoding ─────────────────────────────────────────────────────────

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) rgba.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── SVG favicon (same drawing as vector) ─────────────────────────────────

function svg() {
  const hex = (c) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  const n = (v) => +(v * 100).toFixed(2);
  const rect = (key, colour) =>
    `<rect x="${n(key.x)}" y="${n(key.y)}" width="${n(key.w)}" height="${n(key.h)}" rx="${n(key.r)}" fill="${hex(colour)}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="${CORNER * 100}" fill="${hex(BG)}"/>
${whiteKeys.map((key) => `  ${rect(key, key.colour)}`).join('\n')}
${cutouts.map((cutout) => `  ${rect(cutout, BG)}`).join('\n')}
${blackKeys.map((key) => `  ${rect(key, BLACK_KEY)}`).join('\n')}
</svg>
`;
}

const ICONS = [
  { file: 'icon-192.png', size: 192, rounded: true, scale: 1 },
  { file: 'icon-512.png', size: 512, rounded: true, scale: 1 },
  { file: 'icon-maskable-512.png', size: 512, rounded: false, scale: MASKABLE_SCALE },
  // iOS adds its own rounded corners and dislikes transparency.
  { file: 'apple-touch-icon.png', size: 180, rounded: false, scale: 0.9 },
];

mkdirSync(OUT, { recursive: true });
for (const icon of ICONS) {
  writeFileSync(new URL(icon.file, OUT), png(icon.size, render(icon.size, icon)));
  console.log(`wrote public/${icon.file}`);
}
writeFileSync(new URL('favicon.svg', OUT), svg());
console.log('wrote public/favicon.svg');
