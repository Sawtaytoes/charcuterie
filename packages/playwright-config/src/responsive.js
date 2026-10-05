/**
 * The check every route owes every window: nothing overflows it
 * sideways.
 *
 * Horizontal scroll is the commonest Narrow View defect and the one
 * a person notices first — a page that slides left under a thumb. It
 * is also invisible to every assertion that looks for an element,
 * because the element is there; it is just 40px past the edge. So
 * this asks the document, not a component: is anything wider than
 * the window?
 *
 * On failure it names the widest offenders, because "the page is
 * 431px wide" sends a person hunting and "`.tag-row` ends at 431px"
 * does not.
 *
 * @param {import("@playwright/test").Page} page
 */
export const expectNoHorizontalOverflow = async (page) => {
  const { innerWidth, offenders, scrollWidth } =
    await page.evaluate(() => {
      const windowWidth =
        document.documentElement.clientWidth

      const describe = (element) =>
        [
          element.tagName.toLowerCase(),
          element.id ? `#${element.id}` : "",
          typeof element.className === "string" &&
          element.className
            ? `.${element.className.trim().split(/\s+/).slice(0, 2).join(".")}`
            : "",
        ].join("")

      return {
        innerWidth: windowWidth,
        offenders: [...document.body.querySelectorAll("*")]
          .map((element) => ({
            label: describe(element),
            right: Math.round(
              element.getBoundingClientRect().right,
            ),
          }))
          .filter(({ right }) => right > windowWidth + 1)
          .sort(
            (first, second) => second.right - first.right,
          )
          .slice(0, 5),
        scrollWidth: document.documentElement.scrollWidth,
      }
    })

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
}
