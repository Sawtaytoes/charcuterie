/**
 * What the browser will not remember for you, and the one thing it
 * would never have got wrong.
 *
 * `Shell` gives `<main>` the page's only vertical scrollport, so the
 * header and the rails stay put while the content moves — that is
 * what `Shell.test.tsx` asserts. It costs exactly one thing, and
 * this module is it. A browser remembers **the document scroller's**
 * offset per history entry and puts it back on Back. It does not do
 * that for an arbitrary element with `overflow-y: auto`, and it does
 * not do it at all for a same-document `pushState` navigation, which
 * is every link press in a single-page app:
 *
 * > *"If I scroll, click on an item, then go back, it resets me to
 * > the top. […] It should remember where the scroll position was
 * > previously. Isn't this handled by Chrome already?"*
 *
 * ## An entry remembers its PATH as well as its offset
 *
 * Not decoration — the second field is what keeps this from being a
 * worse bug than the one it fixes. A history entry is not a page. A
 * filter chip, an expanded group, a selected tab: each writes a
 * search param, and **`setSearchParams` navigates**, so each mints a
 * history entry the memory has never seen. Treating an unseen entry
 * as "start at the top" therefore threw the reader to the top of the
 * list every time they opened a group — which is exactly what
 * shipped, and what the path comparison exists to prevent.
 *
 * So the rule is about the PAGE, not the entry:
 *
 *  - **An entry we have seen** → its remembered offset. This is the
 *    whole feature: Back and Forward land where you left them.
 *  - **A new entry on the SAME path** → leave the scrollport alone.
 *    A search param changed; the reader did not go anywhere. This is
 *    also precisely what the app did before this memory existed, so
 *    it can never be a regression.
 *  - **A new entry on a DIFFERENT path** → the top. A page you have
 *    not seen starts at its beginning, which is what a browser does
 *    for a document.
 *
 * ## The offsets are in memory, never `sessionStorage`
 *
 * A history key survives a reload; the DOM it described does not.
 * The app re-fetches, re-measures and often re-orders, so a pixel
 * offset from before the reload points at a different row. Restoring
 * a stale number is worse than restoring nothing, because it looks
 * deliberate.
 */

/**
 * How many history entries keep an offset. A reader goes back
 * through a handful of screens, never fifty, so this is a ceiling
 * against a long session rather than a working set — the map holds
 * one small record per entry and evicts the least recently written.
 */
const REMEMBERED_ENTRY_LIMIT = 50

export type ScrollEntry = {
  /** The history entry — react-router's `useLocation().key`. */
  key: string
  /** The page it belongs to — `useLocation().pathname`. */
  path: string
}

type RememberedEntry = {
  offset: number
  path: string
}

const rememberedEntries = new Map<string, RememberedEntry>()

/**
 * The entry the scrollport is showing. Module state rather than a
 * ref, because the question it answers — *did the reader change page
 * or only a search param?* — is asked by the incoming entry's effect
 * about the OUTGOING one, and by then the outgoing effect has
 * already been cleaned up.
 */
let currentEntry: ScrollEntry | null = null

export const rememberScrollOffset = (
  entry: ScrollEntry,
  offset: number,
) => {
  // Delete before set, so insertion order is least-recent-first and
  // the eviction below takes the right one. A plain `set` on an
  // existing key keeps its original position.
  rememberedEntries.delete(entry.key)
  rememberedEntries.set(entry.key, {
    offset,
    path: entry.path,
  })

  for (const oldestKey of rememberedEntries.keys()) {
    if (rememberedEntries.size <= REMEMBERED_ENTRY_LIMIT) {
      break
    }

    rememberedEntries.delete(oldestKey)
  }
}

/**
 * Where the scrollport should go for this entry, or `null` for
 * **leave it alone** — which is a third answer rather than a missing
 * one, and the difference between a search param and a page.
 */
export const resolveScrollOffset = (entry: ScrollEntry) => {
  const remembered = rememberedEntries.get(entry.key)

  if (remembered) {
    return remembered.offset
  }

  const isSamePage =
    currentEntry !== null &&
    currentEntry.path === entry.path

  return isSamePage ? null : 0
}

/** Called by the hook once it owns the scrollport for this entry. */
export const enterScrollEntry = (entry: ScrollEntry) => {
  currentEntry = entry
}

/** Test-only. Module state outlives a mount; a test must not. */
export const forgetScrollOffsets = () => {
  rememberedEntries.clear()
  currentEntry = null
}
