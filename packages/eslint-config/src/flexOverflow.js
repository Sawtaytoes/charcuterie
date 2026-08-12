/**
 * Flex overflow — the machine half of "a long token cannot be
 * allowed to set a row's width".
 *
 * **Four independent rediscoveries in one day** (2026-08-11),
 * during the fleet-wide bump onto `@charcuterie/ui@2.11.0`. The
 * 17px type ramp consumed the slack that had been hiding a latent
 * layout bug in five of eleven repos, and four of those five were
 * the same shape: *a flex row containing one long unbreakable
 * token* — a URI, a hostname, an item name, a five-digit price.
 *
 *  - gallery-downloader `ErrorRow` — a `webtoons:<uri>` source
 *    span shoved the timestamp out of the card, and the page
 *    measured 1528px in a 1440px window.
 *  - points-market `ShopPage` — an `<h3>` item name pushed the
 *    stock badge out of an 11rem column.
 *  - mail-sifter `LinkCard` — `community.home-assistant.io`
 *    wrapped to two mono lines and dragged the whole card row
 *    taller.
 *  - rip-deck `RipCard` — a control row that could never wrap.
 *
 * The mechanism, in one sentence: **a flex item's automatic
 * minimum size resolves against its content's min-content width**,
 * so a token with no break opportunity in it becomes the row's
 * floor. `min-width: 0` lets the *item* shrink but does nothing to
 * the *text*, which then spills; only `overflow-wrap: anywhere`
 * shrinks the min-content size itself. `truncate` is the other
 * legitimate answer, and mail-sifter took it, because the full
 * value already lives in the card's own `href`.
 *
 * **The fixes are deliberately not identical, and that is why this
 * rule flags the dangerous *shape* and accepts *any* escape.** A
 * rule that demanded one specific class would be wrong in three of
 * the four cases above.
 *
 * Two rules, and they carry different severities on purpose:
 *
 *  - `no-unconstrained-flex-text` is a **heuristic**. It cannot
 *    know whether `{status}` is `"OK"` or a 300-character URL, so
 *    it ships as a `warn` and is opt-in. A rule that fires
 *    constantly gets switched off, and a switched-off rule
 *    enforces nothing — the same reasoning that keeps
 *    `logicalProperties.js` scoped to `className`.
 *  - `no-shrink-0-with-flex-wrap` is **not** a heuristic. The two
 *    classes contradict each other outright: `shrink-0` pins the
 *    item at max-content, so the container's own `flex-wrap` can
 *    never engage. That one is an `error`.
 */

import { CHARCUTERIE_NAMESPACE } from "./namespace.js"

/**
 * Elements whose whole job is to render a run of text. A `<div>`
 * is deliberately absent: it is the generic box, it is the most
 * common child of a flex row by a wide margin, and including it
 * turned a 12-finding sweep of the fleet into a noise generator.
 *
 * `<li>` and `<td>` are absent for the same reason — they are
 * containers far more often than they are a single text run.
 */
export const TEXT_ELEMENTS = new Set([
  "abbr",
  "code",
  "dd",
  "dt",
  "em",
  "figcaption",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "kbd",
  "label",
  "legend",
  "p",
  "pre",
  "samp",
  "small",
  "span",
  "strong",
  "time",
])

/**
 * Any one of these on the child is enough. The rule is "say
 * something about how this item is allowed to size", not "use the
 * class I picked":
 *
 *  - `min-w-0` — the item may shrink below its content. Necessary
 *    but, on its own, not sufficient (the text spills instead),
 *    which is why it is not the only accepted answer.
 *  - `wrap-anywhere` / `break-all` / `break-anywhere` — shrinks
 *    the min-content size itself. The actual fix.
 *  - `truncate` / `text-ellipsis` / `line-clamp-*` /
 *    `overflow-hidden` — mail-sifter's answer: one line, ellipsis,
 *    full value in the `href` or a `title`.
 *  - `w-*` / `max-w-*` / `basis-*` / `size-*` — an explicit width
 *    replaces the automatic minimum with a stated one.
 *  - `shrink-0` / `flex-none` — points-market's answer for the
 *    price beside a wrapping Buy button: "this one does not
 *    shrink, the row wraps around it." A stated intent, so the
 *    rule takes it.
 *  - `absolute` / `fixed` — out of flow, so not a flex item at
 *    all.
 *
 * Anchored the same way `PHYSICAL_DIRECTION_PATTERN` is, and for
 * the same reason: `w-` unanchored matches `flow-root`, `shadow-`,
 * `overflow-x-auto`.
 */
export const FLEX_ESCAPE_PATTERN = [
  "(?:^|[\\s:])(?:",
  "min-w-",
  "|truncate(?=\\s|$)",
  "|text-ellipsis(?=\\s|$)",
  "|line-clamp-",
  "|overflow-hidden(?=\\s|$)",
  "|wrap-anywhere(?=\\s|$)",
  "|break-all(?=\\s|$)",
  "|break-anywhere(?=\\s|$)",
  "|w-|max-w-|basis-|size-",
  "|shrink-0(?=\\s|$)",
  "|flex-none(?=\\s|$)",
  "|absolute(?=\\s|$)",
  "|fixed(?=\\s|$)",
  ")",
].join("")

/** `flex` or `inline-flex`, bare or behind a variant. */
export const FLEX_CONTAINER_PATTERN =
  "(?:^|[\\s:])(?:inline-)?flex(?=\\s|$)"

/**
 * A column flex container is not in scope. Its items' automatic
 * minimum applies down the block axis; horizontally they simply
 * fit the container, so a long token wraps or overflows on its own
 * terms and no *sibling* is displaced. If any variant of
 * `flex-col` is present the container is skipped outright —
 * `md:flex-col` means the row shape is conditional, and a
 * conditional shape is not a confident finding.
 */
export const FLEX_COLUMN_PATTERN =
  "(?:^|[\\s:])flex-col(?:-|\\s|$)"

/**
 * Content the author has already declared to be a bounded run of
 * digits. `tabular-nums` is the fleet's marker for a number —
 * `43.0%`, `1,250 pts`, a duration, a timestamp — and a digit run
 * has no unbreakable-token problem: it is short, and it wraps on
 * its separators.
 *
 * This exclusion is measured, not assumed. Without it the rule
 * warns on rip-deck's `{percentText}` span in the row it *also*
 * flags for `shrink-0`/`flex-wrap` — a second finding on a
 * three-character value, still there after the shipped fix. The
 * one number that did take part in a real overflow (points-market's
 * five-digit price) was fixed on the **parent row**, by letting it
 * wrap; the span itself was never the defect. So nothing true is
 * lost and one guaranteed false positive per fixed file is.
 */
export const BOUNDED_CONTENT_PATTERN =
  "(?:^|[\\s:])(?:tabular-nums|slashed-zero)(?=\\s|$)"

const BOUNDED_CONTENT_REGEXP = new RegExp(
  BOUNDED_CONTENT_PATTERN,
)
const FLEX_ESCAPE_REGEXP = new RegExp(FLEX_ESCAPE_PATTERN)
const FLEX_CONTAINER_REGEXP = new RegExp(
  FLEX_CONTAINER_PATTERN,
)
const FLEX_COLUMN_REGEXP = new RegExp(FLEX_COLUMN_PATTERN)
const FLEX_WRAP_REGEXP = /(?:^|[\s:])flex-wrap(?=\s|$)/
const FLEX_NOWRAP_REGEXP = /(?:^|[\s:])flex-nowrap(?=\s|$)/
const SHRINK_0_REGEXP = /(?:^|[\s:])shrink-0(?=\s|$)/

export const NO_UNCONSTRAINED_FLEX_TEXT_MESSAGE = [
  "`<{{elementName}}>` renders dynamic text as a direct child of a",
  "flex row and says nothing about how it may shrink. A flex",
  "item's automatic minimum size resolves against its content's",
  "**min-content width**, so one unbreakable token — a URL, a",
  "host, a long name — becomes the row's floor and shoves the",
  "sibling beside it out of the container. Pick the escape that",
  "fits: `min-w-0 wrap-anywhere` to wrap mid-token (`min-w-0`",
  "alone is not enough — the text spills instead), `truncate`",
  "plus a `title` or an `href` carrying the full value, or an",
  "explicit `w-`/`max-w-`/`basis-`/`shrink-0`. Escape hatch:",
  "`// eslint-disable-next-line",
  `${CHARCUTERIE_NAMESPACE}/no-unconstrained-flex-text -- why\`.`,
].join(" ")

export const NO_SHRINK_0_WITH_FLEX_WRAP_MESSAGE = [
  "`shrink-0` and `flex-wrap` on the same element contradict each",
  "other. `shrink-0` pins the element at its max-content width, so",
  "the `flex-wrap` can never engage: the widest single line sets",
  "the floor and the row overflows instead of wrapping. Drop the",
  "`shrink-0` (and add `min-w-0` if the element is itself a flex",
  "item), or drop the `flex-wrap` if the row really is meant to",
  "stay on one line. Escape hatch: `// eslint-disable-next-line",
  `${CHARCUTERIE_NAMESPACE}/no-shrink-0-with-flex-wrap -- why\`.`,
].join(" ")

/**
 * The static text of a `className`, or `null` when it cannot be
 * read statically.
 *
 * A template literal contributes its quasis only — the
 * interpolated halves are unknowable, and guessing at them is how
 * a lint rule earns a false positive. `null` and `""` are
 * different answers: `""` means "there is a className and it says
 * nothing useful", `null` means "there is no className at all".
 *
 * @param {any} node a `JSXOpeningElement`
 * @returns {string | null}
 */
export const getClassName = (node) => {
  const attribute = node.attributes.find(
    (/** @type {any} */ candidate) =>
      candidate.type === "JSXAttribute" &&
      candidate.name?.name === "className",
  )

  if (!attribute) {
    return null
  }

  const { value } = attribute

  if (!value) {
    return ""
  }

  if (value.type === "Literal") {
    return typeof value.value === "string"
      ? value.value
      : ""
  }

  if (
    value.type === "JSXExpressionContainer" &&
    value.expression?.type === "Literal"
  ) {
    return typeof value.expression.value === "string"
      ? value.expression.value
      : ""
  }

  if (
    value.type === "JSXExpressionContainer" &&
    value.expression?.type === "TemplateLiteral"
  ) {
    return value.expression.quasis
      .map((/** @type {any} */ quasi) => quasi.value.raw)
      .join(" ")
  }

  /**
   * A `clsx(…)` / `getControlClassName(…)` call, a variable, a
   * conditional. The classes are elsewhere, so the rule cannot
   * see an escape that may well be there — and reporting on what
   * it cannot read is the fastest way to get switched off.
   */
  return null
}

/**
 * @param {any} node a `JSXOpeningElement`
 * @returns {string | null}
 */
const getElementName = (node) =>
  node.name.type === "JSXIdentifier" && node.name.name
    ? node.name.name
    : null

/**
 * Does this element render *dynamic* text?
 *
 * Static text is authored, bounded, and reviewed — `Cancel` is
 * never 300 characters. The bug arrives with data, so the rule
 * only looks at elements holding a `{…}` expression, and skips the
 * ones whose expression obviously renders elements rather than
 * text (`{children}`, `{rows.map(…)}`, `{<Foo />}`).
 *
 * @param {any} element a `JSXElement`
 */
const getHasDynamicText = (element) =>
  element.children.some((/** @type {any} */ child) => {
    if (child.type !== "JSXExpressionContainer") {
      return false
    }

    const { expression } = child

    if (
      expression.type === "JSXElement" ||
      expression.type === "JSXFragment" ||
      expression.type === "JSXEmptyExpression"
    ) {
      return false
    }

    /** `{children}` is somebody else's markup, not this row's text. */
    if (
      expression.type === "Identifier" &&
      expression.name === "children"
    ) {
      return false
    }

    /** `{rows.map(…)}` renders a list, not a text run. */
    if (
      expression.type === "CallExpression" &&
      expression.callee?.type === "MemberExpression" &&
      expression.callee.property?.name === "map"
    ) {
      return false
    }

    return true
  })

export const FLEX_OVERFLOW_RULES = {
  "no-unconstrained-flex-text": {
    meta: {
      type: /** @type {const} */ ("problem"),
      docs: {
        description:
          "A text-bearing child of a flex row has to say how it may shrink.",
      },
      messages: {
        unconstrainedFlexText:
          NO_UNCONSTRAINED_FLEX_TEXT_MESSAGE,
      },
      schema: [],
    },
    create: (/** @type {any} */ context) => ({
      JSXElement: (/** @type {any} */ node) => {
        const containerClassName = getClassName(
          node.openingElement,
        )

        if (
          containerClassName === null ||
          !FLEX_CONTAINER_REGEXP.test(containerClassName) ||
          FLEX_COLUMN_REGEXP.test(containerClassName)
        ) {
          return
        }

        for (const child of node.children) {
          if (child.type !== "JSXElement") {
            continue
          }

          const elementName = getElementName(
            child.openingElement,
          )

          if (
            !elementName ||
            !TEXT_ELEMENTS.has(elementName) ||
            !getHasDynamicText(child)
          ) {
            continue
          }

          const childClassName = getClassName(
            child.openingElement,
          )

          if (
            childClassName === null ||
            FLEX_ESCAPE_REGEXP.test(childClassName) ||
            BOUNDED_CONTENT_REGEXP.test(childClassName)
          ) {
            continue
          }

          context.report({
            node: child.openingElement.name,
            messageId: "unconstrainedFlexText",
            data: { elementName },
          })
        }
      },
    }),
  },

  "no-shrink-0-with-flex-wrap": {
    meta: {
      type: /** @type {const} */ ("problem"),
      docs: {
        description:
          "`shrink-0` pins an element at max-content, so its own `flex-wrap` can never engage.",
      },
      messages: {
        shrink0WithFlexWrap:
          NO_SHRINK_0_WITH_FLEX_WRAP_MESSAGE,
      },
      schema: [],
    },
    create: (/** @type {any} */ context) => ({
      JSXElement: (/** @type {any} */ node) => {
        const containerClassName = getClassName(
          node.openingElement,
        )

        /**
         * **The parent has to be a flex ROW, and that is a
         * correction the fleet sweep forced.**
         *
         * `shrink-0` means nothing at all outside a flex or grid
         * item, and inside a *column* it resists shrinking down
         * the **block** axis — which has no bearing on whether
         * the element's own `flex-wrap` can engage. mux-magic's
         * `FileExplorerModal` title bar
         * (`flex items-center gap-2 shrink-0 flex-wrap`, inside a
         * `flex flex-col` modal) is exactly that: two classes
         * about two different axes, and a perfectly correct one.
         * Reporting it would have been the rule's first false
         * positive, on the first real file it ever saw.
         */
        if (
          containerClassName === null ||
          !FLEX_CONTAINER_REGEXP.test(containerClassName) ||
          FLEX_COLUMN_REGEXP.test(containerClassName)
        ) {
          return
        }

        for (const child of node.children) {
          if (child.type !== "JSXElement") {
            continue
          }

          const className = getClassName(
            child.openingElement,
          )

          if (
            className === null ||
            /** `flex-wrap` on a non-flex element is inert. */
            !FLEX_CONTAINER_REGEXP.test(className) ||
            !FLEX_WRAP_REGEXP.test(className) ||
            !SHRINK_0_REGEXP.test(className)
          ) {
            continue
          }

          /**
           * `flex-wrap sm:flex-nowrap` is points-market's chip: it
           * wraps on a phone and sizes to its content above `sm`.
           * The pairing is a considered one, so the rule stays out
           * of it.
           */
          if (FLEX_NOWRAP_REGEXP.test(className)) {
            continue
          }

          context.report({
            node: child.openingElement.name,
            messageId: "shrink0WithFlexWrap",
          })
        }
      },
    }),
  },
}

export const FLEX_OVERFLOW_RULE_IDS = Object.keys(
  FLEX_OVERFLOW_RULES,
).map((ruleName) => `${CHARCUTERIE_NAMESPACE}/${ruleName}`)
