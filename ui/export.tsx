import type { Composer } from "./state.ts";

/**
 * Copy to clipboard, and the generated HTML behind a disclosure.
 *
 * This is the whole integration surface with Blackbaud. Nothing reads the page,
 * nothing posts anywhere; the teacher pastes. The side panel drops the export
 * history — it is a quick-post tool, not an archive — and says "paste into the
 * source editor" rather than the web app's longer instruction.
 */
export function ExportPanel({ c, label, hint, showHistory = true }: { c: Composer; label: string; hint: string; showHistory?: boolean }) {
  const { copy, copied, html, exportHistory } = c;
  return <div className="export"><button className="copy" onClick={copy}>{copied?"✓ Copied to clipboard":label}</button><details><summary>View generated HTML</summary><textarea readOnly value={html}/></details>{showHistory&&exportHistory.length>0&&<details><summary>Export history ({exportHistory.length})</summary><div className="export-history">{exportHistory.map((x,i)=><button key={`${x.date}-${i}`} onClick={()=>navigator.clipboard.writeText(x.html)}><strong>{x.title}</strong><small>{x.date} · Click to copy</small></button>)}</div></details>}<small>{hint}</small></div>;
}
