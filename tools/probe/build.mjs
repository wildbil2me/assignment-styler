/**
 * Generates the Phase 0 compatibility kit:
 *
 *   docs/compat-probe.html      open locally, read the reference rendering,
 *                               copy the payload, paste into Blackbaud
 *   docs/compat-analyzer.html   open locally, paste back what Blackbaud stored,
 *                               get a per-row verdict and an exportable spec
 *
 * No dependencies, no build step:  node tools/probe/build.mjs
 */

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { rows, TIERS } from "./rows.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const docs = join(here, "..", "..", "docs");

/**
 * The analysis logic is inlined from analyze.mjs rather than duplicated here,
 * so the browser page and tools/probe/analyze.test.mjs exercise the same code.
 */
const ANALYZE_SRC = readFileSync(join(here, "analyze.mjs"), "utf8")
  .replace(/^export /gm, "")
  .trim();

const BUILT = new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ shared */

const SHELL_CSS = `
:root{
  --ground:#EAEEF2; --panel:#FFFFFF; --panel-2:#F3F6F9;
  --ink:#151A20; --ink-2:#3B4652; --muted:#5A6673;
  --rule:#CFD8E1; --rule-soft:#DFE6ED;
  --accent:#0A5D57; --on-accent:#FFFFFF; --accent-soft:#DCEBE8;
  --ok:#2F6B4A; --ok-soft:#DDEBE2;
  --warn:#9C5A08; --warn-soft:#F6E8D4;
  --bad:#98202C; --bad-soft:#F6DFE1;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --ground:#12161A; --panel:#1A1F25; --panel-2:#21272E;
  --ink:#E4E9EF; --ink-2:#BCC6D1; --muted:#8A97A4;
  --rule:#2C343D; --rule-soft:#242B33;
  --accent:#5CC4B4; --on-accent:#0B1114; --accent-soft:#17322F;
  --ok:#6FBE90; --ok-soft:#172A20;
  --warn:#D69B52; --warn-soft:#2E2317;
  --bad:#E08693; --bad-soft:#2E1A1D;
}}
*{box-sizing:border-box;}
body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--sans);font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased;}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px 80px;}
.masthead{padding:48px 0 24px;border-bottom:1px solid var(--rule);}
.kicker{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:1.7px;text-transform:uppercase;color:var(--accent);margin:0 0 12px;}
h1{font-size:clamp(26px,4vw,34px);line-height:1.12;font-weight:600;letter-spacing:-.5px;margin:0 0 12px;max-width:22ch;text-wrap:balance;}
.standfirst{font-size:16.5px;line-height:1.65;color:var(--ink-2);margin:0;max-width:64ch;}
.runline{display:flex;flex-wrap:wrap;gap:9px 24px;margin:22px 0 0;font-family:var(--mono);font-size:11.5px;color:var(--muted);}
.runline b{color:var(--ink-2);font-weight:600;}
h2{font-size:20px;font-weight:600;letter-spacing:-.2px;margin:0 0 6px;}
.section{padding:40px 0 0;}
.sub{color:var(--muted);font-size:14.5px;margin:0 0 20px;max-width:64ch;}
.btn{font-family:var(--mono);font-size:11px;letter-spacing:.9px;text-transform:uppercase;padding:10px 15px;border:1px solid var(--rule);background:var(--panel);color:var(--ink-2);cursor:pointer;}
.btn:hover{border-color:var(--accent);color:var(--accent);}
.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--on-accent);}
.btn.is-done{border-color:var(--ok);color:var(--ok);}
.btn.primary.is-done{background:var(--ok);border-color:var(--ok);color:var(--on-accent);}
button:focus-visible,a:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid var(--accent);outline-offset:2px;}
ol.steps{margin:0;padding:0;list-style:none;counter-reset:s;display:grid;gap:1px;background:var(--rule);border:1px solid var(--rule);}
ol.steps li{counter-increment:s;background:var(--panel);padding:16px 20px 16px 54px;position:relative;font-size:14.5px;color:var(--ink-2);}
ol.steps li::before{content:counter(s);position:absolute;left:20px;top:16px;font-family:var(--mono);font-size:11px;color:var(--accent);font-weight:600;}
ol.steps li strong{color:var(--ink);font-weight:600;display:block;margin:0 0 3px;font-size:15px;}
code{font-family:var(--mono);font-size:.92em;}
footer{margin:52px 0 0;padding:20px 0 0;border-top:1px solid var(--rule);font-family:var(--mono);font-size:11.5px;color:var(--muted);}
.note{margin:24px 0 0;padding:15px 19px;background:var(--panel);border-left:3px solid var(--accent);font-size:14.5px;color:var(--ink-2);}
.note strong{color:var(--ink);font-weight:600;}
.note.warn{border-left-color:var(--warn);}
`;

const esc = (s) =>
  String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

/* ------------------------------------------------------- the paste payload */

function buildPayload() {
  const out = [
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1F2A36;">`,
    `<p style="font-size:20px;font-weight:700;margin:0 0 4px;">Blackbaud compatibility probe</p>`,
    `<p style="margin:0 0 4px;">Built ${BUILT}. Every row is labelled in plain text, so the labels survive even when the styling does not.</p>`,
    `<p style="margin:0 0 18px;"><b>Do not publish this to students.</b> Save it as a draft, look at it, then delete it.</p>`,
  ];

  let tier = null;
  for (const row of rows) {
    if (row.tier !== tier) {
      tier = row.tier;
      out.push(
        `<hr style="border:0;border-top:3px solid #1D3247;margin:26px 0 14px;">`,
        `<p style="margin:0 0 14px;font-size:15px;font-weight:700;">TIER ${tier} &mdash; ${TIERS[tier]}</p>`
      );
    }
    out.push(
      `<hr style="border:0;border-top:1px solid #C9D2DB;margin:20px 0 10px;">`,
      `<p style="margin:0 0 8px;"><b>${row.id} &middot; ${row.name}</b><br>Expect: ${row.expect}</p>`,
      row.html
    );
  }

  out.push(
    `<hr style="border:0;border-top:3px solid #1D3247;margin:26px 0 14px;">`,
    `<p style="margin:0;">End of probe. ${rows.length} rows.</p>`,
    `</div>`
  );
  return out.join("");
}

/* ------------------------------------------------------------- probe page */

function buildProbePage(payload) {
  const byTier = new Map();
  for (const r of rows) {
    if (!byTier.has(r.tier)) byTier.set(r.tier, []);
    byTier.get(r.tier).push(r);
  }

  const legend = [...byTier.entries()]
    .map(
      ([t, rs]) => `
      <div class="tier">
        <p class="tier-h">Tier ${t} &mdash; ${esc(TIERS[t])} <span>${rs.length} rows</span></p>
        <dl class="rowlist">
          ${rs
            .map(
              (r) => `<div class="rl">
                <dt>${r.id}<span class="stk s-${r.stakes}">${r.stakes}</span></dt>
                <dd><b>${esc(r.name)}</b><br>${esc(r.why)}</dd>
              </div>`
            )
            .join("")}
        </dl>
      </div>`
    )
    .join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Blackbaud compatibility probe</title>
<style>${SHELL_CSS}
.tier{margin:0 0 26px;}
.tier-h{font-family:var(--mono);font-size:11px;letter-spacing:1.3px;text-transform:uppercase;color:var(--accent);margin:0 0 10px;font-weight:600;display:flex;justify-content:space-between;gap:12px;}
.tier-h span{color:var(--muted);}
.rowlist{margin:0;border-top:1px solid var(--rule-soft);}
.rl{display:grid;grid-template-columns:110px minmax(0,1fr);gap:14px;padding:11px 0;border-bottom:1px solid var(--rule-soft);}
.rl dt{font-family:var(--mono);font-size:11.5px;color:var(--muted);display:flex;flex-direction:column;gap:5px;align-items:flex-start;}
.rl dd{margin:0;font-size:14px;color:var(--ink-2);}
.rl dd b{color:var(--ink);font-weight:600;}
.stk{font-family:var(--mono);font-size:9.5px;letter-spacing:.8px;text-transform:uppercase;padding:1px 6px;font-weight:600;}
.s-critical{background:var(--bad-soft);color:var(--bad);}
.s-high{background:var(--warn-soft);color:var(--warn);}
.s-medium{background:var(--accent-soft);color:var(--accent);}
.s-low{background:var(--panel-2);color:var(--muted);}
.bar{position:sticky;top:0;z-index:10;display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:12px 0;background:var(--ground);border-bottom:1px solid var(--rule);margin:36px 0 0;}
.paper{background:#FFFFFF;color:#1F2A36;padding:28px 26px;box-shadow:0 1px 2px rgba(20,30,40,.05),0 10px 28px rgba(20,30,40,.07);max-width:720px;margin:20px 0 0;}
details.src{margin:18px 0 0;}
details.src summary{font-family:var(--mono);font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);cursor:pointer;padding:6px 0;}
details.src summary:hover{color:var(--accent);}
details.src textarea{width:100%;height:260px;margin:8px 0 0;padding:12px;background:var(--panel);border:1px solid var(--rule);color:var(--ink-2);font-family:var(--mono);font-size:11px;line-height:1.5;}
</style></head><body>
<div class="wrap">
  <header class="masthead">
    <p class="kicker">Phase 0a &middot; measure Blackbaud</p>
    <h1>Compatibility probe</h1>
    <p class="standfirst">${rows.length} rows, each isolating one property, element, or delivery mechanism, each carrying a plain-text <code>[Rnn]</code> marker that survives whatever Blackbaud does to the styling. Paste it in, save it, copy it back out, and the analyzer will tell you what changed.</p>
    <div class="runline">
      <span><b>Built</b> ${BUILT}</span>
      <span><b>Rows</b> ${rows.length}</span>
      <span><b>Order</b> highest stakes first</span>
      <span><b>Next</b> docs/compat-analyzer.html</span>
    </div>
  </header>

  <p class="note warn"><strong>Save as a draft. Do not publish.</strong> This document is deliberately ugly and will confuse a student who stumbles on it. Delete it once you have copied the result back out.</p>

  <section class="section">
    <h2>How to run it</h2>
    <p class="sub">Repeat for each surface you care about: bulletin board, topic, assignment. Twenty minutes total.</p>
    <ol class="steps">
      <li><strong>Copy the probe</strong>Use the button below. It copies only the probe payload, not this page.</li>
      <li><strong>Paste into Blackbaud's HTML/source editor</strong>Not the visual editor. Save the draft.</li>
      <li><strong>Look at it against the reference rendering below</strong>Every row states what you should see. Note anything that differs.</li>
      <li><strong>Now the important one: open the visual editor, then save again</strong>This is where editors classically mangle markup, and it is the likeliest way a teacher silently loses their formatting.</li>
      <li><strong>Reopen the source editor and copy everything out</strong>That text is what Blackbaud actually stored.</li>
      <li><strong>Paste it into docs/compat-analyzer.html</strong>It reports a verdict per row and exports the compat spec.</li>
    </ol>
  </section>

  <div class="bar">
    <button class="btn primary" id="copy" type="button">Copy probe payload</button>
    <button class="btn" id="copyagain" type="button">Copy again</button>
    <span style="font-family:var(--mono);font-size:11px;color:var(--muted);">${payload.length.toLocaleString("en-US")} characters</span>
  </div>

  <details class="src"><summary>Show payload as text (if the copy button is blocked)</summary><textarea id="raw" readonly></textarea></details>

  <section class="section">
    <h2>Reference rendering</h2>
    <p class="sub">What the probe looks like when nothing has been stripped. Compare this against what you see in Blackbaud &mdash; the differences are the findings.</p>
    <div class="paper" id="paper"></div>
  </section>

  <section class="section">
    <h2>What each row is for</h2>
    <p class="sub">Stakes are relative to the chosen soft-cards direction and the zero-backend architecture, not to CSS in general.</p>
    ${legend}
  </section>

  <footer>BBStyler &middot; tools/probe &middot; regenerate with <code>npm run probe</code></footer>
</div>
<script>
const PAYLOAD = document.getElementById('raw');
const P = ${JSON.stringify(payload)};
PAYLOAD.value = P;
document.getElementById('paper').innerHTML = P;
function wire(id){
  const b = document.getElementById(id);
  b.addEventListener('click', function(){
    const done = function(){
      const was = b.textContent;
      b.textContent = 'Copied';
      b.classList.add('is-done');
      setTimeout(function(){ b.textContent = was; b.classList.remove('is-done'); }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(P).then(done, function(){ fb(done); });
    } else { fb(done); }
  });
}
function fb(done){ PAYLOAD.closest('details').open = true; PAYLOAD.select(); try{ document.execCommand('copy'); done(); }catch(e){} }
wire('copy'); wire('copyagain');
</script>
</body></html>`;
}

/* ---------------------------------------------------------- analyzer page */

function buildAnalyzerPage() {
  const meta = rows.map((r) => ({
    id: r.id,
    tier: r.tier,
    name: r.name,
    stakes: r.stakes,
    why: r.why,
    expect: r.expect,
    check: r.check,
    at: r.at,
    html: r.html,
  }));

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Compatibility probe analyzer</title>
<style>${SHELL_CSS}
.controls{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:26px 0 0;}
select,textarea{font-family:var(--mono);font-size:12px;background:var(--panel);color:var(--ink);border:1px solid var(--rule);padding:9px 11px;}
textarea#input{width:100%;height:190px;line-height:1.5;margin:14px 0 0;}
.tally{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1px;background:var(--rule);border:1px solid var(--rule);margin:26px 0 0;}
.tally div{background:var(--panel);padding:15px 17px;}
.tally .n{font-size:26px;font-weight:600;letter-spacing:-.5px;font-variant-numeric:tabular-nums;line-height:1.1;}
.tally .k{font-family:var(--mono);font-size:10.5px;letter-spacing:1.1px;text-transform:uppercase;color:var(--muted);margin:5px 0 0;}
.n.ok{color:var(--ok);} .n.warn{color:var(--warn);} .n.bad{color:var(--bad);}
.findings{margin:26px 0 0;padding:20px;border:1px solid var(--rule);background:var(--panel);}
.findings h2{font-size:17px;}
.findings-list{display:grid;gap:10px;margin:14px 0 0;}
.finding{display:grid;grid-template-columns:88px 1fr;gap:12px;padding:12px;border-left:3px solid var(--warn);background:var(--panel-2);color:var(--ink-2);text-decoration:none;}
.finding:hover{border-left-color:var(--accent);}
.finding.bad{border-left-color:var(--bad);}
.finding.manual{border-left-color:var(--muted);}
.finding b{display:block;color:var(--ink);font-size:14px;}
.finding p{margin:3px 0 0;color:var(--muted);font-size:12px;line-height:1.45;}
.res{border:1px solid var(--rule);background:var(--panel);margin:26px 0 0;}
.res-row{display:grid;grid-template-columns:100px 1fr 116px;gap:14px;padding:13px 17px;border-bottom:1px solid var(--rule-soft);align-items:start;}
.res-row:last-child{border-bottom:0;}
.res-row.tierhead{grid-template-columns:1fr;background:var(--panel-2);font-family:var(--mono);font-size:10.5px;letter-spacing:1.2px;text-transform:uppercase;color:var(--muted);padding:10px 17px;}
.rid{font-family:var(--mono);font-size:11.5px;color:var(--muted);}
.rname{font-weight:600;font-size:14.5px;}
.rdetail{font-family:var(--mono);font-size:11px;color:var(--muted);margin:5px 0 0;overflow-wrap:anywhere;}
.evidence{margin:10px 0 0;border-top:1px solid var(--rule-soft);padding:9px 0 0;}
.evidence summary{color:var(--accent);font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;}
.evidence dl{display:grid;grid-template-columns:90px minmax(0,1fr);gap:6px 10px;margin:10px 0 0;font-size:12px;}
.evidence dt{color:var(--muted);font-family:var(--mono);}
.evidence dd{margin:0;color:var(--ink-2);overflow-wrap:anywhere;}
.evidence code{display:block;max-height:130px;overflow:auto;padding:8px;background:var(--ground);color:var(--ink-2);font-size:10.5px;line-height:1.45;white-space:pre-wrap;word-break:break-word;}
.verdict{font-family:var(--mono);font-size:10px;letter-spacing:.9px;text-transform:uppercase;font-weight:600;padding:4px 8px;text-align:center;}
.v-survived{background:var(--ok-soft);color:var(--ok);}
.v-stripped{background:var(--bad-soft);color:var(--bad);}
.v-rewritten{background:var(--warn-soft);color:var(--warn);}
.v-missing{background:var(--bad-soft);color:var(--bad);}
.v-manual{background:var(--panel-2);color:var(--muted);}
.manual-pick{display:flex;flex-wrap:wrap;gap:6px;margin:7px 0 0;}
.manual-pick button{font-family:var(--mono);font-size:10px;letter-spacing:.6px;text-transform:uppercase;padding:4px 8px;border:1px solid var(--rule);background:transparent;color:var(--muted);cursor:pointer;}
.manual-pick button[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:var(--on-accent);}
.empty{padding:40px 17px;text-align:center;color:var(--muted);font-size:14.5px;}
.out{width:100%;height:200px;margin:14px 0 0;}
@media(max-width:640px){.res-row{grid-template-columns:62px minmax(0,1fr);}.verdict{grid-column:1/-1;}.finding{grid-template-columns:1fr;}.evidence dl{grid-template-columns:1fr;}}
</style></head><body>
<div class="wrap">
  <header class="masthead">
    <p class="kicker">Phase 0a &middot; read the results</p>
    <h1>Probe analyzer</h1>
    <p class="standfirst">Paste back whatever Blackbaud stored. This finds each <code>[Rnn]</code> marker in the returned markup and reports what survived around it, what got rewritten, and what vanished &mdash; then exports the result as the compat spec.</p>
    <div class="runline"><span><b>Runs locally</b> nothing is uploaded</span><span><b>Rows</b> ${rows.length}</span><span><b>Probe built</b> ${BUILT}</span></div>
  </header>

  <section class="section">
    <h2>1 &middot; Paste what Blackbaud gave back</h2>
    <p class="sub">Open the saved post's HTML/source editor, select all, copy, paste here. Do one surface at a time.</p>
    <div class="controls">
      <label style="font-family:var(--mono);font-size:11px;letter-spacing:1.1px;text-transform:uppercase;color:var(--muted);">Surface
        <select id="surface" style="margin-left:8px;">
          <option value="bulletin">Bulletin Board</option>
          <option value="topic">Topic</option>
          <option value="assignment">Assignment</option>
        </select>
      </label>
      <button class="btn primary" id="run" type="button">Analyze</button>
      <button class="btn" id="clear" type="button">Clear</button>
    </div>
    <textarea id="input" placeholder="Paste the returned HTML here&hellip;"></textarea>
  </section>

  <div class="tally" id="tally" hidden>
    <div><p class="n ok" id="t-survived">0</p><p class="k">Survived</p></div>
    <div><p class="n warn" id="t-rewritten">0</p><p class="k">Rewritten</p></div>
    <div><p class="n bad" id="t-stripped">0</p><p class="k">Stripped</p></div>
    <div><p class="n bad" id="t-missing">0</p><p class="k">Content gone</p></div>
    <div><p class="n" id="t-manual">0</p><p class="k">Needs your eyes</p></div>
  </div>

  <section class="findings" id="findings" hidden>
    <h2>What needs attention</h2>
    <p class="sub">Each item says what changed or what you need to inspect. Select one to jump to its evidence.</p>
    <div class="findings-list" id="findings-list"></div>
  </section>

  <div class="res" id="res"><p class="empty">Results appear here once you analyze a paste.</p></div>

  <section class="section">
    <h2>2 &middot; Export</h2>
    <p class="sub">Record every surface first, then export once. Verdicts for surfaces you have already analyzed are kept in this page until you reload it.</p>
    <div class="controls">
      <button class="btn" id="ex-json" type="button">Copy JSON</button>
      <button class="btn" id="ex-ts" type="button">Copy core/compat.ts</button>
      <button class="btn" id="ex-md" type="button">Copy markdown table</button>
    </div>
    <textarea class="out" id="out" readonly placeholder="Export output appears here too, in case the clipboard is blocked."></textarea>
  </section>

  <footer>BBStyler &middot; tools/probe &middot; regenerate with <code>npm run probe</code></footer>
</div>
<script>
const ROWS = ${JSON.stringify(meta)};
const TIERS = ${JSON.stringify(TIERS)};
const results = {};   // surface -> id -> {verdict, detail, expected, found}

${ANALYZE_SRC}

function escapeHtml(value){
  return String(value == null ? '' : value).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];
  });
}

function attentionText(row, result){
  if (result.verdict === 'rewritten') return 'Blackbaud kept the marked content but changed ' + row.name + '.';
  if (result.verdict === 'stripped') return 'Blackbaud kept the marked content but removed ' + row.name + '.';
  if (result.verdict === 'missing') return 'Blackbaud removed the marked content for ' + row.name + '.';
  return 'Needs your eyes: ' + row.expect;
}

function render(surface){
  const res = results[surface] || {};
  const host = document.getElementById('res');
  const counts = { survived:0, rewritten:0, stripped:0, missing:0, manual:0 };
  let html = '';
  let findings = '';
  let tier = null;

  ROWS.forEach(function(row){
    const r = res[row.id];
    if (!r) return;
    counts[r.verdict] = (counts[r.verdict] || 0) + 1;
    if (r.verdict !== 'survived'){
      const tone = r.verdict === 'missing' || r.verdict === 'stripped' ? 'bad' : r.verdict === 'manual' ? 'manual' : '';
      findings += '<a class="finding ' + tone + '" href="#result-' + row.id + '">'
        + '<span class="verdict v-' + r.verdict + '">' + escapeHtml(r.verdict) + '</span>'
        + '<span><b>' + escapeHtml(row.id + ' · ' + row.name) + '</b><p>' + escapeHtml(attentionText(row, r)) + '</p></span></a>';
    }
    if (row.tier !== tier){
      tier = row.tier;
      html += '<div class="res-row tierhead">Tier ' + tier + ' &mdash; ' + TIERS[tier] + '</div>';
    }
    html += '<div class="res-row" id="result-' + row.id + '">'
      + '<div class="rid">' + row.id + '<br><span class="stk">' + row.stakes + '</span></div>'
      + '<div><div class="rname">' + escapeHtml(row.name) + '</div><div class="rdetail">' + escapeHtml(r.detail) + '</div>'
      + (r.verdict === 'manual'
          ? '<div class="manual-pick" data-row="' + row.id + '">'
            + ['survived','rewritten','stripped'].map(function(v){
                return '<button type="button" data-v="' + v + '" aria-pressed="' + (r.pick === v) + '">' + v + '</button>';
              }).join('')
            + '</div>'
          : '')
      + '<details class="evidence"' + (r.verdict === 'survived' ? '' : ' open') + '><summary>Evidence and next check</summary><dl>'
      + '<dt>Expected</dt><dd>' + escapeHtml(row.expect) + '</dd>'
      + '<dt>Why it matters</dt><dd>' + escapeHtml(row.why) + '</dd>'
      + '<dt>Analyzer found</dt><dd>' + escapeHtml(r.detail) + '</dd>'
      + '<dt>Sent</dt><dd><code>' + escapeHtml(row.html) + '</code></dd>'
      + '<dt>Returned</dt><dd><code>' + escapeHtml(r.found) + '</code></dd>'
      + '</dl></details>'
      + '</div>'
      + '<div class="verdict v-' + (r.pick || r.verdict) + '">' + (r.pick || r.verdict) + '</div>'
      + '</div>';
  });

  host.innerHTML = html || '<p class="empty">Results appear here once you analyze a paste.</p>';
  document.getElementById('findings-list').innerHTML = findings;
  document.getElementById('findings').hidden = !findings;
  document.getElementById('tally').hidden = !html;
  ['survived','rewritten','stripped','missing','manual'].forEach(function(k){
    document.getElementById('t-' + k).textContent = counts[k] || 0;
  });

  host.querySelectorAll('.manual-pick button').forEach(function(btn){
    btn.addEventListener('click', function(){
      const id = btn.parentElement.dataset.row;
      results[surface][id].pick = btn.dataset.v;
      render(surface);
    });
  });
}

document.getElementById('run').addEventListener('click', function(){
  const text = document.getElementById('input').value.trim();
  const surface = document.getElementById('surface').value;
  if (!text) return;
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const parse = function(html){ return new DOMParser().parseFromString(html, 'text/html'); };
  results[surface] = {};
  ROWS.forEach(function(row){
    const result = analyzeRow(doc, row, parse);
    const targets = markerTargets(row);
    result.found = targets.map(function(target){
      const found = markerEl(doc, target);
      return found ? target + ': ' + found.outerHTML : target + ': no returned element contains this marker.';
    }).join('\n');
    results[surface][row.id] = result;
  });
  render(surface);
});
document.getElementById('clear').addEventListener('click', function(){
  document.getElementById('input').value = '';
});
document.getElementById('surface').addEventListener('change', function(){
  render(document.getElementById('surface').value);
});

function verdictOf(r){ return r.pick || r.verdict; }
function emit(text){
  document.getElementById('out').value = text;
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text);
}
document.getElementById('ex-json').addEventListener('click', function(){
  emit(JSON.stringify({ probeBuilt:'${BUILT}', surfaces:results }, null, 2));
});
document.getElementById('ex-md').addEventListener('click', function(){
  const surfaces = Object.keys(results);
  if (!surfaces.length) return emit('Analyze at least one surface first.');
  let md = '| Row | Test | Stakes | ' + surfaces.join(' | ') + ' |\\n|---|---|---|' + surfaces.map(function(){ return '---|'; }).join('') + '\\n';
  ROWS.forEach(function(row){
    md += '| ' + row.id + ' | ' + row.name + ' | ' + row.stakes + ' | '
       + surfaces.map(function(s){ return results[s][row.id] ? verdictOf(results[s][row.id]) : '&mdash;'; }).join(' | ') + ' |\\n';
  });
  emit(md);
});
document.getElementById('ex-ts').addEventListener('click', function(){
  const surfaces = Object.keys(results);
  if (!surfaces.length) return emit('Analyze at least one surface first.');
  const base = surfaces[0];
  const safe = ROWS.filter(function(r){ return verdictOf(results[base][r.id] || {}) === 'survived'; });
  const unsafe = ROWS.filter(function(r){ const v = verdictOf(results[base][r.id] || {}); return v === 'stripped' || v === 'missing'; });
  emit(
    '// Generated from the Phase 0 probe on ' + new Date().toISOString().slice(0,10) + '.\\n' +
    '// Baseline surface: ' + base + '. Regenerate with tools/probe + docs/compat-analyzer.html.\\n\\n' +
    'export const compat = {\\n' +
    '  surfacesMeasured: ' + JSON.stringify(surfaces) + ',\\n\\n' +
    '  /** Verified to survive a paste + visual-editor round trip. */\\n' +
    '  safe: [\\n' + safe.map(function(r){ return '    ' + JSON.stringify(r.id) + ', // ' + r.name; }).join('\\n') + '\\n  ],\\n\\n' +
    '  /** Stripped or rewritten. degrade() must route around these. */\\n' +
    '  unsafe: [\\n' + unsafe.map(function(r){ return '    ' + JSON.stringify(r.id) + ', // ' + r.name; }).join('\\n') + '\\n  ],\\n' +
    '} as const;\\n'
  );
});
</script>
</body></html>`;
}

/* -------------------------------------------------------------------- run */

mkdirSync(docs, { recursive: true });
const payload = buildPayload();
writeFileSync(join(docs, "compat-probe.html"), buildProbePage(payload), "utf8");
writeFileSync(join(docs, "compat-analyzer.html"), buildAnalyzerPage(), "utf8");

console.log(`probe    ${rows.length} rows, ${payload.length.toLocaleString("en-US")} char payload`);
console.log(`written  docs/compat-probe.html`);
console.log(`written  docs/compat-analyzer.html`);
