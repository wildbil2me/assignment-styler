import type { BlockType } from "../core/model.ts";
import type { CheckStatus } from "../core/checks.ts";
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

const MARKER: Record<CheckStatus, string> = { pass: "✓", fail: "!", unknown: "?" };

/**
 * The compatibility panel. It computes nothing — `core/checks.ts` does that, and
 * this draws the answer.
 *
 * The old version was four hardcoded ✓ rows and a hardcoded `4/4`, including an
 * "accessible color contrast" tick that was false for every palette the tool
 * ships. So the two rules here are: never render a status the report did not
 * give, and always show the evidence underneath the claim. A teacher who is told
 * "2.65:1, needs 4.5:1" can act; one who is told "✓" cannot.
 */
export function Checks({ c }: { c: Composer }) {
  const { surface, report, setSelected } = c;
  return <div className="checks">
    <div className="check-head"><div><span className="eyebrow">COMPATIBILITY</span><h3>{surface.name}</h3></div><span className={`score ${report.failed?"score-fail":""}`}>{report.passed}/{report.checked}</span></div>
    <p className="surface-note">{surface.note}</p>
    {report.checks.map(check=><div key={check.id} className={`check-row check-${check.status}`}>
      <p><i>{MARKER[check.status]}</i> {check.label}</p>
      <small>{check.detail}</small>
      {check.blockIds.length>0&&<button className="check-jump" onClick={()=>setSelected(check.blockIds[0])}>Open the block →</button>}
    </div>)}
    <p className="check-provenance">{report.unknown>0&&`${report.unknown} not checked · `}{report.tenantMeasured?`Measured ${report.measured} against ${report.tenant}`:"No tenant measured — run the probe"}</p>
  </div>;
}
