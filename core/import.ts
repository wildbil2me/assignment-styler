/**
 * Existing Blackbaud HTML -> editable blocks.
 *
 * Lifted from the prototype's `importExistingHtml`, with the React state writes
 * pulled out so the heuristics are testable. Behaviour is otherwise identical,
 * including the quirk that the reported block count is taken *after* a synthetic
 * hero is prepended.
 *
 * The regex -> block-type inference table is real heuristic knowledge and the
 * reason this file exists. Order matters: `quiz` is tested before `exam`, and
 * `homework` before `deadline`, so "homework due Friday" reads as homework.
 * Several patterns now resolve to `note` because the types they used to name
 * were retired as visual duplicates of it (see catalog.ts); the tests they sit
 * in still matter, because where a pattern sits decides what a *later* test
 * never gets to claim.
 *
 * Worth knowing from Phase 0: `data-layout` survives a Blackbaud round trip
 * (probe R15), so a future version can recover half-width layout on import
 * instead of inferring it. Blackbaud also re-serializes style attributes, so
 * never compare them byte for byte — see docs/blackbaud-compatibility.md.
 */

import type { Block, BlockType } from "./model.ts";
import { blockMeta } from "./catalog.ts";

export type ImportResult = {
  blocks: Block[];
  message: string;
  /** The title the composer should adopt, or null when nothing was imported. */
  postTitle: string | null;
};

const inferType = (text: string): BlockType =>
  /quiz/i.test(text)
    ? "quiz"
    : /exam|test/i.test(text)
      ? "exam"
      : /announcement/i.test(text)
        ? "announcement"
        : /homework|to do|task/i.test(text)
          ? "homework"
          : /due|deadline|coming up/i.test(text)
            ? "deadline"
            : // Reading, vocabulary and resource are all `note` now, but the
              // reading test stays ahead of `focus` because it always was:
              // "reading questions" was deliberately a reading card, not a
              // focus one, and dropping the branch would silently retint it.
              /read|chapter|pages|scene/i.test(text)
              ? "note"
              : /question|focus|consider|think/i.test(text)
                ? "focus"
                : /learning target|objective|i can/i.test(text)
                  ? "targets"
                  : "note";

/**
 * The heading to give an imported block that arrived without one.
 *
 * Retiring `reading`, `vocabulary` and `resource` as *types* is a statement
 * about how they are drawn — all three were a neutral card, byte for byte. It
 * is not a claim that the words stopped meaning anything, and the fallback
 * heading is the one place that distinction is still visible: a paragraph about
 * a website is better titled "Resource link" than "Note", even though both are
 * now the same block. Without this the regexes above would keep classifying and
 * the teacher would just stop seeing the result.
 */
const inferLabel = (text: string): string =>
  /vocabulary|key term/i.test(text)
    ? "Vocabulary"
    : /resource|link|website/i.test(text)
      ? "Resource link"
      : /read|chapter|pages|scene/i.test(text)
        ? "Reading"
        : blockMeta[inferType(text)].label;

export function importHtml(source: string, stamp: number = Date.now()): ImportResult {
  const doc = new DOMParser().parseFromString(source, "text/html");
  doc
    .querySelectorAll("script,style,iframe,object,embed,form")
    .forEach((el) => el.remove());

  let elements = Array.from(doc.body.children) as HTMLElement[];
  if (
    elements.length === 1 &&
    ["DIV", "MAIN", "SECTION", "ARTICLE"].includes(elements[0].tagName) &&
    (elements[0].children.length > 1 ||
      elements[0].firstElementChild?.matches('svg[data-bcc-type="animated"]'))
  )
    elements = Array.from(elements[0].children) as HTMLElement[];

  const imported: Block[] = [];

  for (const el of elements) {
    const text = (el.textContent || "").trim();
    if (!text) continue;
    const id = stamp + imported.length;
    const tag = el.tagName;

    if (tag === "SVG" && el.getAttribute("data-bcc-type") === "animated") {
      const heading = el.querySelector("foreignObject h2");
      const body = el.querySelector<HTMLElement>("foreignObject [data-bcc-body]");
      const motion = el.getAttribute("data-bcc-motion");
      imported.push({
        id,
        type: "animated",
        title: heading?.textContent?.trim() || "Animated card",
        body: body?.innerHTML.trim() || "",
        motion: ["fade", "slide-up", "slide-left"].includes(motion || "") ? motion as Block["motion"] : "fade",
      });
      continue;
    }

    if (tag === "H1") {
      imported.push({ id, type: "hero", label: "IMPORTED POST", title: text, body: "" });
      continue;
    }
    if (tag === "BLOCKQUOTE") {
      imported.push({ id, type: "quote", title: "Quote", body: el.innerHTML });
      continue;
    }
    if (tag === "OL") {
      imported.push({
        id,
        type: "steps",
        title: "Steps",
        body: Array.from(el.querySelectorAll("li"))
          .map((x) => x.textContent?.trim())
          .filter(Boolean)
          .join("\n"),
      });
      continue;
    }
    if (tag === "UL") {
      imported.push({
        id,
        type: "checklist",
        title: "Checklist",
        body: Array.from(el.querySelectorAll("li"))
          .map((x) => x.textContent?.trim())
          .filter(Boolean)
          .join("\n"),
      });
      continue;
    }
    if (tag === "P" && !imported.length) {
      imported.push({ id, type: "intro", title: "", body: el.innerHTML });
      continue;
    }

    const heading = el.matches("h2,h3,h4")
      ? el
      : el.querySelector<HTMLElement>("h1,h2,h3,h4,strong,b");
    const title = (heading?.textContent || "").trim() || inferLabel(text);
    const clone = el.cloneNode(true) as HTMLElement;
    if (heading && !el.matches("h2,h3,h4"))
      clone.querySelector("h1,h2,h3,h4,strong,b")?.remove();
    const body = el.matches("h2,h3,h4") ? "" : clone.innerHTML.trim() || text;
    imported.push({ id, type: inferType(`${title} ${text}`), title, body });
  }

  if (!imported.length)
    return {
      blocks: [],
      message: "No readable content was found in that HTML.",
      postTitle: null,
    };

  if (!imported.some((b) => b.type === "hero"))
    imported.unshift({
      id: stamp - 1,
      type: "hero",
      label: "IMPORTED POST",
      title: "IMPORTED BLACKBAUD CONTENT",
      body: "Review and rename this page",
    });

  return {
    blocks: imported,
    // Counted after the synthetic hero, as the prototype does.
    message: `${imported.length} editable blocks created.`,
    postTitle: "Imported Blackbaud post",
  };
}
