// Builds the static profile artwork: hero, system map and section divider.
// Each piece that carries text has a compact variant served to narrow screens
// through <picture media="(max-width: …)">, so nothing shrinks below legibility.
import * as si from 'simple-icons';
import { color, text, measure, icon, svg, write, cardDefs, cardBase, motionCss } from './lib/svg.mjs';

const OUT = new URL('../assets/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');

// ---------------------------------------------------------------- geometry

/** Orthogonal route with 45° chamfered corners, as traces are drawn on a board. */
function route(points, r = 14) {
  let d = `M${points[0][0]} ${points[0][1]}`;
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i];
    const [px, py] = points[i - 1];
    const seg = Math.hypot(x - px, y - py);
    const next = points[i + 1];
    if (!next) {
      d += `L${x} ${y}`;
      len += seg - (i > 1 ? r : 0);
      continue;
    }
    const ux = Math.sign(x - px), uy = Math.sign(y - py);
    const vx = Math.sign(next[0] - x), vy = Math.sign(next[1] - y);
    d += `L${x - ux * r} ${y - uy * r}L${x + vx * r} ${y + vy * r}`;
    len += seg - r - (i > 1 ? r : 0) + r * Math.SQRT2;
  }
  return { d, len: Math.round(len) };
}

function trace(points, { stroke = color.dim, width = 1.5, cls = 'draw', delay = 0, opacity = 1 } = {}) {
  const { d, len } = route(points);
  return `<path class="${cls}" d="${d}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}" style="--len:${len};animation-delay:${delay}s"/>`;
}

function pulse(points, gradient, { dur = 6, delay = 1.8, seg = 70, width = 2.5 } = {}) {
  const { d, len } = route(points);
  return `<path class="pulse" d="${d}" stroke="${gradient}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${seg} ${len + seg * 2}" style="--start:${seg};--end:${-len};--dur:${dur}s;--delay:${delay}s"/>`;
}

const node = (x, y, s, { stroke = color.dim, fill = color.void, delay = 0 } = {}) =>
  `<rect class="fade" x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" rx="${s / 5}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" style="animation-delay:${delay}s"/>`;

/**
 * The hero network, in coordinates relative to its hub. A request enters on the
 * left, crosses the hub (the API) and ends in the violet agent node.
 */
function network(id) {
  const P = {
    in: [-170, -110], a: [-90, -110], hub: [0, 0], b: [150, 0], ai: [150, 112],
    c: [-110, 112], d: [240, -110], e: [-170, 40],
  };
  const signal = [P.in, P.a, [0, -110], P.hub, P.b, P.ai];
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * Math.PI * 2;
    const r1 = 196, r2 = i % 5 ? 202 : 210;
    return `M${(Math.cos(a) * r1).toFixed(1)} ${(Math.sin(a) * r1).toFixed(1)}L${(Math.cos(a) * r2).toFixed(1)} ${(Math.sin(a) * r2).toFixed(1)}`;
  }).join('');
  return `
<g class="fade" style="animation-duration:2.4s">
  <circle r="196" stroke="${color.line}" stroke-width="1"/>
  <path d="${ticks}" stroke="${color.dim}" stroke-width="1" opacity=".55"/>
  <circle r="120" stroke="${color.line}" stroke-width="1" stroke-dasharray="2 6"/>
  <path d="M-240 0H260M0 -230V230" stroke="${color.line}" stroke-width="1" stroke-dasharray="2 6"/>
</g>
${trace([P.hub, [0, 112], P.c, [-170, 112], [-170, 210]], { delay: 0.5 })}
${trace([P.hub, [-60, 0], [-60, 40], P.e, [-260, 40]], { delay: 0.6 })}
${trace([P.b, [240, 0], P.d, [240, -210]], { delay: 0.7 })}
${trace([P.ai, [280, 112], [280, 210]], { delay: 0.8 })}
${trace(signal, { stroke: `url(#${id}-signal)`, width: 2, delay: 0.2 })}
${pulse(signal, color.ink, { dur: 5.5, delay: 2.2, seg: 46, width: 2 })}
${node(...P.in, 12, { stroke: color.signal, delay: 0.2 })}
${node(...P.a, 12, { stroke: color.mist, delay: 0.35 })}
${node(...P.c, 12, { delay: 0.7 })}
${node(...P.d, 12, { delay: 0.9 })}
${node(...P.e, 12, { delay: 0.8 })}
${node(...P.b, 12, { stroke: color.mist, delay: 1.0 })}
<g class="fade" style="animation-delay:.6s">
  <rect x="-26" y="-26" width="52" height="52" rx="10" fill="${color.void}" stroke="${color.signal}" stroke-opacity=".35"/>
  <rect x="-16" y="-16" width="32" height="32" rx="6" fill="${color.panel}" stroke="${color.signal}" stroke-width="1.5"/>
  <rect x="-5" y="-5" width="10" height="10" rx="2" fill="${color.signal}"/>
</g>
<g class="fade" style="animation-delay:1.3s">
  <circle cx="${P.ai[0]}" cy="${P.ai[1]}" r="20" fill="${color.violet}" opacity=".12"/>
  <circle cx="${P.ai[0]}" cy="${P.ai[1]}" r="9" fill="${color.void}" stroke="${color.violet}" stroke-width="1.5"/>
  <circle cx="${P.ai[0]}" cy="${P.ai[1]}" r="3.5" fill="${color.violet}"/>
</g>`;
}

// ---------------------------------------------------------------- hero

const NAME = ['Cristian', 'Mingorance'];
const ROLE = 'Full-Stack Software Engineer';
const STACK = ['Java', 'Spring Boot', 'Angular', 'AI Engineering'];
const CLAIM = ['Engineering reliable software.', 'Building meaningful products.'];
const heroTitle = 'Cristian Mingorance, Full-Stack Software Engineer';
const heroDesc = `${STACK.join(', ')}. ${CLAIM.join(' ')}`;

/** Stack line in mono with dimmed separators. */
function stackLine(x, y, size) {
  const sep = ' · ';
  let cx = x;
  return STACK.map((item, i) => {
    let out = text(item, cx, y, { font: 'mono400', size, fill: color.mist });
    cx += measure(item, { font: 'mono400', size });
    if (i < STACK.length - 1) {
      out += text(sep, cx, y, { font: 'mono400', size, fill: color.dim });
      cx += measure(sep, { font: 'mono400', size });
    }
    return out;
  }).join('\n');
}

function hero() {
  const W = 1200, H = 460, id = 'h';
  const nameOpts = { font: 'sans600', size: 80, tracking: -0.04 };
  const body = `
${cardBase(id, W, H)}
<g clip-path="url(#${id}-clip)"><g transform="translate(880 232)">${network(id)}</g></g>
<g class="fade" style="animation-delay:.1s">
${text(NAME[0], 72, 156, nameOpts)}
${text(NAME[1], 72, 238, nameOpts)}
</g>
<g class="fade" style="animation-delay:.45s">
${text(ROLE, 74, 298, { font: 'sans500', size: 26, tracking: -0.01 })}
${stackLine(75, 336, 16)}
</g>
<g class="fade" style="animation-delay:.8s">
<path d="M75 378h28" stroke="${color.signal}" stroke-width="2" stroke-linecap="round"/>
${text(CLAIM.join(' '), 75, 410, { size: 19, fill: color.mist })}
</g>`;
  return svg({ width: W, height: H, title: heroTitle, desc: heroDesc, defs: cardDefs(id, W, H), style: motionCss, body });
}

function heroCompact() {
  const W = 640, H = 700, id = 'hc';
  const nameOpts = { font: 'sans600', size: 68, tracking: -0.04 };
  const body = `
${cardBase(id, W, H)}
<g clip-path="url(#${id}-clip)"><g transform="translate(350 170) scale(.76)">${network(id)}</g></g>
<g class="fade" style="animation-delay:.1s">
${text(NAME[0], 48, 404, nameOpts)}
${text(NAME[1], 48, 474, nameOpts)}
</g>
<g class="fade" style="animation-delay:.45s">
${text(ROLE, 50, 526, { font: 'sans500', size: 27, tracking: -0.01 })}
${stackLine(51, 566, 18)}
</g>
<g class="fade" style="animation-delay:.8s">
<path d="M51 604h28" stroke="${color.signal}" stroke-width="2" stroke-linecap="round"/>
${text(CLAIM[0], 51, 640, { size: 22, fill: color.mist })}
${text(CLAIM[1], 51, 670, { size: 22, fill: color.mist })}
</g>`;
  return svg({ width: W, height: H, title: heroTitle, desc: heroDesc, defs: cardDefs(id, W, H), style: motionCss, body });
}

// ---------------------------------------------------------------- system map

// Hand-drawn glyphs for layers that have no brand mark, on the same 24-unit grid.
// Java: Simple Icons no longer ships the trademarked cup, so this is an original drawing.
const glyph = {
  java: (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s / 24})" stroke="${color.ink}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M4 11h13v4.5a5.5 5.5 0 0 1-5.5 5.5h-2A5.5 5.5 0 0 1 4 15.5V11Z"/><path d="M17 12.5h1.5a2.5 2.5 0 0 1 0 5H16.6"/>
    <path d="M8.5 2.5c-1.2 1.2 1.2 2.3 0 3.8M12.5 2.5c-1.2 1.2 1.2 2.3 0 3.8"/></g>`,
  integrations: (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s / 24})" stroke="${color.ink}" stroke-width="1.8" stroke-linecap="round" fill="none">
    <circle cx="5" cy="12" r="3"/><circle cx="19" cy="5" r="3"/><circle cx="19" cy="19" r="3"/><path d="M8 12h4m0 0 4.6-5.4M12 12l4.6 5.4"/></g>`,
  intelligence: (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s / 24})" fill="${color.violet}">
    <path d="M12 1.5c.6 5.6 4.9 9.9 10.5 10.5-5.6.6-9.9 4.9-10.5 10.5C11.4 16.9 7.1 12.6 1.5 12 7.1 11.4 11.4 7.1 12 1.5Z"/></g>`,
};

const LAYERS = [
  { name: 'Frontend', items: ['Angular', 'TypeScript', 'JavaScript'], icons: [si.siAngular, si.siTypescript, si.siJavascript] },
  { name: 'API', items: ['Spring Boot', 'REST APIs', 'API design'], icons: [si.siSpring] },
  { name: 'Services', items: ['Java', 'Maven', 'Software design'], icons: ['java', si.siApachemaven] },
  { name: 'Integrations', items: ['System integration', 'Business systems', 'Third-party services'], icons: ['integrations'] },
  { name: 'Intelligence', items: ['AI agents', 'Intelligent workflows', 'Tool integrations'], icons: ['intelligence'], ai: true },
];
const mapTitle = 'Engineering system map';
const mapDesc =
  LAYERS.map((l) => `${l.name}: ${l.items.join(', ')}.`).join(' ') +
  ' Requests flow from the frontend through the API and services to integrations; AI agents act on the system through the same APIs, as tool calls. Underneath, everything ships through Git and GitHub: branches, reviews and automation.';

function layerIcons(l, x, y, size) {
  return l.icons
    .map((ic, i) => {
      const ix = x + i * (size + 12);
      return typeof ic === 'string' ? glyph[ic](ix, y, size) : icon(ic, ix, y, size, color.ink, 'opacity=".92"');
    })
    .join('');
}

function legend(x, y, size, id) {
  return `<path d="M${x} ${y - 5}h26" stroke="${color.signal}" stroke-width="2" stroke-linecap="round"/>
${text('request flow', x + 38, y, { font: 'mono400', size, fill: color.mist })}
<path d="M${x + 186} ${y - 5}h26" stroke="${color.violet}" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 5"/>
${text('agent tool calls', x + 224, y, { font: 'mono400', size, fill: color.mist })}`;
}

/** Git graph: main line, one feature branch that is reviewed and merged back. */
function gitRail(x0, x1, y, id, { label = true, s = 1 } = {}) {
  const w = x1 - x0;
  const bx0 = x0 + w * 0.22, bx1 = x0 + w * 0.62, lift = 30 * s;
  const branch = `M${bx0} ${y}C${bx0 + 24 * s} ${y} ${bx0 + 16 * s} ${y - lift} ${bx0 + 44 * s} ${y - lift}H${bx1 - 44 * s}C${bx1 - 16 * s} ${y - lift} ${bx1 - 24 * s} ${y} ${bx1} ${y}`;
  const commits = [0.06, 0.15, 0.44, 0.75, 0.86].map((f) => x0 + w * f);
  const branchCommits = [0.34, 0.44, 0.53].map((f) => x0 + w * f);
  return `
<path d="M${x0} ${y}H${x1}" stroke="${color.dim}" stroke-width="1.5"/>
<path d="${branch}" stroke="url(#${id}-signal)" stroke-width="1.5" fill="none"/>
${commits.filter((c) => Math.abs(c - (x0 + w * 0.44)) > 1).map((c) => `<circle cx="${c}" cy="${y}" r="${4.5 * s}" fill="${color.void}" stroke="${color.mist}" stroke-width="1.5"/>`).join('')}
${branchCommits.map((c) => `<circle cx="${c}" cy="${y - lift}" r="${4.5 * s}" fill="${color.void}" stroke="${color.signal}" stroke-width="1.5"/>`).join('')}
<circle cx="${bx1}" cy="${y}" r="${7 * s}" fill="${color.void}" stroke="${color.violet}" stroke-width="2"/>
<circle cx="${x1}" cy="${y}" r="${6 * s}" fill="${color.signal}"/>
<circle cx="${x1}" cy="${y}" r="${12 * s}" stroke="${color.signal}" stroke-opacity=".35"/>
${label ? text('review + merge', bx1, y + 30 * s, { font: 'mono400', size: 14 * s, fill: color.mist, anchor: 'middle' }) : ''}`;
}

function architecture() {
  const W = 1200, H = 624, id = 'a';
  const cw = 192, gap = 36, x0 = 48, cy = 116, ch = 248, mid = cy + 112;
  const cards = LAYERS.map((l, i) => {
    const x = x0 + i * (cw + gap);
    const stroke = l.ai ? color.violet : color.line;
    return `<g class="fade" style="animation-delay:${0.15 + i * 0.12}s">
<rect x="${x}" y="${cy}" width="${cw}" height="${ch}" rx="16" fill="${color.panel}" stroke="${stroke}" ${l.ai ? 'stroke-opacity=".55"' : ''}/>
${layerIcons(l, x + 24, cy + 26, 26)}
${text(l.name, x + 24, cy + 96, { font: 'sans600', size: 22, tracking: -0.01 })}
<path d="M${x + 24} ${cy + 118}h${cw - 48}" stroke="${color.line}"/>
${l.items.map((it, j) => text(it, x + 24, cy + 152 + j * 30, { size: it.length > 18 ? 16 : 17, fill: color.mist })).join('\n')}
</g>`;
  });
  // The flow line runs behind the cards; it shows in the gaps between layers.
  const flow = [[x0 - 20, mid], [x0 + 4 * (cw + gap) + cw / 2, mid]];
  const chevrons = [1, 2, 3, 4].map((i) => {
    const gx = x0 + i * (cw + gap) - gap / 2 + 4;
    return `<path d="M${gx - 4} ${mid - 6}l6 6-6 6" stroke="${color.signal}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  });
  const apiX = x0 + 1 * (cw + gap) + cw / 2, aiX = x0 + 4 * (cw + gap) + cw / 2, loopY = cy + ch + 46;
  const loop = route([[aiX, cy + ch], [aiX, loopY], [apiX, loopY], [apiX, cy + ch + 10]], 16);
  const railY = 562;
  const body = `
${cardBase(id, W, H, { dots: 0.05 })}
${legend(48, 68, 15, id)}
<path d="M${flow[0][0]} ${mid}H${flow[1][0]}" stroke="url(#${id}-signal-x)" stroke-width="2" opacity=".8"/>
${pulse(flow, color.ink, { dur: 5, delay: 1.6, seg: 40, width: 2 })}
${chevrons.join('')}
${cards.join('\n')}
<path class="fade" d="${loop.d}" stroke="${color.violet}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4 6" style="animation-delay:1s"/>
<path d="M${apiX - 6} ${cy + ch + 18}l6-7 6 7" stroke="${color.violet}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
${text('agents act through the same governed APIs', (apiX + aiX) / 2, loopY + 28, { font: 'mono400', size: 15, fill: color.mist, anchor: 'middle' })}
<path d="M48 ${railY - 64}H${W - 48}" stroke="${color.line}"/>
${icon(si.siGit, 48, railY - 26, 22, color.ink)}${icon(si.siGithub, 80, railY - 26, 22, color.ink)}
${text('Engineering workflow', 118, railY - 8, { font: 'sans600', size: 19, tracking: -0.01 })}
${text('Git · GitHub', 118, railY + 20, { font: 'mono400', size: 15, fill: color.mist })}
${gitRail(420, W - 64, railY, id)}`;
  return svg({ width: W, height: H, title: mapTitle, desc: mapDesc, defs: cardDefs(id, W, H), style: motionCss, body });
}

/** Joins items with middots, breaking onto a second line when they would overflow. */
function itemLines(items, max) {
  const line = items.join(' · ');
  if (measure(line, { size: 21 }) <= max) return [line];
  return [items.slice(0, -1).join(' · '), items.at(-1)];
}

function architectureCompact() {
  const W = 640, x0 = 40, cw = W - 80, ch = 150, gap = 40, top = 104, id = 'ac';
  const H = top + 5 * ch + 4 * gap + 196;
  const flowX = x0 + 44;
  const cards = LAYERS.map((l, i) => {
    const y = top + i * (ch + gap);
    const stroke = l.ai ? color.violet : color.line;
    const n = l.icons.length;
    return `<g class="fade" style="animation-delay:${0.15 + i * 0.12}s">
<rect x="${x0}" y="${y}" width="${cw}" height="${ch}" rx="16" fill="${color.panel}" stroke="${stroke}" ${l.ai ? 'stroke-opacity=".55"' : ''}/>
${layerIcons(l, x0 + cw - 28 - n * 28 - (n - 1) * 12 + 12, y + 26, 28)}
${text(l.name, x0 + 28, y + 56, { font: 'sans600', size: 28, tracking: -0.015 })}
${itemLines(l.items, cw - 56).map((ln, j) => text(ln, x0 + 28, y + 100 + j * 30, { size: 21, fill: color.mist })).join('')}
</g>`;
  });
  const chevrons = [1, 2, 3, 4].map((i) => {
    const gy = top + i * (ch + gap) - gap / 2 + 4;
    return `<path d="M${flowX - 7} ${gy - 5}l7 7 7-7" stroke="${color.signal}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  });
  const apiY = top + 1 * (ch + gap) + ch / 2, aiY = top + 4 * (ch + gap) + ch / 2, loopX = W - 18;
  const loop = route([[x0 + cw, aiY], [loopX, aiY], [loopX, apiY], [x0 + cw + 8, apiY]], 10);
  const flowEnd = top + 4 * (ch + gap) + 40;
  const railY = H - 72;
  const body = `
${cardBase(id, W, H, { dots: 0.05 })}
<path d="M48 56h26" stroke="${color.signal}" stroke-width="2.5" stroke-linecap="round"/>
${text('request flow', 86, 63, { font: 'mono400', size: 20, fill: color.mist })}
<path d="M300 56h26" stroke="${color.violet}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="4 5"/>
${text('agent tool calls', 338, 63, { font: 'mono400', size: 20, fill: color.mist })}
<path d="M${flowX} ${top - 24}V${flowEnd}" stroke="url(#${id}-signal-y)" stroke-width="2" opacity=".8"/>
${pulse([[flowX, top - 24], [flowX, flowEnd]], color.ink, { dur: 5, delay: 1.6, seg: 40, width: 2 })}
${chevrons.join('')}
${cards.join('\n')}
<path d="${loop.d}" stroke="${color.violet}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4 6"/>
<path d="M${x0 + cw + 15} ${apiY - 7}l-7 7 7 7" stroke="${color.violet}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
${icon(si.siGit, 48, railY - 92, 26, color.ink)}${icon(si.siGithub, 86, railY - 92, 26, color.ink)}
${text('Engineering workflow', 128, railY - 70, { font: 'sans600', size: 24, tracking: -0.01 })}
${text('Git · GitHub', 128, railY - 38, { font: 'mono400', size: 18, fill: color.mist })}
${gitRail(56, W - 64, railY + 16, id, { label: false, s: 1.1 })}`;
  return svg({ width: W, height: H, title: mapTitle, desc: mapDesc, defs: cardDefs(id, W, H), style: motionCss, body });
}

// ---------------------------------------------------------------- divider

function divider() {
  const W = 1200, H = 40, c = W / 2;
  // Transparent background so it sits on both GitHub themes; slate reads on white and on near-black.
  const defs = `<linearGradient id="dv" x1="48" y1="0" x2="${W - 48}" y2="0" gradientUnits="userSpaceOnUse">
  <stop stop-color="${color.mist}" stop-opacity="0"/><stop offset=".38" stop-color="${color.mist}" stop-opacity=".55"/>
  <stop offset=".5" stop-color="${color.signal}"/><stop offset=".62" stop-color="${color.violet}" stop-opacity=".7"/>
  <stop offset="1" stop-color="${color.violet}" stop-opacity="0"/></linearGradient>`;
  const body = `<path d="M48 20H${c - 22}M${c + 22} 20H${W - 48}" stroke="url(#dv)" stroke-width="1.5"/>
<rect x="${c - 7}" y="13" width="14" height="14" rx="3" transform="rotate(45 ${c} 20)" stroke="${color.signal}" stroke-width="1.5"/>
<rect x="${c - 2.5}" y="17.5" width="5" height="5" rx="1" transform="rotate(45 ${c} 20)" fill="${color.violet}"/>`;
  return svg({ width: W, height: H, title: 'Section divider', desc: 'A thin line with a small diamond marker.', defs, body });
}

write(OUT + 'hero.svg', hero());
write(OUT + 'hero-compact.svg', heroCompact());
write(OUT + 'architecture.svg', architecture());
write(OUT + 'architecture-compact.svg', architectureCompact());
write(OUT + 'section-dividers.svg', divider());
