/**
 * What `Shell` tells `Header` and `Main` so they cannot disagree.
 *
 * This context exists because of one specific bug, present in the
 * fleet today: **points-market's header is width-constrained and
 * its `<main>` is not.** `AppShell.tsx` wraps the header row in
 * `.pm-constrained` (80rem) and then renders
 * `<main className="px-4 py-6 sm:px-6">` with no cap at all, so on
 * a wide monitor the page title sits above content that starts to
 * its left and runs past its right. Nothing errors, both values
 * are individually reasonable, and the two were simply written on
 * different days.
 *
 * A width that has to be stated twice will eventually be stated
 * twice differently. So it is stated **once**, on `Shell`, and the
 * two elements that have to agree read it from here. Either can
 * still override for a genuine reason — a full-bleed hero `Main`
 * under a constrained `Header` is a real design — but that now
 * takes a prop somebody wrote on purpose.
 *
 * `mainId` rides along for the same reason: the skip link's `href`
 * and the `<main>` it lands on are one value, generated once.
 */

import { createContext } from "react"

import type { ContentWidth } from "./contentWidth.ts"

export type ShellContextValue = {
  contentWidth: ContentWidth
  mainId: string
}

/**
 * `null` rather than a default object, so `Header` and `Main` can
 * tell "no `Shell` above me" from "a `Shell` that chose the
 * defaults" — the first case has to generate its own `<main>` id,
 * the second must not.
 */
export const ShellContext =
  createContext<ShellContextValue | null>(null)
