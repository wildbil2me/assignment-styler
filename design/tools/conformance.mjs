#!/usr/bin/env node
/**
 * Conformance checker — audits an educator app against the canonical style book.
 *
 *   node tools/conformance.mjs ../attendance-app
 *   node tools/conformance.mjs ../app-a ../app-b        several at once
 *   node tools/conformance.mjs ../app --quiet           violations only
 *   node tools/conformance.mjs ../app --json            machine-readable
 *   node tools/conformance.mjs ../app --scope=source     configured bundled source
 *   node tools/conformance.mjs ../app --scope=built      configured bundled output
 *
 * Exit code is 1 if there is any VIOLATION (a MUST or NEVER rule broken), 0 otherwise.
 * WARNINGs are heuristics — real signal, but detectable imprecisely, so they never fail
 * the run. Everything reports a rule ID and a file:line.
 *
 * Values come from tokens.json, so this file holds no palette of its own. Adding a color
 * to the style book automatically permits it here, and nowhere else.
 *
 * Suppress a finding you have genuinely considered:
 *   CSS   /* conformance-ignore COLOR-07 reason * /       (same line or the line above)
 *   HTML  <!-- conformance-ignore BTN-07 reason -->
 *   File  <!-- conformance-ignore-file ARCH-07 reason -->
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, extname, basename } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = JSON.parse(readFileSync(join(ROOT, 'tokens.json'), 'utf8'));
const CANON = readFileSync(join(ROOT, 'style-guide.html'), 'utf8');

/* §18's fence (MKTG-01/MKTG-08). The opt-in marker a landing page must carry, and
   the class names that are legal only behind it. Matched with a word boundary either
   side so `.feature-well` never matches an app's `.feature-well-thing`, and so the
   substring `cta-btn` inside some longer name is not a false hit. */
/* Must be a real HTML comment, not the words appearing in prose. Without the literal
   `<!--`, any file that merely DOCUMENTS the marker exempts itself — which is how the
   style book first passed its own fence, for entirely the wrong reason. */
const MARKETING_SURFACE = /<!--\s*conformance-surface\s+marketing\b/;
const BUNDLED_PLATFORM = /<!--\s*conformance-platform\s+bundled\s*-->/;
const ANY_PLATFORM = /<!--\s*conformance-platform\s+([^\s>]+)[\s\S]*?-->/g;
const SECTION_18_CLASSES =
  /\b(cta-btn|mkt-hero|mkt-h1|mkt-h2|mkt-lead|mkt-section|mkt-hero-actions|mkt-hero-note|feature-grid|feature-well|feature-title|feature-body)\b/g;

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const QUIET = flags.has('--quiet');
const JSON_OUT = flags.has('--json');
const NO_VENDORED = flags.has('--no-vendored');
const scopeArg = args.find((a) => a.startsWith('--scope='));
const SCOPE = scopeArg ? scopeArg.slice('--scope='.length) : 'source';
if (!['source', 'built'].includes(SCOPE)) {
  console.error('usage error: --scope must be source or built');
  process.exit(2);
}

/* --skip design/,reference/   or   --skip=design/,reference/
   Guard the -1 case: without --skip, `skipIdx + 1` is 0 and would eat the first path. */
const eqForm = args.find((a) => a.startsWith('--skip='));
const skipIdx = args.indexOf('--skip');
const usesValueArg = !eqForm && skipIdx !== -1 && args[skipIdx + 1] && !args[skipIdx + 1].startsWith('--');
const SKIP = (eqForm ? eqForm.slice('--skip='.length)
  : usesValueArg ? args[skipIdx + 1] : '')
  .split(',').map((s) => s.trim()).filter(Boolean);

const targets = args.filter((a, i) =>
  !a.startsWith('--') && !(usesValueArg && i === skipIdx + 1));

if (!targets.length) {
  console.error('usage: node tools/conformance.mjs <app-path> [more-paths] [--quiet] [--json] [--scope=source|built] [--skip design/,reference/] [--no-vendored]');
  process.exit(2);
}

/* ── the palette, derived from tokens.json ────────────────────────────────── */

const norm = (h) => {
  h = h.toLowerCase();
  return h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h;
};
const palette = new Map(); // normalised hex -> token path
(function walk(node, path) {
  if (typeof node === 'string') {
    for (const m of node.matchAll(/#[0-9a-fA-F]{3,6}\b/g)) {
      if (!palette.has(norm(m[0]))) palette.set(norm(m[0]), path);
    }
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
  }
})(tokens, '');
palette.set('#ffffff', 'color.surface.panel');

const RADII = new Set(Object.values(tokens.radius).filter((v) => typeof v === 'number'));
const ZLADDER = new Set(Object.values(tokens.zIndex));
const rgb = (h) => [1, 3, 5].map((i) => parseInt(norm(h).slice(i, i + 2), 16));
function nearest(hex) {
  const [r, g, b] = rgb(hex);
  let best = null, bestD = Infinity;
  for (const [p, path] of palette) {
    const [r2, g2, b2] = rgb(p);
    const d = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2;
    if (d < bestD) { bestD = d; best = { hex: p, path, d: Math.sqrt(d) }; }
  }
  return best;
}

/* ── findings ─────────────────────────────────────────────────────────────── */

const findings = [];
let current = { file: '', content: '', ignores: [], fileIgnores: new Set() };

const lineAt = (i) => current.content.slice(0, i).split('\n').length;

function add(severity, rule, index, message, hint) {
  const line = typeof index === 'number' ? lineAt(index) : index;
  if (current.fileIgnores.has(rule)) return;
  if (current.ignores.some((ig) => ig.rule === rule && (ig.line === line || ig.line === line - 1))) return;
  findings.push({ severity, rule, file: current.file, line, message, hint });
}
const violation = (...a) => add('VIOLATION', ...a);
const warning = (...a) => add('WARNING', ...a);

/* ── masking: keep indices exact so line numbers stay true ────────────────── */

/** Replace everything OUTSIDE the given ranges with spaces, preserving newlines. */
function keepOnly(content, ranges) {
  const out = content.split('');
  const inRange = new Uint8Array(content.length);
  for (const [s, e] of ranges) for (let i = s; i < e; i++) inRange[i] = 1;
  for (let i = 0; i < out.length; i++) if (!inRange[i] && out[i] !== '\n') out[i] = ' ';
  return out.join('');
}
/** Replace everything INSIDE the given ranges with spaces, preserving newlines. */
function blankOut(content, ranges) {
  const out = content.split('');
  for (const [s, e] of ranges) for (let i = s; i < e; i++) if (out[i] !== '\n') out[i] = ' ';
  return out.join('');
}
function rangesOf(content, re) {
  return [...content.matchAll(re)].map((m) => [m.index, m.index + m[0].length]);
}
/** Blank CSS comments. A comment that explains a rule ("!important is allowed here")
 *  must not trip the check for the thing it is explaining — and this codebase comments
 *  heavily by design (CODE-07), so scanning comments would punish that. */
const stripCssComments = (css) => blankOut(css, rangesOf(css, /\/\*[\s\S]*?\*\//g));
/** The selector text governing the declaration at `index`. Used to keep context-sensitive
 *  checks precise — `color: #a0aab8` is correct on ::placeholder and wrong everywhere else. */
function selectorFor(css, index) {
  const open = css.lastIndexOf('{', index);
  if (open === -1) return '';
  const prev = Math.max(css.lastIndexOf('}', open), css.lastIndexOf('{', open - 1));
  return css.slice(prev + 1, open).replace(/\s+/g, ' ').trim();
}

/** Range of an at-rule's braces, given the index of its `@`. */
function blockRange(css, at) {
  const open = css.indexOf('{', at);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return [at, i + 1];
  }
  return [at, css.length];
}

/* ── CSS checks ───────────────────────────────────────────────────────────── */

function checkCss(css) {
  const t = tokens;

  /* ARCH-01 — custom properties. Declarations only; var() use implies a declaration
     somewhere, and flagging both would double-report the same mistake. */
  for (const m of css.matchAll(/(^|[;{\s])(--[a-zA-Z][\w-]*)\s*:/g))
    violation('ARCH-01', m.index, `CSS custom property \`${m[2]}\` declared`,
      'Write the literal value. Hoisting colors breaks paste-compatibility across the suite.');

  /* ARCH-02 — dark mode. */
  for (const m of css.matchAll(/prefers-color-scheme|\[data-theme/g))
    violation('ARCH-02', m.index, `dark-mode hook \`${m[0]}\``,
      'The navy chrome IS the light theme. There is no dark variant of anything.');

  /* ARCH-07 — rem/em lengths. */
  for (const m of css.matchAll(/(?<![\w#.-])(\d*\.?\d+)(rem|em)\b/g))
    violation('ARCH-07', m.index, `relative length \`${m[1]}${m[2]}\``,
      `Use px. ~${Math.round(parseFloat(m[1]) * 16)}px if the root is 16px.`);

  /* ARCH-08 — !important outside .hidden, reduced-motion, and print. Print needs it:
     it hides elements whose display was set inline by script, and a print rule cannot
     affect the screen, so the media type is its own guard. */
  const rmAt = css.search(/@media[^{]*prefers-reduced-motion/);
  const rmRange = rmAt === -1 ? null : blockRange(css, rmAt);
  const printRanges = [...css.matchAll(/@media[^{]*\bprint\b/g)]
    .map((m) => blockRange(css, m.index)).filter(Boolean);
  for (const m of css.matchAll(/!important/g)) {
    if (rmRange && m.index >= rmRange[0] && m.index < rmRange[1]) continue;
    if (printRanges.some(([s, e]) => m.index >= s && m.index < e)) continue;
    const lineStart = css.lastIndexOf('\n', m.index) + 1;
    const lineEnd = css.indexOf('\n', m.index);
    if (/\.hidden/.test(css.slice(lineStart, lineEnd === -1 ? undefined : lineEnd))) continue;
    violation('ARCH-08', m.index, '`!important` outside .hidden, reduced-motion and print',
      'Those three are load-bearing. A fourth is a specificity bug the whole suite inherits.');
  }

  /* ARCH-05 / ARCH-04 — remote CSS and web fonts. */
  for (const m of css.matchAll(/@import|@font-face|fonts\.googleapis|url\(\s*['"]?(https?:)?\/\//g))
    violation('ARCH-05', m.index, `external stylesheet or font (\`${m[0].trim()}\`)`,
      'No network dependency on first paint — the app must render offline from file://.');

  /* ARCH-03 — declaration order of the responsive blocks. */
  const order = [
    ['pointer: coarse', css.search(/@media[^{]*pointer:\s*coarse/)],
    ['max-width: 1024px', css.search(/@media[^{]*max-width:\s*1024px/)],
    ['max-width: 640px', css.search(/@media[^{]*max-width:\s*640px/)],
  ].filter(([, i]) => i !== -1);
  for (let i = 1; i < order.length; i++)
    if (order[i][1] < order[i - 1][1])
      violation('ARCH-03', order[i][1], `\`${order[i][0]}\` is declared before \`${order[i - 1][0]}\``,
        'Order is load-bearing: coarse → 1024 → 640 → portrait. The touch pass re-states base rules and the width queries must override it.');

  /* TOUCH-01 / MOTION-04 — the touch pass and the reduced-motion block must exist.
     Gated on this looking like a whole app sheet rather than a fragment, so a partial
     stylesheet is not nagged for blocks that belong at the end of the real one. */
  const coarseAt = css.search(/@media[^{]*pointer:\s*coarse/);
  const isAppSheet = /\bbody\s*\{/.test(css) || /\.header\s*\{/.test(css);
  if (isAppSheet && coarseAt === -1)
    violation('TOUCH-01', 1, 'no `(pointer: coarse)` block',
      'Every interactive control needs a 44px target on touch, and every new control must appear in that block.');
  if (isAppSheet && rmAt === -1)
    warning('MOTION-04', 1, 'no `prefers-reduced-motion` block',
      'Copy it from §14 of the style book. It is the one other place !important is allowed.');

  if (coarseAt !== -1) {
    const cr = blockRange(css, coarseAt);
    const block = css.slice(cr[0], cr[1]);
    /* 44 is a FLOOR, not a literal. §18's `.cta-btn` reaches 52px on touch and
       satisfies the rule by exceeding it — matching only the string "44px" called
       that a violation and would have done so for every marketing page the book
       now permits. Any sizing declaration at or above the floor counts. */
    const targets = [...block.matchAll(/(?:min-)?(?:height|width):\s*(\d+(?:\.\d+)?)px/g)]
      .map((m) => parseFloat(m[1]));
    if (!targets.some((px) => px >= t.touch.minTarget))
      violation('TOUCH-01', coarseAt, '`(pointer: coarse)` block sets no 44px target',
        `tokens.touch.minTarget is ${t.touch.minTarget}px, and nothing in the block reaches it.`);
    if (!/font-size:\s*16px/.test(block) && /input|textarea|select/.test(css))
      warning('TOUCH-04', coarseAt, 'touch block may not set inputs to 16px',
        'Under 16px iOS zooms the page on focus and does not zoom back.');
  }

  /* STATE-02 / STATE-03 — the focus ring. */
  for (const m of css.matchAll(/outline:\s*(none|0)\b/g))
    violation('STATE-02', m.index, `\`outline: ${m[1]}\``,
      'Never remove a focus outline. If you lifted this from a template, drop the rule rather than lift it.');
  const ring = `outline: 2px solid ${t.accent.interactive.strong}`;
  if (/:focus-visible/.test(css) === false && /outline:/.test(css))
    warning('STATE-03', 1, 'no `:focus-visible` rule found', `Expected \`:focus-visible { ${ring}; outline-offset: 2px; }\`.`);
  for (const m of css.matchAll(/([^-\w])(:focus)\s*\{/g))
    warning('STATE-02', m.index, 'bare `:focus` styled',
      'Use :focus-visible so a mouse click leaves no ring but Tab does.');

  /* COLOR-08 — the header identity rule. The element this checker exists for. */
  if (/\.header\s*\{/.test(css)) {
    const at = css.search(/\.header\s*\{/);
    const decl = blockRange(css, at);
    const block = css.slice(decl[0], decl[1]);
    if (!block.includes(t.color.chrome.headerBorderBottom))
      violation('COLOR-08', at, `\`.header\` is missing \`border-bottom: ${t.color.chrome.headerBorderBottom}\``,
        'The gradient plus the amber rule ARE the suite identity. It is 2px on purpose — do not normalise it to 1.5px.');
    if (!block.includes(t.color.chrome.appHeader))
      warning('COLOR-01', at, '`.header` gradient differs from canonical',
        `Expected \`background: ${t.color.chrome.appHeader}\`.`);
  }

  /* LAYOUT-06 — the z-index ladder. */
  for (const m of css.matchAll(/z-index:\s*(-?\d+)/g)) {
    const v = Number(m[1]);
    if (!ZLADDER.has(v) && v !== 0)
      violation('LAYOUT-06', m.index, `z-index: ${v} is not on the ladder`,
        `Allowed: ${[...ZLADDER].sort((a, b) => a - b).join(' · ')}. Nothing else gets a z-index.`);
  }

  /* SHAPE-01 / SHAPE-02 — radius ladder and border weights. */
  for (const m of css.matchAll(/border-radius:\s*([\d.]+)px/g)) {
    const v = Number(m[1]);
    if (!RADII.has(v))
      warning('SHAPE-01', m.index, `border-radius: ${v}px is not on the ladder`,
        `Allowed: ${[...RADII].sort((a, b) => a - b).join(' · ')}px, or 50%.`);
  }
  for (const m of css.matchAll(/border(?:-(?:top|right|bottom|left))?:\s*([\d.]+)px\s+(solid|dashed|dotted)/g)) {
    const v = m[1];
    // SHAPE-02's two named exceptions: the header identity rule, and the spinner ring
    // (the indicator's body, not the boundary of anything).
    const allowed2px = css.slice(m.index, m.index + 60).includes(t.color.chrome.identityAccent)
      || /spinner/i.test(selectorFor(css, m.index));
    if (v !== '1.5' && v !== '1' && !(v === '2' && allowed2px))
      warning('SHAPE-02', m.index, `${v}px border`,
        '1.5px on light surfaces, 1px for row hairlines. Only the header identity rule and the spinner ring are 2px.');
  }

  /* COLOR-06 / COLOR-07 — palette discipline. */
  for (const m of css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    const raw = m[0];
    if (raw.length === 9 || raw.length === 5) continue; // #rrggbbaa — separate concern
    const h = norm(raw);
    if (palette.has(h)) {
      const path = palette.get(h);
      if (/decorativeOnly|placeholderOnly/.test(path)) {
        const isTextColor = /(^|[;{\s])color:\s*$/.test(css.slice(Math.max(0, m.index - 12), m.index));
        // Legitimate homes for these two tones: placeholders and disabled controls.
        const sel = selectorFor(css, m.index);
        const exempt = /placeholder|:disabled|\[disabled\]/i.test(sel);
        if (isTextColor && !exempt)
          warning('COLOR-06', m.index, `${raw} used as a text color${sel ? ` on \`${sel.slice(0, 40)}\`` : ''}`,
            `${h === '#8a9bb0' ? '2.84' : '2.35'}:1 — fails AA at every size. Use #687482 or darker.`);
      }
      continue;
    }
    const n = nearest(raw);
    warning('COLOR-07', m.index, `${raw} is not in the palette`,
      n.d < 24 ? `Closest is ${n.hex} (${n.path}) — likely a typo or an eyeballed variant.`
               : `Nearest palette value is ${n.hex} (${n.path}). Add the color to the style book or use an existing one.`);
  }
}

/* ── HTML checks ──────────────────────────────────────────────────────────── */

function checkHtml(html, raw, { platform = BUNDLED_PLATFORM.test(raw) ? 'bundled' : 'file', document = true } = {}) {
  for (const m of raw.matchAll(ANY_PLATFORM)) {
    if (m[1] !== 'bundled') violation('PLAT-01', m.index, `unknown platform declaration \`${m[1]}\``,
      'Only the exact `<!-- conformance-platform bundled -->` marker is valid; otherwise the file platform applies.');
  }
  /* ARCH-04 — modules and remote scripts. */
  if (platform === 'file') {
    for (const m of html.matchAll(/<script[^>]*\stype=["']module["']/g))
      violation('ARCH-04', m.index, 'ES module script',
        'Modules fail outright on a file:// origin. Use a plain script tag with an IIFE.');
  }
  for (const m of html.matchAll(/<(?:script|link|img|iframe)\b[^>]*?(?:src|href)=["'](?:https?:)?\/\/[^"']+["'][^>]*>/g)) {
    if (/xmlns/.test(m[0])) continue;
    /* `rel="canonical"` names a URL, it does not fetch one — no request is made, on
       file:// or anywhere else, so ARCH-04's offline guarantee is untouched. Every
       other rel here (stylesheet, preload, icon, prefetch) genuinely loads and is
       still caught. A marketing surface needs a canonical URL (MKTG-01 §18). */
    if (/<link\b/.test(m[0]) && /\srel=["']canonical["']/.test(m[0])) continue;
    violation(platform === 'bundled' ? 'PLAT-03' : 'ARCH-04', m.index, 'remote runtime resource loaded',
      platform === 'bundled' ? 'Bundle or vendor runtime assets locally; installed output must work offline.'
        : 'Everything is inline or local. The app must render offline from file://.');
  }

  /* A11Y-10 / TOUCH-03 / BASE-02 — the head block. Browser zoom must remain available. */
  if (/<html\b/.test(html) && !/<html[^>]*\slang=/.test(html))
    violation('A11Y-10', html.search(/<html\b/), 'no `lang` on `<html>`', 'It picks the screen reader voice.');
  if (/<head\b/.test(html)) {
    const viewport = html.match(/<meta[^>]*name=["']viewport["'][^>]*>/i)?.[0] || '';
    if (/maximum-scale\s*=|user-scalable\s*=\s*no/i.test(viewport))
      violation('TOUCH-03', html.indexOf(viewport), 'viewport disables browser zoom',
        'Keep `width=device-width, initial-scale=1.0`; users must be able to zoom.');
    if (!/apple-mobile-web-app-capable/.test(html))
      warning('TOUCH-03', 1, 'no `apple-mobile-web-app-capable` meta', 'Needed for a home-screen install.');
    if (!/<link[^>]*rel=["']icon["']/.test(html))
      warning('BASE-02', 1, 'no favicon', 'Use the inline-SVG emoji data URI — no file, no request, no 404.');
  }

  /* LAYOUT-07 / A11Y-09 — landmarks and headings. */
  const h1s = [...html.matchAll(/<h1\b/g)];
  if (document && /<body\b/.test(html)) {
    if (h1s.length === 0) warning('LAYOUT-07', 1, 'no `<h1>`', 'The app name in the header is the one h1.');
    else if (h1s.length > 1)
      violation('LAYOUT-07', h1s[1].index, `${h1s.length} \`<h1>\` elements`, 'Exactly one. Panels use h2.');
    if (!/<main\b/.test(html)) warning('A11Y-09', 1, 'no `<main>` landmark', 'Content lives in one `<main class="main">`.');
  }

  /* MKTG-01 — the §18 fence, and it fails CLOSED.
     §18 is the only visual-surface section that WIDENS what is permitted (display type, a second
     button class, feature tiles), so it is the one that most needs a guard. A file
     is an app screen unless it declares itself a marketing surface with
     `<!-- conformance-surface marketing -->` (MKTG-08). That default is the whole
     point: the failure that matters is §18 leaking into an app, never an app screen
     being mistaken for a landing page. */
  /* Against `raw`, not `html`: checkHtml receives content with comments blanked, and
     the declaration IS a comment. Testing the blanked copy makes the marker unfindable
     and flags every correctly-declared landing page. */
  if (!MARKETING_SURFACE.test(raw)) {
    const seen = new Set();
    for (const m of html.matchAll(SECTION_18_CLASSES)) {
      if (seen.has(m[1])) continue;          // one finding per class, not per use
      seen.add(m[1]);
      violation('MKTG-01', m.index, `§18 class \`.${m[1]}\` outside a marketing surface`,
        'Section 18 is fenced to landing pages. If this IS one, declare it with `<!-- conformance-surface marketing -->` (MKTG-08); if it is an app screen, the §4 scale and BTN-01 govern instead.');
    }
  }

  /* A11Y-05 — one live region, one helper. */
  const live = [...html.matchAll(/aria-live=/g)];
  if (live.length > 1)
    violation('A11Y-05', live[1].index, `${live.length} \`aria-live\` regions`,
      'Two live regions race each other and the second message wins. One region, one announce() helper.');

  /* BTN-07 — icon-only buttons need aria-label AND title. */
  for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const [full, attrs, inner] = m;
    const textOnly = inner.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').trim();
    const iconOnly = /<svg/i.test(inner) || (textOnly.length > 0 && !/[a-zA-Z0-9]/.test(textOnly)) || textOnly === '';
    if (!iconOnly) continue;
    const hasLabel = /aria-label=/.test(attrs), hasTitle = /title=/.test(attrs);
    if (!hasLabel || !hasTitle)
      violation('BTN-07', m.index, `icon-only button missing ${!hasLabel && !hasTitle ? 'aria-label and title' : !hasLabel ? 'aria-label' : 'title'}`,
        'The label is for a screen reader, the tooltip for a sighted user who cannot place the glyph. Both audiences are real.');
  }

  /* BTN-08 — clickable non-buttons. */
  for (const m of html.matchAll(/<(div|span|li|td)\b[^>]*\sonclick=/g))
    violation('BTN-08', m.index, `clickable \`<${m[1]}>\``,
      'Use a real <button>. Otherwise you reimplement Enter, Space, focus and role — and miss one.');
  for (const m of html.matchAll(/<a\b(?![^>]*\shref=)[^>]*\sonclick=/g))
    violation('BTN-08', m.index, '`<a>` with onclick and no href', 'Not keyboard-focusable. Use a <button>.');

  /* FORM-05 — every control needs a real label. */
  const labelFor = new Set([...html.matchAll(/<label[^>]*\s(?:for|htmlFor)=["']([^"']+)["']/g)].map((m) => m[1]));
  for (const m of html.matchAll(/<(input|select|textarea)\b([^>]*)>/g)) {
    const attrs = m[2];
    const type = (attrs.match(/type=["']([^"']+)["']/) || [, 'text'])[1];
    if (/^(hidden|submit|button|reset|image)$/.test(type)) continue;
    const id = (attrs.match(/\sid=["']([^"']+)["']/) || [])[1];
    if ((id && labelFor.has(id)) || /aria-label(ledby)?=/.test(attrs)) continue;
    warning('FORM-05', m.index, `<${m[1]}> has no label`,
      /placeholder=/.test(attrs)
        ? 'A placeholder is not a label — it vanishes exactly when the user needs it, and fails contrast besides.'
        : 'Add a <label for> or an aria-label.');
  }

  /* CODE-08 — inline styles. */
  const inline = [...html.matchAll(/<[a-z][^>]*\sstyle=["'][^"']+["']/gi)];
  if (inline.length)
    warning('CODE-08', inline[0].index,
      `${inline.length} inline \`style\` attribute${inline.length > 1 ? 's' : ''}`,
      'Only for values genuinely computed at runtime. Otherwise it is a class waiting to be named.');
  for (const m of html.matchAll(/\sstyle=["'][^"']*z-index:\s*(\d+)/g)) {
    if (!ZLADDER.has(Number(m[1])))
      violation('LAYOUT-06', m.index, `inline z-index: ${m[1]} is not on the ladder`, 'Use the ladder.');
  }
}

/* ── vendored-copy freshness ──────────────────────────────────────────────── */

function checkVendored(dir, out) {
  const derived = ['style-guide.html', 'RULES.md', 'tokens.json', 'conformance.schema.json', 'tools/conformance.mjs'];
  const dirs = ['design', 'docs', '.', 'design/style-guide'];
  let foundAny = false;
  for (const name of derived) {
    for (const d of dirs) {
      const p = join(dir, d, name);
      if (!existsSync(p) || statSync(p).isDirectory()) continue;
      foundAny = true;
      const theirs = readFileSync(p, 'utf8');
      const ours = readFileSync(join(ROOT, name), 'utf8');
      const rel = relative(dir, p).replace(/\\/g, '/');
      if (theirs === ours) out.push({ severity: 'OK', message: `${rel} matches canonical` });
      else {
        const oursRules = (ours.match(/sg-rule" id=|^#### `/gm) || []).length;
        const theirsRules = (theirs.match(/sg-rule" id=|^#### `/gm) || []).length;
        out.push({
          severity: 'STALE', rule: 'ARCH-09',
          message: `${rel} differs from canonical`,
          hint: theirsRules && oursRules && theirsRules !== oursRules
            ? `Vendored copy has ${theirsRules} rules, canonical has ${oursRules}. Re-copy it.`
            : 'Re-copy it from the style book repo.',
        });
      }
      break;
    }
  }
  if (!foundAny)
    out.push({
      severity: 'STALE', rule: 'ARCH-09',
      message: 'no vendored copy of the style book found',
      hint: 'Sync the style book, generated artifacts, schema, and checker into this app\'s design/ folder.',
    });
}

/* ── walk an app ──────────────────────────────────────────────────────────── */

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'vendor', '.next', 'coverage']);
function collect(p, acc = []) {
  const st = statSync(p);
  if (st.isFile()) {
    if (/\.(html?|css|[cm]?[jt]sx?)$/i.test(p)) acc.push(p);
    return acc;
  }
  for (const e of readdirSync(p)) {
    if (SKIP_DIRS.has(e) || e.startsWith('.')) continue;
    collect(join(p, e), acc);
  }
  return acc;
}

function auditFile(file, label, { platform = 'file', dynamicDocument = false } = {}) {
  const content = readFileSync(file, 'utf8');
  if (content === CANON) return { skipped: 'is the canonical style book' };

  current = { file: label, content, ignores: [], fileIgnores: new Set() };
  for (const m of content.matchAll(/conformance-ignore-file\s+([A-Z]+-\d+)/g))
    current.fileIgnores.add(m[1]);
  for (const m of content.matchAll(/conformance-ignore\s+([A-Z]+-\d+)/g))
    current.ignores.push({ rule: m[1], line: lineAt(m.index) });

  const extension = extname(file).toLowerCase();
  const isCss = extension === '.css';
  if (isCss) {
    checkCss(stripCssComments(content));
  } else if (/^\.html?$/.test(extension)) {
    const styleBodies = [...content.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)]
      .map((m) => [m.index + m[0].indexOf('>') + 1, m.index + m[0].length - '</style>'.length]);
    checkCss(stripCssComments(keepOnly(content, styleBodies)));
    // Blank script BODIES but keep their opening tags: `src=` and `type="module"` are
    // exactly what ARCH-04 needs to see. Blanking the whole element hides them.
    const scriptBodies = [...content.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
      .map((m) => [m.index + m[0].indexOf('>') + 1, m.index + m[0].length - '</script>'.length]);
    const comments = rangesOf(content, /<!--[\s\S]*?-->/g);
    // <pre> and <code> hold example markup, not markup. Linting a documented snippet as
    // if it were live is how a page that explains aria-live gets reported for having
    // three of them — and any app with a code sample in it hits the same thing.
    const samples = rangesOf(content, /<pre\b[\s\S]*?<\/pre>|<code\b[\s\S]*?<\/code>/g);
    checkHtml(blankOut(content, [...styleBodies, ...scriptBodies, ...comments, ...samples]), content,
      { platform: BUNDLED_PLATFORM.test(content) ? 'bundled' : 'file', document: !dynamicDocument });
  } else {
    if (platform === 'file') {
      for (const m of content.matchAll(/^\s*(?:import|export)\b/gm))
        violation('ARCH-04', m.index, 'module syntax in a file-platform source',
          'Declare a bundled platform or use a plain IIFE script that runs from file://.');
    }
    checkHtml(content, content, { platform, document: false });
    for (const m of content.matchAll(/\bstyle\s*=\s*\{\{/g))
      warning('CODE-08', m.index, 'static JSX style object', 'Use a named class unless the value is genuinely computed at runtime.');
  }
  return {};
}

/* ── run ──────────────────────────────────────────────────────────────────── */

function loadConfig(target) {
  if (!statSync(target).isDirectory()) return null;
  for (const name of ['conformance.json', join('design', 'conformance.json')]) {
    const file = join(target, name);
    if (!existsSync(file)) continue;
    try { return { file, value: JSON.parse(readFileSync(file, 'utf8')) }; }
    catch (e) {
      current = { file: name.replace(/\\/g, '/'), content: readFileSync(file, 'utf8'), ignores: [], fileIgnores: new Set() };
      violation('PLAT-01', 1, 'invalid conformance.json', e.message);
      return { file, value: null };
    }
  }
  return null;
}

function validateBundled(target, config) {
  if (!config?.value) return;
  const cfg = config.value;
  current = { file: relative(target, config.file).replace(/\\/g, '/'), content: readFileSync(config.file, 'utf8'), ignores: [], fileIgnores: new Set() };
  if (cfg.platform !== 'bundled')
    violation('PLAT-01', 1, 'configured platform is not `bundled`', 'Omit conformance.json for the default file platform.');
  if (!Array.isArray(cfg.entries) || !cfg.entries.length)
    violation('PLAT-01', 1, 'no bundled HTML entries declared', 'Declare each entry and its rendered source paths.');
  for (const entry of cfg.entries || []) {
    const entryFile = join(target, entry.html || '');
    if (!entry.html || !existsSync(entryFile)) {
      violation('PLAT-01', 1, `bundled entry not found: \`${entry.html || '(missing)'}\``, 'Every configured entry must exist.');
      continue;
    }
    if (!BUNDLED_PLATFORM.test(readFileSync(entryFile, 'utf8')))
      violation('PLAT-01', 1, `\`${entry.html}\` lacks the bundled platform marker`, 'Add the exact `<!-- conformance-platform bundled -->` comment in its head.');
  }
  const locks = ['package-lock.json', 'npm-shrinkwrap.json', 'pnpm-lock.yaml', 'yarn.lock'];
  if (!existsSync(join(target, 'package.json')) || !locks.some((name) => existsSync(join(target, name))))
    violation('PLAT-04', 1, 'package manifest or supported dependency lockfile is missing', 'Commit both inputs used by the clean build.');
  if (typeof cfg.buildCommand !== 'string' || !cfg.buildCommand.trim())
    violation('PLAT-04', 1, 'no reproducible build command declared', 'Set `buildCommand` in conformance.json.');
  if (!Array.isArray(cfg.deliverySurfaces) || !cfg.deliverySurfaces.length)
    violation('PLAT-05', 1, 'no delivery surfaces declared', 'Name each surface, its source entry, and built output.');
  for (const surface of cfg.deliverySurfaces || []) {
    if (!surface?.name || !surface?.entry || !surface?.build)
      violation('PLAT-05', 1, 'incomplete delivery-surface declaration', 'Each surface needs name, entry, and build.');
    else {
      if (!(cfg.entries || []).some((entry) => entry.html === surface.entry))
        violation('PLAT-05', 1, `delivery surface \`${surface.name}\` names an undeclared entry`, 'The surface entry must appear in `entries`.');
      const builtIncludes = cfg.scopes?.built?.include || [];
      if (!builtIncludes.some((path) => surface.build === path || surface.build.startsWith(path.replace(/\/$/, '') + '/')))
        violation('PLAT-06', 1, `built output for \`${surface.name}\` is outside the built scope`, 'Include every delivery output in `scopes.built`.');
      if (SCOPE === 'built' && !existsSync(join(target, surface.build)))
        violation('PLAT-05', 1, `built output not found for \`${surface.name}\`: \`${surface.build}\``, 'Run the declared build before the built-scope audit.');
    }
  }
  for (const scope of ['source', 'built']) {
    const value = cfg.scopes?.[scope];
    if (!value || !Array.isArray(value.include) || !value.include.length || !Array.isArray(value.exclude))
      violation('PLAT-06', 1, `incomplete ${scope} conformance scope`, 'Each scope needs non-empty include and explicit exclude arrays.');
  }
}

function configuredFiles(target, cfg, scope) {
  const spec = cfg.scopes?.[scope];
  if (!spec?.include) return [];
  const files = [];
  for (const name of spec.include) {
    const path = join(target, name);
    if (existsSync(path)) collect(path, files, true);
    else {
      current = { file: 'conformance.json', content: '', ignores: [], fileIgnores: new Set() };
      violation('PLAT-06', 1, `${scope} include path not found: \`${name}\``, 'Keep conformance scopes aligned with repository paths.');
    }
  }
  return [...new Set(files)].filter((file) => {
    const name = relative(target, file).replace(/\\/g, '/');
    return !(spec.exclude || []).some((x) => name === x || name.startsWith(x.replace(/\/$/, '') + '/'));
  });
}

function checkRenderedEntries(target, cfg) {
  for (const entry of cfg.entries || []) {
    const paths = [];
    for (const name of entry.sources || []) {
      const path = join(target, name);
      if (existsSync(path)) collect(path, paths, true);
    }
    const excludes = cfg.scopes?.source?.exclude || [];
    const rendered = paths.filter((p) => {
      const name = relative(target, p).replace(/\\/g, '/');
      return /\.[jt]sx?$/i.test(p) && !excludes.some((x) => name === x || name.startsWith(x.replace(/\/$/, '') + '/'));
    }).map((p) => readFileSync(p, 'utf8')).join('\n');
    if (!rendered) continue;
    current = { file: entry.html, content: rendered, ignores: [], fileIgnores: new Set() };
    const h1s = [...rendered.matchAll(/<h1\b/g)];
    if (h1s.length !== 1) violation('LAYOUT-07', 1, `${h1s.length} rendered \`<h1>\` elements for ${entry.html}`, 'Each entry renders exactly one h1.');
    if (!/<main\b/.test(rendered)) violation('A11Y-09', 1, `no rendered \`<main>\` for ${entry.html}`, 'The source tree must render one main landmark.');
  }
}

const results = [];
for (const target of targets) {
  if (!existsSync(target)) { console.error(`skip  ${target} — not found`); process.exitCode = 2; continue; }
  const before = findings.length;
  const isDir = statSync(target).isDirectory();
  const config = isDir ? loadConfig(target) : null;
  validateBundled(target, config);
  const bundledDeclared = config?.value?.platform === 'bundled' && config.value.entries?.length > 0 &&
    config.value.entries.every((entry) => entry.html && existsSync(join(target, entry.html)) &&
      BUNDLED_PLATFORM.test(readFileSync(join(target, entry.html), 'utf8')));
  const all = config?.value ? configuredFiles(target, config.value, SCOPE) : collect(target);
  const rel = (f) => relative(target, f).replace(/\\/g, '/');
  const files = SKIP.length ? all.filter((f) => !SKIP.some((s) => rel(f).startsWith(s) || rel(f).includes('/' + s))) : all;
  const excluded = all.length - files.length;
  const vendored = [];
  if (isDir && !NO_VENDORED) checkVendored(target, vendored);

  const skipped = [];
  for (const f of files) {
    const label = relative(target, f).replace(/\\/g, '/') || basename(f);
    const dynamicDocument = config?.value?.entries?.some((entry) => entry.html === label && entry.sources?.length);
    const r = auditFile(f, label, { platform: bundledDeclared ? 'bundled' : 'file', dynamicDocument });
    if (r.skipped) skipped.push(`${label} (${r.skipped})`);
  }
  if (config?.value && SCOPE === 'source') checkRenderedEntries(target, config.value);
  results.push({
    app: target, files: files.length, excluded, skipped, vendored,
    findings: findings.slice(before),
  });
}

/* ── report ───────────────────────────────────────────────────────────────── */

if (JSON_OUT) {
  console.log(JSON.stringify({ tokensEdition: tokens.edition, results }, null, 2));
} else {
  const BY = { VIOLATION: 0, STALE: 1, WARNING: 2, OK: 3 };
  for (const r of results) {
    const excl = r.excluded ? `, ${r.excluded} excluded by --skip` : '';
    console.log(`\n${'═'.repeat(74)}\n${r.app}  —  ${r.files} file${r.files === 1 ? '' : 's'} checked${excl}\n${'═'.repeat(74)}`);

    for (const v of r.vendored) {
      if (v.severity === 'OK') { if (!QUIET) console.log(`  ok       ${v.message}`); continue; }
      console.log(`  STALE    ${v.message}  [${v.rule}]`);
      if (v.hint) console.log(`           → ${v.hint}`);
    }

    const shown = r.findings.filter((f) => !QUIET || f.severity === 'VIOLATION');

    /* A rule that fires 31 times in one file is ONE thing to fix, not 31. Reporting it
       31 times buries the other 20 rules and gets the whole tool ignored. Collapse by
       (file, rule) and carry the line numbers. */
    const groups = new Map();
    for (const f of shown) {
      const k = `${f.file}|${f.rule}|${f.severity}`;
      if (!groups.has(k)) groups.set(k, { ...f, lines: [] });
      groups.get(k).lines.push(f.line);
    }
    /* Order files by how broken they are, but keep each file's groups contiguous —
       sorting by severity first splits a file across two headings. */
    const fileWeight = new Map();
    for (const g of groups.values()) {
      const w = fileWeight.get(g.file) || { v: 0, n: 0 };
      if (g.severity === 'VIOLATION') w.v += g.lines.length;
      w.n += g.lines.length;
      fileWeight.set(g.file, w);
    }
    const grouped = [...groups.values()].sort((a, b) => {
      const wa = fileWeight.get(a.file), wb = fileWeight.get(b.file);
      return (wb.v - wa.v) || (wb.n - wa.n) || a.file.localeCompare(b.file)
        || BY[a.severity] - BY[b.severity] || b.lines.length - a.lines.length
        || a.lines[0] - b.lines[0];
    });

    if (!grouped.length) console.log(`\n  No ${QUIET ? 'violations' : 'findings'}.`);

    /* Per-app tally first, so the top of the output is the shape of the problem. */
    if (grouped.length > 6) {
      const tally = new Map();
      for (const f of r.findings) {
        if (QUIET && f.severity !== 'VIOLATION') continue;
        tally.set(f.rule, (tally.get(f.rule) || 0) + 1);
      }
      const line = [...tally.entries()].sort((a, b) => b[1] - a[1])
        .map(([rule, n]) => `${rule}×${n}`).join('  ');
      console.log(`\n  by rule: ${line}`);
    }

    let lastFile = null;
    for (const g of grouped) {
      if (g.file !== lastFile) { console.log(`\n  ${g.file}`); lastFile = g.file; }
      const tag = g.severity === 'VIOLATION' ? 'VIOLATION' : 'warning  ';
      const n = g.lines.length;
      const where = n === 1 ? `:${g.lines[0]}` : ` ×${n}`;
      console.log(`    ${tag} ${g.file}${where}  [${g.rule}]  ${g.message}`);
      if (n > 1) {
        const head = g.lines.slice(0, 8).join(', ');
        console.log(`              lines ${head}${n > 8 ? ` +${n - 8} more` : ''}`);
      }
      if (g.hint) console.log(`              → ${g.hint}`);
    }
    for (const s of r.skipped) if (!QUIET) console.log(`\n  skipped  ${s}`);

    const v = r.findings.filter((f) => f.severity === 'VIOLATION').length;
    const w = r.findings.length - v;
    const st = r.vendored.filter((x) => x.severity === 'STALE').length;
    console.log(`\n  ${v} violation${v === 1 ? '' : 's'} · ${w} warning${w === 1 ? '' : 's'}${st ? ` · ${st} stale` : ''}`);
  }
  const total = findings.filter((f) => f.severity === 'VIOLATION').length;
  console.log(`\n${total === 0 ? 'PASS' : 'FAIL'} — ${total} violation${total === 1 ? '' : 's'} across ${results.length} app${results.length === 1 ? '' : 's'}. ` +
    `Rules: RULES.md · values: tokens.json · specimens: style-guide.html\n`);
}

if (findings.some((f) => f.severity === 'VIOLATION')) process.exitCode = 1;
