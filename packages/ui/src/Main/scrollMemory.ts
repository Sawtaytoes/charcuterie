/**
 * What the browser will not remember for you.
 *
 * `Shell` gives `<main>` the page's only vertical scrollport, so
 * the header and the rails stay put while the content moves —
 * that is the whole reason `Shell.test.tsx` asserts "only main
 * scrolls vertically, keeping the rail available".
 *
 * It costs exactly one thing, and this module is it. A browser
 * remembers **the document scroller's** offset per history entry
 * and puts it back on Back. It does that for a cross-document
 * load, and `history.scrollRestoration` is the switch for it. It
 * does **not** do it for an arbitrary element with
 * `overflow-y: auto`, and it does not do it at all for a
 * same-document `pushState` navigation, which is every link press
 * in a single-page app. So a page that scrolls its own `<main>`
 * loses the reader's place on Back, and no browser setting brings
 * it back:
 *
 * > *"If I scroll, click on an item, then go back, it resets me to
 * > the top. […] It should remember where the scroll position was
 * > previously. Isn't this handled by Chrome already?"*
 *
 * The offsets are held **in memory**, not in `sessionStorage`. A
 * history key survives a reload, but the DOM it described does
 * not: the app re-fetches, re-measures and often re-orders, so a
 * pixel offset from before the reload points at a different row.
 * Restoring a stale number is worse than restoring nothing,
 * because it looks deliberate.
 */

/**
 * How many history entries keep an offset. A reader goes back
 * through a handful of screens, never fifty, so this is a ceiling
 * against a long session rather than a working set — the map holds
 * one small number per entry and evicts the least recently
 * written.
 */
const REMEMBERED_ENTRY_LIMIT = 50

const rememberedOffsets = new Map<string, number>()

export const rememberScrollOffset = (
  key: string,
  offset: number,
) => {
  // Delete before set, so insertion order is least-recent-first
  // and the eviction below takes the right one. A plain `set` on
  // an existing key keeps its original position.
  rememberedOffsets.delete(key)
  rememberedOffsets.set(key, offset)

  for (const oldestKey of rememberedOffsets.keys()) {
    if (rememberedOffsets.size <= REMEMBERED_ENTRY_LIMIT) {
      break
    }

    rememberedOffsets.delete(oldestKey)
  }
}

/**
 * `0` for an entry nobody has scrolled, which is also the right
 * answer for an entry nobody has *seen* — a link press lands at
 * the top of the new page.
 */
export const recallScrollOffset = (key: string) =>
  rememberedOffsets.get(key) ?? 0

/** Test-only. Module state outlives a mount; a test must not. */
export const forgetScrollOffsets = () => {
  rememberedOffsets.clear()
}
