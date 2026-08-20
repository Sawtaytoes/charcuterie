import { connectionTransitions } from "@charcuterie/logic"
import {
  CATEGORICAL_HUES,
  CATEGORICAL_INDEXES,
} from "@charcuterie/tokens"
import type { InputType } from "storybook/internal/types"

import { CONTROL_SIZE_CLASS } from "./controlStyles.ts"
import { INTENT_APPEARANCE_CLASS } from "./intentStyles.ts"

/**
 * Controls for the props Storybook's docgen cannot see through.
 *
 * `react-docgen` follows **relative** imports and stops at bare
 * package specifiers. So `appearance?: IntentAppearance` — imported
 * from `../intentStyles.ts` — arrives as a resolved union and gets a
 * radio for free, while `size?: ControlSize` and `intent?: IntentName`
 * — imported from `@charcuterie/tokens` — arrive as the bare names
 * `ControlSize` and `IntentName`, which Storybook cannot enumerate.
 * Its fallback for an unknown type is the **object control**: a JSON
 * textarea containing `{}`, on a prop whose only legal values are
 * three strings. Typing in it renders the component with an object
 * where a string belongs.
 *
 * The other half of the same problem is that Storybook has not seeded
 * `args` from a docgen `defaultValue` since v7 — the props table
 * prints `"control"` in the Default column while the radio beside it
 * has nothing selected. Only an explicit `args` fixes that, so every
 * meta states the component's own defaults.
 *
 * Switching the whole project to `react-docgen-typescript` would
 * resolve the imports and is the wrong trade: it expands
 * `ComponentPropsWithRef<"button">` too, turning a nine-row props
 * table into every HTML attribute React knows.
 *
 * The option lists are derived from the `Record<Union, …>` maps the
 * components already index, never retyped — so a new intent or a new
 * size is a compile error in the map and a longer radio here, rather
 * than a control that silently omits it.
 */

const toOptions = <Key extends string>(
  map: Record<Key, unknown>,
): Key[] => Object.keys(map) as Key[]

/**
 * A radio under five options, a select at five or more — past four
 * the radio column is taller than the props row it belongs to.
 */
const toChoiceArgType = <Key extends string>(
  options: readonly Key[],
): InputType => ({
  control: {
    type: options.length < 5 ? "radio" : "select",
  },
  options: [...options],
  table: {
    type: {
      summary: options
        .map((option) => `"${option}"`)
        .join(" | "),
    },
  },
})

export const INTENT_OPTIONS = toOptions(
  INTENT_APPEARANCE_CLASS,
)

export const CONTROL_SIZE_OPTIONS = toOptions(
  CONTROL_SIZE_CLASS,
)

export const CONNECTION_STATUS_OPTIONS = toOptions(
  connectionTransitions,
)

/**
 * floating-ui's own union, which is not a `Record` anywhere we own —
 * so this is the one list written out by hand, and the one a
 * dependency bump could silently outdate.
 * `storyControls.test.ts` pins it against the placements `Popover`
 * actually accepts.
 */
export const PLACEMENT_OPTIONS = [
  "top",
  "top-start",
  "top-end",
  "right",
  "right-start",
  "right-end",
  "bottom",
  "bottom-start",
  "bottom-end",
  "left",
  "left-start",
  "left-end",
] as const

export const intentArgType = toChoiceArgType(INTENT_OPTIONS)

/**
 * `categorical` is the one enumerable prop in the package whose
 * values are **numbers**, so it cannot go through `toOptions` —
 * `Object.keys` on a numerically-keyed record returns
 * `["1", "2", …]`, and a control handing the component `"3"` where
 * it wants `3` indexes a `Record<CategoricalIndex, …>` with a
 * string and paints nothing. Reading `CATEGORICAL_INDEXES` keeps
 * the type and the control agreeing.
 *
 * `undefined` leads the list because it is the real default: a
 * badge with no `categorical` is an `intent` badge, and a control
 * with no way back to that would make the two props look like a
 * choice the reader cannot undo.
 */
export const CATEGORICAL_OPTIONS = [...CATEGORICAL_INDEXES]

export const categoricalArgType: InputType = {
  control: { type: "select" },
  options: [undefined, ...CATEGORICAL_OPTIONS],
  // The names are `CATEGORICAL_HUES`', not invented here — a picker
  // that says "3" tells a reader nothing, and `Swatch` already
  // settled that a colour needs a word attached.
  mapping: Object.fromEntries(
    CATEGORICAL_OPTIONS.map((index) => [index, index]),
  ),
  table: {
    type: {
      summary: CATEGORICAL_OPTIONS.map(
        (index) =>
          `${index} (${CATEGORICAL_HUES[index].label})`,
      ).join(" | "),
    },
  },
}

export const controlSizeArgType = toChoiceArgType(
  CONTROL_SIZE_OPTIONS,
)

export const connectionStatusArgType = toChoiceArgType(
  CONNECTION_STATUS_OPTIONS,
)

export const placementArgType = toChoiceArgType(
  PLACEMENT_OPTIONS,
)

/**
 * Exported for the one control whose map is private to its own
 * component — `Card`'s `ELEVATION_CLASS`. Its story derives the
 * options there rather than this file importing a component.
 */
export const toStoryChoice = toChoiceArgType
