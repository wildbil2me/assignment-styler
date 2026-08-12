import { blockMeta } from "../core/catalog.ts";
import type { Composer } from "./state.ts";

/** The rail's block list. Identical in both shells — reorder, duplicate, select. */
export function BlockList({ c }: { c: Composer }) {
  const { blocks, selected, setSelected, dragged, dropBlock, duplicateBlock, move, addBlock } = c;
  return <>
    <div className="block-head"><span>CONTENT BLOCKS</span><button onClick={addBlock}>＋ Add block</button></div>
    <div className="blocks">{blocks.map((b,i)=><div key={b.id} draggable onDragStart={()=>dragged.current=b.id} onDragOver={e=>e.preventDefault()} onDrop={()=>dropBlock(b.id)} className={`block-row ${selected===b.id?"selected":""} ${b.hidden?"hidden-block":""}`} onClick={()=>setSelected(b.id)}>
      <span className={`type-icon ${b.type}`}>{blockMeta[b.type].icon}</span><div><strong>{blockMeta[b.type].label}</strong><small>{b.hidden?"Hidden · ":""}{b.title || b.body.replace(/<[^>]+>/g,"").slice(0,38)}</small></div><span className="block-actions"><button onClick={e=>{e.stopPropagation();duplicateBlock(b.id)}} aria-label="Duplicate block">▣</button><button onClick={e=>{e.stopPropagation();move(b.id,-1)}} disabled={!i} aria-label="Move up">↑</button><button onClick={e=>{e.stopPropagation();move(b.id,1)}} disabled={i===blocks.length-1} aria-label="Move down">↓</button></span>
    </div>)}</div>
  </>;
}
