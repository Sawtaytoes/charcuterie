/**
 * The check every route owes every window: nothing overflows it
 * sideways — not the page, and not a box that hides what sticks out.
 *
 * Horizontal scroll is the commonest Narrow View defect and the one
 * a person notices first — a page that slides left under a thumb. It
 * is also invisible to every assertion that looks for an element,
 * because the element is there; it is just 40px past the edge.
 *
 * ⚠️ **Asking the document alone is not enough in a Charcuterie app.**
 * `Shell` sets `overflow-x: clip` and `Main`'s scrolling region sets
 * `overflow-x: hidden`, so the document is structurally never wider
 * than the window: what overflows is cut off instead, out of sight.
 * The defect is still there — a button nobody can reach, half a
 * badge — and the document measures nothing. tally-marks#101 found
 * both of its narrow-window defects in screenshots after this check
 * had passed them. So it also asks every box whose `overflow-x` is
 * `hidden` or `clip`: is its content wider than it is?
 *
 * Not flagged, because the clipping is the design:
 * - a deliberate side-scroller, which is `overflow-x: auto`/`scroll`
 *   (Charcuterie puts a wide table in one);
 * - a single-line truncation, `text-overflow: ellipsis` — unless it
 *   has been squeezed narrower than one character, which shows
 *   nothing at all. portly-controllers#27: every seated pad's name
 *   was 0px wide at 384px, a tile of swatches nobody could tell
 *   apart, and the ellipsis exemption passed it;
 * - a visually hidden (`sr-only`) element, 1px by 1px on purpose;
 * - anything inside an `ignore` selector, for the rare component
 *   that clips on purpose (a ticker). Name it, so the exception is
 *   visible in the test.
 *
 * On failure it names the offenders, because "the page is 431px wide"
 * sends a person hunting and "`.tag-row` ends at 431px" does not.
 *
 * @param {import("@playwright/test").Page} page
 * @param {{ ignore?: string[] }} [options]
 */
export const expectNoHorizontalOverflow = async (
  page,
  { ignore = [] } = {},
) => {
  const {
    clipped,
    collapsed,
    innerWidth,
    offenders,
    scrollWidth,
  } = await page.evaluate((ignoreSelectors) => {
    const windowWidth = document.documentElement.clientWidth

    const describe = (element) =>
      [
        element.tagName.toLowerCase(),
        element.id ? `#${element.id}` : "",
        typeof element.className === "string" &&
        element.className
          ? `.${element.className.trim().split(/\s+/).slice(0, 2).join(".")}`
          : "",
      ].join("")

    const isIgnored = (element) =>
      ignoreSelectors.some((selector) =>
        element.closest(selector),
      )

    const elements = [
      ...document.body.querySelectorAll("*"),
    ].filter((element) => !isIgnored(element))

    return {
      // A truncation that shows no text: the ellipsis exemption is
      // for a label that runs out of room, not one that has none.
      // Narrower than its own font size is less than one character
      // and its ellipsis. `sr-only` is 1px in BOTH directions; a
      // collapsed label still has its line height.
      collapsed: elements
        .filter((element) => {
          const style = getComputedStyle(element)
          const { height } = element.getBoundingClientRect()

          return (
            style.textOverflow === "ellipsis" &&
            (style.overflowX === "hidden" ||
              style.overflowX === "clip") &&
            height > 1 &&
            element.checkVisibility() &&
            (element.textContent ?? "").trim() !== "" &&
            element.scrollWidth > element.clientWidth &&
            element.clientWidth < parseFloat(style.fontSize)
          )
        })
        .map((element) => ({
          clientWidth: element.clientWidth,
          label: describe(element),
          scrollWidth: element.scrollWidth,
        }))
        .slice(0, 5),
      clipped: [document.body, ...elements]
        .filter((element) => {
          const style = getComputedStyle(element)

          return (
            (style.overflowX === "hidden" ||
              style.overflowX === "clip") &&
            style.textOverflow !== "ellipsis" &&
            element.clientWidth > 1 &&
            element.scrollWidth > element.clientWidth + 1
          )
        })
        .map((element) => ({
          clientWidth: element.clientWidth,
          label: describe(element),
          scrollWidth: element.scrollWidth,
        }))
        // The innermost box first: an outer clip region only
        // inherits the overflow of the one inside it.
        .reverse()
        .slice(0, 5),
      innerWidth: windowWidth,
      offenders: elements
        .map((element) => ({
          label: describe(element),
          right: Math.round(
            element.getBoundingClientRect().right,
          ),
        }))
        .filter(({ right }) => right > windowWidth + 1)
        .sort((first, second) => second.right - first.right)
        .slice(0, 5),
      scrollWidth: document.documentElement.scrollWidth,
    }
  }, ignore)

  if (scrollWidth > innerWidth) {
    throw new Error(
      `The page is ${scrollWidth}px wide in a ${innerWidth}px window. ` +
        `Widest elements: ${offenders
          .map(
            ({ label, right }) =>
              `${label} ends at ${right}px`,
          )
          .join("; ")}`,
    )
  }

  if (collapsed.length > 0) {
    throw new Error(
      `A truncated label shows nothing in a ${innerWidth}px window: ${collapsed
        .map(
          ({
            clientWidth,
            label,
            scrollWidth: textWidth,
          }) =>
            `${label} is ${clientWidth}px wide for ${textWidth}px of text`,
        )
        .join("; ")}`,
    )
  }

  if (clipped.length > 0) {
    throw new Error(
      `Content is cut off sideways in a ${innerWidth}px window: ${clipped
        .map(
          ({
            clientWidth,
            label,
            scrollWidth: contentWidth,
          }) =>
            `${label} holds ${contentWidth}px in ${clientWidth}px`,
        )
        .join("; ")}`,
    )
  }
}

/**
 * No visible heading breaks a word in the middle.
 *
 * `Main`'s content column sets `wrap-anywhere`, so an unbroken string
 * — a path, a URL — wraps instead of pushing the layout wider. That
 * is the right safety net, and it hides a squeezed layout: a heading
 * beside a filter or a badge that has run out of room breaks as
 * "Rewa / rds" and overflows nothing (tally-marks#101). A word in a
 * heading is a name a person reads at a glance, so a break inside one
 * means the layout around it is wrong.
 *
 * Each word is measured as a Range; more than one line box means it
 * was broken. Visually hidden headings are skipped. Pass `selector`
 * to measure other text the same way.
 *
 * @param {import("@playwright/test").Page} page
 * @param {{ selector?: string }} [options]
 */
export const expectNoSplitWords = async (
  page,
  { selector = "h1, h2, h3, h4, h5, h6" } = {},
) => {
  const { innerWidth, splitWords } = await page.evaluate(
    (textSelector) => {
      const found = []

      for (const element of document.querySelectorAll(
        textSelector,
      )) {
        if (
          !element.checkVisibility() ||
          element.getBoundingClientRect().width <= 1
        ) {
          continue
        }

        const walker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_TEXT,
        )

        for (
          let node = walker.nextNode();
          node;
          node = walker.nextNode()
        ) {
          for (const match of (
            node.textContent ?? ""
          ).matchAll(/[\p{L}\p{N}']+/gu)) {
            const range = document.createRange()

            range.setStart(node, match.index)
            range.setEnd(
              node,
              match.index + match[0].length,
            )

            const lineTops = new Set(
              [...range.getClientRects()].map((rect) =>
                Math.round(rect.top),
              ),
            )

            if (lineTops.size > 1) {
              found.push(
                `"${match[0]}" in "${element.textContent?.trim()}"`,
              )
            }
          }
        }
      }

      return {
        innerWidth: document.documentElement.clientWidth,
        splitWords: found,
      }
    },
    selector,
  )

  if (splitWords.length > 0) {
    throw new Error(
      `A word breaks across two lines in a ${innerWidth}px window, so the layout around it is squeezed: ${splitWords.join("; ")}`,
    )
  }
}
