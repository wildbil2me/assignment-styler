/**
 * Pure operations on a block list.
 *
 * These live here, and take the list as an argument, because of the bug they
 * were pulled out of the composer hook to fix. Every one of them has to be
 * applied to the array React is *currently* holding, not to one captured when
 * the click handler was created.
 *
 * `duplicateBlock` used to read `blocks[i]` from its closure and then splice the
 * result into the array a functional `setBlocks` handed it. Those are two
 * different arrays whenever an update is already queued — and one always is
 * when the duplicate button is what took focus away from an open editor, since
 * the resulting blur commits the teacher's edit into the same React batch. The
 * copy was therefore built from the block as it looked *before* the edit: the
 * original kept the new text and the duplicate silently carried the old.
 *
 * Written as `setBlocks(v => duplicateIn(v, id, newId))` there is no snapshot
 * left to go stale, which is a stronger guarantee than remembering to read the
 * right variable.
 */

import type { Block } from "./model.ts";

/** Insert a copy of `id` directly after it. Unknown ids leave the list alone. */
export function duplicateIn(blocks: Block[], id: number, newId: number): Block[] {
  const i = blocks.findIndex((b) => b.id === id);
  if (i < 0) return blocks;
  const copy: Block = { ...blocks[i], id: newId, title: `${blocks[i].title} copy` };
  return [...blocks.slice(0, i + 1), copy, ...blocks.slice(i + 1)];
}

/** Drop `id`, returning the same array when there was nothing to drop. */
export function removeFrom(blocks: Block[], id: number): Block[] {
  const next = blocks.filter((b) => b.id !== id);
  return next.length === blocks.length ? blocks : next;
}

/**
 * Which block should be selected once `id` is deleted — the one that slides
 * into its place, or the new last block.
 *
 * Carried-forward bug #5: this used to be `blocks[0]?.id` against the
 * *pre-deletion* array, so deleting the first block re-selected the block it had
 * just removed and the inspector went blank.
 */
export function neighbourOf(blocks: Block[], id: number): number {
  const i = blocks.findIndex((b) => b.id === id);
  if (i < 0) return blocks[0]?.id ?? 0;
  const remaining = blocks.filter((b) => b.id !== id);
  return remaining[Math.min(i, remaining.length - 1)]?.id ?? 0;
}
