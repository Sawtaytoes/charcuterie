import type { ReactNode } from "react"

import type { CommandPalettePrefix } from "./commandPaletteSections.ts"

const renderKey = (name: string): ReactNode => (
  <kbd className="rounded-sm border border-border-default bg-surface-raised px-1 font-mono text-content-secondary text-xs">
    {name}
  </kbd>
)

/**
 * The default strip under the list: the keys, and each prefix with
 * its target.
 *
 * The keys are words — `Up`, `Down` — not arrow glyphs, because a font
 * without the glyph paints nothing
 * (`2026-07-29-ship-no-icons-and-no-symbol-glyphs.md`). In the Narrow
 * View the key hints give way, since a phone has no arrow keys, and
 * the prefixes stay: they work from a phone keyboard too.
 */
export const CommandPaletteFooter = ({
  prefixes,
}: {
  prefixes: readonly CommandPalettePrefix[]
}): ReactNode => (
  <>
    <span className="max-sm:hidden">
      {renderKey("Up")} {renderKey("Down")} move
    </span>
    <span className="max-sm:hidden">
      {renderKey("Enter")} open
    </span>
    <span className="max-sm:hidden">
      {renderKey("Ctrl")} {renderKey("Enter")} new tab
    </span>
    {prefixes.map(({ label, prefix }) => (
      <span key={prefix}>
        {renderKey(prefix)} {label}
      </span>
    ))}
    <span className="max-sm:hidden">
      {renderKey("Esc")} close
    </span>
  </>
)
