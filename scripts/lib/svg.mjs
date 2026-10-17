// Shared primitives for the profile SVGs.
// GitHub serves README images through <img>, which never loads web fonts, so
// every piece of text is converted to outlines here to render identically everywhere.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import opentype from 'opentype.js';

const require = createRequire(import.meta.url);

export const color = {
  void: '#080C16',
  panel: '#111827',
  line: '#1E293B',
  ink: '#F8FAFC',
  mist: '#94A3B8',
  dim: '#475569',
  signal: '#67E8F9',
  violet: '#A78BFA',
};

const fontFile = {
  sans400: '@fontsource/geist-sans/files/geist-sans-latin-400-normal.woff',
  sans500: '@fontsource/geist-sans/files/geist-sans-latin-500-normal.woff',
  sans600: '@fontsource/geist-sans/files/geist-sans-latin-600-normal.woff',
  mono400: '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff',
};

const fonts = {};
function font(name) {
  if (!fonts[name]) {
    const buf = readFileSync(require.resolve(fontFile[name]));
    fonts[name] = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  }
  return fonts[name];
}

// Lays out a single line glyph by glyph so tracking (in em) and kerning both apply.
function layout(str, { font: name = 'sans400', size = 16, tracking = 0 }) {
  const f = font(name);
  const scale = size / f.unitsPerEm;
  const glyphs = f.stringToGlyphs(str);
  const placed = [];
  let x = 0;
  glyphs.forEach((g, i) => {
    placed.push({ g, x });
    x += g.advanceWidth * scale + tracking * size;
    if (glyphs[i + 1]) x += f.getKerningValue(g, glyphs[i + 1]) * scale;
  });
  return { f, placed, width: x - (glyphs.length ? tracking * size : 0) };
}

export function measure(str, opts) {
  return layout(str, opts).width;
}

/** Text as a single <path>. anchor: 'start' | 'middle' | 'end'. */
export function text(str, x, y, opts = {}) {
  const { size = 16, fill = color.ink, anchor = 'start', attrs = '' } = opts;
  const { f, placed, width } = layout(str, opts);
  const x0 = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  const d = placed
    .map(({ g, x: gx }) => g.getPath(x0 + gx, y, size).toPathData(1))
    .filter(Boolean)
    .join('');
  return `<path d="${d}" fill="${fill}"${attrs ? ' ' + attrs : ''}/>`;
}

/** Simple Icons glyph (24×24 viewBox) scaled into a size×size box at x,y. */
export function icon(si, x, y, size, fill = color.ink, attrs = '') {
  const s = (size / 24).toFixed(4);
  return `<path transform="translate(${x} ${y}) scale(${s})" d="${si.path}" fill="${fill}"${attrs ? ' ' + attrs : ''}/>`;
}

export function svg({ width, height, title, desc, defs = '', style = '', body }) {
  const css = style.replace(/\s+/g, ' ').trim();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" role="img" aria-labelledby="t d">
<title id="t">${escape(title)}</title>
<desc id="d">${escape(desc)}</desc>
${css ? `<style>${css}</style>\n` : ''}${defs ? `<defs>${defs}</defs>\n` : ''}${body}
</svg>
`;
}

export function escape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  console.log(`${path}  ${(Buffer.byteLength(content) / 1024).toFixed(1)} kB`);
}

// Card shell shared by every asset: dark surface, hairline border, ambient light.
export function cardDefs(id, w, h) {
  return `
<clipPath id="${id}-clip"><rect width="${w}" height="${h}" rx="24"/></clipPath>
<radialGradient id="${id}-glow-a" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${w * 0.82} ${h * 0.12}) scale(${w * 0.42} ${h * 0.9})">
  <stop stop-color="${color.signal}" stop-opacity=".16"/><stop offset="1" stop-color="${color.signal}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="${id}-glow-b" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${w * 0.62} ${h * 1.05}) scale(${w * 0.4} ${h * 0.8})">
  <stop stop-color="${color.violet}" stop-opacity=".14"/><stop offset="1" stop-color="${color.violet}" stop-opacity="0"/>
</radialGradient>
<linearGradient id="${id}-signal" x1="0" y1="0" x2="1" y2="0">
  <stop stop-color="${color.signal}"/><stop offset="1" stop-color="${color.violet}"/>
</linearGradient>
<linearGradient id="${id}-signal-x" x1="0" y1="0" x2="${w}" y2="0" gradientUnits="userSpaceOnUse">
  <stop stop-color="${color.signal}"/><stop offset="1" stop-color="${color.violet}"/>
</linearGradient>
<linearGradient id="${id}-signal-y" x1="0" y1="0" x2="0" y2="${h}" gradientUnits="userSpaceOnUse">
  <stop stop-color="${color.signal}"/><stop offset="1" stop-color="${color.violet}"/>
</linearGradient>
<pattern id="${id}-dots" width="24" height="24" patternUnits="userSpaceOnUse">
  <circle cx="1" cy="1" r="1" fill="${color.mist}"/>
</pattern>`;
}

export function cardBase(id, w, h, { dots = 0.07 } = {}) {
  return `<rect width="${w}" height="${h}" rx="24" fill="${color.void}"/>
<g clip-path="url(#${id}-clip)">
  <rect class="ambient" width="${w}" height="${h}" fill="url(#${id}-glow-a)"/>
  <rect class="ambient b" width="${w}" height="${h}" fill="url(#${id}-glow-b)"/>
  <rect width="${w}" height="${h}" fill="url(#${id}-dots)" opacity="${dots}"/>
</g>
<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="23.5" stroke="${color.line}"/>`;
}

// Motion lives in CSS (not SMIL) so prefers-reduced-motion can switch all of it off.
// Every animated element rests in its final, fully visible state when motion is disabled.
export const motionCss = `
.ambient { animation: drift 16s ease-in-out infinite alternate; transform-origin: center; }
.ambient.b { animation-duration: 21s; animation-direction: alternate-reverse; }
@keyframes drift { from { transform: translate(-1.5%, -1%); opacity: .75 } to { transform: translate(1.5%, 1%); opacity: 1 } }
.draw { stroke-dasharray: var(--len); animation: draw 1.6s cubic-bezier(.6,.1,.2,1) both; }
@keyframes draw { from { stroke-dashoffset: var(--len) } to { stroke-dashoffset: 0 } }
.fade { animation: fade .9s ease-out both; }
@keyframes fade { from { opacity: 0 } to { opacity: 1 } }
.pulse { animation: travel var(--dur, 6s) linear infinite; animation-delay: var(--delay, 1.8s); stroke-dashoffset: var(--start); opacity: 0; }
@keyframes travel { 0% { stroke-dashoffset: var(--start); opacity: 0 } 6% { opacity: 1 } 70% { opacity: 1 } 78%, 100% { stroke-dashoffset: var(--end); opacity: 0 } }
@media (prefers-reduced-motion: reduce) {
  .ambient, .draw, .fade { animation: none; }
  .pulse { display: none; }
}`;
