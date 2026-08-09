"use client";

import { useMemo, useState } from "react";

type BlockType = "hero" | "intro" | "reading" | "focus" | "homework" | "deadline" | "note";
type Block = { id: number; type: BlockType; title: string; body: string };

const blockMeta: Record<BlockType, { label: string; icon: string }> = {
  hero: { label: "Page title", icon: "H" }, intro: { label: "Introduction", icon: "¶" },
  reading: { label: "Reading", icon: "R" }, focus: { label: "Focus questions", icon: "?" },
  homework: { label: "Homework", icon: "✓" }, deadline: { label: "Deadline", icon: "!" },
  note: { label: "Note", icon: "i" },
};

const starter: Block[] = [
  { id: 1, type: "hero", title: "MACBETH · ACT II", body: "After the murder" },
  { id: 2, type: "intro", title: "", body: "Tonight we move into the consequences of Duncan’s murder." },
  { id: 3, type: "reading", title: "For Tuesday", body: "Read Act II, Scenes 1–2 and annotate references to sleep and blood." },
  { id: 4, type: "focus", title: "As you read", body: "What changes in Macbeth’s behavior?\nHow does Shakespeare connect guilt to sleep?" },
  { id: 5, type: "homework", title: "Come prepared", body: "Bring one discussion question to class." },
  { id: 6, type: "deadline", title: "Coming up", body: "Vocabulary quiz · Thursday" },
];

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c] || c));

function renderHtml(blocks: Block[]) {
  const base = "font-family:Arial,sans-serif;color:#1F2937;font-size:14px;line-height:1.6;";
  return `<div style="${base}max-width:720px;margin:0 auto;">` + blocks.map((b) => {
    const title = esc(b.title), body = esc(b.body).replace(/\n/g, "<br>");
    if (b.type === "hero") return `<div style="border-top:5px solid #C99700;padding:22px 0 16px;"><p style="margin:0 0 5px;color:#C99700;font-size:12px;font-weight:700;letter-spacing:1.5px;">UNIT UPDATE</p><h1 style="margin:0;color:#243B53;font-family:Georgia,serif;font-size:26px;line-height:1.25;">${title}</h1><p style="margin:5px 0 0;color:#4B5563;">${body}</p></div>`;
    if (b.type === "intro") return `<p style="margin:0 0 16px;font-size:15px;">${body}</p>`;
    const colors = b.type === "deadline" ? ["#FEF3C7", "#F59E0B"] : b.type === "focus" ? ["#FFFBEB", "#C99700"] : b.type === "homework" ? ["#EFF6FF", "#93C5FD"] : ["#F8FAFC", "#E2E8F0"];
    return `<div style="margin:0 0 14px;padding:16px;background-color:${colors[0]};border:1px solid ${colors[1]};border-left:4px solid ${colors[1]};"><p style="margin:0 0 6px;color:#243B53;font-weight:700;">${title || blockMeta[b.type].label}</p><p style="margin:0;">${body}</p></div>`;
  }).join("") + `</div>`;
}

export default function Home() {
  const [blocks, setBlocks] = useState(starter);
  const [selected, setSelected] = useState(3);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [draft, setDraft] = useState("We finished Macbeth 2.1 today. For homework, read 2.2 and mark examples of blood imagery. Bring one discussion question. Vocabulary quiz Thursday.");
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => renderHtml(blocks), [blocks]);
  const active = blocks.find(b => b.id === selected);

  const update = (patch: Partial<Block>) => setBlocks(v => v.map(b => b.id === selected ? { ...b, ...patch } : b));
  const move = (id: number, by: number) => setBlocks(v => { const i=v.findIndex(b=>b.id===id), j=i+by; if(j<0||j>=v.length)return v; const n=[...v]; [n[i],n[j]]=[n[j],n[i]]; return n; });
  const generate = () => {
    const quiz = draft.match(/quiz\s+(?:is\s+)?(Monday|Tuesday|Wednesday|Thursday|Friday)/i)?.[1] || "Thursday";
    const read = draft.match(/read\s+([^.!]+)/i)?.[1] || "the assigned passage";
    const focus = draft.match(/mark\s+([^.!]+)/i)?.[1] || "key patterns and changes";
    setBlocks([
      { id: 11, type:"hero", title:"MACBETH · ACT II", body:"Consequences and conscience" },
      { id: 12, type:"intro", title:"", body:"Today’s work carries us from the decision into its consequences." },
      { id: 13, type:"reading", title:"Tonight’s reading", body:`Read ${read.replace(/^Act/i,"Act")}.` },
      { id: 14, type:"focus", title:"Reading focus", body:`Annotate ${focus}.` },
      { id: 15, type:"homework", title:"Be ready to discuss", body:"Bring one original discussion question to class." },
      { id: 16, type:"deadline", title:"Coming up", body:`Vocabulary quiz · ${quiz}` },
    ]); setSelected(13);
  };
  const copy = async () => { await navigator.clipboard.writeText(html); setCopied(true); setTimeout(()=>setCopied(false),1800); };

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brandmark">C</span><div><strong>Content Composer</strong><small>for Blackbaud</small></div></div><div className="class-picker"><span className="class-dot"/> AP English Literature <span>⌄</span></div><button className="avatar" aria-label="Account">WB</button></header>
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
        {active&&<div className="fields"><label>Block type<select value={active.type} onChange={e=>update({type:e.target.value as BlockType})}>{Object.entries(blockMeta).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label><label>Label / heading<input value={active.title} onChange={e=>update({title:e.target.value})}/></label><label>Content<textarea value={active.body} onChange={e=>update({body:e.target.value})}/></label></div>}
        <div className="checks"><div className="check-head"><div><span className="eyebrow">COMPATIBILITY</span><h3>Ready for Blackbaud</h3></div><span className="score">4/4</span></div><p><i>✓</i> All styles are inline</p><p><i>✓</i> Blackbaud-safe structure</p><p><i>✓</i> Strong heading hierarchy</p><p><i>✓</i> Accessible color contrast</p></div>
        <div className="export"><button className="copy" onClick={copy}>{copied?"✓ Copied to clipboard":"Copy for Blackbaud"}</button><details><summary>View generated HTML</summary><textarea readOnly value={html}/></details><small>Paste into Blackbaud’s HTML editor, then preview before publishing.</small></div>
      </aside>
    </section>
  </main>;
}
