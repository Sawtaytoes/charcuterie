import type {
  CategoricalIndex,
  ControlSize,
} from "@charcuterie/tokens"
import {
  CATEGORICAL_INDEX_COUNT,
  CATEGORICAL_INDEXES,
} from "@charcuterie/tokens"
import type { CSSProperties, ReactNode } from "react"

import {
  CATEGORICAL_APPEARANCE_CLASS,
  CATEGORICAL_CONTENT_CLASS,
  CATEGORICAL_HOVER_BORDER_CLASS,
  CATEGORICAL_RING_CLASS,
} from "../categoricalStyles.ts"
import { FOCUS_RING_CLASS } from "../intentStyles.ts"
import { useRouterLink } from "../RouterLink/RouterLinkProvider.tsx"
import { getIsRoutedHref } from "../RouterLink/routerLink.ts"
import {
  TILE_BOX_CLASS,
  TILE_COLUMNS_CLASS,
  TILE_MIN_INLINE_SIZE_PROPERTY,
} from "../tileStyles.ts"
import { toClassName } from "../toClassName.ts"
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx"
import { PortraitAvatar } from "./PortraitAvatar.tsx"

export type PortraitTileItem = {
  /**
   * The hue this portrait wears — the fill behind its initials, the
   * halo around the picture, and the colour of its number.
   *
   * Overrides the one its position would have given it. Name it
   * whenever the colour belongs to the PERSON rather than to the
   * list: a household picker that gains a fifth member must not
   * re-colour the first four, and it will if every hue is positional.
   */
  categorical?: CategoricalIndex
  /**
   * The quiet line under the number, naming its unit — "points",
   * "episodes left", "due today".
   *
   * Inside the tile, so it is part of the accessible name. "1,240"
   * on its own tells a screen-reader user nothing.
   */
  hint?: ReactNode
  /** Makes the portrait a real `<a href>`. Same rules as `ActionTiles`. */
  href?: string
  /**
   * A picture of the subject. Falls back to {@link initials} when
   * absent, and **also** when the file 404s — a broken portrait grid
   * is the one failure this shape cannot absorb.
   */
  imageSrc?: string
  /**
   * Drawn in the hue's solid fill when there is no picture. One or
   * two characters; longer strings are the caller's problem to
   * shorten, because "which letters" is a naming question this
   * component cannot answer (a mononym, a family that shares an
   * initial).
   */
  initials?: string
  isDisabled?: boolean
  /** Opens in a new tab, and says so to a screen reader. `href` only. */
  isExternal?: boolean
  /** The name. */
  label: ReactNode
  /**
   * The one number this portrait is chosen by — a balance, a count,
   * a streak. Optional: a picker that is only ever "who are you"
   * passes none and the tile closes up around the name.
   */
  stat?: ReactNode
  /** Identity. The React key, and what `onChoose` is handed. */
  value: string
}

/**
 * How a portrait arranges itself.
 *
 *  - `auto` — a **row** while the set is narrow, a **column** once
 *    it has room. The switch is a container query on the set, not a
 *    media query: a picker in a 320px sidebar is a list of rows on a
 *    2560px monitor, and the same picker filling a phone is a column
 *    per screenful.
 *  - `row` / `column` — fixed, for a layout that has already decided.
 */
export type PortraitTilesLayout = "auto" | "column" | "row"

export type PortraitTilesProps = {
  className?: string
  items: readonly PortraitTileItem[]
  /** The set's accessible name. Required. */
  label: string
  layout?: PortraitTilesLayout
  /** The narrowest a portrait track may be, in CSS px. */
  minTileInlineSize?: number
  /** What `isExternal` announces. Not shown. */
  newTabLabel?: string
  /** Fired by a portrait that carries no `href`. */
  onChoose?: (value: string) => void
  size?: ControlSize
}

/**
 * The two forms, spelled as complete class strings rather than
 * assembled.
 *
 * `cq-sm` is 24rem. Below it the set is one narrow column — a phone,
 * a sidebar — and a 144px face would push the number off the bottom
 * of the fold; above it there is room for the shape points-market
 * built, which is what its kiosk screen shows today.
 *
 * The `auto` strings carry BOTH forms, because a container query
 * variant is a media query in the stylesheet and cannot be chosen in
 * JavaScript. `layout="row"` and `layout="column"` exist so a caller
 * that already knows can skip the query rather than fight it.
 */
const TILE_LAYOUT_CLASS: Record<
  PortraitTilesLayout,
  string
> = {
  auto: "flex-row items-center text-start cq-sm:flex-col cq-sm:items-center cq-sm:text-center",
  column: "flex-col items-center text-center",
  row: "flex-row items-center text-start",
}

const TEXT_LAYOUT_CLASS: Record<
  PortraitTilesLayout,
  string
> = {
  auto: "items-start cq-sm:items-center",
  column: "items-center",
  row: "items-start",
}

const TILE_PADDING_CLASS: Record<
  PortraitTilesLayout,
  string
> = {
  auto: "p-4 cq-sm:p-6",
  column: "p-6",
  row: "p-4",
}

/**
 * Every length here moves together, and none of them is a pixel
 * count in an app.
 *
 * The face grows when the set does, and the type ramp does the rest
 * on its own — `text-2xl` is 30px at `comfortable` and 38px at
 * `kiosk`, which is how points-market's wall-mounted picker gets its
 * size back without a single override. That the density axis already
 * carries this is the reason the owner's "it is meant to scale" does
 * not need a fourth size here.
 */
const AVATAR_SIZE_CLASS: Record<
  ControlSize,
  Record<PortraitTilesLayout, string>
> = {
  sm: {
    auto: "size-12 cq-sm:size-20",
    column: "size-20",
    row: "size-12",
  },
  md: {
    auto: "size-16 cq-sm:size-28",
    column: "size-28",
    row: "size-16",
  },
  lg: {
    auto: "size-20 cq-sm:size-36",
    column: "size-36",
    row: "size-20",
  },
}

/**
 * The initials, sized to the circle they sit in.
 *
 * Its own map rather than a `calc()` off the avatar size, because
 * the size arrives as a Tailwind class and there is no number here
 * to compute from. Inheriting the tile's text size — which is what
 * the first version did — put a 17px letter in the middle of a 144px
 * circle and looked like a bug in the picture loader.
 *
 * The ramp stops at `2xl`, so the largest column avatar is
 * deliberately a letter with air around it rather than a letter that
 * fills the disc. Going past the ramp for one glyph would be the
 * hardcoded length every other size in this file avoids.
 */
const AVATAR_TEXT_CLASS: Record<
  ControlSize,
  Record<PortraitTilesLayout, string>
> = {
  sm: {
    auto: "text-md cq-sm:text-xl",
    column: "text-xl",
    row: "text-md",
  },
  md: {
    auto: "text-lg cq-sm:text-2xl",
    column: "text-2xl",
    row: "text-lg",
  },
  lg: {
    auto: "text-xl cq-sm:text-2xl",
    column: "text-2xl",
    row: "text-xl",
  },
}

const NAME_TEXT_CLASS: Record<ControlSize, string> = {
  sm: "text-sm",
  md: "text-md",
  lg: "text-lg",
}

const STAT_TEXT_CLASS: Record<
  ControlSize,
  Record<PortraitTilesLayout, string>
> = {
  sm: {
    auto: "text-lg cq-sm:text-xl",
    column: "text-xl",
    row: "text-lg",
  },
  md: {
    auto: "text-xl cq-sm:text-2xl",
    column: "text-2xl",
    row: "text-xl",
  },
  lg: {
    auto: "text-2xl cq-sm:text-2xl",
    column: "text-2xl",
    row: "text-2xl",
  },
}

const GAP_CLASS: Record<ControlSize, string> = {
  sm: "gap-3",
  md: "gap-4",
  lg: "gap-5",
}

/** Positional hue, wrapping at ten. Same rule `ActionTiles` uses. */
const getPortraitCategorical = (
  item: PortraitTileItem,
  position: number,
): CategoricalIndex =>
  item.categorical ??
  (CATEGORICAL_INDEXES[
    position % CATEGORICAL_INDEX_COUNT
  ] as CategoricalIndex)

/**
 * A set of PEOPLE — or of anything else picked by its face — drawn
 * as round pictures with a name and one big number.
 *
 * points-market's "Who's shopping?" is the shape this is taken from,
 * and it is deliberately **not** an `ActionTiles` variant. The two
 * answer different questions:
 *
 *  - `ActionTiles` asks *what do you want to do* — a name, a line of
 *    help, an icon that illustrates the verb.
 *  - This asks *who is this* — a face, and one number that decides
 *    it. There is no description, because a person is not explained.
 *
 * Collapsing them would mean one component whose icon is sometimes a
 * 20px glyph beside the title and sometimes a 144px circle above it,
 * with `hint` meaning "what this does" in one mode and "points" in
 * the other. That is two components wearing one name, which is the
 * mistake the
 * [2026-08-25 record](../../../../docs/decisions/2026-08-25-a-choice-tile-is-a-radiogroup-shape-not-a-third-component.md)
 * warns about from the other direction.
 *
 * What they DO share is the box — `TILE_BOX_CLASS` and the same
 * `auto-fill` grid — so a page carrying both does not show two
 * different cards.
 *
 * ### It scales, and the scaling is the point
 *
 * The owner's one requirement when this moved into the library:
 * *"that one is meant to scale. I don't wanna lose that
 * functionality."* Two axes carry it.
 *
 *  1. **The container.** `layout="auto"` is a row while the set is
 *     narrow and a column once it has room, off a `cq-sm` query on
 *     the set itself. Nothing reads the viewport, so the same picker
 *     works in a sidebar and on a wall.
 *  2. **The density.** Every length is a token, so `data-density="kiosk"`
 *     grows the type ramp and the control heights under it. points-market
 *     runs `kiosk` today; that is where its big numbers come from,
 *     and it keeps them.
 *
 * ### The colour is the person's, not the position's
 *
 * A positional hue is the default because it costs a call site
 * nothing. It is also the wrong default for a household: add a
 * fifth member and the first four change colour, which is exactly
 * the identity the picker was using to be fast. Any set whose
 * subjects persist should store a `categorical` per subject and
 * pass it — the same call Docket makes for a project.
 */
export const PortraitTiles = ({
  className,
  items,
  label,
  layout = "auto",
  minTileInlineSize = 200,
  newTabLabel = "(opens in a new tab)",
  onChoose,
  size = "md",
}: PortraitTilesProps): ReactNode => {
  const RouterLink = useRouterLink()

  return (
    // The container and the thing querying it cannot be the same
    // element — a container query matches descendants only, so
    // `@container cq-sm:flex-col` on one box silently never fires
    // and the layout stays a row forever with nothing to report it.
    // `EmptyState` hit this first and its comment says the same.
    <div className={toClassName("@container", className)}>
      {/* biome-ignore lint/a11y/useSemanticElements: the semantic element for `group` is `<fieldset>`, which is a form-control grouping — it drags `<legend>` semantics, a border and form-reset behaviour onto a set of links that is not a form. Same call `ActionTiles` and `Menu`'s group already made. */}
      <div
        aria-label={label}
        className={toClassName(
          "grid",
          TILE_COLUMNS_CLASS,
          GAP_CLASS[size],
        )}
        role="group"
        style={
          {
            [TILE_MIN_INLINE_SIZE_PROPERTY]: `${minTileInlineSize}px`,
          } as CSSProperties
        }
      >
        {items.map((item, position) => {
          const {
            hint,
            href,
            imageSrc,
            initials,
            isDisabled = false,
            isExternal = false,
            label: tileLabel,
            stat,
            value,
          } = item

          const categorical = getPortraitCategorical(
            item,
            position,
          )

          const tileClassName = toClassName(
            "flex min-w-0 wrap-anywhere transition-[background-color,border-color,box-shadow,transform] duration-(--duration-fast) ease-standard",
            TILE_BOX_CLASS,
            TILE_LAYOUT_CLASS[layout],
            TILE_PADDING_CLASS[layout],
            GAP_CLASS[size],
            isDisabled
              ? "cursor-not-allowed opacity-60"
              : toClassName(
                  "cursor-pointer hover:shadow-medium hover:-translate-y-1",
                  // The lift is the one piece of motion in this
                  // library, kept because it is what the owner
                  // pointed at in points-market — and turned off
                  // for anyone who has asked the OS for less. The
                  // shadow and the border stay, so the hover is
                  // still legible without it.
                  "motion-reduce:hover:translate-y-0",
                  CATEGORICAL_HOVER_BORDER_CLASS[
                    categorical
                  ],
                ),
            FOCUS_RING_CLASS,
          )

          const avatarClassName = toClassName(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-full object-cover font-display font-semibold ring-4",
            AVATAR_SIZE_CLASS[size][layout],
            AVATAR_TEXT_CLASS[size][layout],
            CATEGORICAL_APPEARANCE_CLASS[categorical].solid,
            CATEGORICAL_RING_CLASS[categorical],
          )

          const content = (
            <>
              <PortraitAvatar
                className={avatarClassName}
                imageSrc={imageSrc}
                initials={initials}
              />

              <span
                className={toClassName(
                  "flex min-w-0 flex-col",
                  TEXT_LAYOUT_CLASS[layout],
                )}
              >
                <span
                  className={toClassName(
                    "font-semibold text-content-primary",
                    NAME_TEXT_CLASS[size],
                  )}
                >
                  {tileLabel}
                </span>

                {stat === undefined ? null : (
                  <span
                    className={toClassName(
                      "font-bold tabular-nums",
                      STAT_TEXT_CLASS[size][layout],
                      CATEGORICAL_CONTENT_CLASS[
                        categorical
                      ],
                    )}
                  >
                    {stat}
                  </span>
                )}

                {hint === undefined ? null : (
                  <span className="text-xs text-content-muted">
                    {hint}
                  </span>
                )}
              </span>

              {isExternal && href !== undefined ? (
                <VisuallyHidden>
                  {newTabLabel}
                </VisuallyHidden>
              ) : null}
            </>
          )

          if (href !== undefined && !isDisabled) {
            const LinkElement =
              isExternal || !getIsRoutedHref(href)
                ? "a"
                : RouterLink

            return (
              <LinkElement
                className={tileClassName}
                href={href}
                key={value}
                rel={
                  isExternal
                    ? "noopener noreferrer"
                    : undefined
                }
                target={isExternal ? "_blank" : undefined}
              >
                {content}
              </LinkElement>
            )
          }

          if (href !== undefined) {
            return (
              // biome-ignore lint/a11y/useValidAnchor: dropping `href` is the point. A disabled anchor that keeps one is focusable and silently ignores clicks; without one it is inert by the platform's own rules, and the explicit `role`/`aria-disabled` keeps it announced. `ActionTiles` and `ButtonLink` make the same call.
              <a
                aria-disabled="true"
                className={tileClassName}
                key={value}
                role="link"
              >
                {content}
              </a>
            )
          }

          return (
            <button
              className={tileClassName}
              disabled={isDisabled}
              key={value}
              onClick={() => {
                onChoose?.(value)
              }}
              type="button"
            >
              {content}
            </button>
          )
        })}
      </div>
    </div>
  )
}
