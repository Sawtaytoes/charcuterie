/**
 * Logical properties only — the machine half of the rule.
 *
 * Every spatial value in this fleet is consumed logically:
 * `padding-inline`, `margin-block`, `inset-inline-start`,
 * `border-inline-start`, `text-align: start`. In Tailwind that is
 * `ps-`/`pe-`/`ms-`/`me-`/`start-`/`end-`/`border-s`/`border-e`/
 * `text-start`/`text-end`.
 *
 * It costs nothing today and makes RTL nearly free later, which is
 * exactly why it is a lint rule rather than a preference — a
 * preference survives until the first person in a hurry.
 *
 * Scope is deliberately narrow: `className` string literals and
 * template chunks. Physical property *names* in style objects
 * (`left`, `paddingRight`) are not matched, because `left` and
 * `right` are legitimate identifiers in far too many places —
 * `getBoundingClientRect().left`, Floating UI placements, CSS
 * gradient stops. A rule that cries wolf on those gets switched
 * off, and a switched-off rule enforces nothing.
 */

/**
 * Three shapes of offender, and they need different anchoring:
 *
 *  1. Utilities that always take a value — `pl-2`, `-mr-1`,
 *     `left-0`, `inset-l-4`. Anchored by the trailing dash.
 *  2. Utilities valid bare *or* valued — `border-l`,
 *     `border-r-2`, `rounded-tl`, `rounded-l-lg`. These need an
 *     end anchor, otherwise `border-red-500` and `rounded-lg`
 *     both look like hits.
 *  3. Exact utilities — `text-left`, `float-right`.
 *
 * The leading `(?:^|[\s:])` is what keeps `bright-` and
 * `place-items-center` out of it while still matching a modifier
 * like `sm:pl-2` or `hover:mr-1`.
 */
export const PHYSICAL_DIRECTION_PATTERN = [
  "(?:^|[\\s:])(?:",
  "-?(?:p[lr]|m[lr]|left|right|inset-[lr])-",
  "|(?:border-[lr]|rounded-(?:[tb][lr]|[lr]))(?:-[^\\s]+)?(?=\\s|$)",
  "|(?:text-(?:left|right)|float-(?:left|right)|clear-(?:left|right))(?=\\s|$)",
  ")",
].join("")

export const PHYSICAL_DIRECTION_MESSAGE =
  "Physical-direction utility in className. Use the logical form instead: ps-/pe-, ms-/me-, start-/end-, border-s/border-e, rounded-s/rounded-e, text-start/text-end. See packages/tokens/README.md."

/**
 * `no-restricted-syntax` entries rather than a custom rule
 * package: the same technique `mux-magic/eslint.config.js` uses
 * for `WEB_API_SHAPE_RULES`, and it needs no plugin to install,
 * version, or publish.
 *
 * Both node types are needed. A plain `className="pl-2"` is a
 * `Literal`; `className={`flex ${gap} pl-2`}` puts the offending
 * text in a `TemplateElement` the `Literal` selector never sees.
 */
export const PHYSICAL_DIRECTION_SELECTORS = [
  {
    selector: `JSXAttribute[name.name="className"] Literal[value=/${PHYSICAL_DIRECTION_PATTERN}/]`,
    message: PHYSICAL_DIRECTION_MESSAGE,
  },
  {
    selector: `JSXAttribute[name.name="className"] TemplateElement[value.raw=/${PHYSICAL_DIRECTION_PATTERN}/]`,
    message: PHYSICAL_DIRECTION_MESSAGE,
  },
]
