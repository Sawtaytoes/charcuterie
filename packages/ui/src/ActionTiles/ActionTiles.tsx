import type { ControlSize } from "@charcuterie/tokens"
import type { CSSProperties, ReactNode } from "react"

import { FOCUS_RING_CLASS } from "../intentStyles.ts"
import { useRouterLink } from "../RouterLink/RouterLinkProvider.tsx"
import { getIsRoutedHref } from "../RouterLink/routerLink.ts"
import {
  TILE_BOX_CLASS,
  TILE_COLUMNS_CLASS,
  TILE_GAP_CLASS,
  TILE_HINT_TEXT_CLASS,
  TILE_MIN_INLINE_SIZE_PROPERTY,
  TILE_PADDING_CLASS,
  TILE_TEXT_SIZE_CLASS,
} from "../tileStyles.ts"
import { toClassName } from "../toClassName.ts"
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx"

export type ActionTileItem = {
  /**
   * A line of help under the name. Drawn one step down the type ramp
   * in `content-muted`, **inside** the tile — so `getByRole` computes
   * it into the accessible name. A hint a screen reader never reads
   * is a hint half the audience does not have.
   */
  hint?: ReactNode
  /**
   * Makes this tile a real `<a href>`: middle-click, ctrl-click,
   * "open in new tab", "copy link address" and the status bar all
   * come from the element rather than from the paint. Routed through
   * the injected `RouterLink` when the destination is same-origin and
   * not a fragment.
   *
   * Without one, the tile is a `<button>` that calls the set's
   * `onChoose`. A set may mix the two.
   */
  href?: string
  /**
   * Leading content, above the name. A `Badge`, an app's own icon, a
   * count.
   *
   * `aria-hidden` by construction: the name it sits above is inside
   * the same tile, so an announced icon is the label read twice.
   */
  icon?: ReactNode
  isDisabled?: boolean
  /** Opens in a new tab, and says so to a screen reader. `href` only. */
  isExternal?: boolean
  label: ReactNode
  /**
   * Identity. The React key, and what `onChoose` is handed.
   *
   * Required even on a tile that navigates, so a set can mix the two
   * without one half losing its key — the same reason `RadioItem`
   * carries one.
   */
  value: string
}

export type ActionTilesProps = {
  className?: string
  items: readonly ActionTileItem[]
  /** The set's accessible name. Required. */
  label: string
  /**
   * The narrowest a tile track may be, in CSS px.
   *
   * It is the grid's floor and not the tile's width: tracks below it
   * are not created, and the ones that are share the row evenly.
   */
  minTileInlineSize?: number
  /** Fired by a tile that carries no `href`. */
  onChoose?: (value: string) => void
  /** What `isExternal` announces. Not shown. */
  newTabLabel?: string
  size?: ControlSize
}

/**
 * A set of ACTIONS drawn as tiles — a bordered card carrying a name
 * and a line of help, in a grid that gains columns with its
 * container.
 *
 * This is `RadioGroup`'s `itemShape="tile"` with the radio taken
 * away. The
 * [2026-08-25 record](../../../../docs/decisions/2026-08-25-a-choice-tile-is-a-radiogroup-shape-not-a-third-component.md)
 * that made the choice tile a `RadioGroup` shape named this case
 * under *"What this deliberately does not cover"* — mux-magic's "Pick
 * a tool" tiles are `<a href>` and points-market's are `<Link>`, and
 * *"a link is not a radio, and giving one `aria-checked` would be
 * worse than the paint it replaced"*. So the box is shared through
 * `tileStyles.ts` and nothing else is.
 *
 * ### Which of the two you want
 *
 * Ask what a press does.
 *
 *  - It **records a value** the user will then submit, or that
 *    filters what is below it — `RadioGroup itemShape="tile"`. The
 *    set announces "3 of 6", the arrow keys move the choice, and one
 *    tile stays selected.
 *  - It **goes somewhere or starts something** — this. Nothing stays
 *    selected, because nothing was chosen: the page moved on. Tab
 *    reaches each tile, Enter and Space press it, and a `href` tile
 *    is a real anchor.
 *
 * A first step that opens the next step is the second kind, which is
 * why QueuePilot's "Queue type" chooser is here and its Tonight
 * activity filter is not.
 *
 * ### Why this is not a `Button` with a `className`
 *
 * A `Button` is sized by `h-(--control-height-md)` and carries **no
 * block padding at all** — one line of text, by contract. An app that
 * wants a wrapping two-line card reaches for `height: auto`, which
 * deletes the height and leaves `padding: 0` down the block axis:
 * a title flush against the top border and a description flush
 * against the bottom one, with nothing to report it. That shipped in
 * QueuePilot and is what this component exists to have made
 * impossible.
 *
 * ### `role="group"`, and no roving tabindex
 *
 * These are ordinary buttons and anchors, so the platform already
 * owns the keyboard: Tab reaches each one, Enter and Space press it,
 * and a link opens in a new tab on ctrl-click. A radio group borrows
 * one tab stop and moves the choice with the arrow keys because
 * exactly one of its options is true at a time; nothing here is
 * true, so imposing that model would only cost a keyboard user the
 * ability to Tab to the second tile.
 */
export const ActionTiles = ({
  className,
  items,
  label,
  minTileInlineSize = 200,
  newTabLabel = "(opens in a new tab)",
  onChoose,
  size = "md",
}: ActionTilesProps): ReactNode => {
  const RouterLink = useRouterLink()

  return (
    // biome-ignore lint/a11y/useSemanticElements: the semantic element for `group` is `<fieldset>`, which is a form-control grouping — it drags `<legend>` semantics, a border and form-reset behaviour onto a set of buttons and links that is not a form. Same call `Menu`'s group, `AccordionSection` and `BoardLaneList` already made.
    <div
      aria-label={label}
      className={toClassName(
        "grid",
        TILE_COLUMNS_CLASS,
        TILE_GAP_CLASS[size],
        className,
      )}
      role="group"
      style={
        {
          [TILE_MIN_INLINE_SIZE_PROPERTY]: `${minTileInlineSize}px`,
        } as CSSProperties
      }
    >
      {items.map(
        ({
          hint,
          href,
          icon,
          isDisabled = false,
          isExternal = false,
          label: tileLabel,
          value,
        }) => {
          const tileClassName = toClassName(
            // `flex`, not `inline-flex`: a grid item stretches to its
            // track, and an inline box would sit at max-content
            // inside it. `min-w-0` with `wrap-anywhere` below,
            // because a grid item's automatic minimum is its
            // min-content width — one unbroken token would otherwise
            // set the track's floor and shove the grid out of its
            // container.
            "flex min-w-0 flex-col gap-0.5 text-start wrap-anywhere transition-colors duration-(--duration-fast) ease-standard",
            TILE_BOX_CLASS,
            TILE_PADDING_CLASS[size],
            TILE_TEXT_SIZE_CLASS[size],
            // Disabled turns the whole tile down with `opacity-60`,
            // the same family treatment as `Checkbox`, `Switch` and
            // the radio tile, rather than fading the border to a
            // token that disappeared on a pale theme.
            isDisabled
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer hover:border-border-strong",
            FOCUS_RING_CLASS,
          )

          const content = (
            <>
              {icon === undefined ? null : (
                <span aria-hidden className="flex">
                  {icon}
                </span>
              )}

              <span className="font-semibold text-content-primary">
                {tileLabel}
              </span>

              {hint === undefined ? null : (
                <span
                  className={toClassName(
                    "font-normal text-content-muted",
                    TILE_HINT_TEXT_CLASS[size],
                  )}
                >
                  {hint}
                </span>
              )}

              {isExternal && href !== undefined ? (
                <VisuallyHidden>
                  {newTabLabel}
                </VisuallyHidden>
              ) : null}
            </>
          )

          if (href !== undefined && !isDisabled) {
            // An external destination or a fragment is never the
            // router's — pushing `https://…` or `#credits` onto the
            // history stack navigates the SPA to a route that does
            // not exist. Same destination test as `ButtonLink`.
            const LinkElement =
              isExternal || !getIsRoutedHref(href)
                ? "a"
                : RouterLink

            return (
              <LinkElement
                className={tileClassName}
                href={href}
                key={value}
                // `noreferrer` alongside `noopener` on purpose:
                // `noopener` closes the `window.opener` hole, and
                // `noreferrer` is what keeps a private app's URL out
                // of the destination's logs.
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
            // `isDisabled` drops `href` entirely rather than shipping
            // a focusable anchor that silently ignores clicks — an
            // anchor with no `href` is inert by the platform's own
            // rules, and the explicit `role`/`aria-disabled` keeps it
            // *announced* as a link that is currently unavailable
            // rather than vanishing from the tree. `ButtonLink`'s
            // rule, unchanged.
            return (
              // biome-ignore lint/a11y/useValidAnchor: dropping `href` is the point. A disabled anchor that keeps one is focusable and silently ignores clicks; without one it is inert and out of the tab order by the platform's own rules, and the explicit `role`/`aria-disabled` keeps it announced rather than removed from the tree. `ButtonLink` makes the same call.
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
        },
      )}
    </div>
  )
}
