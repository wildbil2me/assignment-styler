import { blockMeta } from "../core/catalog.ts";
import { Icon } from "./icon.tsx";
import type { Composer } from "./state.ts";

/** Shared keyboard- and pointer-accessible block list. */
export function BlockList({ c }: { c: Composer }) {
  const { blocks, selected, setSelected, dragged, dropBlock, duplicateBlock, move, addBlock } = c;
  return <>
    <div className="block-head"><span>CONTENT BLOCKS</span><button onClick={addBlock}><Icon name="add" /> Add block</button></div>
    <div className="blocks">{blocks.map((block, index) => {
      const label = blockMeta[block.type].label;
      return <div key={block.id} draggable onDragStart={() => { dragged.current = block.id }} onDragOver={event => event.preventDefault()} onDrop={() => dropBlock(block.id)} className={`block-row ${selected === block.id ? "selected" : ""} ${block.hidden ? "hidden-block" : ""}`}>
        <button className="block-select" aria-pressed={selected === block.id} onClick={() => setSelected(block.id)}>
          <span className={`type-icon ${block.type}`} aria-hidden="true">{blockMeta[block.type].icon}</span>
          <span><strong>{label}</strong><small>{block.hidden ? "Hidden · " : ""}{block.title || block.body.replace(/<[^>]+>/g, "").slice(0, 38)}</small></span>
        </button>
        <span className="block-actions">
          <button onClick={() => duplicateBlock(block.id)} aria-label={`Duplicate ${label}`} title={`Duplicate ${label}`}><Icon name="duplicate" /></button>
          <button onClick={() => move(block.id, -1)} disabled={!index} aria-label={`Move ${label} up`} title={`Move ${label} up`}><Icon name="up" /></button>
          <button onClick={() => move(block.id, 1)} disabled={index === blocks.length - 1} aria-label={`Move ${label} down`} title={`Move ${label} down`}><Icon name="down" /></button>
        </span>
      </div>;
    })}</div>
  </>;
}
