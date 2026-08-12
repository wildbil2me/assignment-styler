/**
 * Installs a DOM on globalThis so core/sanitize.ts and core/import.ts run under
 * Node exactly as they do in a browser.
 *
 * They depend on `document`, `DOMParser` and `HTMLElement` as globals — that is
 * how the shells provide them, and Phase 1 changes no call signatures. Import
 * this before importing anything from core/.
 */

import { parseHTML } from "linkedom";

const host = parseHTML("<!doctype html><html><body></body></html>");

for (const name of [
  "window",
  "document",
  "DOMParser",
  "HTMLElement",
  "Element",
  "Node",
  "NodeList",
  "CSSStyleDeclaration",
]) {
  if (host[name] !== undefined) globalThis[name] = host[name];
}

/**
 * linkedom's DOMParser does not synthesize html/head/body around a fragment the
 * way a browser's does — given "<h1>a</h1><p>b</p>" it makes the h1 the document
 * element and leaves `body` empty, so `doc.body.children` sees nothing.
 *
 * core/import.ts calls `parseFromString(source, "text/html")` and relies on
 * browser fragment behaviour, which is correct in both shells. Rather than bend
 * the core to suit the test double, the shim makes linkedom behave like a
 * browser: bare fragments get wrapped, anything already carrying html/body is
 * passed through untouched.
 *
 * Worth remembering if core ever needs to run outside a browser for real — this
 * is a difference in the parser, not in our code.
 */
const NativeDOMParser =
  typeof globalThis.DOMParser === "function"
    ? globalThis.DOMParser
    : (await import("linkedom")).DOMParser;

const HAS_DOCUMENT_SHELL = /<(?:!doctype|html|body)\b/i;

class BrowserLikeDOMParser extends NativeDOMParser {
  parseFromString(source, type) {
    if (type === "text/html" && !HAS_DOCUMENT_SHELL.test(source))
      return super.parseFromString(
        `<!doctype html><html><head></head><body>${source}</body></html>`,
        type
      );
    return super.parseFromString(source, type);
  }
}

globalThis.DOMParser = BrowserLikeDOMParser;

export const dom = host;
