/**
 * Probe analysis — the only real logic in the compatibility kit.
 *
 * Pure and DOM-implementation agnostic: every function takes an already-parsed
 * document, so it runs unchanged in the browser (docs/compat-analyzer.html,
 * where build.mjs inlines this file) and in Node tests (via linkedom).
 *
 * Verdicts:
 *   survived   the thing under test is still there, unchanged
 *   rewritten  still there, but Blackbaud changed it
 *   stripped   the marker survived, the thing under test did not
 *   missing    the marker itself is gone; the content was removed wholesale
 *   manual     needs a human; the page offers buttons
 */

/** Deepest element whose text contains the row's `[Rnn]` marker. */
export function markerEl(doc, id) {
  const token = "[" + id;
  let best = null;
  const all = doc.querySelectorAll("*");
  for (let i = 0; i < all.length; i++) {
    const t = all[i].textContent;
    if (t && t.indexOf(token) !== -1) best = all[i]; // document order: deepest match wins
  }
  return best;
}

/** The element plus up to `n` ancestors, nearest first. */
function ancestors(el, n) {
  const out = [];
  let cur = el;
  for (let i = 0; i <= n && cur; i++) {
    out.push(cur);
    cur = cur.parentElement;
  }
  return out;
}

/** The `prop: value` declaration for `prop` within a style attribute, or null. */
export function declOf(styleText, prop) {
  if (!styleText) return null;
  const parts = styleText.split(";");
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].trim();
    if (!p) continue;
    const colon = p.indexOf(":");
    if (colon === -1) continue;
    if (p.slice(0, colon).trim().toLowerCase() === prop) return p;
  }
  return null;
}

/**
 * The specific marker token an element carries — `[R04c]` yields "R04c".
 * Rows that test several values of one property use lettered sub-markers, and
 * each must be compared against the declaration it was actually sent with.
 */
export function subMarker(text, id) {
  const m = String(text).match(new RegExp("\\[" + id + "([a-z]?)\\]"));
  return m ? id + m[1] : id;
}

/** Every lettered marker a row carries, or its base id when it has only one. */
export function markerTargets(row) {
  if (row.at) return [row.at];
  const found = [];
  const re = new RegExp("\\[" + row.id + "([a-z])\\]", "g");
  let match;
  while ((match = re.exec(row.html))) {
    const id = row.id + match[1];
    if (found.indexOf(id) === -1) found.push(id);
  }
  return found.length ? found : [row.id];
}

/**
 * What we sent for `prop`, read back out of the row's own source.
 *
 * With `parse`, this is exact: the original document is parsed and the
 * declaration is read from the element carrying `sub`. Without it, every value
 * the row sends for `prop` is returned, and a match against any of them counts
 * as survival — less precise, but it never reports a false rewrite.
 */
export function originalDecls(row, prop, sub, parse) {
  if (parse && sub) {
    const el = markerEl(parse(row.html), sub);
    if (el) {
      const chain = ancestors(el, 3);
      for (let i = 0; i < chain.length; i++) {
        const d = declOf(chain[i].getAttribute("style"), prop);
        if (d) return [d];
      }
      return [];
    }
  }
  const out = [];
  const m = row.html.match(/style="([^"]*)"/g) || [];
  for (let i = 0; i < m.length; i++) {
    const d = declOf(m[i].slice(7, -1), prop);
    if (d && out.indexOf(d) === -1) out.push(d);
  }
  return out;
}

function norm(s) {
  return s ? s.replace(/\s+/g, "").replace(/"/g, "'").toLowerCase() : s;
}

export function analyze(doc, row, parse) {
  const kind = row.check.split(":")[0];
  const arg = row.check.slice(kind.length + 1);

  if (kind === "doc") {
    const styles = doc.querySelectorAll("style");
    for (let i = 0; i < styles.length; i++) {
      if (styles[i].textContent.indexOf(arg) !== -1)
        return { verdict: "survived", detail: "style element retained, contains " + arg };
    }
    return { verdict: "stripped", detail: "no surviving style element contains " + arg };
  }

  if (kind === "manual") return { verdict: "manual", detail: row.expect };

  // Rows that render several elements can name the one they assert against
  // (`at: "R25a"`); otherwise the deepest marker for the row wins.
  const target = row.at || row.id;
  const el = markerEl(doc, target);
  if (!el)
    return {
      verdict: "missing",
      detail: "marker " + target + " not found — the content itself was removed",
    };

  if (kind === "style") {
    const sub = subMarker(el.textContent, row.id);
    const chain = ancestors(el, 3);
    for (let i = 0; i < chain.length; i++) {
      const found = declOf(chain[i].getAttribute("style"), arg);
      if (found) {
        const sent = originalDecls(row, arg, sub, parse);
        const where = i === 0 ? "on the element" : "on ancestor +" + i;
        const matches = sent.some((d) => norm(d) === norm(found));
        if (sent.length && !matches)
          return {
            verdict: "rewritten",
            detail:
              "sent " + sent.join(" / ") + " · got " + found + " (" + where + ")",
          };
        return { verdict: "survived", detail: found + " · " + where };
      }
    }
    const own = el.getAttribute("style");
    return {
      verdict: "stripped",
      detail: own
        ? 'element kept style="' + own + '" but lost ' + arg
        : "no style attribute left on the element",
    };
  }

  if (kind === "attr") {
    const chain = ancestors(el, 3);
    for (let i = 0; i < chain.length; i++) {
      if (chain[i].hasAttribute(arg))
        return { verdict: "survived", detail: arg + '="' + chain[i].getAttribute(arg) + '"' };
    }
    return { verdict: "stripped", detail: arg + " attribute removed" };
  }

  if (kind === "tag") {
    const chain = ancestors(el, 4);
    for (let i = 0; i < chain.length; i++) {
      if (chain[i].tagName.toLowerCase() === arg)
        return { verdict: "survived", detail: "<" + arg + "> retained" };
    }
    return {
      verdict: "rewritten",
      detail: "<" + arg + "> gone · marker now sits in <" + el.tagName.toLowerCase() + ">",
    };
  }

  if (kind === "has") {
    const scope = el.parentElement || el;
    if (scope.querySelector(arg))
      return { verdict: "survived", detail: "<" + arg + "> retained nearby" };
    return { verdict: "stripped", detail: "no <" + arg + "> near the marker" };
  }

  return { verdict: "manual", detail: "unrecognised check" };
}

/** Analyze every lettered specimen and report the worst result for the row. */
export function analyzeRow(doc, row, parse) {
  const targets = row.check === "manual" ? [row.at || row.id] : markerTargets(row);
  if (targets.length === 1) return analyze(doc, { ...row, at: targets[0] }, parse);

  const rank = { survived: 0, manual: 1, rewritten: 2, stripped: 3, missing: 4 };
  const parts = targets.map((target) => ({ target, result: analyze(doc, { ...row, at: target }, parse) }));
  const worst = parts.reduce((a, b) => rank[b.result.verdict] > rank[a.result.verdict] ? b : a);
  return {
    verdict: worst.result.verdict,
    detail: parts.map(({ target, result }) => `${target}: ${result.detail}`).join(" | "),
  };
}
