import { useLayoutEffect, useRef } from "react";

export function exec(element: HTMLElement | null, name: string, argument?: string): string {
  element?.focus();
  document.execCommand(name, false, argument);
  return element?.innerHTML || "";
}

export function RichEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const command = (name: string, argument?: string) => onChange(exec(ref.current, name, argument));
  const emojis = ["📘", "📖", "✏️", "💡", "❓", "✅", "⚠️", "📅", "🔬", "🎨", "🌎", "✦"];

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const html = value.replace(/\n/g, "<br>");
    if (html !== element.innerHTML) element.innerHTML = html;
  }, [value]);

  const tool = (label: string, name: string, glyph: string) => <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => command(name)} aria-label={label} title={label}>{glyph}</button>;

  return <div className="rich-editor"><div className="formatbar" role="toolbar" aria-label="Text formatting">
    {tool("Bold", "bold", "B")}
    {tool("Italic", "italic", "I")}
    {tool("Underline", "underline", "U")}
    {tool("Strikethrough", "strikeThrough", "S")}
    {tool("Bulleted list", "insertUnorderedList", "•≡")}
    {tool("Numbered list", "insertOrderedList", "1.")}
    <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => { const url = window.prompt("Link URL"); if (url) command("createLink", url) }} aria-label="Add link" title="Add link">↗</button>
    <label title="Font color"><span>A</span><input aria-label="Font color" type="color" defaultValue="#243B53" onChange={event => command("foreColor", event.target.value)} /></label>
    <label title="Highlight"><span className="highlight-a">A</span><input aria-label="Highlight color" type="color" defaultValue="#FEF3C7" onChange={event => command("hiliteColor", event.target.value)} /></label>
    <details className="emoji-menu"><summary aria-label="Insert emoji" title="Insert emoji">☺</summary><div>{emojis.map(emoji => <button type="button" aria-label={`Insert ${emoji}`} title={`Insert ${emoji}`} key={emoji} onMouseDown={event => event.preventDefault()} onClick={() => command("insertText", emoji)}>{emoji}</button>)}</div></details>
  </div><div ref={ref} className="editable" contentEditable role="textbox" aria-multiline="true" aria-label="Block content" suppressContentEditableWarning onInput={event => onChange(event.currentTarget.innerHTML)} /></div>;
}
