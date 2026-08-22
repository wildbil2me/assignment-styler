import type { CheckStatus } from "../core/checks.ts";
import { blockMeta } from "../core/catalog.ts";
import type { BlockType, MotionStyle } from "../core/model.ts";
import { Icon } from "./icon.tsx";
import type { Composer } from "./state.ts";

const ICONS = ["", "📘", "📖", "✏️", "💡", "❓", "✅", "⚠️", "📅", "🔬", "🎨", "🌎"];
const TEXT_EMOJIS = ["📘", "📖", "✏️", "💡", "❓", "✅", "⚠️", "📅", "🔬", "🎨", "🌎", "✦"];

/** Structural settings for the selected block. Text is edited in the preview. */
export function BlockFields({ c }: { c: Composer }) {
  const { active, update, deleteBlock } = c;
  const replayMotion = () => {
    if (!active) return;
    const root = document.querySelector(`[data-editor-block="${active.id}"]`);
    const target = root?.querySelector<HTMLElement>(".bcc-motion");
    if (!target) return;
    target.style.animation = "none";
    target.getBoundingClientRect();
    target.style.removeProperty("animation");
  };
  return <>
    <div className="inspector-title">
      <div><span className="eyebrow">BLOCK SETTINGS</span><h2>{active ? blockMeta[active.type].label : "Block"}</h2></div>
      {active && <button className="danger-icon" onClick={deleteBlock} aria-label="Delete block" title="Delete block"><Icon name="delete" /></button>}
    </div>
    {active && <div className="fields">
      <p className="inline-edit-help">Edit the heading and content directly in the preview.</p>
      <TextFormatting c={c} />
      <label>Block type<select aria-label="Block type" value={active.type} onChange={event => update({ type: event.target.value as BlockType })}>{Object.entries(blockMeta).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
      {active.type === "animated" && <div className="motion-control"><label>Entrance motion<select aria-label="Entrance motion" value={active.motion || "fade"} onChange={event => update({ motion: event.target.value as MotionStyle })}><option value="fade">Fade in</option><option value="slide-up">Slide up</option><option value="slide-left">Slide from left</option></select></label><button type="button" className="replay-motion" onClick={replayMotion}>▶ Replay animation</button><small className="motion-help">Runs when the Blackbaud content loads. Reduced-motion users see the final state immediately.</small></div>}
      <button aria-pressed={Boolean(active.hidden)} className={`visibility-toggle ${active.hidden ? "active" : ""}`} onClick={() => update({ hidden: !active.hidden })}>{active.hidden ? "Show in export" : "Hide from export"}</button>
      {active.type !== "hero" && active.type !== "intro" && active.type !== "animated" && <fieldset className="width-control">
        <legend>Desktop width</legend>
        <button aria-pressed={(active.width || "full") === "full"} className={(active.width || "full") === "full" ? "active" : ""} onClick={() => update({ width: "full" })}><span aria-hidden="true">▬</span> Full</button>
        <button aria-pressed={active.width === "half"} className={active.width === "half" ? "active" : ""} onClick={() => update({ width: "half" })}><span aria-hidden="true">▰</span> Half</button>
        <small>Half-width blocks stack on mobile.</small>
      </fieldset>}
      <fieldset className="emoji-control"><legend>Block icon</legend><div>{ICONS.map(icon => <button type="button" aria-pressed={(active.emoji || "") === icon} className={(active.emoji || "") === icon ? "active" : ""} key={icon || "none"} onClick={() => update({ emoji: icon })}><span aria-hidden="true">{icon || "None"}</span><span className="sr-only">{icon ? `Use ${icon} icon` : "Use no icon"}</span></button>)}</div></fieldset>
      {/* conformance-ignore FORM-05 The input is nested directly in its visible Context label. */}
      {active.type === "hero" && <label>Context label<input value={active.label || ""} placeholder="Optional — e.g. UNIT UPDATE" onChange={event => update({ label: event.target.value })} /></label>}
    </div>}
  </>;
}

function TextFormatting({ c }: { c: Composer }) {
  const { active, format } = c;
  if (!active) return null;
  const tool = (label: string, command: string, glyph: string, shortcut?: string) => <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => format(command)} aria-label={label} title={`${label}${shortcut ? ` (${shortcut})` : ""}`}>{glyph}</button>;
  const align = (value: NonNullable<typeof active.align>, label: string, shortcut: string) => <button type="button" aria-pressed={(active.align || "left") === value} className={`align-${value} ${(active.align || "left") === value ? "active" : ""}`} onMouseDown={event => event.preventDefault()} onClick={() => format("align", value)} aria-label={label} title={`${label} (${shortcut})`}><span className="align-glyph" aria-hidden="true"><i /><i /><i /></span></button>;

  return <div className="formatting-panel">
    <div className="formatbar" role="toolbar" aria-label="Text formatting">
      {tool("Bold", "bold", "B", "Ctrl+B")}
      {tool("Italic", "italic", "I", "Ctrl+I")}
      {tool("Underline", "underline", "U", "Ctrl+U")}
      {tool("Strikethrough", "strikeThrough", "S", "Ctrl+Shift+X")}
      <span className="format-divider" aria-hidden="true" />
      {align("left", "Align left", "Ctrl+Shift+L")}
      {align("center", "Align center", "Ctrl+Shift+E")}
      {align("right", "Align right", "Ctrl+Shift+R")}
      {align("justify", "Justify", "Ctrl+Shift+J")}
      <span className="format-divider" aria-hidden="true" />
      {tool("Bulleted list", "insertUnorderedList", "•≡")}
      {tool("Numbered list", "insertOrderedList", "1.")}
      <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => { const url = window.prompt("Link URL"); if (url) format("createLink", url) }} aria-label="Add link" title="Add link">↗</button>
      <label title="Font color"><span>A</span><input aria-label="Font color" type="color" defaultValue="#243B53" onChange={event => format("foreColor", event.target.value)} /></label>
      <label title="Highlight"><span className="highlight-a">A</span><input aria-label="Highlight color" type="color" defaultValue="#FEF3C7" onChange={event => format("hiliteColor", event.target.value)} /></label>
      <details className="emoji-menu"><summary aria-label="Insert emoji" title="Insert emoji">☺</summary><div>{TEXT_EMOJIS.map(emoji => <button type="button" aria-label={`Insert ${emoji}`} title={`Insert ${emoji}`} key={emoji} onMouseDown={event => event.preventDefault()} onClick={() => format("insertText", emoji)}>{emoji}</button>)}</div></details>
    </div>
    <small>Shortcuts use Ctrl on Windows and ⌘ on Mac.</small>
  </div>;
}

const MARKER: Record<CheckStatus, string> = { pass: "✓", fail: "!", unknown: "?" };

/** Draw the compatibility report computed by the core. */
export function Checks({ c }: { c: Composer }) {
  const { surface, report, setSelected } = c;
  return <div className="checks">
    <div className="check-head"><div><span className="eyebrow">COMPATIBILITY</span><h3>{surface.name}</h3></div><span className={`score ${report.failed ? "score-fail" : ""}`}>{report.passed}/{report.checked}</span></div>
    <p className="surface-note">{surface.note}</p>
    {report.checks.map(check => <div key={check.id} className={`check-row check-${check.status}`}>
      <p><i aria-hidden="true">{MARKER[check.status]}</i> {check.label}</p>
      <small>{check.detail}</small>
      {check.blockIds.length > 0 && <button className="check-jump" onClick={() => setSelected(check.blockIds[0])}>Open the block →</button>}
    </div>)}
    <p className="check-provenance">{report.unknown > 0 && `${report.unknown} not checked · `}{report.tenantMeasured ? `Measured ${report.measured} against ${report.tenant}` : "No tenant measured — run the probe"}</p>
  </div>;
}
