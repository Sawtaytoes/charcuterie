/**
 * Component choice — the machine half of "use the library".
 *
 * Six repos were measured on 2026-08-10 and the same four
 * mistakes keep arriving: raw `<a href>` for navigation (14 in
 * mux-magic, 10 in gallery-downloader, 31 in bambuddy), raw
 * `<select>` (134 in bambuddy, 19 in spoolbuddy), a `<div
 * onClick>` header title that no keyboard can reach
 * (points-market's `AppShell`), and whole app shells navigating
 * from a `<button onClick={() => navigate(…)}>` (plex-channels,
 * mail-sifter). Documentation has been in place the whole time
 * and did not move any of those numbers, which is the argument
 * for a lint rule: docs are read once, a rule is enforced on
 * every save.
 *
 * These are real plugin rules rather than `no-restricted-syntax`
 * entries — the technique `logicalProperties.js` uses — for two
 * reasons that only apply here:
 *
 *  1. **One rule id per mistake.** A `no-restricted-syntax`
 *     suppression is all-or-nothing: silencing a raw `<a>` on
 *     one line would also silence the logical-properties
 *     selectors on it. Each rule below gets its own id, so an
 *     escape hatch turns off exactly the one thing it names.
 *  2. **Flat config replaces rule options, it does not merge
 *     them.** Two config blocks that both set
 *     `no-restricted-syntax` over overlapping globs leave only
 *     the later one's selectors running, silently. Distinct
 *     rule ids cannot collide that way.
 *
 * The plugin object is inline in this package — nothing extra to
 * install, version, or publish, which was the original objection
 * to a custom rule.
 *
 * **Nothing here needs type information.** Every rule is a JSX
 * shape query, so the block runs under a plain parser and costs
 * a consumer no `projectService`.
 */

import { FLEX_OVERFLOW_RULE_IDS } from "./flexOverflow.js"
import { CHARCUTERIE_NAMESPACE } from "./namespace.js"

/**
 * The one import specifier every message points at. Named once
 * so a package rename is a single edit rather than six.
 */
export const UI_PACKAGE_NAME = "@charcuterie/ui"

/**
 * The plugin namespace. Consumers see it in rule ids
 * (`charcuterie/no-raw-anchor`) and in their disable comments,
 * so it is exported rather than spelled out at the call site.
 *
 * Now an alias of the shared `CHARCUTERIE_NAMESPACE` — the flex
 * rules live under the same namespace, in the same plugin object,
 * because ESLint's flat config refuses two different objects
 * registered under one name.
 */
export const COMPONENT_CHOICE_NAMESPACE =
  CHARCUTERIE_NAMESPACE

/**
 * Elements that carry no interactive semantics. An `onClick` on
 * one of these is invisible to the keyboard and to assistive
 * technology — the control exists only for a mouse.
 *
 * `label` is deliberately absent: clicking a label activating
 * its control is the platform doing its job, not a hand-rolled
 * button. `a`, `button`, `select`, `input`, `summary` and
 * friends are absent because they are already interactive (and
 * the raw-element rules have their own opinion about three of
 * them).
 */
export const NON_INTERACTIVE_ELEMENTS = new Set([
  "article",
  "aside",
  "div",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "img",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "section",
  "span",
  "table",
  "td",
  "tr",
  "ul",
])

/**
 * Attributes that mean "I know, and I have already made this
 * thing focusable and announced". Either one is enough to opt
 * out — the rule is about reaching for the wrong component, not
 * about auditing a deliberate custom widget, which is
 * `jsx-a11y`'s job and not this package's.
 */
const INTERACTIVITY_OPT_OUT_ATTRIBUTES = new Set([
  "role",
  "tabIndex",
])

/**
 * Objects whose `.push`/`.replace`/`.assign` is a navigation and
 * not an array append. Kept to this list on purpose: a bare
 * `[callee.property.name="push"]` would fire on
 * `results.push(row)` inside a click handler, and a rule that
 * cries wolf gets switched off.
 */
const NAVIGATOR_OBJECT_NAMES = new Set([
  "history",
  "location",
  "navigation",
  "router",
])

/** Bare functions that are a navigation by name. */
const NAVIGATOR_FUNCTION_NAMES = new Set([
  "navigate",
  "redirect",
])

const NAVIGATOR_METHOD_NAMES = new Set([
  "assign",
  "push",
  "replace",
])

/**
 * `<a>` is a `JSXIdentifier`; `<Foo.Bar>` is a
 * `JSXMemberExpression` and `<foo:bar>` a `JSXNamespacedName`,
 * neither of which has a `name.name` to compare.
 *
 * @param {{ name: { type: string, name?: string } }} node
 * @returns {string | null}
 */
const getElementName = (node) =>
  node.name.type === "JSXIdentifier" && node.name.name
    ? node.name.name
    : null

/**
 * @param {{ attributes: { type: string, name?: { name?: string } }[] }} node
 * @param {string} attributeName
 */
const hasAttribute = (node, attributeName) =>
  node.attributes.some(
    (attribute) =>
      attribute.type === "JSXAttribute" &&
      attribute.name?.name === attributeName,
  )

/**
 * A rule that fires on one host element name and says what to
 * use instead. Three of the five rules are exactly this shape,
 * and writing them out three times is how the messages drift
 * apart.
 *
 * @param {{
 *   description: string,
 *   elementName: string,
 *   messages: Record<string, string>,
 * }} options
 */
const createRawElementRule = ({
  description,
  elementName,
  messages,
}) => ({
  meta: {
    type: /** @type {const} */ ("problem"),
    docs: { description },
    messages,
    schema: [],
  },
  create: (/** @type {any} */ context) => ({
    JSXOpeningElement: (/** @type {any} */ node) => {
      if (getElementName(node) !== elementName) {
        return
      }

      context.report({
        node: node.name,
        messageId: Object.keys(messages)[0],
      })
    },
  }),
})

export const NO_RAW_ANCHOR_MESSAGE = [
  "Raw `<a>`. Use `TextLink` for navigation in prose or a nav,",
  "or `ButtonLink` when the navigation should look like a",
  `button — both from \`${UI_PACKAGE_NAME}\`, and both render a`,
  "real `<a href>`, so middle-click, ctrl-click and",
  "open-in-new-tab keep working, with the house focus, hover and",
  "visited styling instead of a hand-rolled one. Links go",
  "somewhere; buttons act on this page. Escape hatch:",
  "`// eslint-disable-next-line charcuterie/no-raw-anchor -- why`.",
].join(" ")

export const NO_RAW_BUTTON_MESSAGE = [
  `Raw \`<button>\`. Use \`Button\` from \`${UI_PACKAGE_NAME}\`, or`,
  "`IconButton` when the control is icon-only — an icon-only",
  "`Button` has nothing but a glyph for its accessible name, so",
  "`IconButton` takes a required `label` and is the component to",
  "reach for. If the control navigates, it is not a button at",
  "all: use `TextLink` or `ButtonLink`. Escape hatch:",
  "`// eslint-disable-next-line charcuterie/no-raw-button -- why`.",
].join(" ")

export const NO_RAW_SELECT_MESSAGE = [
  "Raw `<select>`. Use `Listbox` for a short list of rich",
  "options or `Combobox` when the list is long enough to want",
  `searching — both from \`${UI_PACKAGE_NAME}\`, both keyboard-`,
  "and screen-reader-complete. Escape hatch:",
  "`// eslint-disable-next-line charcuterie/no-raw-select -- why`.",
].join(" ")

export const PREFER_LISTBOX_OVER_SELECT_MESSAGE = [
  "`Select` is **deprecated** — the native `<select>` popup is",
  "painted by the OS and nothing in the design system reaches",
  "inside it. Use `Picker` (a `Listbox` with the trigger",
  "attached, and a drop-in for this: `label`, `options`,",
  "`value`, `onChange`), `Listbox` when the trigger is",
  "something else, or `Combobox` when the list is long enough",
  "to want typing. The four platform cases that used to excuse",
  "a native one — wheel picker, autofill, `:invalid`, no-JS",
  "form post — have never applied to an app in this fleet, so",
  "there is no per-call-site exception left: a native `Select`",
  "is a new decision record in charcuterie, and the disable",
  "comment cites it (`// eslint-disable-next-line",
  "charcuterie/prefer-listbox-over-select -- <link to the",
  "decision>`). See",
  "docs/decisions/2026-08-20-native-select-is-deprecated-and-the-platform-hatch-is-closed.md.",
].join(" ")

export const NO_CLICKABLE_NON_INTERACTIVE_MESSAGE = [
  "`onClick` on `<{{elementName}}>`, which has no interactive",
  "semantics — it cannot be tabbed to, cannot be triggered by",
  "Enter or Space, and is announced as plain text. Use `Button`",
  "or `IconButton` for an action on this page, or `TextLink` /",
  `\`ButtonLink\` if it navigates — all from \`${UI_PACKAGE_NAME}\`.`,
  "Escape hatch:",
  "`// eslint-disable-next-line",
  "charcuterie/no-clickable-non-interactive -- why`.",
].join(" ")

export const NO_NAVIGATION_IN_CLICK_HANDLER_MESSAGE = [
  "This `onClick` navigates. Use `TextLink` or `ButtonLink` from",
  `\`${UI_PACKAGE_NAME}\` and pass the destination as \`href\`, so`,
  "the browser gets a real `<a href>`: a JS-only handler cannot",
  "be middle-clicked, opened in a new tab, copied, hovered for a",
  "status-bar preview, or crawled. Buttons are for on-page",
  "actions. Escape hatch: `// eslint-disable-next-line",
  "charcuterie/no-navigation-in-click-handler -- why`.",
].join(" ")

export const REQUIRE_SUPPRESSION_REASON_MESSAGE = [
  "This `eslint-disable` silences a component-choice rule",
  "without saying why, and the whole point of the escape hatch",
  "is the reason. Add one:",
  "`// eslint-disable-next-line {{ruleId}} -- <one line on why",
  "the library component does not fit>`.",
].join(" ")

/**
 * `sourceCode.getDisableDirectives()` hands back the raw
 * comma-joined rule list, so a single directive can name several
 * rules.
 *
 * @param {string} value
 * @returns {string[]}
 */
const parseDirectiveRuleIds = (value) =>
  value
    .split(",")
    .map((ruleId) => ruleId.trim())
    .filter(Boolean)

/**
 * Every rule id this block owns. `require-suppression-reason`
 * itself is included — a disable comment that silences the
 * reason check without giving a reason is the one loophole that
 * would make the whole thing decorative.
 */
export const COMPONENT_CHOICE_RULE_IDS = [
  "no-raw-anchor",
  "no-raw-button",
  "no-raw-select",
  "prefer-listbox-over-select",
  "no-clickable-non-interactive",
  "no-navigation-in-click-handler",
  "require-suppression-reason",
].map(
  (ruleName) => `${COMPONENT_CHOICE_NAMESPACE}/${ruleName}`,
)

/**
 * Every rule in this package whose escape hatch owes a reason —
 * the component-choice set plus the flex-overflow set. They share
 * one namespace and one plugin object, so they share one
 * suppression policy: a disable with no `-- why` is the loophole
 * that makes the whole escape-hatch design decorative, whichever
 * rule it names.
 */
export const SUPPRESSION_GUARDED_RULE_IDS = [
  ...COMPONENT_CHOICE_RULE_IDS,
  ...FLEX_OVERFLOW_RULE_IDS,
]

/**
 * The component-choice half of the plugin's rules. Composed with
 * the flex-overflow half into one plugin object by `plugin.js`;
 * see `namespace.js` for why the composition cannot happen here.
 */
export const COMPONENT_CHOICE_RULES = {
  "no-raw-anchor": createRawElementRule({
    description:
      "Navigate with `TextLink` or `ButtonLink`, not a raw `<a>`.",
    elementName: "a",
    messages: { rawAnchor: NO_RAW_ANCHOR_MESSAGE },
  }),

  "no-raw-button": createRawElementRule({
    description:
      "Act with `Button` or `IconButton`, not a raw `<button>`.",
    elementName: "button",
    messages: { rawButton: NO_RAW_BUTTON_MESSAGE },
  }),

  "no-raw-select": createRawElementRule({
    description:
      "Choose with `Listbox` or `Combobox`, not a raw `<select>`.",
    elementName: "select",
    messages: { rawSelect: NO_RAW_SELECT_MESSAGE },
  }),

  "prefer-listbox-over-select": {
    meta: {
      type: /** @type {const} */ ("suggestion"),
      docs: {
        description:
          "`Select` is deprecated; pick with `Picker`, `Listbox` or `Combobox`.",
      },
      messages: {
        preferListbox: PREFER_LISTBOX_OVER_SELECT_MESSAGE,
      },
      schema: [],
    },
    create: (/** @type {any} */ context) => ({
      JSXOpeningElement: (/** @type {any} */ node) => {
        if (getElementName(node) !== "Select") {
          return
        }

        context.report({
          node: node.name,
          messageId: "preferListbox",
        })
      },
    }),
  },

  "no-clickable-non-interactive": {
    meta: {
      type: /** @type {const} */ ("problem"),
      docs: {
        description:
          "A click target is a `Button` or a link component, never a bare `<div>`.",
      },
      messages: {
        clickableNonInteractive:
          NO_CLICKABLE_NON_INTERACTIVE_MESSAGE,
      },
      schema: [],
    },
    create: (/** @type {any} */ context) => ({
      JSXOpeningElement: (/** @type {any} */ node) => {
        const elementName = getElementName(node)

        if (
          !elementName ||
          !NON_INTERACTIVE_ELEMENTS.has(elementName) ||
          !hasAttribute(node, "onClick")
        ) {
          return
        }

        const hasOptOut = [
          ...INTERACTIVITY_OPT_OUT_ATTRIBUTES,
        ].some((attributeName) =>
          hasAttribute(node, attributeName),
        )

        if (hasOptOut) {
          return
        }

        context.report({
          node: node.name,
          messageId: "clickableNonInteractive",
          data: { elementName },
        })
      },
    }),
  },

  "no-navigation-in-click-handler": {
    meta: {
      type: /** @type {const} */ ("problem"),
      docs: {
        description:
          "Navigation is an `<a href>` — `TextLink` or `ButtonLink` — not a click handler.",
      },
      messages: {
        navigationInClickHandler:
          NO_NAVIGATION_IN_CLICK_HANDLER_MESSAGE,
      },
      schema: [],
    },
    create: (/** @type {any} */ context) => {
      /**
       * Report the attribute once however many navigations
       * the handler contains — one wrong component is one
       * problem, and three squiggles on one prop reads as
       * three separate bugs.
       *
       * @type {Set<unknown>}
       */
      const reportedAttributes = new Set()

      /** @param {any} node */
      const reportEnclosingClickHandler = (node) => {
        const clickHandler = context.sourceCode
          .getAncestors(node)
          .find(
            (/** @type {any} */ ancestor) =>
              ancestor.type === "JSXAttribute" &&
              ancestor.name?.name === "onClick",
          )

        if (
          !clickHandler ||
          reportedAttributes.has(clickHandler)
        ) {
          return
        }

        reportedAttributes.add(clickHandler)

        context.report({
          node: clickHandler,
          messageId: "navigationInClickHandler",
        })
      }

      return {
        CallExpression: (/** @type {any} */ node) => {
          const { callee } = node

          const isNavigatorFunction =
            callee.type === "Identifier" &&
            NAVIGATOR_FUNCTION_NAMES.has(callee.name)

          const isNavigatorMethod =
            callee.type === "MemberExpression" &&
            callee.property?.type === "Identifier" &&
            NAVIGATOR_METHOD_NAMES.has(
              callee.property.name,
            ) &&
            (NAVIGATOR_OBJECT_NAMES.has(
              callee.object?.name,
            ) ||
              NAVIGATOR_OBJECT_NAMES.has(
                callee.object?.property?.name,
              ))

          if (!isNavigatorFunction && !isNavigatorMethod) {
            return
          }

          reportEnclosingClickHandler(node)
        },

        AssignmentExpression: (/** @type {any} */ node) => {
          const { left } = node

          const isHrefAssignment =
            left.type === "MemberExpression" &&
            left.property?.type === "Identifier" &&
            left.property.name === "href"

          if (!isHrefAssignment) {
            return
          }

          reportEnclosingClickHandler(node)
        },
      }
    },
  },

  "require-suppression-reason": {
    meta: {
      type: /** @type {const} */ ("suggestion"),
      docs: {
        description:
          "An escape hatch out of a component-choice rule has to say why.",
      },
      messages: {
        missingReason: REQUIRE_SUPPRESSION_REASON_MESSAGE,
      },
      schema: [],
    },
    create: (/** @type {any} */ context) => ({
      Program: () => {
        const { directives } =
          context.sourceCode.getDisableDirectives()

        for (const directive of directives) {
          if (directive.justification) {
            continue
          }

          const ruleIds = parseDirectiveRuleIds(
            directive.value,
          )

          /**
           * An empty rule list is a blanket
           * `// eslint-disable-next-line` — it silences these
           * rules too, so it owes the same one line.
           */
          const suppressedRuleId =
            ruleIds.length === 0
              ? `${COMPONENT_CHOICE_NAMESPACE}/<rule>`
              : ruleIds.find((ruleId) =>
                  SUPPRESSION_GUARDED_RULE_IDS.includes(
                    ruleId,
                  ),
                )

          if (!suppressedRuleId) {
            continue
          }

          context.report({
            loc: directive.node.loc,
            messageId: "missingReason",
            data: { ruleId: suppressedRuleId },
          })
        }
      },
    }),
  },
}
