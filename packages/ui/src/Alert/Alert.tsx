import type { IntentName } from "@charcuterie/tokens"
import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react"

import { INTENT_APPEARANCE_CLASS } from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"

export type AlertSize = "md" | "sm"

export type AlertProps = Omit<
  ComponentPropsWithRef<"section">,
  "children"
> & {
  /** Buttons. Laid out beside the text at `cq-sm` and up. */
  actions?: ReactNode
  /** The quiet second line — counts, timestamps, provenance. */
  description?: ReactNode
  /**
   * The evidence, one line each. A list rather than a paragraph
   * because that is what it is, and because a screen reader then
   * announces "list, 3 items" instead of running three measurements
   * together into one sentence.
   */
  details?: readonly string[]
  /**
   * The sentence. A `ReactNode` rather than a `string` because
   * rip-deck's verdicts qualify themselves inline — *"…(suspected —
   * retry in another drive to confirm)"* — and splitting that across
   * two props would let the qualifier drift away from the claim it
   * qualifies.
   */
  heading: ReactNode
  intent?: IntentName
  /**
   * Present ⇒ this is a **named landmark** and
   * `getByRole("region", { name })` finds it. Absent ⇒ a plain
   * block, because a `<section>` with no accessible name is
   * `generic` rather than `region`. See below; the default is
   * deliberate.
   */
  label?: string
  size?: AlertSize
}

const SIZE_CLASS: Record<AlertSize, string> = {
  sm: "gap-0.5 rounded-md px-2 py-1 text-sm",
  md: "gap-1 rounded-xl px-3.5 py-2.5 text-md",
}

/**
 * The thing four of rip-deck's components each spell differently,
 * and the reason `TONE_CLASS` was declared twice in one package.
 *
 * `TowerAlerts`, `UsbAlertBanner`, `LoadedDiscsBanner` and
 * `VerdictBadge` are one shape: an intent-coloured block holding a
 * sentence, a quieter line under it, and sometimes a list of
 * evidence. Two of them carried a byte-identical `TONE_CLASS` map of
 * hardcoded hexes and `amber-`/`red-` utilities; mux-magic spells the
 * same idea a third way in `statusClassMap`. Here it is
 * `INTENT_APPEARANCE_CLASS`, which every other component in this
 * package already reads.
 *
 * ### It is a block by default, and a landmark only when named
 *
 * `label` is what decides, because the evidence divides cleanly:
 *
 *  - The **banners** are one alert at the top of a page and want to
 *    be addressable — `getByRole("region", { name: "USB connection
 *    alert" })`. They pass a `label`.
 *  - The **verdict** renders inside every bay card, and one of its
 *    two forms is the single sentence *"Part of the tower-wide
 *    problem above."* Nine landmarks sharing one name is axe's
 *    `landmark-unique`, so it passes none.
 *
 * A component that always took the landmark would have made the
 * second case fail its own a11y gate, and one that never took it
 * would leave three `<section aria-label>` wrappers hand-rolled in
 * the consumer — which is what rip-deck has today.
 *
 * ### The heading is not a heading element
 *
 * An alert's headline is a *sentence* — "Bay 7 is reading with
 * errors; clean the disc and try again" — not a node in the document
 * outline. Nine bays' worth of those as `<h3>`s builds a table of
 * contents out of nine complaints, which is worse for a screen
 * reader than no outline entry at all. `Card` and `EmptyState` take
 * a real `headingLevel` precisely because their headings *are* short
 * outline nodes; this one is styled text, and `label` is how it
 * becomes findable.
 *
 * ### It does not announce, and that is a component boundary
 *
 * No `role="alert"`, no `aria-live`. A live region takes **no
 * accessible name from its content**
 * ([decision](../../../docs/decisions/2026-07-29-status-regions-carry-an-aria-label.md)),
 * so an announcing variant would need a name that duplicates the
 * sentence it is announcing — and `role="alert"` on a `<section>`
 * overrides the landmark, so it cannot be both. A thing that
 * interrupts you is a `Toast` (M6). This is a thing that is *on the
 * page*.
 */
export const Alert = ({
  actions,
  className,
  description,
  details,
  heading,
  intent = "neutral",
  label,
  size = "md",
  ...sectionProps
}: AlertProps): ReactNode => {
  return (
    // Always a `<section>`, and the landmark still depends on
    // `label` — because HTML already says so. A `<section>` maps to
    // `region` **only when it has an accessible name**; without one
    // it is `generic`, which is exactly the "plain block" the
    // in-card verdict wants. Branching the element type here would
    // have been a second, weaker statement of a rule the platform
    // already enforces.
    <section
      {...sectionProps}
      aria-label={label}
      className={toClassName(
        // `@container` so the actions drop below the text in a
        // sidebar and sit beside it full-bleed — the case a media
        // query cannot tell apart.
        "@container border",
        INTENT_APPEARANCE_CLASS[intent].soft,
        SIZE_CLASS[size],
        className,
      )}
    >
      <div className="flex flex-col gap-2 cq-sm:flex-row cq-sm:items-start cq-sm:justify-between">
        <div className="flex min-w-0 flex-col">
          <p className="m-0 font-semibold">{heading}</p>

          {description ? (
            <p className="m-0 text-sm opacity-80">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 items-center gap-1">
            {actions}
          </div>
        ) : null}
      </div>

      {details && details.length > 0 ? (
        <ul className="m-0 list-none p-0 text-sm opacity-80">
          {details.map((line, index) => (
            // The line's own text is not a key: evidence repeats.
            // Two drives reporting "3 read errors" is the normal
            // case, not an edge one.
            <li key={`${String(index)}-${line}`}>{line}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
