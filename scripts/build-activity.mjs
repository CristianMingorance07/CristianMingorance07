// Renders assets/activity.svg and assets/activity-compact.svg from the GitHub GraphQL API.
// Runs daily in .github/workflows/activity.yml; can also run locally with GITHUB_TOKEN set.
//
// Token: GITHUB_TOKEN sees public repositories only. Set the optional STATS_TOKEN secret
// (fine-grained PAT, all repositories, "Metadata: read-only") to include private repositories
// in the language mix. Only aggregate byte counts are used; no repository name is rendered.
import { color, text, measure, svg, write, cardDefs, cardBase, motionCss } from './lib/svg.mjs';

const OUT = new URL('../assets/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const LOGIN = process.env.PROFILE_LOGIN || 'CristianMingorance07';
const TOKEN = process.env.STATS_TOKEN || process.env.GITHUB_TOKEN;
if (!TOKEN) throw new Error('Set GITHUB_TOKEN (or STATS_TOKEN) to query the GitHub API.');

const query = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      startedAt endedAt
      totalCommitContributions totalPullRequestContributions
      totalPullRequestReviewContributions restrictedContributionsCount
      contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
    }
    repositories(ownerAffiliations: OWNER, isFork: false, first: 100) {
      nodes { languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } } }
    }
  }
}`;

const res = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': LOGIN },
  body: JSON.stringify({ query, variables: { login: LOGIN } }),
});
const json = await res.json();
if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors || json));
const { contributionsCollection: cc, repositories } = json.data.user;

// ---------------------------------------------------------------- data

const days = cc.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
const weeks = cc.contributionCalendar.weeks.map((w) => ({
  start: w.contributionDays[0].date,
  count: w.contributionDays.reduce((n, d) => n + d.contributionCount, 0),
}));
let streak = 0, best = 0;
for (const d of days) { streak = d.contributionCount ? streak + 1 : 0; best = Math.max(best, streak); }

const stats = [
  { value: cc.contributionCalendar.totalContributions, label: 'contributions' },
  { value: cc.totalCommitContributions, label: 'commits' },
  { value: cc.totalPullRequestContributions, label: 'pull requests' },
  { value: days.filter((d) => d.contributionCount).length, label: 'active days' },
];

const bytes = {};
for (const repo of repositories.nodes)
  for (const { size, node } of repo.languages.edges) bytes[node.name] = (bytes[node.name] || 0) + size;
const totalBytes = Object.values(bytes).reduce((a, b) => a + b, 0);
const ranked = Object.entries(bytes).sort((a, b) => b[1] - a[1]);
const languages = ranked.slice(0, 5).map(([name, b]) => ({ name, share: b / totalBytes }));
const rest = ranked.slice(5).reduce((n, [, b]) => n + b, 0);
if (rest) languages.push({ name: 'Other', share: rest / totalBytes });

// Brand-neutral ramp from the profile palette: languages are ranked, so tone encodes rank.
const ramp = [color.signal, '#7DD3FC', '#93A5F8', color.violet, '#6B7A99', color.dim];
const fmt = (n) => n.toLocaleString('en-US');
const month = (iso) => new Date(iso + 'T00:00:00Z').toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });

// ---------------------------------------------------------------- render

function bars(x, y, w, h, id, labelSize = 14) {
  const max = Math.max(1, ...weeks.map((wk) => wk.count));
  const step = w / weeks.length, bw = Math.max(3, step * 0.56);
  const out = [];
  weeks.forEach((wk, i) => {
    const bx = (x + i * step + (step - bw) / 2).toFixed(1);
    if (!wk.count) {
      out.push(`<rect x="${bx}" y="${y + h - 3}" width="${bw.toFixed(1)}" height="3" rx="1.5" fill="${color.line}"/>`);
      return;
    }
    const bh = Math.max(6, (wk.count / max) * h);
    out.push(`<rect class="fade" x="${bx}" y="${(y + h - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="${(bw / 2).toFixed(1)}" fill="url(#${id}-signal-y)" style="animation-delay:${(0.2 + i * 0.012).toFixed(2)}s"/>`);
  });
  // Month ticks at the first week of each month, skipping the partial month at the start.
  let prev = month(weeks[0].start);
  weeks.forEach((wk, i) => {
    const m = month(wk.start);
    if (m !== prev && i < weeks.length - 2)
      out.push(text(m, x + i * step, y + h + labelSize * 2, { font: 'mono400', size: labelSize, fill: color.dim }));
    prev = m;
  });
  return out.join('\n');
}

function statBlock(s, x, y, valueSize, labelSize) {
  return `${text(fmt(s.value), x, y, { font: 'sans600', size: valueSize, tracking: -0.03 })}
${text(s.label, x, y + labelSize + 12, { size: labelSize, fill: color.mist })}`;
}

function languageBar(x, y, w, labelSize, id, { columns = 6 } = {}) {
  if (!languages.length) return '';
  let cx = x;
  const segs = languages.map((l, i) => {
    const sw = Math.max(2, l.share * w - 4);
    const seg = `<rect x="${cx.toFixed(1)}" y="${y}" width="${sw.toFixed(1)}" height="8" rx="4" fill="${ramp[i]}"/>`;
    cx += l.share * w;
    return seg;
  });
  const colW = w / columns;
  const legend = languages.map((l, i) => {
    const lx = x + (i % columns) * colW, ly = y + 42 + Math.floor(i / columns) * 34;
    const pct = l.share < 0.01 ? '<1%' : `${Math.round(l.share * 100)}%`;
    return `<circle cx="${lx + 5}" cy="${ly - 5}" r="5" fill="${ramp[i]}"/>
${text(l.name, lx + 18, ly, { size: labelSize, fill: color.ink })}
${text(pct, lx + 24 + measure(l.name, { size: labelSize }), ly, { font: 'mono400', size: labelSize - 2, fill: color.mist })}`;
  });
  return segs.join('') + legend.join('\n');
}

const period = `${month(cc.startedAt.slice(0, 10))} ${cc.startedAt.slice(0, 4)} – ${month(cc.endedAt.slice(0, 10))} ${cc.endedAt.slice(0, 4)}`;
const title = 'GitHub activity, last 12 months';
const desc =
  stats.map((s) => `${fmt(s.value)} ${s.label}`).join(', ') +
  ` between ${period}. Language mix by code size across own repositories: ` +
  languages.map((l) => `${l.name} ${Math.round(l.share * 100)}%`).join(', ') + '.';

function wide() {
  const W = 1200, H = 470, id = 'g';
  const body = `
${cardBase(id, W, H, { dots: 0.04 })}
${text('Weekly contributions', 48, 68, { font: 'sans600', size: 20, tracking: -0.01 })}
${text(period, 48, 96, { font: 'mono400', size: 14, fill: color.mist })}
${bars(48, 128, 680, 150, id)}
<path d="M792 56V300" stroke="${color.line}"/>
${stats.map((s, i) => statBlock(s, 836 + (i % 2) * 170, 104 + Math.floor(i / 2) * 120, 44, 16)).join('\n')}
<path d="M48 336H${W - 48}" stroke="${color.line}"/>
${text('Languages by code size', 48, 380, { font: 'sans600', size: 16 })}
${languageBar(48, 400, W - 96, 15, id)}`;
  return svg({ width: W, height: H, title, desc, defs: cardDefs(id, W, H), style: motionCss, body });
}

function compact() {
  const W = 640, id = 'gc';
  const legendRows = Math.ceil(languages.length / 2);
  const H = 692 + legendRows * 34;
  const body = `
${cardBase(id, W, H, { dots: 0.04 })}
${text('Weekly contributions', 44, 70, { font: 'sans600', size: 26, tracking: -0.01 })}
${text(period, 44, 102, { font: 'mono400', size: 17, fill: color.mist })}
${bars(44, 136, W - 88, 150, id, 17)}
${stats.map((s, i) => statBlock(s, 44 + (i % 2) * 280, 400 + Math.floor(i / 2) * 116, 52, 20)).join('\n')}
<path d="M44 588H${W - 44}" stroke="${color.line}"/>
${text('Languages by code size', 44, 632, { font: 'sans600', size: 21 })}
${languageBar(44, 654, W - 88, 19, id, { columns: 2 })}`;
  return svg({ width: W, height: H, title, desc, defs: cardDefs(id, W, H), style: motionCss, body });
}

write(OUT + 'activity.svg', wide());
write(OUT + 'activity-compact.svg', compact());
