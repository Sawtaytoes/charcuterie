/**
 * Identity-preserving array helpers.
 *
 * Every core rebuilds its derived arrays on every command and then
 * throws the new one away if it is equal to the old one. That
 * looks wasteful and is not: `useSyncExternalStore` re-renders on
 * reference identity, so handing back a fresh-but-equal array is
 * how a state library ends up re-rendering a whole listbox
 * because something unrelated changed.
 */

export const areArraysEqual = <Item>(
  first: readonly Item[],
  second: readonly Item[],
) =>
  first === second ||
  (first.length === second.length &&
    first.every((item, index) => item === second[index]))

/**
 * Returns `previous` verbatim when nothing moved, so callers can
 * compare the whole state object by identity afterwards.
 */
export const keepArrayIdentity = <Item>(
  previous: readonly Item[],
  next: readonly Item[],
) =>
  areArraysEqual(previous, next)
    ? previous
    : Object.freeze(next)
