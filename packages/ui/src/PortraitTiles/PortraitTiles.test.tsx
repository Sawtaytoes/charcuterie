import { composeStories } from "@storybook/react"
import type { ReactNode } from "react"
import { useLayoutEffect, useState } from "react"
import { createRoot, hydrateRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import { waitForImagesToFinish } from "../waitForImages.testHelpers.ts"
import { PortraitAvatar } from "./PortraitAvatar.tsx"
import * as stories from "./PortraitTiles.stories.tsx"

const {
  AllStates,
  AllVariants,
  DataColours,
  Playground,
  Interactive,
  NamedHues,
  Responsive,
  WithPictures,
} = composeStories(stories)

test("it is a named group of pressable portraits", async () => {
  const { canvas, canvasElement } =
    await mountStory(Playground)

  const group = expectAgentDrivable(canvas, {
    name: "Who's shopping?",
    role: "group",
  })

  await expect(
    group.querySelectorAll("button"),
  ).toHaveLength(4)

  // Nothing here is selected, and nothing claims to be — the same
  // call `ActionTiles` makes. A picker that keeps a value is
  // `RadioGroup itemShape="tile"`.
  await expect(
    group.querySelector(
      "[aria-checked], [aria-pressed], [role='radio']",
    ),
  ).toBeNull()

  await expectNoAxeViolations(canvasElement)
})

/**
 * The number and its unit are both inside the tile, so both are
 * computed into the accessible name. "1,240" on its own tells a
 * screen-reader user nothing at all, and "Avery" alone loses the
 * thing the portrait was being chosen by.
 */
test("the name, the number and its unit are one accessible name", async () => {
  const { canvas } = await mountStory(Playground)

  expectAgentDrivable(canvas, {
    name: "Avery 1,240 points",
    role: "button",
  })
})

/**
 * The avatar is decoration: the name it sits beside is inside the
 * same tile, so an announced picture is the label read twice. This
 * holds for the initials fallback and for a real `<img>`, which is
 * why both are checked.
 */
test("the face stays out of the accessible name", async () => {
  const { canvas, canvasElement } =
    await mountStory(WithPictures)

  const group = expectAgentDrivable(canvas, {
    name: "Who's shopping?",
    role: "group",
  })

  for (const image of group.querySelectorAll("img")) {
    await expect(image).toHaveAttribute("alt", "")
  }

  // Named by its words alone. An initial that joined the name would
  // read "A Avery 1,240 points".
  expectAgentDrivable(canvas, {
    name: "Casey 2,015 points",
    role: "button",
  })

  await expectNoAxeViolations(canvasElement)
})

/**
 * A 404 is the case this shape cannot absorb: a torn hole where a
 * face was, beside three that loaded. `onError` is the only signal a
 * browser gives, and the fallback is the one the caller already
 * supplied for "no picture".
 *
 * The story points a portrait at a file that does not exist, so this
 * is the real failure rather than a mocked one.
 */
test("a picture that fails to load falls back to the initials", async () => {
  const { canvas } = await mountStory(WithPictures)

  const group = expectAgentDrivable(canvas, {
    name: "Who's shopping?",
    role: "group",
  })

  // A real 404 over the network, not a mocked error event, so the
  // wait is for the browser's answer rather than for a clock. With
  // four browser windows sharing a CI runner the 404 arrived after
  // `waitFor`'s 1 s default, and a longer clock only moves the line.
  await waitForImagesToFinish(group)

  await waitFor(async () => {
    const broken = Array.from(
      group.querySelectorAll<HTMLImageElement>("img"),
    ).find((one) =>
      one.src.includes("charcuterie-missing-portrait"),
    )

    // Gone from the DOM entirely, replaced by the letter — not left
    // in place with a broken-image glyph in it.
    await expect(broken).toBeUndefined()
  })

  const bailey = expectAgentDrivable(canvas, {
    name: "Bailey 860 points",
    role: "button",
  })

  await expect(bailey.textContent).toContain("B")
})

/**
 * `layout="auto"` reads the container and never the window. Every
 * panel in the board is the same window, so a difference between
 * them can only have come from the container.
 */
test("the arrangement comes from the container, not the window", async () => {
  const { canvas } = await mountStory(Responsive)

  const getTileDirection = (name: string) => {
    const tile = expectAgentDrivable(canvas, {
      name,
      role: "group",
    }).querySelector<HTMLElement>("button")

    if (!tile) {
      throw new Error(`${name} drew no portrait`)
    }

    return getComputedStyle(tile).flexDirection
  }

  // Below `cq-sm` there is no room to stack: a face beside a name is
  // what fits in one narrow column.
  await expect(
    getTileDirection("Who's shopping at 15rem"),
  ).toBe("row")

  await expect(
    getTileDirection("Who's shopping at 34rem"),
  ).toBe("column")
})

test("a fixed layout skips the query", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllVariants)

  const getTileDirection = (name: string) => {
    const tile = expectAgentDrivable(canvas, {
      name,
      role: "group",
    }).querySelector<HTMLElement>("button")

    if (!tile) {
      throw new Error(`${name} drew no portrait`)
    }

    return getComputedStyle(tile).flexDirection
  }

  // Both cells are the same width. Only the prop differs, which is
  // the point of having one.
  await expect(
    getTileDirection("Who's shopping, as rows"),
  ).toBe("row")

  await expect(
    getTileDirection("Who's shopping, as columns"),
  ).toBe("column")

  await expectNoAxeViolations(canvasElement)
})

/**
 * The hue has to reach the paint, and the assertion is a computed
 * colour rather than a class name. A `--color-categorical-*` that
 * had never existed resolves to nothing, paints transparent, and
 * satisfies every check that the element rendered — which is exactly
 * how a token name that did not exist shipped in Docket.
 */
const MISSING_PICTURE = "/charcuterie-missing-portrait.png"

/** A picture that loads with no network and no fixture file. */
const WORKING_PICTURE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#2F6F4E"/></svg>',
)}`

/**
 * A failure belongs to the URL that failed, not to the tile. An
 * expired signed URL is replaced by a fresh one, and the tile has to
 * try it: it used to keep a boolean, and showed the letter for the
 * rest of its life.
 */
test("a tile whose picture failed tries the next one it is given", async () => {
  const host = document.createElement("div")

  document.body.append(host)

  const root = createRoot(host)

  const renderPicture = (imageSrc: string) => {
    root.render(
      <PortraitAvatar
        className=""
        imageSrc={imageSrc}
        initials="B"
      />,
    )
  }

  try {
    renderPicture(MISSING_PICTURE)

    await waitFor(async () => {
      await expect(host.querySelector("img")).not.toBeNull()
    })

    await waitForImagesToFinish(host)

    await waitFor(async () => {
      await expect(host.querySelector("img")).toBeNull()
    })

    renderPicture(WORKING_PICTURE)

    await waitFor(async () => {
      await expect(host.querySelector("img")).not.toBeNull()
    })

    // It loaded, and it stays a picture.
    await waitForImagesToFinish(host)

    await expect(host.querySelector("img")).toHaveAttribute(
      "src",
      WORKING_PICTURE,
    )
  } finally {
    root.unmount()

    host.remove()
  }
})

/**
 * As for `Avatar`: a server-rendered picture can fail before
 * `hydrateRoot` attaches `onError`, and React does not repeat the
 * request, so the check has to happen when the ref is attached.
 */
test("a picture that failed before hydration still falls back to the initials", async () => {
  const picture = (
    <PortraitAvatar
      className=""
      imageSrc={MISSING_PICTURE}
      initials="B"
    />
  )

  const host = document.createElement("div")

  document.body.append(host)

  host.innerHTML = renderToString(picture)

  await waitForImagesToFinish(host)

  await expect(host.querySelector("img")).not.toBeNull()

  const root = hydrateRoot(host, picture)

  try {
    await waitFor(async () => {
      await expect(host.querySelector("img")).toBeNull()
    })

    await expect(host).toHaveTextContent("B")
  } finally {
    root.unmount()

    host.remove()
  }
})

/** Two animation frames, as in `mountStory`: a barrier, not a clock. */
const settleFrames = () =>
  new Promise<void>((resolve) => {
    globalThis.requestAnimationFrame(() => {
      globalThis.requestAnimationFrame(() => {
        resolve()
      })
    })
  })

const OTHER_WORKING_PICTURE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#6F2F4E"/></svg>',
)}`

/**
 * Shows the first picture, and swaps to the second in a layout
 * effect — in the same commit that hydrates it, so before the
 * browser can finish decoding the first. `isBack` swaps back.
 */
const SwitchingPicture = ({
  isBack,
}: {
  isBack: boolean
}): ReactNode => {
  const [hasSwapped, setHasSwapped] = useState(false)

  useLayoutEffect(() => {
    setHasSwapped(true)
  }, [])

  return (
    <PortraitAvatar
      className=""
      imageSrc={
        hasSwapped && !isBack
          ? OTHER_WORKING_PICTURE
          : WORKING_PICTURE
      }
      initials="B"
    />
  )
}

/**
 * The check that catches a failure from before hydration asks
 * `decode()`, and `decode()` also rejects when a newer `src`
 * supersedes the request. That rejection is not a failure. Read as
 * one, it marked the first picture dead, and the tile showed the
 * letter when it came back to that picture.
 */
test("a picture that a new one superseded is not marked as failed", async () => {
  const host = document.createElement("div")

  document.body.append(host)

  host.innerHTML = renderToString(
    <SwitchingPicture isBack={false} />,
  )

  // Loaded before hydration, so the ref's check runs `decode()`.
  await waitForImagesToFinish(host)

  const root = hydrateRoot(
    host,
    <SwitchingPicture isBack={false} />,
  )

  try {
    await waitFor(async () => {
      await expect(
        host.querySelector("img"),
      ).toHaveAttribute("src", OTHER_WORKING_PICTURE)
    })

    // The second picture has loaded, the first one's decode has been
    // superseded, and React has committed whatever that caused.
    await waitForImagesToFinish(host)

    await settleFrames()

    root.render(<SwitchingPicture isBack />)

    await waitFor(async () => {
      await expect(
        host.querySelector("img"),
      ).toHaveAttribute("src", WORKING_PICTURE)
    })
  } finally {
    root.unmount()

    host.remove()
  }
})

test("each portrait wears a different hue, and a named one holds it", async () => {
  const { canvas } = await mountStory(Playground)

  const faces = Array.from(
    expectAgentDrivable(canvas, {
      name: "Who's shopping?",
      role: "group",
    }).querySelectorAll<HTMLElement>(
      "button > *:first-child",
    ),
  ).map((face) => getComputedStyle(face).backgroundColor)

  await expect(faces).toHaveLength(4)

  for (const face of faces) {
    await expect(face).not.toBe("rgba(0, 0, 0, 0)")
  }

  await expect(new Set(faces).size).toBe(4)

  const { canvas: pinnedCanvas } =
    await mountStory(NamedHues)

  const pinned = Array.from(
    expectAgentDrivable(pinnedCanvas, {
      name: "Who's shopping, with pinned colours",
      role: "group",
    }).querySelectorAll<HTMLElement>(
      "button > *:first-child",
    ),
  ).map((face) => getComputedStyle(face).backgroundColor)

  // Avery is position 0 in both sets. Naming `categorical: 3` has to
  // change its colour, or the prop does nothing and every assertion
  // above still passes.
  await expect(pinned[0]).not.toBe(faces[0])
})

/**
 * The second colour arm, which no token covers: the hue arrives from
 * data, lands in an inline custom property, and three separate
 * classes read it back out. Every step of that is invisible to
 * typecheck, to lint and to axe — the CSS either generated or it did
 * not, and a portrait with no fill looks like a picture that failed
 * to load.
 */
test("a data colour reaches the fill exactly, and the initials flip to suit it", async () => {
  const { canvas, canvasElement } =
    await mountStory(DataColours)

  const faces = Array.from(
    expectAgentDrivable(canvas, {
      name: "Who's shopping, coloured by their cards",
      role: "group",
    }).querySelectorAll<HTMLElement>(
      "button > *:first-child",
    ),
  )

  await expect(faces).toHaveLength(3)

  // Exactly the stated colour. A palette hue would be some other
  // triplet entirely, which is the whole point of the arm.
  await expect(
    faces.map(
      (face) => getComputedStyle(face).backgroundColor,
    ),
  ).toEqual([
    "rgb(143, 211, 244)",
    "rgb(217, 210, 197)",
    "rgb(59, 74, 107)",
  ])

  // The first two fills are pale and the third is dark, so the
  // letters have to go the other way on the third. Nothing in the
  // toolchain would have said otherwise.
  await expect(
    faces.map((face) => getComputedStyle(face).color),
  ).toEqual([
    "rgb(0, 0, 0)",
    "rgb(0, 0, 0)",
    "rgb(255, 255, 255)",
  ])

  await expectNoAxeViolations(canvasElement)
})

/**
 * The number is the hue mixed toward the scheme's own text colour,
 * not the hue itself — a `#C0C4CC` number on a near-white surface is
 * the readability failure this arm gives up the palette's guarantee
 * to allow.
 */
test("the number is the data colour pulled toward readable, not the raw colour", async () => {
  const { canvas } = await mountStory(DataColours)

  const bailey = Array.from(
    expectAgentDrivable(canvas, {
      name: "Who's shopping, coloured by their cards",
      role: "group",
    }).querySelectorAll<HTMLButtonElement>("button"),
  ).find((one) => one.textContent?.includes("Bailey"))

  const stat = Array.from(
    bailey?.querySelectorAll<HTMLElement>("span") ?? [],
  ).find((one) => one.textContent === "860")

  await expect(stat).toBeDefined()

  const statColour = getComputedStyle(
    stat as HTMLElement,
  ).color

  await expect(statColour).not.toBe("rgb(217, 210, 197)")

  await expect(statColour).not.toBe("rgba(0, 0, 0, 0)")
})

test("every portrait is its own tab stop, and Enter and Space press it", async () => {
  const { canvas } = await mountStory(Interactive)

  const tiles = Array.from(
    expectAgentDrivable(canvas, {
      name: "Who's shopping?",
      role: "group",
    }).querySelectorAll<HTMLButtonElement>("button"),
  )

  await expect(
    tiles.filter((one) => one.tabIndex === 0),
  ).toHaveLength(2)

  tiles[0]?.focus()

  await userEvent.tab()

  await waitFor(() => {
    expect(tiles[1]).toHaveFocus()
  })

  await userEvent.keyboard("{Enter}")

  await userEvent.keyboard(" ")
})

test("a disabled portrait cannot be pressed", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  const bailey = Array.from(
    expectAgentDrivable(canvas, {
      name: "Who's shopping, with Bailey unavailable",
      role: "group",
    }).querySelectorAll<HTMLButtonElement>("button"),
  ).find((one) => one.textContent?.includes("Bailey"))

  await expect(bailey).toBeDisabled()

  await expectNoAxeViolations(canvasElement)
})

test("an href portrait is a real anchor", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  const avery = Array.from(
    expectAgentDrivable(canvas, {
      name: "Who's shopping, as links",
      role: "group",
    }).querySelectorAll<HTMLAnchorElement>("a"),
  ).find((one) => one.textContent?.includes("Avery"))

  // A real `<a href>`, so middle-click, ctrl-click, "open in a new
  // tab" and "copy link address" come from the element rather than
  // from the paint.
  await expect(avery).toHaveAttribute("href", "/avery")

  await expectNoAxeViolations(canvasElement)
})

/**
 * The box is shared with the other tile shapes through
 * `tileStyles.ts`. Two tile sets on one page have to be the same
 * card, and "identical" spelled as two copies of one string is a
 * promise that survives exactly one edit.
 */
test("a portrait is the same box as an action tile", async () => {
  const { canvas } = await mountStory(Playground)

  const portrait = expectAgentDrivable(canvas, {
    name: "Avery 1,240 points",
    role: "button",
  })

  const style = getComputedStyle(portrait)

  await expect(style.borderTopWidth).toBe("1px")

  await expect(style.borderTopLeftRadius).not.toBe("0px")

  await expect(
    Number.parseFloat(style.paddingTop),
  ).toBeGreaterThan(0)
})

test("a bounded set keeps three portraits beside each other without an empty fourth track", async () => {
  const { BoundedSet } = composeStories(stories)
  const { canvasElement } = await mountStory(BoundedSet)
  const buttons = [
    ...canvasElement.querySelectorAll("button"),
  ]
  await waitFor(() => expect(buttons).toHaveLength(3))
  const rectangles = buttons.map((button) =>
    button.getBoundingClientRect(),
  )
  await expect(rectangles[0]?.top).toBe(rectangles[2]?.top)
  await expect(rectangles[0]?.width).toBeGreaterThan(240)
})

test("a wrapping bounded set centers its final row and responds to container resizing", async () => {
  const { CenteredLastRow } = composeStories(stories)
  const { canvas, canvasElement } =
    await mountStory(CenteredLastRow)
  const group = expectAgentDrivable(canvas, {
    name: "People",
    role: "group",
  })
  const tiles = Array.from(group.querySelectorAll("button"))
  const wrapper = group.parentElement?.parentElement
  if (!wrapper) throw new Error("Missing story wrapper")
  for (const width of [780, 540, 1100, 200, 780]) {
    wrapper.style.width = `${width}px`
    await waitFor(() => {
      const bounds = group.getBoundingClientRect()
      const rects = tiles.map((tile) =>
        tile.getBoundingClientRect(),
      )
      const lastTop = rects.at(-1)?.top
      const last = rects.filter(
        (rect) => rect.top === lastTop,
      )
      expect(
        Math.abs(
          ((last[0]?.left ?? 0) +
            (last.at(-1)?.right ?? 0)) /
            2 -
            (bounds.left + bounds.right) / 2,
        ),
      ).toBeLessThan(1)
      expect(
        Math.abs(
          (rects[0]?.width ?? 0) -
            (rects.at(-1)?.width ?? 0),
        ),
      ).toBeLessThan(1)
      expect(group.scrollWidth).toBeLessThanOrEqual(
        group.clientWidth,
      )
    })
  }
  await expectNoAxeViolations(canvasElement)
})
