/**
 * The `index.html` guard — no structural tag literal may sit in a
 * comment *before* the real tag it shadows.
 *
 * **This is not a style rule. It is a blank page.** Vite finds its
 * script-injection points in `index.html` with plain regexes over
 * the raw text — `/<head[^>]*>/i` for head-prepend, and siblings
 * for `</head>`, `<body>`, `</body>`, `</html>`. They are
 * comment-blind. So the **first** literal `<head>` in the file
 * wins even when it is inside `<!-- … -->`, and everything Vite
 * meant to inject there lands inside the comment, where the
 * browser never parses it.
 *
 * In dev that means `@vitejs/plugin-react`'s react-refresh
 * preamble and `/@vite/client` are commented out: the console says
 * *"@vitejs/plugin-react can't detect preamble"*, `$RefreshReg$`
 * is undefined, HMR is dead, and the page is blank.
 *
 * **Production builds are unaffected**, which is the whole reason
 * this needs a mechanism rather than a paragraph. `typecheck`,
 * `lint`, `unit-tests`, `e2e`, `build-budget` and
 * `storybook-build` all stay green while `yarn dev` serves
 * nothing. It happened twice, in two repos, six days apart:
 * image-viewer on 2026-08-05 (which wrote a **Locked** decision
 * record that reached nobody else) and mux-magic on 2026-08-11
 * ([#200](https://github.com/Sawtaytoes/mux-magic/issues/200)).
 * The second one is what moved the rule into the shared build
 * seam, where every app inherits it without opting in.
 *
 * **Why "before the real tag" and not "never in a comment".**
 * mux-magic's shipped fix keeps the word `<head>` in its comment —
 * it moved the comment *inside* `<head>`, so the first literal in
 * the file is now the real element. That is a correct file, and a
 * blanket ban would fail it. The condition checked here is Vite's
 * actual failure condition, so the rule is exactly as strict as
 * the bug is.
 */

import { existsSync, readFileSync } from "node:fs"
import { isAbsolute, relative, resolve } from "node:path"

/**
 * Vite's injection anchors, in the same forms its own
 * `headPrependInjectRE` / `headInjectRE` / `bodyPrependInjectRE` /
 * `bodyInjectRE` / `htmlInjectRE` use.
 *
 * `<html>` itself is absent: Vite has no open-`html` anchor, so a
 * literal `<html>` in a leading comment shadows nothing.
 */
export const STRUCTURAL_INJECTION_ANCHORS = [
  { label: "<head>", pattern: /<head[^>]*>/i },
  { label: "</head>", pattern: /<\/head\s*>/i },
  { label: "<body>", pattern: /<body[^>]*>/i },
  { label: "</body>", pattern: /<\/body\s*>/i },
  { label: "</html>", pattern: /<\/html\s*>/i },
]

const HTML_COMMENT_PATTERN = /<!--[\s\S]*?(?:-->|$)/g

/**
 * @param {string} html
 * @returns {{ end: number, start: number }[]}
 */
const getCommentRanges = (html) =>
  [...html.matchAll(HTML_COMMENT_PATTERN)].map((match) => ({
    end:
      /** @type {number} */ (match.index) + match[0].length,
    start: /** @type {number} */ (match.index),
  }))

/**
 * 1-based, so the number matches what an editor shows.
 *
 * @param {string} html
 * @param {number} index
 */
const getLineNumber = (html, index) =>
  html.slice(0, index).split("\n").length

/**
 * Every anchor whose first occurrence in the file is inside a
 * comment. That is precisely the set Vite will inject into the
 * wrong place.
 *
 * @param {string} html
 * @returns {{ anchor: string, line: number, snippet: string }[]}
 */
export const findShadowedInjectionAnchors = (html) => {
  const commentRanges = getCommentRanges(html)

  if (commentRanges.length === 0) {
    return []
  }

  return STRUCTURAL_INJECTION_ANCHORS.flatMap(
    ({ label, pattern }) => {
      const match = pattern.exec(html)

      if (!match || match.index === undefined) {
        return []
      }

      const isShadowed = commentRanges.some(
        (range) =>
          match.index >= range.start &&
          match.index < range.end,
      )

      if (!isShadowed) {
        return []
      }

      const lineStart =
        html.lastIndexOf("\n", match.index) + 1
      const lineEnd = html.indexOf("\n", match.index)

      return [
        {
          anchor: label,
          line: getLineNumber(html, match.index),
          snippet: html
            .slice(
              lineStart,
              lineEnd === -1 ? undefined : lineEnd,
            )
            .trim(),
        },
      ]
    },
  )
}

/**
 * @param {{ anchor: string, line: number, snippet: string }[]} issues
 * @param {string} fileLabel
 */
export const formatShadowedAnchorError = (
  issues,
  fileLabel,
) =>
  [
    "",
    `[@charcuterie/vite-config] ${fileLabel} would break the dev server.`,
    "",
    ...issues.map(
      ({ anchor, line, snippet }) =>
        `  line ${line}: a literal \`${anchor}\` inside an HTML comment comes before the real one\n    ${snippet}`,
    ),
    "",
    "  Vite finds its script-injection points with comment-blind regexes",
    "  (`/<head[^>]*>/i` and friends), so the FIRST literal in the file wins",
    "  even inside `<!-- … -->`. `@vitejs/plugin-react`'s react-refresh",
    "  preamble and `/@vite/client` get written into the comment, where the",
    "  browser never parses them: `yarn dev` serves a blank page,",
    "  `$RefreshReg$` is undefined, HMR is dead — and production builds are",
    "  unaffected, so CI stays green.",
    "",
    "  Fix: drop the angle brackets in the prose (`head`, not `<head>`), or",
    "  move the comment below the real tag. Both are one line.",
    "",
    "  See charcuterie docs/decisions/2026-08-11-index-html-comments-must-not-shadow-vites-injection-anchors.md",
    "",
  ].join("\n")

/**
 * The check, as a thrown error or nothing at all.
 *
 * @param {string} html
 * @param {string} fileLabel
 */
export const assertNoShadowedInjectionAnchors = (
  html,
  fileLabel,
) => {
  const issues = findShadowedInjectionAnchors(html)

  if (issues.length === 0) {
    return
  }

  throw new Error(
    formatShadowedAnchorError(issues, fileLabel),
  )
}

/**
 * The HTML entries to check at config time. `root/index.html` is
 * the SPA default; anything else the app declared as a rollup
 * input is checked too, because a multi-page app's second page
 * fails exactly the same way.
 *
 * @param {any} config a resolved Vite config
 * @returns {string[]}
 */
export const getHtmlEntryPaths = (config) => {
  const { input } = config.build?.rollupOptions ?? {}

  const declaredInputs =
    typeof input === "string"
      ? [input]
      : Array.isArray(input)
        ? input
        : input && typeof input === "object"
          ? Object.values(input)
          : []

  return [
    ...new Set(
      [
        resolve(config.root, "index.html"),
        ...declaredInputs,
      ]
        .filter(
          (entry) =>
            typeof entry === "string" &&
            entry.endsWith(".html"),
        )
        .map((entry) =>
          isAbsolute(entry)
            ? entry
            : resolve(config.root, entry),
        ),
    ),
  ]
}

/**
 * The plugin. Included in the shared base, so no app opts in and
 * no app can forget.
 *
 * It fires in **two** places on purpose:
 *
 *  - `configResolved` reads the HTML off disk, so `yarn dev` dies
 *    at **startup** with the reason printed. The failure being
 *    fixed is a silent blank page; a check that only ran on the
 *    first request would still let the server come up looking
 *    healthy.
 *  - `transformIndexHtml` (`order: "pre"`) catches the served
 *    document, including any HTML an earlier plugin generated and
 *    any page that was not a declared entry.
 *
 * And it runs in **build** as well as serve, which is the point:
 * production is unaffected by the bug, so a serve-only check would
 * leave CI exactly as blind as it was the two times this shipped.
 */
export const createStructuralTagCommentGuard = () => ({
  name: "charcuterie:no-shadowed-injection-anchors",
  enforce: /** @type {const} */ ("pre"),

  configResolved: (/** @type {any} */ config) => {
    for (const entryPath of getHtmlEntryPaths(config)) {
      if (!existsSync(entryPath)) {
        continue
      }

      assertNoShadowedInjectionAnchors(
        readFileSync(entryPath, "utf8"),
        relative(config.root, entryPath) || entryPath,
      )
    }
  },

  transformIndexHtml: {
    order: /** @type {const} */ ("pre"),
    handler: (
      /** @type {string} */ html,
      /** @type {any} */ context,
    ) => {
      assertNoShadowedInjectionAnchors(
        html,
        context?.filename ?? context?.path ?? "index.html",
      )

      return html
    },
  },
})
