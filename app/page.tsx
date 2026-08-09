"use client";

import { useMemo, useRef, useState } from "react";

type BlockType = "hero" | "intro" | "reading" | "focus" | "homework" | "deadline" | "note";
type Block = { id: number; type: BlockType; title: string; body: string; label?: string; width?: "full" | "half"; emoji?: string };
type StyleKey = "english" | "math" | "religion" | "science" | "language" | "arts";

const styles: Record<StyleKey, { name: string; className: string; primary: string; accent: string; surface: string; focus: string; heading: string; body: string }> = {
  english: { name:"English", className:"AP English Literature", primary:"#243B53", accent:"#C99700", surface:"#F8FAFC", focus:"#FFFBEB", heading:"Georgia,serif", body:"Arial,sans-serif" },
  math: { name:"Math", className:"Mathematics", primary:"#173F5F", accent:"#2A9D8F", surface:"#F2F8FA", focus:"#E8F6F3", heading:"Arial,sans-serif", body:"Arial,sans-serif" },
  religion: { name:"Religion", className:"Religion", primary:"#4B365F", accent:"#B8893B", surface:"#F8F5FA", focus:"#FBF5E9", heading:"Georgia,serif", body:"Arial,sans-serif" },
  science: { name:"Science", className:"Science", primary:"#174C3C", accent:"#4A9D74", surface:"#F0F8F4", focus:"#E8F5ED", heading:"Arial,sans-serif", body:"Arial,sans-serif" },
  language: { name:"Foreign Language", className:"Foreign Language", primary:"#7A3045", accent:"#D47B59", surface:"#FBF4F5", focus:"#FFF0E9", heading:"Georgia,serif", body:"Arial,sans-serif" },
  arts: { name:"Arts", className:"Visual & Performing Arts", primary:"#49306B", accent:"#E05A8C", surface:"#F8F3FB", focus:"#FFF0F6", heading:"Georgia,serif", body:"Arial,sans-serif" },
};

const blockMeta: Record<BlockType, { label: string; icon: string }> = {
  hero: { label: "Page title", icon: "H" }, intro: { label: "Introduction", icon: "¶" },
  reading: { label: "Reading", icon: "R" }, focus: { label: "Focus questions", icon: "?" },
  homework: { label: "Homework", icon: "✓" }, deadline: { label: "Deadline", icon: "!" },
  note: { label: "Note", icon: "i" },
};

const starter: Block[] = [
  { id: 1, type: "hero", label: "UNIT UPDATE", title: "MACBETH · ACT II", body: "After the murder" },
  { id: 2, type: "intro", title: "", body: "Tonight we move into the consequences of Duncan’s murder." },
  { id: 3, type: "reading", width: "half", title: "For Tuesday", body: "Read Act II, Scenes 1–2 and annotate references to sleep and blood." },
  { id: 4, type: "focus", width: "half", title: "As you read", body: "What changes in Macbeth’s behavior?\nHow does Shakespeare connect guilt to sleep?" },
  { id: 5, type: "homework", title: "Come prepared", body: "Bring one discussion question to class." },
  { id: 6, type: "deadline", title: "Coming up", body: "Vocabulary quiz · Thursday" },
];

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c] || c));

function safeRich(value: string) {
  if (!value.includes("<")) return esc(value).replace(/\n/g, "<br>");
  if (typeof document === "undefined") return esc(value);
  const root = document.createElement("div"); root.innerHTML = value;
  root.querySelectorAll("*").forEach(el => {
    if (!["STRONG","B","EM","I","U","S","STRIKE","SPAN","BR"].includes(el.tagName)) el.replaceWith(...Array.from(el.childNodes));
    else Array.from(el.attributes).forEach(a => { if (a.name !== "style") el.removeAttribute(a.name); });
    if (el instanceof HTMLElement && el.hasAttribute("style")) {
      const color=el.style.color, bg=el.style.backgroundColor; el.removeAttribute("style");
      if(color) el.style.color=color; if(bg) el.style.backgroundColor=bg;
    }
  });
  return root.innerHTML;
}

function RichEditor({ value, onChange }: { value:string; onChange:(v:string)=>void }) {
  const ref = useRef<HTMLDivElement>(null);
  const command = (name:string, arg?:string) => { ref.current?.focus(); document.execCommand(name, false, arg); onChange(ref.current?.innerHTML || ""); };
  const emojis = ["📘","📖","✏️","💡","❓","✅","⚠️","📅","🔬","🎨","🌎","✦"];
  return <div className="rich-editor"><div className="formatbar">
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>command("bold")} aria-label="Bold"><b>B</b></button>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>command("italic")} aria-label="Italic"><i>I</i></button>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>command("underline")} aria-label="Underline"><u>U</u></button>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>command("strikeThrough")} aria-label="Strikethrough"><s>S</s></button>
    <label title="Font color"><span>A</span><input type="color" defaultValue="#243B53" onChange={e=>command("foreColor",e.target.value)}/></label>
    <label title="Highlight"><span className="highlight-a">A</span><input type="color" defaultValue="#FEF3C7" onChange={e=>command("hiliteColor",e.target.value)}/></label>
    <details className="emoji-menu"><summary title="Insert emoji">☺</summary><div>{emojis.map(x=><button type="button" key={x} onMouseDown={e=>e.preventDefault()} onClick={()=>command("insertText",x)}>{x}</button>)}</div></details>
  </div><div key={value === "" ? "empty" : "filled"} ref={ref} className="editable" contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{__html:value.replace(/\n/g,"<br>")}} onInput={e=>onChange(e.currentTarget.innerHTML)} /></div>;
}

function renderHtml(blocks: Block[], preset: typeof styles[StyleKey]) {
  const base = `font-family:${preset.body};color:#1F2937;font-size:14px;line-height:1.6;`;
  return `<div style="${base}max-width:720px;margin:0 auto;">` + blocks.map((b) => {
    const title = esc(b.title), body = safeRich(b.body), icon = b.emoji ? `${esc(b.emoji)} ` : "";
    if (b.type === "hero") return `<div style="border-top:5px solid ${preset.accent};padding:22px 0 16px;">${b.label?.trim() ? `<p style="margin:0 0 5px;color:${preset.accent};font-size:12px;font-weight:700;letter-spacing:1.5px;">${esc(b.label)}</p>` : ""}<h1 style="margin:0;color:${preset.primary};font-family:${preset.heading};font-size:26px;line-height:1.25;">${icon}${title}</h1><p style="margin:5px 0 0;color:#4B5563;">${body}</p></div>`;
    if (b.type === "intro") return `<p style="margin:0 0 16px;font-size:15px;">${body}</p>`;
    const colors = b.type === "deadline" ? ["#FEF3C7", preset.accent] : b.type === "focus" ? [preset.focus, preset.accent] : b.type === "homework" ? ["#EFF6FF", "#93C5FD"] : [preset.surface, "#E2E8F0"];
    const width = b.width === "half" ? "display:inline-block;vertical-align:top;width:100%;max-width:330px;margin-right:10px;" : "display:block;width:100%;";
    return `<div data-layout="${b.width || "full"}" style="${width}margin-bottom:14px;padding:16px;background-color:${colors[0]};border:1px solid ${colors[1]};border-left:4px solid ${colors[1]};"><p style="margin:0 0 6px;color:${preset.primary};font-weight:700;">${icon}${title || blockMeta[b.type].label}</p><p style="margin:0;">${body}</p></div>`;
  }).join("") + `</div>`;
}

export default function Home() {
  const [blocks, setBlocks] = useState(starter);
  const [selected, setSelected] = useState(3);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [draft, setDraft] = useState("We finished Macbeth 2.1 today. For homework, read 2.2 and mark examples of blood imagery. Bring one discussion question. Vocabulary quiz Thursday.");
  const [copied, setCopied] = useState(false);
  const [styleKey, setStyleKey] = useState<StyleKey>("english");
  const preset = styles[styleKey];
  const html = useMemo(() => renderHtml(blocks, preset), [blocks, preset]);
  const active = blocks.find(b => b.id === selected);

  const update = (patch: Partial<Block>) => setBlocks(v => v.map(b => b.id === selected ? { ...b, ...patch } : b));
  const move = (id: number, by: number) => setBlocks(v => { const i=v.findIndex(b=>b.id===id), j=i+by; if(j<0||j>=v.length)return v; const n=[...v]; [n[i],n[j]]=[n[j],n[i]]; return n; });
  const generate = () => {
    const quiz = draft.match(/quiz\s+(?:is\s+)?(Monday|Tuesday|Wednesday|Thursday|Friday)/i)?.[1] || "Thursday";
    const read = draft.match(/read\s+([^.!]+)/i)?.[1] || "the assigned passage";
    const focus = draft.match(/mark\s+([^.!]+)/i)?.[1] || "key patterns and changes";
    setBlocks([
      { id: 11, type:"hero", label:"UNIT UPDATE", title:"MACBETH · ACT II", body:"Consequences and conscience" },
      { id: 12, type:"intro", title:"", body:"Today’s work carries us from the decision into its consequences." },
      { id: 13, type:"reading", width:"half", title:"Tonight’s reading", body:`Read ${read.replace(/^Act/i,"Act")}.` },
      { id: 14, type:"focus", width:"half", title:"Reading focus", body:`Annotate ${focus}.` },
      { id: 15, type:"homework", title:"Be ready to discuss", body:"Bring one original discussion question to class." },
      { id: 16, type:"deadline", title:"Coming up", body:`Vocabulary quiz · ${quiz}` },
    ]); setSelected(13);
  };
  const copy = async () => { await navigator.clipboard.writeText(html); setCopied(true); setTimeout(()=>setCopied(false),1800); };

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brandmark">C</span><div><strong>Content Composer</strong><small>for Blackbaud</small></div></div><label className="class-picker"><span className="class-dot" style={{background:preset.accent}}/><select value={styleKey} onChange={e=>setStyleKey(e.target.value as StyleKey)} aria-label="Class style">{Object.entries(styles).map(([key,s])=><option key={key} value={key}>{s.name} · {s.className}</option>)}</select></label><button className="avatar" aria-label="Account">WB</button></header>
    <section className="workspace">
      <aside className="rail">
        <div className="rail-head"><div><span className="eyebrow">COMPOSITION</span><h2>Tuesday’s class post</h2></div><button className="icon-button" aria-label="More options">•••</button></div>
        <div className="draft-box"><label htmlFor="draft">Describe what you’re posting</label><textarea id="draft" value={draft} onChange={e=>setDraft(e.target.value)}/><button onClick={generate}><span>✦</span> Draft with AI</button></div>
        <div className="block-head"><span>CONTENT BLOCKS</span><button onClick={()=>{const id=Date.now();setBlocks(v=>[...v,{id,type:"note",title:"Note",body:"Add your note here."}]);setSelected(id)}}>＋ Add block</button></div>
        <div className="blocks">{blocks.map((b,i)=><div key={b.id} className={`block-row ${selected===b.id?"selected":""}`} onClick={()=>setSelected(b.id)}>
          <span className={`type-icon ${b.type}`}>{blockMeta[b.type].icon}</span><div><strong>{blockMeta[b.type].label}</strong><small>{b.title || b.body.slice(0,38)}</small></div><span className="block-actions"><button onClick={e=>{e.stopPropagation();move(b.id,-1)}} disabled={!i} aria-label="Move up">↑</button><button onClick={e=>{e.stopPropagation();move(b.id,1)}} disabled={i===blocks.length-1} aria-label="Move down">↓</button></span>
        </div>)}</div>
      </aside>

      <section className="stage">
        <div className="stagebar"><div className="device-switch"><button className={device==="desktop"?"active":""} onClick={()=>setDevice("desktop")}>▰ Desktop</button><button className={device==="mobile"?"active":""} onClick={()=>setDevice("mobile")}>▯ Mobile</button></div><span>Blackbaud content width · 720px</span></div>
        <div className={`preview-wrap ${device}`}><div className="paper" dangerouslySetInnerHTML={{__html:html}} /></div>
      </section>

      <aside className="inspector">
        <div className="inspector-title"><div><span className="eyebrow">EDIT BLOCK</span><h2>{active ? blockMeta[active.type].label : "Block"}</h2></div>{active&&<button onClick={()=>{setBlocks(v=>v.filter(b=>b.id!==selected));setSelected(blocks[0]?.id)}} aria-label="Delete block">⌫</button>}</div>
        {active&&<div className="fields"><label>Block type<select value={active.type} onChange={e=>update({type:e.target.value as BlockType})}>{Object.entries(blockMeta).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label>{active.type !== "hero" && active.type !== "intro" && <fieldset className="width-control"><legend>Desktop width</legend><button className={(active.width || "full") === "full" ? "active" : ""} onClick={()=>update({width:"full"})}><span>▬</span> Full</button><button className={active.width === "half" ? "active" : ""} onClick={()=>update({width:"half"})}><span>▰</span> Half</button><small>Half-width blocks stack on mobile.</small></fieldset>}<fieldset className="emoji-control"><legend>Block icon</legend><div>{["","📘","📖","✏️","💡","❓","✅","⚠️","📅","🔬","🎨","🌎"].map(x=><button type="button" className={(active.emoji||"")===x?"active":""} key={x||"none"} onClick={()=>update({emoji:x})}>{x||"None"}</button>)}</div></fieldset>{active.type === "hero" && <label>Context label<input value={active.label || ""} placeholder="Optional — e.g. UNIT UPDATE" onChange={e=>update({label:e.target.value})}/></label>}<label>{active.type === "hero" ? "Page heading" : "Label / heading"}<input value={active.title} onChange={e=>update({title:e.target.value})}/></label><label>{active.type === "hero" ? "Subtitle" : "Content"}<RichEditor value={active.body} onChange={body=>update({body})}/></label></div>}
        <div className="checks"><div className="check-head"><div><span className="eyebrow">COMPATIBILITY</span><h3>Ready for Blackbaud</h3></div><span className="score">4/4</span></div><p><i>✓</i> All styles are inline</p><p><i>✓</i> Blackbaud-safe structure</p><p><i>✓</i> Strong heading hierarchy</p><p><i>✓</i> Accessible color contrast</p></div>
        <div className="export"><button className="copy" onClick={copy}>{copied?"✓ Copied to clipboard":"Copy for Blackbaud"}</button><details><summary>View generated HTML</summary><textarea readOnly value={html}/></details><small>Paste into Blackbaud’s HTML editor, then preview before publishing.</small></div>
      </aside>
    </section>
  </main>;
}
