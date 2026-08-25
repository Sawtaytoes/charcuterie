/**
 * FLIP, in the same chromium the conformance suite runs in.
 *
 * There is no core to test in Node here: every guarantee this
 * hook makes is about layout — `getBoundingClientRect` before a
 * commit, `element.animate` after it — and none of that exists
 * outside a real browser. jsdom would report every box as
 * `0 × 0` and each of these tests would pass while proving
 * nothing.
 *
 * `createElement` rather than JSX, because this project has no
 * JSX plugin in its browser config — same reason as
 * `useClonedChild.browser.test.ts`.
 */

import { act, createElement, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, expect, test } from "vitest"

import { useFlipList } from "./useFlipList.ts"

;(
  globalThis as unknown as Record<string, boolean>
).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLElement | null = null

afterEach(() => {
  container?.remove()
  container = null
})

/**
 * A list whose items are tall enough that a re-order moves them
 * a distance no rounding can hide.
 */
const List = ({
  duration,
  ids,
  isAnimating = true,
}: {
  /** Written onto the container as `--duration-normal`, which is
   * how the theme delivers it in a real app. */
  duration?: string
  ids: readonly string[]
  isAnimating?: boolean
}): ReactNode => {
  const listRef = useFlipList<HTMLUListElement>({
    isAnimating,
    signature: ids.join(","),
  })

  return createElement(
    "ul",
    {
      ref: listRef,
      style: {
        margin: 0,
        padding: 0,
        ...(duration == null
          ? {}
          : { "--duration-normal": duration }),
      },
    },
    ids.map((id) =>
      createElement(
        "li",
        {
          "data-flip-key": id,
          "data-testid": id,
          key: id,
          style: { height: "80px", listStyle: "none" },
        },
        id,
      ),
    ),
  )
}

const mount = (
  ids: readonly string[],
  duration?: string,
) => {
  container = document.createElement("div")
  document.body.append(container)

  const root = createRoot(container)

  act(() => {
    root.render(createElement(List, { duration, ids }))
  })

  return {
    /** Every animation currently attached to the keyed items. */
    animationsOf: () =>
      [
        ...(container?.querySelectorAll<HTMLElement>(
          "[data-flip-key]",
        ) ?? []),
      ].flatMap((item) => item.getAnimations()),

    render: (
      nextIds: readonly string[],
      isAnimating = true,
    ) => {
      act(() => {
        root.render(
          createElement(List, {
            duration,
            ids: nextIds,
            isAnimating,
          }),
        )
      })
    },
  }
}

test("animates an item from where it WAS to where it landed", () => {
  const list = mount(["a", "b", "c"])

  expect(list.animationsOf()).toHaveLength(0)

  list.render(["c", "a", "b"])

  const animations = list.animationsOf()

  expect(animations.length).toBeGreaterThan(0)

  // The whole point of Invert: the item is already in its final
  // position, and the first keyframe is the offset back to the
  // old one. A `translate(0px, 0px)` opening frame would mean
  // the boxes were measured after the commit, which is the bug
  // this hook is written to avoid.
  const effect = animations[0]?.effect

  expect(effect).toBeInstanceOf(KeyframeEffect)

  const [first] = (effect as KeyframeEffect).getKeyframes()

  expect(String(first?.transform)).toMatch(
    /translate\(-?\d/,
  )
  expect(String(first?.transform)).not.toBe(
    "translate(0px, 0px)",
  )
})

test("animates nothing when the order did not change", () => {
  const list = mount(["a", "b", "c"])

  list.render(["a", "b", "c"])

  expect(list.animationsOf()).toHaveLength(0)
})

test("respects isAnimating, so switching lists is not a shuffle", () => {
  const list = mount(["a", "b", "c"])

  list.render(["c", "b", "a"], false)

  expect(list.animationsOf()).toHaveLength(0)
})

test("fades a new item in rather than sliding it from nowhere", () => {
  const list = mount(["a", "b"])

  list.render(["a", "b", "new"])

  const added = container?.querySelector<HTMLElement>(
    "[data-flip-key='new']",
  )
  const addedEffect = added?.getAnimations()[0]?.effect

  expect(addedEffect).toBeInstanceOf(KeyframeEffect)

  const [keyframe] = (
    addedEffect as KeyframeEffect
  ).getKeyframes()

  // It has no previous box, so inverting one would mean inventing
  // a position. Opacity is the honest answer.
  //
  // Compared as a string: the Web Animations API normalises every
  // keyframe value to its serialised CSS form, so this reads back
  // as `"0"` however it was written.
  expect(String(keyframe?.opacity)).toBe("0")
})

test("a zeroed duration token suppresses the motion entirely", () => {
  // What `prefers-reduced-motion` actually does: `@charcuterie/tokens`
  // collapses every duration to `0ms` inside that media query. The
  // hook reads the token, so honouring the query IS honouring this.
  //
  // Regression-pinned, because the first version of this read the
  // token with `parseFloat(...) || FALLBACK`. `parseFloat("0ms")` is
  // `0`, `0` is falsy, and the fallback is 200ms — so the reduced
  // path animated harder than the ordinary one. `Number.isFinite`
  // tells "the user asked for none" apart from "there is no theme".
  const list = mount(["a", "b", "c"], "0ms")

  list.render(["c", "a", "b"])

  expect(list.animationsOf()).toHaveLength(0)
})

test("falls back to a real duration when no theme is on the page", () => {
  // The other half of the same branch: a MISSING token parses to
  // `NaN`, which must NOT be read as "no motion wanted".
  const list = mount(["a", "b", "c"])

  list.render(["c", "a", "b"])

  expect(list.animationsOf().length).toBeGreaterThan(0)
})
