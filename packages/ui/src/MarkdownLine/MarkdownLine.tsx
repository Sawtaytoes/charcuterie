import type { ReactNode } from "react"
import { Fragment } from "react"

import {
  FOCUS_RING_CLASS,
  INTENT_CONTENT_CLASS,
} from "../intentStyles.ts"
import { useRouterLink } from "../RouterLink/RouterLinkProvider.tsx"
import { getIsRoutedHref } from "../RouterLink/routerLink.ts"
import { toClassName } from "../toClassName.ts"
import type { InlineMarkdownRun } from "./inlineMarkdown.ts"
import { toInlineMarkdownRuns } from "./inlineMarkdown.ts"

export type MarkdownLineProps = {
  className?: string
  /**
   * Where the text that is **not** itself a link points — the task
   * a card opens, usually.
   *
   * Given one, every plain run becomes its own anchor to it and a
   * markdown link stays a separate anchor beside them. That is the
   * whole reason this prop exists rather than the caller wrapping
   * the component in an `<a>`: an anchor inside an anchor is invalid
   * HTML, the browser closes the outer one, and the second half of
   * the title silently stops opening the task.
   *
   * Left out, the runs are plain text and only the markdown links
   * are clickable — which is right for a heading, a table cell, or
   * anywhere the line is not itself a destination.
   *
   * ⚠️ **A markdown link splits this into more than one anchor**, and
   * each one is named by the words it actually covers — `Ship`, then
   * `#53`, then `tonight`. That is honest (what is announced is what
   * is on screen, per WCAG 2.5.3) and it is not *good*: `tonight` is
   * a poor name for a link to a task. Giving them all one name was
   * tried and is worse — two links with the same name are ambiguous
   * to anything driving the page by name, which this library's own
   * `expectAgentDrivable` refuses outright. The conclusion is a
   * design one: a link usually belongs in a task's **description**,
   * where it has a sentence around it, rather than in its title.
   */
  href?: string
  /**
   * The caller has already wrapped this line in a link — so draw the
   * marks and emit **no anchors at all**, not even for a markdown
   * link.
   *
   * The third and last answer to "who owns the link here", after
   * `href` (this component does) and neither (the markdown links do,
   * and nothing else is clickable). It exists because a whole-card
   * link is a real and common shape — Docket's triage cards wrap the
   * title *and* the body, so middle-click opens the proposal — and
   * inside one, an anchor of any kind is an anchor inside an anchor.
   *
   * That trap has teeth even when no author ever typed a link: a
   * **bare URL autolinks**, so a captured note whose title ends in
   * `https://…` would nest one without anybody writing `[]()`.
   *
   * A markdown link's text still renders, with its marks; it simply
   * does not navigate on its own. The card's link is what a click
   * follows.
   */
  isInsideLink?: boolean
  /**
   * The markdown. **Inline constructs only** — see
   * `inlineMarkdown.ts`; a `#` or a `- ` is a literal character
   * here, and a newline collapses to a space.
   */
  value: string
}

/**
 * The link paint, matched to `.cm-md-link` in the CodeMirror
 * surface's theme rather than to `TextLink`'s.
 *
 * `TextLink` would be the obvious reach and it is the wrong one: it
 * declares `rounded-xs`, a cursor and a hover rule that belong to a
 * link in a paragraph, and — the deciding one — it has no way to
 * inherit the title's own weight, so a link inside a bold title
 * would un-bold itself. Two rules is the whole of what is shared
 * with `.cm-md-link`, and sharing them by value is what keeps the
 * editor and the card showing one answer.
 */
const LINK_CLASS = toClassName(
  INTENT_CONTENT_CLASS.accent,
  "underline decoration-1 underline-offset-2 hover:decoration-2",
  FOCUS_RING_CLASS,
)

/**
 * `0.9em` and not a step on the type scale.
 *
 * A monospace face at the same `font-size` as the text around it
 * reads bigger — fixed advance width, taller x-height — so a file
 * name in a title would shout. `em` rather than a fixed size so a
 * code span in a 24px heading and one in a 13px card row are both
 * proportional to their line. This is `.cm-md-code`'s rule, copied
 * by value for the same reason as the link's.
 */
const CODE_CLASS =
  "font-mono text-[0.9em] text-intent-info-content"

/**
 * Position IS the identity here, which is why every `key` in this
 * file is an index.
 *
 * The usual objection to an index key does not reach this component.
 * The list is a **pure function of `value`** — nothing inserts,
 * removes or re-orders a run, and no run holds component state for a
 * key to preserve — so two renders of the same string produce the
 * same runs in the same order, and two renders of different strings
 * are a different line entirely. Content cannot stand in for it: a
 * title like `**Ship** it **Ship**` has two runs with identical text
 * and identical marks, and keying by either would collide.
 */
const toMarkedContent = (
  run: InlineMarkdownRun,
  key: number,
): ReactNode => {
  /**
   * AN UNMARKED RUN IS A TEXT NODE, NOT A WRAPPED ONE — and this is
   * an accessibility fix rather than a saving.
   *
   * Every run used to come back inside a keyed `<span>`. It looked
   * identical, and it silently broke every accessible name on the
   * page: the name computation **trims** each element child's
   * contribution before joining them, so
   * `<span>Deduplicate </span><code>~/archive</code><span> by</span>`
   * announces as `Deduplicate~/archiveby`. A text node keeps its
   * spaces, so the same line as text-node / `<code>` / text-node
   * announces correctly.
   *
   * Caught by `Board`'s move handle, which is named after the card's
   * title. On screen the two are indistinguishable — the spaces are
   * still painted either way — which is why `MarkdownLine.test.tsx`
   * asserts the NAME rather than the text.
   */
  if (
    !run.isCode &&
    !run.isEmphasis &&
    !run.isStrikethrough &&
    !run.isStrong
  ) {
    return run.text
  }

  // Innermost first: the element that carries the text, then the
  // marks wrapped around it. `<code>` is innermost because it is the
  // only one that changes the *face* rather than a variation of it.
  let content: ReactNode = run.isCode ? (
    <code className={CODE_CLASS}>{run.text}</code>
  ) : (
    run.text
  )

  if (run.isEmphasis) {
    content = <em>{content}</em>
  }

  if (run.isStrong) {
    content = <strong>{content}</strong>
  }

  if (run.isStrikethrough) {
    // `<s>`, not `<del>`. `<del>` means "removed from the document"
    // and carries an editorial history a title does not have; `<s>`
    // is "no longer accurate", which is what a struck-through task
    // name says.
    content = (
      <s className="text-content-secondary">{content}</s>
    )
  }

  // A `Fragment` rather than a `<span>`: it carries the key React
  // needs for an array child and adds no element to the DOM, so the
  // mark element sits directly inside the anchor and the name
  // computation sees no extra boundary to trim.
  return <Fragment key={key}>{content}</Fragment>
}

/**
 * One line of markdown, drawn with its inline marks and nothing
 * else.
 *
 * A **title** is what this is for. Docket's cards carry names like
 * ``Ingest 53 movies from `Downloads/MOVIES` into `G:\Movies` ``,
 * and a grid of them set in one flat weight is a wall the eye cannot
 * scan — the parts that differ between two cards are exactly the
 * parts markdown would have marked. So the marks earn their place
 * by making a list of names *scannable*, which is the same argument
 * as the priority bar and the project colour, one layer down.
 *
 * ### It is not a small `MarkdownView`
 *
 * `MarkdownView` renders a document, through CodeMirror, from the
 * optional `@charcuterie/ui/markdown-editor-codemirror` entry point.
 * Neither half of that suits a name: an editor state and a syntax
 * tree per card is an absurd price for forty characters, and the
 * main entry may not reach the CodeMirror stack at all. This parses
 * the inline grammar directly and returns spans.
 *
 * The two therefore have to agree, and `inlineMarkdown.ts` says how
 * that is kept true — most importantly that both call the **same**
 * URL guard, `safeUrls.ts`, which moved up out of the CodeMirror
 * subpath when this landed.
 *
 * ### The `href` prop is the load-bearing one
 *
 * A card title is usually itself a link. A title may also *contain*
 * one. Nested anchors are invalid HTML and the browser silently
 * closes the outer element, so `href` makes the component emit
 * **siblings** — the plain runs anchored to `href`, the markdown
 * links anchored to their own destination — which reads as one
 * continuous line and behaves as two different destinations.
 *
 * ```tsx
 * <MarkdownLine href={`/tasks/${task.id}`} value={task.title} />
 * ```
 *
 * Anywhere a *string* is required — an `aria-label`, a `title`
 * attribute, `document.title` — call `toPlainMarkdownText` rather
 * than re-stripping the markup with a regex of your own. It is the
 * same parse, so it cannot drift from what is on screen.
 */
export const MarkdownLine = ({
  className,
  href,
  isInsideLink = false,
  value,
}: MarkdownLineProps): ReactNode => {
  const RouterLink = useRouterLink()

  const runs = toInlineMarkdownRuns(value)

  /**
   * Consecutive runs that share a destination become **one** anchor.
   *
   * Not cosmetic: an anchor per run would make `**Ship** it` two tab
   * stops and two entries in a screen reader's link list for one
   * destination, and would break the hover underline into pieces at
   * every mark boundary.
   */
  const groups: {
    href?: string
    runs: InlineMarkdownRun[]
  }[] = []

  for (const run of runs) {
    const last = groups.at(-1)

    if (last && last.href === run.href) {
      last.runs.push(run)

      continue
    }

    groups.push({
      ...(run.href === undefined ? {} : { href: run.href }),
      runs: [run],
    })
  }

  return (
    <span className={className}>
      {groups.map((group, groupIndex) => {
        const content = group.runs.map(toMarkedContent)

        if (isInsideLink) {
          // No anchor, and no link paint either: a word painted as
          // a link that cannot be followed is worse than plain text.
          return (
            <Fragment
              // biome-ignore lint/suspicious/noArrayIndexKey: position is the identity — see `toMarkedContent`
              key={groupIndex}
            >
              {content}
            </Fragment>
          )
        }

        if (group.href !== undefined) {
          // A destination the injected router cannot serve opens in
          // a new tab rather than replacing the app: a title that
          // names a pull request is a reference, and following it
          // should not lose the board the reader was on.
          const isRouted = getIsRoutedHref(group.href)

          const LinkElement = isRouted ? RouterLink : "a"

          return (
            <LinkElement
              className={LINK_CLASS}
              href={group.href}
              // biome-ignore lint/suspicious/noArrayIndexKey: position is the identity — see `toMarkedContent`
              key={groupIndex}
              rel={
                isRouted ? undefined : "noopener noreferrer"
              }
              target={isRouted ? undefined : "_blank"}
            >
              {content}
            </LinkElement>
          )
        }

        if (href === undefined) {
          // biome-ignore lint/suspicious/noArrayIndexKey: position is the identity — see `toMarkedContent`
          return <span key={groupIndex}>{content}</span>
        }

        const isRouted = getIsRoutedHref(href)

        const LinkElement = isRouted ? RouterLink : "a"

        return (
          <LinkElement
            className={toClassName(
              "hover:underline",
              FOCUS_RING_CLASS,
            )}
            href={href}
            // biome-ignore lint/suspicious/noArrayIndexKey: position is the identity — see `toMarkedContent`
            key={groupIndex}
          >
            {content}
          </LinkElement>
        )
      })}
    </span>
  )
}
