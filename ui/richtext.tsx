import { useRef } from "react";

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
  </div><div key={value === "" ? "empty" : "filled"} ref={ref} className="editable" contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{__html:value.replace(/\n/g,"<br>")}} onInput={e=>onChange(e.currentTarget.innerHTML)} /></div>;
}
