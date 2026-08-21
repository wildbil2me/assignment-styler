import type { Composer } from "./state.ts";

/** Clipboard export and the optional history used by the full composer. */
export function ExportPanel({ c, label, hint, showHistory = true }: {
  c: Composer;
  label: string;
  hint: string;
  showHistory?: boolean;
}) {
  const { copy, copied, html, exportHistory, announce } = c;
  const copyRecord = async (record: { html: string; title: string }) => {
    await navigator.clipboard.writeText(record.html);
    announce(`Copied the ${record.title} export to the clipboard.`);
  };

  return <div className="export">
    <button className="copy" onClick={copy}>{copied ? "✓ Copied to clipboard" : label}</button>
    <details><summary>View generated HTML</summary><textarea aria-label="Generated Blackbaud HTML" readOnly value={html} /></details>
    {showHistory && <details><summary>Export history ({exportHistory.length})</summary>{exportHistory.length === 0 ? <p className="empty-state compact">No exports yet. Copy this post to start the local history.</p> : <div className="export-history">{exportHistory.map((record, index) => <button key={`${record.date}-${index}`} onClick={() => copyRecord(record)}><strong>{record.title}</strong><small>{record.date} · Click to copy</small></button>)}</div>}</details>}
    <small>{hint}</small>
  </div>;
}
