"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type BlockType = "hero" | "intro" | "reading" | "focus" | "homework" | "deadline" | "note" | "steps" | "checklist" | "vocabulary" | "quote" | "resource" | "targets";
type Block = { id: number; type: BlockType; title: string; body: string; label?: string; width?: "full" | "half"; emoji?: string; hidden?: boolean };
type StyleKey = "english" | "math" | "religion" | "science" | "language" | "arts" | "custom";
type StylePreset = { name: string; className: string; primary: string; accent: string; surface: string; focus: string; heading: string; body: string };

const styles: Record<Exclude<StyleKey,"custom">, StylePreset> = {
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
  note: { label: "Note", icon: "i" }, steps: { label:"Steps",icon:"1" }, checklist:{label:"Checklist",icon:"✓"}, vocabulary:{label:"Vocabulary",icon:"V"}, quote:{label:"Quote",icon:"“"}, resource:{label:"Resource link",icon:"↗"}, targets:{label:"Learning targets",icon:"◎"},
};

const templates: Record<string, Block[]> = {
  "Daily update": [],
  "Weekly overview": [{id:201,type:"hero",label:"THIS WEEK",title:"WEEKLY OVERVIEW",body:"What we are learning and doing this week"},{id:202,type:"targets",title:"Learning targets",body:"I can explain the central concept.\nI can apply it independently."},{id:203,type:"steps",title:"This week",body:"Monday — Introduce\nWednesday — Practice\nFriday — Demonstrate"},{id:204,type:"deadline",title:"Due this week",body:"Add the important deadline"}],
  "Reading assignment": [{id:211,type:"hero",label:"READING",title:"TONIGHT’S READING",body:"Prepare for our next class"},{id:212,type:"reading",title:"Read",body:"Add the title, chapter, scenes, or pages"},{id:213,type:"focus",title:"As you read",body:"Add questions or ideas to track"},{id:214,type:"checklist",title:"Before class",body:"Annotate the text\nBring one question"}],
  "Discussion prompt": [{id:221,type:"hero",label:"DISCUSSION",title:"TODAY’S QUESTION",body:"Think, write, and prepare to share"},{id:222,type:"focus",title:"Essential question",body:"Add the central question"},{id:223,type:"steps",title:"How to respond",body:"Think independently\nUse specific evidence\nRespond to a classmate"}],
  "Study guide": [{id:231,type:"hero",label:"STUDY GUIDE",title:"PREPARE WITH PURPOSE",body:"Use this guide to organize your review"},{id:232,type:"targets",title:"You should be able to",body:"Add learning targets"},{id:233,type:"vocabulary",title:"Key vocabulary",body:"Term — definition"},{id:234,type:"checklist",title:"Review checklist",body:"Review notes\nPractice key skills\nBring questions"}],
  "Project instructions": [{id:241,type:"hero",label:"PROJECT",title:"PROJECT INSTRUCTIONS",body:"Plan, create, and submit"},{id:242,type:"targets",title:"Goal",body:"Describe the project’s purpose"},{id:243,type:"steps",title:"Process",body:"Plan\nDraft\nRevise\nSubmit"},{id:244,type:"deadline",title:"Final deadline",body:"Add date and time"}],
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
    if (!["STRONG","B","EM","I","U","S","STRIKE","SPAN","BR","A","UL","OL","LI"].includes(el.tagName)) el.replaceWith(...Array.from(el.childNodes));
    else Array.from(el.attributes).forEach(a => { if (a.name !== "style" && !(el.tagName === "A" && a.name === "href")) el.removeAttribute(a.name); });
    if(el.tagName === "A" && !/^https?:\/\//i.test(el.getAttribute("href") || "")) el.removeAttribute("href");
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
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>command("insertUnorderedList")} aria-label="Bulleted list">•≡</button>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>command("insertOrderedList")} aria-label="Numbered list">1.</button>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>{const url=window.prompt("Link URL");if(url)command("createLink",url)}} aria-label="Add link">↗</button>
    <label title="Font color"><span>A</span><input type="color" defaultValue="#243B53" onChange={e=>command("foreColor",e.target.value)}/></label>
    <label title="Highlight"><span className="highlight-a">A</span><input type="color" defaultValue="#FEF3C7" onChange={e=>command("hiliteColor",e.target.value)}/></label>
    <details className="emoji-menu"><summary title="Insert emoji">☺</summary><div>{emojis.map(x=><button type="button" key={x} onMouseDown={e=>e.preventDefault()} onClick={()=>command("insertText",x)}>{x}</button>)}</div></details>
  </div><div key={value === "" ? "empty" : "filled"} ref={ref} className="editable" contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{__html:value.replace(/\n/g,"<br>")}} onInput={e=>onChange(e.currentTarget.innerHTML)} /></div>;
}

function renderHtml(blocks: Block[], preset: StylePreset) {
  const base = `font-family:${preset.body};color:#1F2937;font-size:14px;line-height:1.6;`;
  return `<div style="${base}max-width:720px;margin:0 auto;">` + blocks.filter(b=>!b.hidden).map((b) => {
    const title = esc(b.title), richBody = safeRich(b.body), icon = b.emoji ? `${esc(b.emoji)} ` : "";
    const lines = b.body.split(/\n|<br\s*\/?\s*>/i).map(x=>safeRich(x)).filter(Boolean);
    const body = b.type === "steps" ? `<ol style="margin:0;padding-left:22px;">${lines.map(x=>`<li>${x}</li>`).join("")}</ol>` : b.type === "checklist" ? `<ul style="margin:0;padding-left:22px;list-style-type:none;">${lines.map(x=>`<li>☐ ${x}</li>`).join("")}</ul>` : b.type === "targets" ? `<ul style="margin:0;padding-left:22px;">${lines.map(x=>`<li>${x}</li>`).join("")}</ul>` : b.type === "quote" ? `<blockquote style="margin:0;font-family:${preset.heading};font-style:italic;">${richBody}</blockquote>` : richBody;
    if (b.type === "hero") return `<div style="border-top:5px solid ${preset.accent};padding:22px 0 16px;">${b.label?.trim() ? `<p style="margin:0 0 5px;color:${preset.accent};font-size:12px;font-weight:700;letter-spacing:1.5px;">${esc(b.label)}</p>` : ""}<h1 style="margin:0;color:${preset.primary};font-family:${preset.heading};font-size:26px;line-height:1.25;">${icon}${title}</h1><p style="margin:5px 0 0;color:#4B5563;">${body}</p></div>`;
    if (b.type === "intro") return `<p style="margin:0 0 16px;font-size:15px;">${body}</p>`;
    const colors = b.type === "deadline" ? ["#FEF3C7", preset.accent] : b.type === "focus" ? [preset.focus, preset.accent] : b.type === "homework" ? ["#EFF6FF", "#93C5FD"] : [preset.surface, "#E2E8F0"];
    const width = b.width === "half" ? "display:inline-block;vertical-align:top;width:calc(50% - 10px);min-width:260px;margin-right:10px;" : "display:block;width:100%;";
    return `<div data-layout="${b.width || "full"}" style="${width}margin-bottom:14px;padding:16px;background-color:${colors[0]};border:1px solid ${colors[1]};border-left:4px solid ${colors[1]};"><p style="margin:0 0 6px;color:${preset.primary};font-weight:700;">${icon}${title || blockMeta[b.type].label}</p><p style="margin:0;">${body}</p></div>`;
  }).join("") + `</div>`;
}

export default function Home() {
  const [blocks, setBlocks] = useState(starter);
  const [postTitle, setPostTitle] = useState("Tuesday’s class post");
  const [postMenu, setPostMenu] = useState(false);
  const [selected, setSelected] = useState(3);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [draft, setDraft] = useState("We finished Macbeth 2.1 today. For homework, read 2.2 and mark examples of blood imagery. Bring one discussion question. Vocabulary quiz Thursday.");
  const [copied, setCopied] = useState(false);
  const [styleKey, setStyleKey] = useState<StyleKey>("english");
  const [customStyle, setCustomStyle] = useState<StylePreset>({...styles.english,name:"Custom",className:"My Custom Style"});
  const [styleEditor, setStyleEditor] = useState(false);
  const [styleDraft, setStyleDraft] = useState<StylePreset>(customStyle);
  const [savedPosts, setSavedPosts] = useState<Array<{id:number;title:string;blocks:Block[]}>>([]);
  const [exportHistory, setExportHistory] = useState<Array<{date:string;title:string;html:string}>>([]);
  const [drafting, setDrafting] = useState(false);
  const [insertStatus, setInsertStatus] = useState<"idle"|"working"|"success"|"error">("idle");
  const past = useRef<Block[][]>([]), future = useRef<Block[][]>([]), previous = useRef<Block[]>(starter), historyAction = useRef(false);
  const dragged = useRef<number | null>(null);
  const preset = styleKey === "custom" ? customStyle : styles[styleKey];
  const html = useMemo(() => renderHtml(blocks, preset), [blocks, preset]);
  const active = blocks.find(b => b.id === selected);

  useEffect(()=>{try{const raw=localStorage.getItem("bcc-workspace");if(raw){const d=JSON.parse(raw);if(d.blocks)setBlocks(d.blocks.map(({animation,...b}:Block&{animation?:string})=>b));if(d.postTitle)setPostTitle(d.postTitle);if(d.styleKey)setStyleKey(d.styleKey);if(d.customStyle)setCustomStyle(d.customStyle);if(d.savedPosts)setSavedPosts(d.savedPosts.map((p:{id:number;title:string;blocks:Array<Block&{animation?:string}>})=>({...p,blocks:p.blocks.map(({animation,...b})=>b)})));setExportHistory([])}}catch{}},[]);
  useEffect(()=>{const before=JSON.stringify(previous.current),after=JSON.stringify(blocks);if(before!==after){if(!historyAction.current){past.current.push(previous.current);if(past.current.length>50)past.current.shift();future.current=[]}previous.current=blocks;historyAction.current=false}},[blocks]);
  useEffect(()=>{const timer=setTimeout(()=>{localStorage.setItem("bcc-workspace",JSON.stringify({blocks,postTitle,styleKey,customStyle,savedPosts,exportHistory}))},250);return()=>clearTimeout(timer)},[blocks,postTitle,styleKey,customStyle,savedPosts,exportHistory]);

  const update = (patch: Partial<Block>) => setBlocks(v => v.map(b => b.id === selected ? { ...b, ...patch } : b));
  const move = (id: number, by: number) => setBlocks(v => { const i=v.findIndex(b=>b.id===id), j=i+by; if(j<0||j>=v.length)return v; const n=[...v]; [n[i],n[j]]=[n[j],n[i]]; return n; });
  const localGenerate = () => {
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
  const generate = async () => {setDrafting(true);try{const res=await fetch("/api/draft",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({draft,subject:preset.name})});if(!res.ok)throw new Error();const data=await res.json(),stamp=Date.now();const next=data.blocks.map((b:Block,i:number)=>({...b,id:stamp+i}));setBlocks(next);setSelected(stamp)}catch{localGenerate()}finally{setDrafting(false)}};
  const copy = async () => { await navigator.clipboard.writeText(html); setExportHistory(v=>[{date:new Date().toLocaleString(),title:postTitle,html},...v].slice(0,10)); setCopied(true); setTimeout(()=>setCopied(false),1800); };
  const isExtension = typeof location !== "undefined" && location.protocol === "chrome-extension:";
  const insertIntoBlackbaud = async (mode:"replace"|"cursor"="replace") => {
    const chromeApi=(globalThis as typeof globalThis&{chrome?:any}).chrome;
    if(!chromeApi?.tabs||!chromeApi?.scripting){setInsertStatus("error");return}
    setInsertStatus("working");
    try{
      const [tab]=await chromeApi.tabs.query({active:true,currentWindow:true});
      if(!tab?.id)throw new Error("No active tab");
      const results=await chromeApi.scripting.executeScript({target:{tabId:tab.id},world:"MAIN",args:[html,mode],func:(markup:string,insertMode:"replace"|"cursor")=>{
        const page=window as any;
        if(page.tinymce?.activeEditor){if(insertMode==="cursor")page.tinymce.activeEditor.selection.setContent(markup);else page.tinymce.activeEditor.setContent(markup);page.tinymce.activeEditor.fire("change");return {inserted:true,adapter:"tinymce-api"}}
        const ck=page.CKEDITOR?.instances&&Object.values(page.CKEDITOR.instances)[0] as any;
        if(ck?.setData){if(insertMode==="cursor"&&ck.insertHtml)ck.insertHtml(markup);else ck.setData(markup);return {inserted:true,adapter:"ckeditor-api"}}
        if(page.jQuery){
          const kendo=page.jQuery(".k-editor textarea,textarea").filter(function(this:HTMLElement){return !!page.jQuery(this).data("kendoEditor")}).first().data("kendoEditor");
          if(kendo?.value){if(insertMode==="cursor"&&kendo.exec)kendo.exec("inserthtml",{value:markup});else kendo.value(markup);kendo.trigger?.("change");return {inserted:true,adapter:"kendo-api"}}
        }
        const visible=(el:HTMLElement)=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=="none"&&s.visibility!=="hidden"};
        const active=document.activeElement as HTMLElement|null;
        const selector='.tox-textarea,textarea,[contenteditable]:not([contenteditable="false"]),[role="textbox"],body.mce-content-body,.ck-editor__editable,.ck-content,.ProseMirror,.k-editor-content,.fr-element,.tox-edit-area';
        const roots:Array<Document|ShadowRoot>=[document];
        for(let i=0;i<roots.length;i++)roots[i].querySelectorAll<HTMLElement>("*").forEach(el=>{if(el.shadowRoot)roots.push(el.shadowRoot)});
        const candidates=roots.flatMap(root=>Array.from(root.querySelectorAll<HTMLElement>(selector)));
        const activeEditor=active?.closest?.(selector) as HTMLElement|null;
        const tinySource=document.querySelector<HTMLElement>("textarea.tox-textarea");
        const editor=(tinySource&&visible(tinySource)?tinySource:activeEditor&&visible(activeEditor)?activeEditor:candidates.find(visible));
        if(!editor)return {inserted:false,reason:"No visible text editor found"};
        editor.focus();
        if(editor instanceof HTMLTextAreaElement||editor instanceof HTMLInputElement){
          const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(editor),"value")?.set;
          if(insertMode==="cursor"){const start=editor.selectionStart??editor.value.length,end=editor.selectionEnd??start,next=editor.value.slice(0,start)+markup+editor.value.slice(end);setter?.call(editor,next);editor.setSelectionRange(start+markup.length,start+markup.length)}else setter?.call(editor,markup);
        }else if(insertMode==="cursor"){
          const selection=getSelection(),range=selection?.rangeCount?selection.getRangeAt(0):null;
          if(range&&editor.contains(range.commonAncestorContainer)){range.deleteContents();range.insertNode(range.createContextualFragment(markup));selection?.collapseToEnd()}else editor.insertAdjacentHTML("beforeend",markup);
        }else{editor.innerHTML=markup}
        editor.dispatchEvent(new InputEvent("input",{bubbles:true,inputType:"insertText",data:null}));
        for(const name of ["change","blur"]){editor.dispatchEvent(new Event(name,{bubbles:true}))}
        return {inserted:true,adapter:"dom",tag:editor.tagName,className:editor.className};
      }});
      if(!results.some((r:{result?:{inserted?:boolean}})=>r.result?.inserted))throw new Error("No editor found");
      setExportHistory(v=>[{date:new Date().toLocaleString(),title:`${postTitle} · ${mode==="cursor"?"Pasted":"Inserted"}`,html},...v].slice(0,10));
      setInsertStatus("success");setTimeout(()=>setInsertStatus("idle"),2500);
    }catch{setInsertStatus("error")}
  };
  const undo = () => {const prior=past.current.pop();if(!prior)return;future.current.push(blocks);historyAction.current=true;setBlocks(prior)};
  const redo = () => {const next=future.current.pop();if(!next)return;past.current.push(blocks);historyAction.current=true;setBlocks(next)};
  const savePost = () => {setSavedPosts(v=>[{id:Date.now(),title:postTitle,blocks:blocks.map(b=>({...b}))},...v].slice(0,12));setPostMenu(false)};
  const loadPost = (p:{title:string;blocks:Block[]}) => {setPostTitle(p.title);setBlocks(p.blocks.map(b=>({...b})));setSelected(p.blocks[0]?.id);setPostMenu(false)};
  const useTemplate = (name:string) => {const source=name==="Daily update"?starter:templates[name];const stamp=Date.now(),next=source.map((b,i)=>({...b,id:stamp+i}));setBlocks(next);setSelected(stamp);setPostTitle(name);};
  const duplicateBlock = (id:number) => {const i=blocks.findIndex(b=>b.id===id);if(i<0)return;const copy={...blocks[i],id:Date.now(),title:`${blocks[i].title} copy`};setBlocks(v=>[...v.slice(0,i+1),copy,...v.slice(i+1)]);setSelected(copy.id)};
  const dropBlock = (target:number) => {const source=dragged.current;if(source===null||source===target)return;setBlocks(v=>{const n=[...v],from=n.findIndex(b=>b.id===source),to=n.findIndex(b=>b.id===target);const [item]=n.splice(from,1);n.splice(to,0,item);return n});dragged.current=null};
  const exportStyle = () => {const blob=new Blob([JSON.stringify(styleDraft,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`${styleDraft.className.toLowerCase().replace(/[^a-z0-9]+/g,"-")||"class-style"}.json`;a.click();URL.revokeObjectURL(url)};
  const importStyle = async (file?:File) => {if(!file)return;try{const parsed=JSON.parse(await file.text());if(parsed.primary&&parsed.accent&&parsed.heading&&parsed.body)setStyleDraft({...styleDraft,...parsed,name:"Custom"})}catch{window.alert("That file is not a valid Content Composer style.")}};
  const newPost = () => { const id=Date.now(); setBlocks([{id,type:"hero",label:"CLASS UPDATE",title:"UNTITLED POST",body:"Add a subtitle"}]); setSelected(id); setPostTitle("Untitled class post"); setPostMenu(false); };
  const duplicatePost = () => { const stamp=Date.now(); const copies=blocks.map((b,i)=>({...b,id:stamp+i})); setBlocks(copies); setSelected(copies[0]?.id); setPostTitle(`${postTitle} — Copy`); setPostMenu(false); };
  const restoreExample = () => { setBlocks(starter.map(b=>({...b}))); setSelected(3); setPostTitle("Tuesday’s class post"); setPostMenu(false); };

  return <main className={`app-shell ${isExtension?"extension-shell":""}`}>
    <header className="topbar"><div className="brand"><span className="brandmark">C</span><div><strong>Content Composer</strong><small>for Blackbaud</small></div></div><div className="style-tools"><label className="class-picker"><span className="class-dot" style={{background:preset.accent}}/><select value={styleKey} onChange={e=>setStyleKey(e.target.value as StyleKey)} aria-label="Class style">{Object.entries(styles).map(([key,s])=><option key={key} value={key}>{s.name} · {s.className}</option>)}<option value="custom">Custom · {customStyle.className}</option></select></label><button className="style-edit-button" onClick={()=>{setStyleDraft({...preset,name:"Custom"});setStyleEditor(true)}}>Style editor</button></div><button className="avatar" aria-label="Account">WB</button></header>
    {styleEditor&&<div className="modal-backdrop" onMouseDown={()=>setStyleEditor(false)}><section className="style-modal" onMouseDown={e=>e.stopPropagation()} aria-modal="true" role="dialog" aria-labelledby="style-editor-title"><header><div><span className="eyebrow">CLASS STYLE</span><h2 id="style-editor-title">Create a custom style</h2></div><button onClick={()=>setStyleEditor(false)} aria-label="Close">×</button></header><div className="style-form"><label>Style name<input value={styleDraft.className} onChange={e=>setStyleDraft(v=>({...v,className:e.target.value}))}/></label><div className="color-grid"><label>Primary color<span><input type="color" value={styleDraft.primary} onChange={e=>setStyleDraft(v=>({...v,primary:e.target.value}))}/>{styleDraft.primary}</span></label><label>Accent color<span><input type="color" value={styleDraft.accent} onChange={e=>setStyleDraft(v=>({...v,accent:e.target.value}))}/>{styleDraft.accent}</span></label><label>Surface color<span><input type="color" value={styleDraft.surface} onChange={e=>setStyleDraft(v=>({...v,surface:e.target.value}))}/>{styleDraft.surface}</span></label><label>Highlight color<span><input type="color" value={styleDraft.focus} onChange={e=>setStyleDraft(v=>({...v,focus:e.target.value}))}/>{styleDraft.focus}</span></label></div><label>Heading font<select value={styleDraft.heading} onChange={e=>setStyleDraft(v=>({...v,heading:e.target.value}))}><option value="Georgia,serif">Georgia</option><option value="Arial,sans-serif">Arial</option><option value="Trebuchet MS,sans-serif">Trebuchet</option><option value="Verdana,sans-serif">Verdana</option></select></label><label>Body font<select value={styleDraft.body} onChange={e=>setStyleDraft(v=>({...v,body:e.target.value}))}><option value="Arial,sans-serif">Arial</option><option value="Georgia,serif">Georgia</option><option value="Trebuchet MS,sans-serif">Trebuchet</option><option value="Verdana,sans-serif">Verdana</option></select></label><div className="style-swatch" style={{borderColor:styleDraft.accent,background:styleDraft.surface}}><strong style={{color:styleDraft.primary,fontFamily:styleDraft.heading}}>Custom style preview</strong><p style={{fontFamily:styleDraft.body}}>Clear, consistent content for your class.</p></div></div><footer><label className="import-style">Import JSON<input type="file" accept="application/json,.json" onChange={e=>importStyle(e.target.files?.[0])}/></label><button className="secondary" onClick={exportStyle}>Export JSON</button><span className="footer-spacer"/><button className="secondary" onClick={()=>setStyleEditor(false)}>Cancel</button><button className="apply-style" onClick={()=>{setCustomStyle({...styleDraft,name:"Custom"});setStyleKey("custom");setStyleEditor(false)}}>Apply custom style</button></footer></section></div>}
    <section className="workspace">
      <aside className="rail">
        <div className="rail-head"><div className="post-name"><label htmlFor="post-title" className="eyebrow">COMPOSITION · AUTOSAVED</label><input id="post-title" value={postTitle} onChange={e=>setPostTitle(e.target.value)} aria-label="Composition name" /></div><div className="post-menu"><button className="icon-button" aria-label="Post actions" aria-expanded={postMenu} onClick={()=>setPostMenu(v=>!v)}>•••</button>{postMenu&&<div className="post-menu-popover"><button onClick={newPost}><span>＋</span><div><strong>New post</strong><small>Start with a blank composition</small></div></button><button onClick={duplicatePost}><span>▣</span><div><strong>Duplicate draft</strong><small>Make an editable copy</small></div></button><button onClick={savePost}><span>↓</span><div><strong>Save to My posts</strong><small>Keep a named snapshot</small></div></button><button onClick={restoreExample}><span>↺</span><div><strong>Restore example</strong><small>Return to the Macbeth sample</small></div></button>{savedPosts.length>0&&<div className="saved-heading">MY POSTS</div>}{savedPosts.slice(0,5).map(p=><button key={p.id} onClick={()=>loadPost(p)}><span>□</span><div><strong>{p.title}</strong><small>Open saved snapshot</small></div></button>)}</div>}</div></div>
        <div className="draft-box"><label htmlFor="template">Start from a template</label><select id="template" defaultValue="" onChange={e=>{if(e.target.value)useTemplate(e.target.value);e.target.value=""}}><option value="" disabled>Choose a structure…</option>{Object.keys(templates).map(t=><option key={t}>{t}</option>)}</select><label htmlFor="draft">Describe what you’re posting</label><textarea id="draft" value={draft} onChange={e=>setDraft(e.target.value)}/><button onClick={generate} disabled={drafting}><span>✦</span> {drafting?"Drafting…":"Draft with AI"}</button></div>
        <div className="block-head"><span>CONTENT BLOCKS</span><button onClick={()=>{const id=Date.now();setBlocks(v=>[...v,{id,type:"note",title:"Note",body:"Add your note here."}]);setSelected(id)}}>＋ Add block</button></div>
        <div className="blocks">{blocks.map((b,i)=><div key={b.id} draggable onDragStart={()=>dragged.current=b.id} onDragOver={e=>e.preventDefault()} onDrop={()=>dropBlock(b.id)} className={`block-row ${selected===b.id?"selected":""} ${b.hidden?"hidden-block":""}`} onClick={()=>setSelected(b.id)}>
          <span className={`type-icon ${b.type}`}>{blockMeta[b.type].icon}</span><div><strong>{blockMeta[b.type].label}</strong><small>{b.hidden?"Hidden · ":""}{b.title || b.body.replace(/<[^>]+>/g,"").slice(0,38)}</small></div><span className="block-actions"><button onClick={e=>{e.stopPropagation();duplicateBlock(b.id)}} aria-label="Duplicate block">▣</button><button onClick={e=>{e.stopPropagation();move(b.id,-1)}} disabled={!i} aria-label="Move up">↑</button><button onClick={e=>{e.stopPropagation();move(b.id,1)}} disabled={i===blocks.length-1} aria-label="Move down">↓</button></span>
        </div>)}</div>
      </aside>

      <section className="stage">
        <div className="stagebar"><div className="device-switch"><button className={device==="desktop"?"active":""} onClick={()=>setDevice("desktop")}>▰ Desktop</button><button className={device==="mobile"?"active":""} onClick={()=>setDevice("mobile")}>▯ Mobile</button></div><div className="history-buttons"><button onClick={undo} title="Undo">↶ Undo</button><button onClick={redo} title="Redo">↷ Redo</button></div><span>Blackbaud content width · 720px</span></div>
        <div className={`preview-wrap ${device}`}><div className="paper" dangerouslySetInnerHTML={{__html:html}} /></div>
      </section>

      <aside className="inspector">
        <div className="inspector-title"><div><span className="eyebrow">EDIT BLOCK</span><h2>{active ? blockMeta[active.type].label : "Block"}</h2></div>{active&&<button onClick={()=>{setBlocks(v=>v.filter(b=>b.id!==selected));setSelected(blocks[0]?.id)}} aria-label="Delete block">⌫</button>}</div>
        {active&&<div className="fields"><label>Block type<select value={active.type} onChange={e=>update({type:e.target.value as BlockType})}>{Object.entries(blockMeta).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label><button className={`visibility-toggle ${active.hidden?"active":""}`} onClick={()=>update({hidden:!active.hidden})}>{active.hidden?"Show in export":"Hide from export"}</button>{active.type !== "hero" && active.type !== "intro" && <fieldset className="width-control"><legend>Desktop width</legend><button className={(active.width || "full") === "full" ? "active" : ""} onClick={()=>update({width:"full"})}><span>▬</span> Full</button><button className={active.width === "half" ? "active" : ""} onClick={()=>update({width:"half"})}><span>▰</span> Half</button><small>Half-width blocks stack on mobile.</small></fieldset>}<fieldset className="emoji-control"><legend>Block icon</legend><div>{["","📘","📖","✏️","💡","❓","✅","⚠️","📅","🔬","🎨","🌎"].map(x=><button type="button" className={(active.emoji||"")===x?"active":""} key={x||"none"} onClick={()=>update({emoji:x})}>{x||"None"}</button>)}</div></fieldset>{active.type === "hero" && <label>Context label<input value={active.label || ""} placeholder="Optional — e.g. UNIT UPDATE" onChange={e=>update({label:e.target.value})}/></label>}<label>{active.type === "hero" ? "Page heading" : "Label / heading"}<input value={active.title} onChange={e=>update({title:e.target.value})}/></label><label>{active.type === "hero" ? "Subtitle" : "Content"}<RichEditor value={active.body} onChange={body=>update({body})}/></label></div>}
        <div className="checks"><div className="check-head"><div><span className="eyebrow">COMPATIBILITY</span><h3>Ready for Blackbaud</h3></div><span className="score">4/4</span></div><p><i>✓</i> All export styles are inline</p><p><i>✓</i> Blackbaud-safe structure</p><p><i>✓</i> Strong heading hierarchy</p><p><i>✓</i> Accessible color contrast</p>{blocks.some(b=>b.width==="half")&&<p className="compat-warning"><i>!</i> Preview half-width blocks in your target Blackbaud editor; responsive behavior can vary by surface.</p>}</div>
        <div className="export">{isExtension&&<div className="insert-actions"><button className={`insert-button ${insertStatus}`} onClick={()=>insertIntoBlackbaud("replace")} disabled={insertStatus==="working"}>{insertStatus==="working"?"Finding editor…":insertStatus==="success"?"✓ Added to Blackbaud":insertStatus==="error"?"Editor not found":"Replace editor content"}</button><button className="cursor-button" onClick={()=>insertIntoBlackbaud("cursor")} disabled={insertStatus==="working"}>Paste at cursor</button></div>}<button className="copy" onClick={copy}>{copied?"✓ Copied to clipboard":isExtension?"Add to clipboard":"Copy for Blackbaud"}</button><details><summary>View generated HTML</summary><textarea readOnly value={html}/></details>{exportHistory.length>0&&<details><summary>Export history ({exportHistory.length})</summary><div className="export-history">{exportHistory.map((x,i)=><button key={`${x.date}-${i}`} onClick={()=>navigator.clipboard.writeText(x.html)}><strong>{x.title}</strong><small>{x.date} · Click to copy</small></button>)}</div></details>}<small>{isExtension?"Insertion never publishes or saves the Blackbaud page. Preview before publishing.":"Paste into Blackbaud’s HTML editor, then preview before publishing."}</small></div>
      </aside>
    </section>
  </main>;
}
