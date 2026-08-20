/**
 * The shortcut row, in its own module.
 *
 * Its own file for two reasons, one design and one mechanical. The
 * design one: a preset is an **offset from today**, not a date, so
 * the preset row cannot become the one thing in the component that
 * reads the system clock behind `today`'s back. The mechanical one:
 * the barrel's assist merges same-source exports into one block, and
 * `sourceRules.test.ts` asserts a literal `export { <Name> }` line
 * for every component — so a component file with a second named
 * export cannot be barrelled the way that rule expects. Same
 * arrangement as `Toolbar/chooseVisibleCount.ts`.
 */

export type DatePreset = {
  /** Whole days from `today`. Negative is allowed. */
  days: number
  label: string
}

/**
 * Words, not glyphs — the house rule, and it is the right default
 * here anyway: "Today" is unambiguous in a way an icon of a calendar
 * with a dot on it is not.
 *
 * Three, because a shortcut row that needs scanning is not a
 * shortcut. `presets={[]}` removes it; a consumer with its own
 * cadence (Docket's 14-day staleness) passes its own.
 */
export const DEFAULT_DATE_PRESETS: readonly DatePreset[] = [
  { days: 0, label: "Today" },
  { days: 1, label: "Tomorrow" },
  { days: 7, label: "Next week" },
]
