import type { BlockType } from "../core/model.ts";
import { blockMeta } from "../core/catalog.ts";
import { RichEditor } from "./richtext.tsx";
import type { Composer } from "./state.ts";

/** Edit the selected block. The panel shows this without the surrounding aside. */
export function BlockFields({ c }: { c: Composer }) {
  const { active, update, deleteBlock } = c;
  return <>
    <div className="inspector-title"><div><span className="eyebrow">EDIT BLOCK</span><h2>{active ? blockMeta[active.type].label : "Block"}</h2></div>{active&&<button onClick={deleteBlock} aria-label="Delete block">⌫</button>}</div>
    {active&&<div className="fields"><label>Block type<select value={active.type} onChange={e=>update({type:e.target.value as BlockType})}>{Object.entries(blockMeta).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label><button className={`visibility-toggle ${active.hidden?"active":""}`} onClick={()=>update({hidden:!active.hidden})}>{active.hidden?"Show in export":"Hide from export"}</button>{active.type !== "hero" && active.type !== "intro" && <fieldset className="width-control"><legend>Desktop width</legend><button className={(active.width || "full") === "full" ? "active" : ""} onClick={()=>update({width:"full"})}><span>▬</span> Full</button><button className={active.width === "half" ? "active" : ""} onClick={()=>update({width:"half"})}><span>▰</span> Half</button><small>Half-width blocks stack on mobile.</small></fieldset>}<fieldset className="emoji-control"><legend>Block icon</legend><div>{["","📘","📖","✏️","💡","❓","✅","⚠️","📅","🔬","🎨","🌎"].map(x=><button type="button" className={(active.emoji||"")===x?"active":""} key={x||"none"} onClick={()=>update({emoji:x})}>{x||"None"}</button>)}</div></fieldset>{active.type === "hero" && <label>Context label<input value={active.label || ""} placeholder="Optional — e.g. UNIT UPDATE" onChange={e=>update({label:e.target.value})}/></label>}<label>{active.type === "hero" ? "Page heading" : "Label / heading"}<input value={active.title} onChange={e=>update({title:e.target.value})}/></label><label>{active.type === "hero" ? "Subtitle" : "Content"}<RichEditor value={active.body} onChange={body=>update({body})}/></label></div>}
  </>;
}

/**
 * The compatibility panel — still the decorative 4/4 from the prototype.
 *
 * Phase 4 replaces it with real WCAG contrast math, heading-order validation and
 * per-surface warnings derived from `core/compat.ts`. It is moved verbatim here
 * rather than fixed, because its "accessible color contrast" ✓ is a claim the
 * custom style editor can already make false, and fixing that is its own change.
 */
export function Checks({ c }: { c: Composer }) {
  const { surface, surfaceKey, blocks } = c;
  return <div className="checks"><div className="check-head"><div><span className="eyebrow">COMPATIBILITY</span><h3>{surface.name}</h3></div><span className="score">4/4</span></div><p className="surface-note">{surface.note}</p><p><i>✓</i> All export styles are inline</p><p><i>✓</i> Blackbaud-safe structure</p><p><i>✓</i> Strong heading hierarchy</p><p><i>✓</i> Accessible color contrast</p>{blocks.some(b=>b.width==="half")&&<p className="compat-warning"><i>!</i> Preview half-width blocks in your target Blackbaud editor; responsive behavior can vary by surface.</p>}{surfaceKey==="bulletin"&&blocks.some(b=>b.width==="half")&&<p className="compat-warning"><i>!</i> Full-width blocks are recommended for concise bulletin notices.</p>}</div>;
}
