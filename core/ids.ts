/**
 * One source of block ids.
 *
 * Carried-forward bug #7: ids came from `Date.now()` in some paths and
 * `stamp + i` in others. Two blocks added inside the same millisecond — which a
 * template expansion does by construction — could collide, and a collision means
 * `blocks.find(b => b.id === selected)` picks the wrong block, edits land in the
 * wrong card, and `key={b.id}` makes React reuse the wrong DOM node.
 *
 * A plain counter would restart at 1 on reload and collide with a stored
 * workspace instead. So: monotonic, seeded from the clock, and guaranteed to
 * advance even when called twice in the same tick.
 */

let last = 0;

export function nextId(): number {
  const now = Date.now();
  last = now > last ? now : last + 1;
  return last;
}

/**
 * Ids for a batch, contiguous and collision-free — the template and duplicate
 * paths, which used to do `stamp + i` and hope.
 */
export function nextIds(count: number): number[] {
  return Array.from({ length: count }, () => nextId());
}

/**
 * Seed the counter past ids that already exist. A restored workspace can hold
 * ids from a future clock (a different machine, a changed timezone), and without
 * this the next new block would land on top of one of them.
 */
export function reserveIds(ids: number[]): void {
  for (const id of ids) if (Number.isFinite(id) && id > last) last = id;
}
