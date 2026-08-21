/**
 * Rich-text sanitizing, lifted verbatim from the prototype's single-file UI.
 *
 * The allowlist is the contract: 11 inline tags survive, everything else is
 * unwrapped with its children kept, every attribute is dropped except `style`
 * (and `href` on anchors), non-http(s) hrefs go, and surviving inline styles are
 * narrowed to `color`, `background-color`, and the measured line-through form.
 *
 * DOM-dependent by design. Both shells have a real DOM; tests shim `document`
 * and `HTMLElement` with linkedom. The plan's argument for an HTML-parser
 * dependency went away with SSR.
 */

const INLINE_ALLOWLIST = [
  "STRONG",
  "B",
  "EM",
  "I",
  "U",
  "S",
  "STRIKE",
  "SPAN",
  "BR",
  "A",
  "UL",
  "OL",
  "LI",
];

export const esc = (s: string): string =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c] || c
  );

/**
 * Make a CSS value safe to sit inside a double-quoted `style` attribute.
 *
 * Style values come from profiles and palettes, and a custom palette is
 * user-authored — the prototype interpolated it raw, so a quote character in a
 * colour produced broken HTML. Single quotes stay: `font-family` needs them.
 */
export const cssSafe = (value: string): string => value.replace(/[<>"]/g, "");

export function safeRich(value: string): string {
  if (!value.includes("<")) return esc(value).replace(/\n/g, "<br>");

  // Preserved from the prototype. Phase 3 deleted vinext, so plan bug #3 (this
  // diverging under SSR) is moot and both shells always have a real DOM. Kept
  // anyway: it is the guard that lets core run outside a browser at all, and
  // removing it would be a behaviour change no phase has asked for.
  if (typeof document === "undefined") return esc(value);

  const root = document.createElement("div");
  root.innerHTML = value;
  root.querySelectorAll("*").forEach((el) => {
    if (!INLINE_ALLOWLIST.includes(el.tagName))
      el.replaceWith(...Array.from(el.childNodes));
    else
      Array.from(el.attributes).forEach((a) => {
        if (a.name !== "style" && !(el.tagName === "A" && a.name === "href"))
          el.removeAttribute(a.name);
      });
    if (el.tagName === "A" && !/^https?:\/\//i.test(el.getAttribute("href") || ""))
      el.removeAttribute("href");
    if (el instanceof HTMLElement && el.hasAttribute("style")) {
      const color = el.style.color;
      const bg = el.style.backgroundColor;
      const lineThrough = /(^|\s)line-through(\s|$)/i.test(el.style.textDecoration);
      el.removeAttribute("style");
      if (color) el.style.color = color;
      if (bg) el.style.backgroundColor = bg;
      if (lineThrough) el.style.textDecoration = "line-through";
    }
    if (el.tagName === "S" || el.tagName === "STRIKE") {
      // Blackbaud normalizes both elements to this span after a visual-editor
      // save. Emit its stored form up front and preserve it on re-import.
      const span = document.createElement("span");
      const keptStyle = el.getAttribute("style");
      if (keptStyle) span.setAttribute("style", keptStyle);
      span.style.textDecoration = "line-through";
      span.append(...Array.from(el.childNodes));
      el.replaceWith(span);
    }
  });
  return root.innerHTML;
}
