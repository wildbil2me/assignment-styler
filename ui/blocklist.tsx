import { blockMeta } from "../core/catalog.ts";
import type { Composer } from "./state.ts";

/**
 * The rail's block list. Identical in both shells — reorder, duplicate, select.
 *
 * The row used to be a `<div onClick>`, which meant it could not be reached or
 * activated from a keyboard at all: a teacher navigating by Tab could edit a
 * block's fields but never choose which block to edit. The select target is a
 * real `<button>` now, with the reorder controls as siblings rather than nested
 * inside it — you cannot put a button in a button, and the two lint rules that
 * flagged this were describing a genuine dead end, not a formality.
 *
 * Drag-and-drop stays on the wrapper. It is an enhancement on top of the ↑ ↓
 * buttons, which do the same job without a pointer.
 */
export function BlockList({ c }: { c: Composer }) {
  const { blocks, selected, setSelected, dragged, dropBlock, duplicateBlock, move, addBlock } = c;
  return <>
    <div className="block-head"><span>CONTENT BLOCKS</span><button onClick={addBlock}>＋ Add block</button></div>
    <div className="blocks">{blocks.map((b,i)=><div key={b.id} draggable onDragStart={()=>dragged.current=b.id} onDragOver={e=>e.preventDefault()} onDrop={()=>dropBlock(b.id)} className={`block-row ${selected===b.id?"selected":""} ${b.hidden?"hidden-block":""}`}>
      <button className="block-select" aria-pressed={selected===b.id} onClick={()=>setSelected(b.id)}>
        <span className={`type-icon ${b.type}`}>{blockMeta[b.type].icon}</span><span><strong>{blockMeta[b.type].label}</strong><small>{b.hidden?"Hidden · ":""}{b.title || b.body.replace(/<[^>]+>/g,"").slice(0,38)}</small></span>
      </button>
      <span className="block-actions"><button onClick={()=>duplicateBlock(b.id)} aria-label={`Duplicate ${blockMeta[b.type].label}`}>▣</button><button onClick={()=>move(b.id,-1)} disabled={!i} aria-label={`Move ${blockMeta[b.type].label} up`}>↑</button><button onClick={()=>move(b.id,1)} disabled={i===blocks.length-1} aria-label={`Move ${blockMeta[b.type].label} down`}>↓</button></span>
    </div>)}</div>
  </>;
}
