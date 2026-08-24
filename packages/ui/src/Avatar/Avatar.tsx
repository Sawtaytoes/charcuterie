import type { CategoricalIndex } from "@charcuterie/tokens"
import { getCategoricalIndex } from "@charcuterie/tokens"
import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react"
import { useState } from "react"

import { CATEGORICAL_APPEARANCE_CLASS } from "../categoricalStyles.ts"
import type { IntentAppearance } from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"

export type AvatarSize = keyof typeof AVATAR_SIZE_CLASS

export type AvatarProps = Omit<
  ComponentPropsWithRef<"span">,
  "children"
> & {
  /**
   * The same three the rest of the categorical family wears, minus
   * `ghost` — a chip with no fill and no border is a floating
   * letter, and the whole job here is to be a **shape** the eye
   * finds in a list.
   */
  appearance?: Exclude<IntentAppearance, "ghost">
  /**
   * The colour, when somebody has chosen one. Omitted, it is derived
   * — see `categoricalKey` — so an avatar always has a colour and
   * never has to be given one.
   */
  categorical?: CategoricalIndex
  /**
   * What the derived colour is hashed from when `categorical` is
   * absent. Defaults to `name`.
   *
   * Pass the **user's id** wherever one exists. `getCategoricalIndex`
   * does no normalization on purpose, so hashing the name means a
   * rename — or a trailing space — silently repaints a person the
   * reader had already learned to recognise. An id does not move.
   */
  categoricalKey?: string
  /**
   * A glyph instead of the initials — a robot for an agent account,
   * a lock for a service account. The library ships **no icons**, so
   * this is the app's own
   * ([decision](../../../docs/decisions/2026-07-29-ship-no-icons-and-no-symbol-glyphs.md)).
   * It is decoration: the name still travels in `aria-label`, and a
   * glyph the font cannot render must not be the only thing
   * carrying who this is.
   */
  icon?: ReactNode
  /**
   * A photo. Optional, and **it is never the only thing** — a
   * request that 404s, a signed URL that expired, or an app that
   * simply has no photos falls back to the initials with no empty
   * box in between.
   */
  imageUrl?: string
  /**
   * The letters, when the derivation is wrong. Derived from `name`
   * otherwise: the first character of each of the first two
   * whitespace-separated words, upper-cased.
   *
   * Worth passing for a name the split gets wrong — a mononym that
   * wants two letters, a name whose family part comes first, a
   * handle with punctuation in it.
   */
  initials?: string
  /**
   * Who this is. Read by assistive technology and shown on hover;
   * **never printed as visible text**, which is the entire point of
   * the component.
   *
   * Nullable, and that is a decision rather than a loose type — see
   * the note on the component about what an unassigned row draws.
   */
  name: string | null | undefined
  size?: AvatarSize
}

/**
 * One rule: **the circle is 1.9 x its own type size**, and `size`
 * picks which step of the type scale that is.
 *
 * 1.9 rather than a tighter number because a circle only offers its
 * full width on the centre line. Two capitals measure about 1.25em
 * in this face, and a chord taken at the cap height of a 1.75em
 * circle is barely wider than that — measured, not guessed.
 *
 * It is em-based rather than a fixed `size-5` / `size-7` / `size-9`,
 * and that is the whole of the design. Every length in this token
 * set moves with the density axis — `--font-size-xs` is 0.88rem
 * compact, 0.94rem at desktop and 1.11rem on the kiosk — so a chip
 * pinned to 20px holds two letters at one density and clips them at
 * the next. `controlStyles.ts` says the same thing about badges and
 * dots: non-control sizing is type-relative on purpose, because a
 * chip that stays 20px while the kiosk scales the prose around it
 * reads as a rendering fault.
 *
 * The hand-rolled avatar this replaces is the worked example. It was
 * `size-5` with `text-[0.625rem]` — a 10px font, which is **not a
 * step of this type scale at any density**, because 20px is not
 * enough room for two characters at the smallest size the tokens
 * actually offer. A component that has to invent a font size to fit
 * its own box has the wrong box.
 */
const AVATAR_SIZE_CLASS = {
  sm: "size-[1.9em] text-xs",
  md: "size-[1.9em] text-md",
  lg: "size-[1.9em] text-xl",
} as const

/**
 * The first character of each of the first two words.
 *
 * `Array.from` rather than `charAt`, so a name that starts outside
 * the BMP contributes a whole character instead of half a surrogate
 * pair and a replacement glyph.
 */
const toInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toLocaleUpperCase()

/**
 * A person, as a coloured chip — a glyph or an initial, with the
 * name attached where only assistive technology and a hover can
 * reach it.
 *
 * It exists to delete a printed name. Docket's board put the word
 * *"Owner"* on most of its cards, which is a column of identical
 * text doing the work of a colour; the fleet's boards all want the
 * same chip, and `Board.stories.tsx` had already hand-rolled one
 * inside a story file.
 *
 * ### Unassigned draws **nothing**, and the component owns that
 *
 * `name` accepts `null` and `undefined`, and either renders `null`.
 * A grey *"None"* placeholder is a decision the design system makes
 * against the reader: it is a chip that says a fact nobody needed,
 * repeated down every unassigned row, at the same weight as the
 * chips that mean something.
 *
 * The alternative is a ternary at every call site, and the call
 * sites are the whole problem — a board, a table, a card footer, a
 * detail pane, each written on a different day. The one that forgets
 * is the one that ships the grey circle. Absence is expressed once,
 * here, which is the same call `Board` makes with `onMove`: no
 * handler means no affordance, rather than a disabled one.
 *
 * A consumer that genuinely wants to *say* "unassigned" still can —
 * that is text, or an `EmptyState`, and neither of them is an
 * avatar.
 *
 * ### The name is never visible text
 *
 * `role="img"` with an `aria-label`, exactly as `Swatch` does, so
 * `getByRole("img", { name })` is the one handle whether the chip is
 * showing a photo, a glyph or two letters. `title` carries the same
 * string for a pointer, which is the only channel a person browsing
 * with their eyes has — the letters `KG` are not a name.
 *
 * That is also why there is no `isNameVisible`: an avatar whose name
 * is printed beside it is a name with a decoration in front of it,
 * and the layout that wants one should print the name and skip the
 * chip.
 *
 * ### The colour is derived, never invented
 *
 * `categorical` is the ten-wide non-semantic scale — the same one
 * `Badge` takes — and **not** an `intent`. An intent is a claim the
 * design system makes; a person is not `danger`. With no
 * `categorical` the index comes from `getCategoricalIndex`, which is
 * a pure function of the key, so the same person is the same colour
 * on every machine, every reload, and in a server render. Ten
 * colours means collisions past ten people, and that is a property
 * of the palette rather than a fault in the hash: the colour helps
 * you *scan*, and the accessible name is what identifies.
 *
 * ### There is no `AvatarGroup`
 *
 * Deliberately. A stack of overlapping chips with a `+3` needs
 * answers to which three survive, in what order, and what the
 * overflow announces — and no consumer has asked the question yet. A
 * row of `Avatar`s in a flex box is what a multi-assignee list looks
 * like until one does.
 */
export const Avatar = ({
  appearance = "soft",
  categorical,
  categoricalKey,
  className,
  icon,
  imageUrl,
  initials,
  name,
  size = "md",
  title,
  ...spanProps
}: AvatarProps): ReactNode => {
  /**
   * The URL that failed, rather than a `hasFailed` boolean.
   *
   * A boolean has to be *reset* when `imageUrl` changes, which is an
   * effect syncing a prop into state — the shape this library
   * refuses everywhere else
   * ([decision](../../../docs/decisions/2026-07-29-logic-hooks-are-uncontrolled.md)).
   * Storing the URL makes the comparison below derive the answer, so
   * a second photo gets its own attempt and a re-render never
   * resurrects a dead one.
   */
  const [failedImageUrl, setFailedImageUrl] = useState<
    string | undefined
  >(undefined)

  const hasImageError =
    imageUrl !== undefined && failedImageUrl === imageUrl

  const trimmedName = name?.trim()

  if (!trimmedName) {
    return null
  }

  const resolvedInitials =
    initials ?? toInitials(trimmedName)

  const resolvedCategorical =
    categorical ??
    getCategoricalIndex(categoricalKey ?? trimmedName)

  return (
    <span
      {...spanProps}
      aria-label={trimmedName}
      className={toClassName(
        "inline-grid shrink-0 place-items-center overflow-hidden rounded-full border font-medium leading-none",
        AVATAR_SIZE_CLASS[size],
        CATEGORICAL_APPEARANCE_CLASS[resolvedCategorical][
          appearance
        ],
        className,
      )}
      role="img"
      title={title ?? trimmedName}
    >
      {imageUrl !== undefined && !hasImageError ? (
        // `alt=""` on purpose: the wrapper already carries the
        // accessible name, and a second copy on the image is how an
        // avatar gets announced twice.
        <img
          alt=""
          className="size-full object-cover"
          onError={() => {
            setFailedImageUrl(imageUrl)
          }}
          src={imageUrl}
        />
      ) : (
        <span aria-hidden="true">
          {icon ?? resolvedInitials}
        </span>
      )}
    </span>
  )
}
