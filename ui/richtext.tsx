import { useLayoutEffect, useRef } from "react";

/**
 * The one place `document.execCommand` is called.
 *
 * It is deprecated and has been for years, but nothing in a zero-dependency
 * browser tool replaces it without shipping an editor library, and the output
 * goes through `core/sanitize.ts` before it reaches an export — so whatever
 * mess a browser's `execCommand` makes is cleaned up downstream. Carried-forward
 * bug #6 asks for exactly this: keep it, but behind one function, so swapping in
 * a real editing model later is a change to this file and nothing else.
 */
export function exec(el: HTMLElement | null, name: string, arg?: string): string {
  el?.focus();
  document.execCommand(name, false, arg);
  return el?.innerHTML || "";
}

export function RichEditor({ value, onChange }: { value:string; onChange:(v:string)=>void }) {
  const ref = useRef<HTMLDivElement>(null);
  const command = (name:string, arg?:string) => onChange(exec(ref.current, name, arg));
  const emojis = ["📘","📖","✏️","💡","❓","✅","⚠️","📅","🔬","🎨","🌎","✦"];

  /**
   * The editable div is deliberately *not* rendered from `value`. React would
   * re-set its innerHTML after every keystroke, replacing the text node the caret
   * sits in and dropping the caret to offset 0 — which is why "test" used to come
   * out "tset". While a teacher types the DOM holds the live copy and `value`
   * follows it; this writes back into the DOM only when `value` arrived from
   * somewhere else (another block, undo/redo, a template) and so genuinely
   * disagrees with what is on screen. A layout effect, not `useEffect`, so
   * switching blocks never paints the outgoing block's body.
   */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const html = value.replace(/\n/g, "<br>");
    if (html !== el.innerHTML) el.innerHTML = html;
  }, [value]);
  return <div className="rich-editor"><div className="formatbar">
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>command("bold")} aria-label="Bold"><b>B</b></button>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>command("italic")} aria-label="Italic"><i>I</i></button>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>command("underline")} aria-label="Underline"><u>U</u></button>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>command("strikeThrough")} aria-label="Strikethrough"><s>S</s></button>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>command("insertUnorderedList")} aria-label="Bulleted list">•≡</button>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>command("insertOrderedList")} aria-label="Numbered list">1.</button>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>{const url=window.prompt("Link URL");if(url)command("createLink",url)}} aria-label="Add link">↗</button>
    <label title="Font color"><span>A</span><input type="color" defaultValue="#243B53" onChange={e=>command("foreColor",e.target.value)}/></label>
    <label title="Highlight"><span className="highlight-a">A</span><input type="color" defaultValue="#FEF3C7" onChange={e=>command("hiliteColor",e.target.value)}/></label>
    <details className="emoji-menu"><summary title="Insert emoji">☺</summary><div>{emojis.map(x=><button type="button" key={x} onMouseDown={e=>e.preventDefault()} onClick={()=>command("insertText",x)}>{x}</button>)}</div></details>
  </div><div ref={ref} className="editable" contentEditable suppressContentEditableWarning onInput={e=>onChange(e.currentTarget.innerHTML)} /></div>;
}
