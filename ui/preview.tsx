import { memo, useLayoutEffect, useRef, type RefObject } from "react";

import type { Block } from "../core/model.ts";
import { Icon } from "./icon.tsx";
import type { Composer } from "./state.ts";

export type Device = "desktop" | "mobile";

/** The shared live preview. Its rendered headings and bodies are editable in place. */
export function Preview({ c, device, onDevice }: {
  c: Composer;
  device: Device;
  onDevice?: (device: Device) => void;
}) {
  const { surface, html, undo, redo, blocks, selected, setSelected, updateBlock, formatterRef } = c;
  const paper = useRef<HTMLDivElement>(null);
  const activeEditor = useRef<ActiveEditor | null>(null);
  const savedRange = useRef<Range | null>(null);
  const pendingAlign = useRef(new Map<number, NonNullable<Block["align"]>>());

  useLayoutEffect(() => {
    const page = paper.current?.firstElementChild;
    if (!(page instanceof HTMLElement)) return;

    const roots = Array.from(page.children).flatMap(element => {
      const child = element as HTMLElement;
      const nested = Array.from(child.children) as HTMLElement[];
      return !child.hasAttribute("data-layout") && nested.length > 0 && nested.every(item => item.hasAttribute("data-layout"))
        ? nested
        : [child];
    });
    const visible = blocks.filter(block => !block.hidden);
    const cleanups: Array<() => void> = [];
    let fallbackEditor: ActiveEditor | null = null;
    let toolbarPointerDown = false;
    const trackToolbarPointer = (event: PointerEvent) => {
      toolbarPointerDown = event.target instanceof Element && Boolean(event.target.closest(".formatting-panel"));
    };
    const clearToolbarPointer = () => { toolbarPointerDown = false };
    document.addEventListener("pointerdown", trackToolbarPointer, true);
    document.addEventListener("pointerup", clearToolbarPointer, true);
    document.addEventListener("pointercancel", clearToolbarPointer, true);

    const runFormat = (command: string, argument?: string) => {
      const target = activeEditor.current || fallbackEditor;
      if (!target?.element.isConnected) return;
      const range = savedRange.current;
      target.element.focus();
      const selection = document.getSelection();
      if (selection && range) {
        try {
          selection.removeAllRanges();
          selection.addRange(range);
          savedRange.current = range.cloneRange();
        } catch {
          savedRange.current = null;
        }
      }
      if (command === "align" && argument) {
        const align = argument as NonNullable<Block["align"]>;
        target.root.style.textAlign = align;
        pendingAlign.current.set(target.block.id, align);
        target.markDirty();
        document.querySelectorAll<HTMLButtonElement>(".formatting-panel [class*='align-']").forEach(button => {
          const active = button.classList.contains(`align-${align}`);
          button.classList.toggle("active", active);
          button.setAttribute("aria-pressed", String(active));
        });
      } else {
        document.execCommand(command, false, argument);
        target.markDirty();
      }
    };
    formatterRef.current = runFormat;

    visible.forEach((block, index) => {
      const root = roots[index];
      if (!root) return;

      // The paper sits inside the middle application column, so its usable
      // content width can be narrower than Blackbaud's real 720px surface.
      // Keep the exported calc() width, but relax the exported min-width only
      // in this live preview so paired half cards do not wrap prematurely.
      // Mobile remains an explicit full-width stack.
      if (block.width === "half" && block.type !== "hero" && block.type !== "intro") {
        root.dataset.previewDesktopWidth ||= root.style.width;
        root.dataset.previewDesktopMarginRight ??= root.style.marginRight;
        root.style.minWidth = "0";
        root.style.width = device === "mobile" ? "100%" : root.dataset.previewDesktopWidth;
        root.style.marginRight = device === "mobile" ? "0" : root.dataset.previewDesktopMarginRight;
      }

      root.classList.add("inline-block");
      root.classList.toggle("inline-block-selected", block.id === selected);
      root.dataset.editorBlock = String(block.id);

      // Select after the browser has completed its native focus placement.
      // Updating React state on pointerdown replaced the editing context before
      // the same click could establish a caret, which caused visible flashing.
      const select = () => setSelected(block.id);
      root.addEventListener("click", select);
      cleanups.push(() => root.removeEventListener("click", select));

      editableFields(root, block).forEach(({ element, field }) => {
        element.contentEditable = "true";
        element.classList.add("inline-field");
        element.setAttribute("role", "textbox");
        element.setAttribute("aria-label", field === "body" ? "Block content" : field === "label" ? "Context label" : "Block heading");
        if (field === "body") element.setAttribute("aria-multiline", "true");

        // Commit on blur so React does not replace the DOM while the browser is
        // maintaining a live caret or text selection inside the block.
        let dirty = false;
        const commit = () => {
          const align = pendingAlign.current.get(block.id);
          if (!dirty && !align) return;
          const alignment = align ? { align } : {};
          if (field === "body") updateBlock(block.id, { body: readBody(element, block), ...alignment });
          else if (field === "title") updateBlock(block.id, { title: readTitle(element, block), ...alignment });
          else updateBlock(block.id, { label: element.textContent?.trim() || "", ...alignment });
          pendingAlign.current.delete(block.id);
          dirty = false;
        };
        const editor = { element, root, block, field, commit, markDirty: () => { dirty = true } } satisfies ActiveEditor;
        if (block.id === selected && field === "body") fallbackEditor = editor;
        const rememberSelection = () => {
          activeEditor.current = editor;
          if (selected !== block.id) setSelected(block.id);
          const selection = document.getSelection();
          if (selection?.rangeCount && element.contains(selection.anchorNode)) savedRange.current = selection.getRangeAt(0).cloneRange();
        };
        const keydown = (event: KeyboardEvent) => {
          const command = shortcutFor(event);
          if (command) {
            event.preventDefault();
            if (command.startsWith("justify")) {
              const raw = command.slice(7).toLowerCase();
              const align = (raw === "full" ? "justify" : raw) as NonNullable<Block["align"]>;
              activeEditor.current = editor;
              runFormat("align", align);
            } else {
              activeEditor.current = editor;
              runFormat(command);
            }
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            element.blur();
          } else if (field !== "body" && event.key === "Enter") {
            event.preventDefault();
            element.blur();
          }
        };
        element.addEventListener("focus", rememberSelection);
        const input = () => {
          dirty = true;
          rememberSelection();
        };
        element.addEventListener("input", input);
        element.addEventListener("keyup", rememberSelection);
        element.addEventListener("mouseup", rememberSelection);
        const blur = (event: FocusEvent) => {
          const next = event.relatedTarget;
          if (toolbarPointerDown || (next instanceof Element && next.closest(".formatting-panel"))) return;
          commit();
        };
        element.addEventListener("blur", blur);
        element.addEventListener("keydown", keydown);
        cleanups.push(() => {
          element.removeEventListener("focus", rememberSelection);
          element.removeEventListener("input", input);
          element.removeEventListener("keyup", rememberSelection);
          element.removeEventListener("mouseup", rememberSelection);
          element.removeEventListener("blur", blur);
          element.removeEventListener("keydown", keydown);
        });
      });
    });

    if (!activeEditor.current?.element.isConnected || activeEditor.current.block.id !== selected) activeEditor.current = fallbackEditor;

    return () => {
      cleanups.forEach(cleanup => cleanup());
      document.removeEventListener("pointerdown", trackToolbarPointer, true);
      document.removeEventListener("pointerup", clearToolbarPointer, true);
      document.removeEventListener("pointercancel", clearToolbarPointer, true);
      if (formatterRef.current === runFormat) formatterRef.current = () => undefined;
    };
  }, [blocks, device, formatterRef, html, selected, setSelected, updateBlock]);

  return <>
    {onDevice && <div className="stagebar">
      <div className="device-switch" role="group" aria-label="Preview device">
        <button aria-pressed={device === "desktop"} className={device === "desktop" ? "active" : ""} onClick={() => onDevice("desktop")}><Icon name="desktop" /> Desktop</button>
        <button aria-pressed={device === "mobile"} className={device === "mobile" ? "active" : ""} onClick={() => onDevice("mobile")}><Icon name="mobile" /> Mobile</button>
      </div>
      <span className="surface-context">Editing for <strong>{surface.name}</strong></span>
      <div className="history-buttons">
        <button onClick={undo} title="Undo"><Icon name="undo" /> Undo</button>
        <button onClick={redo} title="Redo"><Icon name="redo" /> Redo</button>
      </div>
      <span>{surface.width}px</span>
    </div>}
    <div className={`preview-wrap ${device}`}>
      <PreviewPaper paper={paper} html={html} maxWidth={device === "desktop" ? surface.width : 390} />
    </div>
  </>;
}

/** Keep selection-only React renders from replacing the live contenteditable DOM. */
const PreviewPaper = memo(function PreviewPaper({ paper, html, maxWidth }: {
  paper: RefObject<HTMLDivElement | null>;
  html: string;
  maxWidth: number;
}) {
  return <div
    ref={paper}
    className="paper"
    /* conformance-ignore CODE-08 maxWidth is the selected Blackbaud surface's runtime width. */
    style={{ maxWidth }}
    dangerouslySetInnerHTML={{ __html: html }}
  />;
});

type EditableField = { element: HTMLElement; field: "label" | "title" | "body" };
type ActiveEditor = EditableField & { root: HTMLElement; block: Block; commit: () => void; markDirty: () => void };

function shortcutFor(event: KeyboardEvent): string | undefined {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return undefined;
  const key = event.key.toLowerCase();
  if (!event.shiftKey) return ({ b: "bold", i: "italic", u: "underline" } as Record<string, string>)[key];
  return ({ x: "strikeThrough", l: "justifyLeft", e: "justifyCenter", r: "justifyRight", j: "justifyFull" } as Record<string, string>)[key];
}

function editableFields(root: HTMLElement, block: Block): EditableField[] {
  if (block.type === "intro") return [{ element: root, field: "body" }];
  if (block.type === "hero") {
    // Eyebrow and body are both `div` since the eyebrow stopped being a `<p>`,
    // so they are told apart by which side of the heading they fall on. First
    // and last would not do it: a hero with no label has only the body div, and
    // first-and-last would then hand the body over to be edited as an eyebrow.
    const children = Array.from(root.children) as HTMLElement[];
    const titleIndex = children.findIndex(element => element.matches("h1"));
    const title = titleIndex < 0 ? undefined : children[titleIndex];
    const label = titleIndex < 0 ? undefined : children.slice(0, titleIndex).find(element => element.matches("div"));
    const body = titleIndex < 0
      ? children.filter(element => element.matches("div")).at(-1)
      : children.slice(titleIndex + 1).find(element => element.matches("div"));
    return compact([label && { element: label, field: "label" }, title && { element: title, field: "title" }, body && { element: body, field: "body" }]);
  }
  if (block.type === "details") {
    const title = directChild(root, "summary");
    const body = directChild(root, "div");
    return compact([title && { element: title, field: "title" }, body && { element: body, field: "body" }]);
  }
  const title = directChild(root, "h2");
  const container = directChild(root, "div");
  const body = container && ["steps", "checklist", "targets"].includes(block.type)
    ? container.firstElementChild as HTMLElement | null
    : container;
  return compact([title && { element: title, field: "title" }, body && { element: body, field: "body" }]);
}

function compact(fields: Array<EditableField | null | undefined | false>): EditableField[] {
  return fields.filter(Boolean) as EditableField[];
}

function directChildren(root: HTMLElement, selector: string): HTMLElement[] {
  return Array.from(root.children).filter(element => element.matches(selector)) as HTMLElement[];
}

function directChild(root: HTMLElement, selector: string): HTMLElement | undefined {
  return directChildren(root, selector)[0];
}

function readTitle(element: HTMLElement, block: Block): string {
  let value = element.textContent?.trim() || "";
  if (block.emoji && value.startsWith(block.emoji)) value = value.slice(block.emoji.length).trimStart();
  return value;
}

function readBody(element: HTMLElement, block: Block): string {
  if (["steps", "checklist", "targets"].includes(block.type)) {
    return Array.from(element.querySelectorAll(":scope > li"))
      .map(item => {
        const clone = item.cloneNode(true) as HTMLElement;
        if (block.type === "checklist" && clone.firstChild?.nodeType === Node.TEXT_NODE) {
          clone.firstChild.textContent = clone.firstChild.textContent?.replace(/^\s*☐\s*/, "") || "";
        }
        return clone.innerHTML.trim();
      })
      .filter(Boolean)
      .join("<br>");
  }
  return element.innerHTML;
}
