// The World in One Day — Thursday 19 November 2026.
// Draws a 1024x1024 newspaper front page summing up six verified stories of
// 19 November 2026, with its own bitmap font and its own PNG encoder.
// Node 22, standard library only. No network, no external assets.
// Writes entry.png to $MAKEFUN_OUTPUT_DIR (or /output). Deterministic:
// the same bytes come out of every run.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------- font ----
// A 5x7 pixel font, one glyph per character: 7 rows of 5 bits each.
// '#' is ink, '.' is blank. All text on the page is set in this font.
const GLYPHS = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#..##', '#.#.#', '##..#', '#...#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  ';': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.#...'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
  '(': ['...##', '..#..', '.#...', '.#...', '.#...', '..#..', '...##'],
  ')': ['##...', '..#..', '...#.', '...#.', '...#.', '..#..', '##...'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '&': ['.##..', '#..#.', '#..#.', '.#...', '#.#.#', '#..#.', '.##.#'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '#.###', '#..##'],
  $: ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
  '+': ['.....', '..#..', '..#..', '.###.', '..#..', '..#..', '.....'],
  '=': ['.....', '.....', '.###.', '.....', '.###.', '.....', '.....'],
  _: ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
  '<': ['...#.', '..#..', '.#...', '#....', '.#...', '..#..', '...#.'],
  '>': ['.#...', '..#..', '...#.', '....#', '...#.', '..#..', '.#...'],
  '@': ['.###.', '#...#', '#.###', '#.#.#', '#.###', '#....', '.###.'],
};

// ------------------------------------------------------------- PNG out ----
// Minimal PNG encoder: 8-bit RGB, no interlace, filter 0 on every row.
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(w, h, rgb) {
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0;
    rgb.copy(raw, y * (1 + w * 3) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// -------------------------------------------------------------- canvas ----
const W = 1024;
const H = 1024;
const PAPER = [248, 243, 230];
const INK = [23, 21, 15];
const MUTED = [90, 83, 68];
const RULE = [168, 30, 30];

const px = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) {
  px[i * 3] = PAPER[0];
  px[i * 3 + 1] = PAPER[1];
  px[i * 3 + 2] = PAPER[2];
}

function setPix(x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 3;
  px[o] = c[0];
  px[o + 1] = c[1];
  px[o + 2] = c[2];
}

function fillRect(x, y, w, h, c) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) setPix(i, j, c);
}

function hline(x0, x1, y, c, t = 1) {
  for (let t0 = 0; t0 < t; t0++) for (let x = x0; x <= x1; x++) setPix(x, y + t0, c);
}

function vline(x, y0, y1, c, t = 1) {
  for (let t0 = 0; t0 < t; t0++) for (let y = y0; y <= y1; y++) setPix(x + t0, y, c);
}

// Bresenham line.
function line(x0, y0, x1, y1, c, t = 1) {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    fillRect(x - ((t / 2) | 0), y - ((t / 2) | 0), t, t, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function disc(cx, cy, r, c) {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) setPix(cx + x, cy + y, c);
    }
  }
}

function ring(cx, cy, r, c, t = 2) {
  for (let a = 0; a < 360; a += 1) {
    const rad = (a * Math.PI) / 180;
    for (let k = 0; k < t; k++) {
      setPix(Math.round(cx + (r + k) * Math.cos(rad)), Math.round(cy + (r + k) * Math.sin(rad)), c);
    }
  }
}

// Draw one line of text; returns the x just past the last glyph.
function drawText(str, x, y, s, c) {
  let cx = x;
  for (const ch of str) {
    const g = GLYPHS[ch] || GLYPHS['?'];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] === '#') fillRect(cx + col * s, y + r * s, s, s, c);
      }
    }
    cx += 6 * s;
  }
  return cx;
}

function textWidth(str, s) {
  return str.length * 6 * s - s;
}

// Greedy word wrap to a pixel width; returns lines.
function wrapText(str, maxW, s) {
  const words = str.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (textWidth(trial, s) <= maxW || !cur) cur = trial;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawTextBlock(str, x, y, maxW, s, c, lh) {
  const lines = wrapText(str, maxW, s);
  lines.forEach((ln, i) => drawText(ln, x, y + i * lh, s, c));
  return lines.length;
}

// --------------------------------------------------------------- icons ----
function drawFlag(x, y, w, h, kind) {
  if (kind === 'us') {
    for (let i = 0; i < 7; i++) fillRect(x, y + Math.floor((i * h) / 7), w, Math.ceil(h / 7), i % 2 ? [255, 255, 255] : [178, 34, 52]);
    fillRect(x, y, Math.floor(w * 0.42), Math.floor(h * 0.55), [60, 59, 110]);
    for (let r = 0; r < 3; r++) for (let c2 = 0; c2 < 3; c2++) disc(x + 5 + c2 * 6, y + 5 + r * 5, 1, [255, 255, 255]);
  } else if (kind === 'cn') {
    fillRect(x, y, w, h, [222, 41, 16]);
    disc(x + 9, y + 9, 4, [255, 222, 0]);
    disc(x + 20, y + 5, 2, [255, 222, 0]);
    disc(x + 24, y + 11, 2, [255, 222, 0]);
    disc(x + 20, y + 17, 2, [255, 222, 0]);
    disc(x + 14, y + 19, 2, [255, 222, 0]);
  } else {
    fillRect(x, y, w, Math.floor(h / 3), [255, 255, 255]);
    fillRect(x, y + Math.floor(h / 3), w, Math.floor(h / 3), [0, 57, 166]);
    fillRect(x, y + Math.floor((2 * h) / 3), w, h - Math.floor((2 * h) / 3), [213, 0, 50]);
  }
  // flag pole
  vline(x - 2, y - 6, y + h, INK, 2);
}

function drawSummit(x, y, w, h) {
  const fw = 46;
  const fh = 30;
  const gap = 10;
  const total = fw * 3 + gap * 2;
  const sx = x + Math.floor((w - total) / 2);
  const sy = y + Math.floor((h - fh) / 2);
  drawFlag(sx, sy, fw, fh, 'us');
  drawFlag(sx + fw + gap, sy, fw, fh, 'cn');
  drawFlag(sx + (fw + gap) * 2, sy, fw, fh, 'ru');
}

function drawGulf(x, y, w, h) {
  const cx = x + Math.floor(w / 2);
  const cy = y + Math.floor(h / 2);
  const ORANGE = [217, 119, 6];
  const RED = [185, 28, 28];
  const YELLOW = [245, 158, 11];
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6;
    const len = k % 2 ? 30 : 44;
    line(cx, cy, Math.round(cx + len * Math.cos(a)), Math.round(cy + len * Math.sin(a)), k % 3 ? ORANGE : RED, 5);
  }
  disc(cx, cy, 13, YELLOW);
  disc(cx, cy, 8, RED);
}

function drawBridge(x, y, w, h) {
  const cy = y + Math.floor(h * 0.55);
  const STEEL = [100, 116, 139];
  const DARK = [51, 65, 85];
  // towers
  fillRect(x + 26, y + 6, 8, cy - y - 6, DARK);
  fillRect(x + w - 34, y + 6, 8, cy - y - 6, DARK);
  // deck: two spans with a broken gap in the middle
  const mid = x + Math.floor(w / 2);
  hline(x, mid - 16, cy, STEEL, 6);
  hline(mid + 16, x + w, cy, STEEL, 6);
  // fallen span, tilted into the water
  line(mid - 14, cy + 4, mid + 6, cy + 26, STEEL, 6);
  // arch cables
  line(x + 30, y + 6, mid - 16, cy, DARK, 2);
  line(x + w - 30, y + 6, mid + 16, cy, DARK, 2);
  // water
  for (let i = 0; i < 5; i++) hline(x + 8 + i * 30, x + 30 + i * 30, y + h - 12 - (i % 2) * 5, [56, 130, 180], 2);
}

function drawChart(x, y, w, h) {
  const base = y + h - 8;
  const GREEN = [4, 120, 87];
  const bars = [0.3, 0.45, 0.62, 0.85];
  const bw = 16;
  const gap = 12;
  const total = bars.length * bw + (bars.length - 1) * gap;
  let bx = x + Math.floor((w - total) / 2);
  for (const f of bars) {
    const bh = Math.floor((h - 22) * f);
    fillRect(bx, base - bh, bw, bh, GREEN);
    bx += bw + gap;
  }
  hline(x + 4, x + w - 4, base, INK, 2);
  // rising arrow
  line(x + 6, base - Math.floor((h - 22) * 0.32), x + w - 14, y + 6, [185, 28, 28], 3);
  line(x + w - 14, y + 6, x + w - 26, y + 6, [185, 28, 28], 3);
  line(x + w - 14, y + 6, x + w - 14, y + 18, [185, 28, 28], 3);
}

function drawScales(x, y, w, h) {
  const cx = x + Math.floor(w / 2);
  const GOLD = [180, 130, 29];
  const base = y + h - 6;
  // post and base
  vline(cx, y + 8, base, INK, 4);
  hline(cx - 22, cx + 22, base, INK, 4);
  // beam
  hline(cx - 34, cx + 34, y + 12, GOLD, 4);
  disc(cx, y + 12, 4, GOLD);
  // pans
  for (const s of [-1, 1]) {
    const px0 = cx + s * 34;
    line(px0, y + 14, px0 - 10, y + 34, GOLD, 2);
    line(px0, y + 14, px0 + 10, y + 34, GOLD, 2);
    hline(px0 - 11, px0 + 11, y + 34, GOLD, 3);
    fillRect(px0 - 11, y + 34, 23, 3, GOLD);
  }
}

function drawCyclone(x, y, w, h) {
  const cx = x + Math.floor(w / 2);
  const cy = y + Math.floor(h / 2);
  const TEAL = [3, 105, 161];
  // spiral: r grows with angle
  for (let t = 0; t < Math.PI * 5; t += 0.08) {
    const r = 3 + 4.6 * t;
    const px0 = Math.round(cx + r * Math.cos(t));
    const py0 = Math.round(cy + r * Math.sin(t));
    fillRect(px0 - 2, py0 - 2, 4, 4, TEAL);
  }
  disc(cx, cy, 5, PAPER);
  ring(cx, cy, 5, TEAL, 2);
}

const ICONS = {
  summit: drawSummit,
  gulf: drawGulf,
  bridge: drawBridge,
  chart: drawChart,
  scales: drawScales,
  cyclone: drawCyclone,
};

// -------------------------------------------------------------- stories ----
const STORIES = [
  {
    kicker: 'DIPLOMACY',
    accent: [29, 78, 216],
    icon: 'summit',
    head: 'TRUMP, XI & PUTIN MEET IN SHENZHEN',
    body: 'FIRST-EVER TRILATERAL OF THE THREE NUCLEAR POWERS, ON THE APEC SIDELINES. NUCLEAR ARMS, AI AND TRADE ON THE AGENDA - UKRAINE NOT ON IT.',
  },
  {
    kicker: 'THE GULF WAR',
    accent: [180, 83, 9],
    icon: 'gulf',
    head: 'IRAN HITS US BASES IN KUWAIT & BAHRAIN',
    body: 'TEHRAN DRONES HIT ALI AL SALEM BASE AFTER US JETS STRUCK QESHM ISLAND. GULF ON ALERT.',
  },
  {
    kicker: 'UKRAINE WAR',
    accent: [124, 58, 237],
    icon: 'bridge',
    head: 'KERCH BRIDGE HIT AGAIN - TRAFFIC HALTED',
    body: 'THIRD STRIKE IN A WEEK, HOURS BEFORE PUTIN MEETS TRUMP AND XI. ROAD SPAN DOWN; RAIL TARGETED.',
  },
  {
    kicker: 'MARKETS',
    accent: [4, 120, 87],
    icon: 'chart',
    head: 'ANTHROPIC DEBUTS - BIGGEST IPO EVER',
    body: 'CLAUDE MAKER LISTS AS ANT AFTER A RECORD $81.3B OFFERING AT $83 A SHARE - ABOUT $1.5T FULLY DILUTED.',
  },
  {
    kicker: 'JUSTICE',
    accent: [14, 116, 144],
    icon: 'scales',
    head: 'WORLD COURT RULES ON MYANMAR GENOCIDE',
    body: 'AFTER SEVEN YEARS, THE ICJ DELIVERS ITS FINAL JUDGMENT OVER THE ROHINGYA - NO APPEAL, NO ENFORCEMENT.',
  },
  {
    kicker: 'WEATHER',
    accent: [3, 105, 161],
    icon: 'cyclone',
    head: 'CYCLONE AKVAN BEARS DOWN ON INDIA',
    body: 'SEVERE STORM IN THE BAY OF BENGAL; 46,700 EVACUATED IN ODISHA AS RED ALERTS GO UP. LANDFALL DUE AT NOON FRIDAY BETWEEN NARSAPUR AND PURI.',
  },
];

// -------------------------------------------------------------- layout ----
const M = 28; // outer margin
const CW = W - 2 * M; // content width

// Masthead.
const mast = 'THE WORLD IN ONE DAY';
drawText(mast, Math.floor((W - textWidth(mast, 6)) / 2), 22, 6, INK);
hline(M, W - M, 80, RULE, 3);
const dateline = 'THURSDAY 19 NOVEMBER 2026';
drawText(dateline, Math.floor((W - textWidth(dateline, 3)) / 2), 92, 3, MUTED);
hline(M, W - M, 124, INK, 2);

// Lead story: full width, icon left, text right. Lead cells centre their
// content vertically; grid cells are top-aligned.
function storyCell(x, y, w, h, s, lead) {
  // panel
  fillRect(x, y, w, h, [255, 255, 255]);
  // accent top rule
  fillRect(x, y, w, 4, s.accent);
  // thin border
  hline(x, x + w, y + h, MUTED, 1);
  vline(x, y, y + h, MUTED, 1);
  vline(x + w, y, y + h, MUTED, 1);
  const pad = 16;
  const iconW = lead ? 190 : 118;
  const iconH = lead ? 130 : 84;
  const headScale = lead ? 3 : 2;
  const headLh = headScale === 3 ? 26 : 20;
  const tx = x + pad + iconW + 14;
  const tw = x + w - pad - tx;
  const headLines = wrapText(s.head, tw, headScale);
  const bodyLines = wrapText(s.body, tw, 2);
  const textH = 14 + 8 + headLines.length * headLh + 6 + bodyLines.length * 17;
  const top = lead ? y + Math.floor((h - Math.max(iconH, textH)) / 2) : y;
  const iy = lead ? y + Math.floor((h - iconH) / 2) : y + 30;
  ICONS[s.icon](x + pad, iy, iconW, iconH);
  drawText(s.kicker, tx, top + 14, 2, s.accent);
  headLines.forEach((ln, i) => drawText(ln, tx, top + 36 + i * headLh, headScale, INK));
  bodyLines.forEach((ln, i) =>
    drawText(ln, tx, top + 36 + headLines.length * headLh + 6 + i * 17, 2, MUTED),
  );
}

const lead = STORIES[0];
storyCell(M, 136, CW, 182, lead, true);

// Grid: two columns, two rows.
const gridTop = 330;
const gridH = 194;
const colW = Math.floor((CW - 12) / 2);
storyCell(M, gridTop, colW, gridH, STORIES[1], false);
storyCell(M + colW + 12, gridTop, colW, gridH, STORIES[2], false);
storyCell(M, gridTop + gridH + 12, colW, gridH, STORIES[3], false);
storyCell(M + colW + 12, gridTop + gridH + 12, colW, gridH, STORIES[4], false);

// Bottom band: cyclone, full width.
const botTop = gridTop + 2 * gridH + 24;
storyCell(M, botTop, CW, 204, STORIES[5], true);

// Footer.
const foot = 'SIX STORIES FROM 19 NOVEMBER 2026 - DRAWN FROM WIRE REPORTS';
drawText(foot, Math.floor((W - textWidth(foot, 2)) / 2), botTop + 204 + 16, 2, MUTED);

// -------------------------------------------------------------- write -----
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), encodePNG(W, H, px));
