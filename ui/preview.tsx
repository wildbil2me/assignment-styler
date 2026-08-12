import type { Composer } from "./state.ts";

export type Device = "desktop" | "mobile";

/**
 * The live preview. The full editor draws the stage bar — device switch, undo,
 * redo, surface width; the side panel is too narrow for a desktop preview, so it
 * passes no `onDevice` and gets the paper alone at mobile width.
 */
export function Preview({ c, device, onDevice }: { c: Composer; device: Device; onDevice?: (d: Device) => void }) {
  const { surface, html, undo, redo } = c;
  return <>
    {onDevice&&<div className="stagebar"><div className="device-switch"><button className={device==="desktop"?"active":""} onClick={()=>onDevice("desktop")}>▰ Desktop</button><button className={device==="mobile"?"active":""} onClick={()=>onDevice("mobile")}>▯ Mobile</button></div><span className="surface-context">Previewing for <strong>{surface.name}</strong></span><div className="history-buttons"><button onClick={undo} title="Undo">↶ Undo</button><button onClick={redo} title="Redo">↷ Redo</button></div><span>{surface.width}px</span></div>}
    <div className={`preview-wrap ${device}`}><div className="paper" style={{maxWidth:device==="desktop"?surface.width:390}} dangerouslySetInnerHTML={{__html:html}} /></div>
  </>;
}
