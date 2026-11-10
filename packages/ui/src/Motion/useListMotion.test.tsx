import type { ReactNode } from "react"
import { useState } from "react"
import type { Root } from "react-dom/client"
import { createRoot } from "react-dom/client"
import { expect, userEvent, waitFor } from "storybook/test"
import { afterEach, beforeEach, test } from "vitest"

import { useListMotion } from "./useListMotion.ts"

/**
 * As in `usePresence.test.tsx`: these tests are about the motion, so
 * they lift the suite's motion freeze for their own duration.
 */
const FREEZE_ID = "charcuterie-freeze-motion"

let frozenStyle: HTMLElement | null = null

beforeEach(() => {
  frozenStyle = document.getElementById(FREEZE_ID)
})

const mounted: { host: HTMLElement; root: Root }[] = []

afterEach(() => {
  for (const { host, root } of mounted.splice(0)) {
    root.unmount()

    host.remove()
  }

  if (frozenStyle !== null && !frozenStyle.isConnected) {
    document.head.append(frozenStyle)
  }
})

/**
 * Long enough that a loaded test host cannot finish an exit or a
 * slide between two lines of a test. The tokens are inherited, so
 * setting them on the host slows every motion inside it.
 */
const SLOW_MOTION = "600ms"

const MOTION_TIMEOUT = { timeout: 5_000 }

const unfreeze = () => {
  frozenStyle?.remove()
}

const List = ({
  initial,
}: {
  initial: string[]
}): ReactNode => {
  const [names, setNames] = useState(initial)

  const [isTall, setIsTall] = useState(false)

  const { entries } = useListMotion({
    getKey: (name: string) => name,
    // A fresh array every render, as a caller that derives its list
    // during render passes. The hook must compare keys, not identity,
    // or its render-phase update loops forever.
    items: names.map((name) => name),
  })

  return (
    <div>
      <button
        onClick={() => {
          setNames((previous) => [...previous, "Delta"])
        }}
        type="button"
      >
        Add
      </button>

      <button
        onClick={() => {
          setNames((previous) =>
            previous.filter((name) => name !== "Alpha"),
          )
        }}
        type="button"
      >
        Remove Alpha
      </button>

      <button
        onClick={() => {
          setNames((previous) => [...previous].reverse())
        }}
        type="button"
      >
        Reverse
      </button>

      <button
        onClick={() => {
          setIsTall(true)
        }}
        type="button"
      >
        Grow Alpha
      </button>

      <button
        onClick={() => {
          setNames((previous) => ["Newest", ...previous])
        }}
        type="button"
      >
        Add to front
      </button>

      <button
        onClick={() => {
          // A newest-first list capped at its length: one in at the
          // top, the oldest out at the bottom.
          setNames((previous) => [
            "Newest",
            ...previous.slice(0, -1),
          ])
        }}
        type="button"
      >
        Add capped
      </button>

      <button
        onClick={() => {
          setNames((previous) =>
            previous
              .filter((name) => name !== "Beta")
              .reverse(),
          )
        }}
        type="button"
      >
        Remove Beta and reverse
      </button>

      {["Beta", "Gamma"].map((name) => (
        <button
          key={name}
          onClick={() => {
            setNames((previous) =>
              previous.filter((one) => one !== name),
            )
          }}
          type="button"
        >
          {`Remove ${name}`}
        </button>
      ))}

      <ul className="m-0 list-none p-0">
        {entries.map(({ item, key, motionProps }) => (
          <li
            key={key}
            {...motionProps}
            style={{
              blockSize:
                isTall && item === "Alpha"
                  ? "100px"
                  : "40px",
            }}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

const mount = (node: ReactNode) => {
  const host = document.createElement("div")

  for (const token of [
    "--duration-fast",
    "--duration-normal",
    "--duration-slow",
  ]) {
    host.style.setProperty(token, SLOW_MOTION)
  }

  document.body.append(host)

  const root = createRoot(host)

  root.render(node)

  mounted.push({ host, root })

  return host
}

const getButton = (host: HTMLElement, name: string) =>
  [...host.querySelectorAll("button")].find(
    (button) => button.textContent === name,
  ) as HTMLButtonElement

const getItem = (host: HTMLElement, key: string) =>
  host.querySelector<HTMLElement>(
    `[data-motion-key="${key}"]`,
  )

test("items on the first render do not animate; an added item enters", async () => {
  unfreeze()

  const host = mount(
    <List initial={["Alpha", "Beta", "Gamma"]} />,
  )

  await waitFor(() => {
    expect(getItem(host, "Alpha")).not.toBeNull()
  })

  expect(getItem(host, "Alpha")?.className).toBe("")

  await userEvent.click(getButton(host, "Add"))

  await waitFor(() => {
    expect(getItem(host, "Delta")).toHaveClass(
      "charcuterie-item-enter",
    )
  })
})

test("a removed item stays, inert, at its index until its exit ends", async () => {
  unfreeze()

  const host = mount(
    <List initial={["Alpha", "Beta", "Gamma"]} />,
  )

  await waitFor(() => {
    expect(getItem(host, "Alpha")).not.toBeNull()
  })

  const alpha = getItem(host, "Alpha") as HTMLElement

  await userEvent.click(getButton(host, "Remove Alpha"))

  expect(alpha).toHaveClass("charcuterie-item-exit")
  expect(alpha).toHaveAttribute("inert")
  expect(alpha).toHaveAttribute("aria-hidden", "true")
  expect(host.querySelector("li")).toBe(alpha)

  await waitFor(() => {
    expect(alpha.isConnected).toBe(false)
  }, MOTION_TIMEOUT)
})

test("with motion frozen, a removed item is gone in the same commit", async () => {
  const host = mount(
    <List initial={["Alpha", "Beta", "Gamma"]} />,
  )

  await waitFor(() => {
    expect(getItem(host, "Alpha")).not.toBeNull()
  })

  await userEvent.click(getButton(host, "Remove Alpha"))

  expect(getItem(host, "Alpha")).toBeNull()
})

test("a reorder slides each moved item from where it was", async () => {
  unfreeze()

  const host = mount(
    <List initial={["Alpha", "Beta", "Gamma"]} />,
  )

  await waitFor(() => {
    expect(getItem(host, "Alpha")).not.toBeNull()
  })

  await userEvent.click(getButton(host, "Reverse"))

  const alpha = getItem(host, "Alpha") as HTMLElement

  // The slide is a transition back to no offset, so mid-flight the
  // element sits away from its laid-out place.
  expect(alpha.style.transition).toContain("translate")

  await waitFor(() => {
    expect(alpha.style.transition).toBe("")
  }, MOTION_TIMEOUT)
})

test("an added item loses its enter class when it has entered, so showing the list again does not replay it", async () => {
  unfreeze()

  const host = mount(
    <List initial={["Alpha", "Beta", "Gamma"]} />,
  )

  await waitFor(() => {
    expect(getItem(host, "Alpha")).not.toBeNull()
  })

  await userEvent.click(getButton(host, "Add"))

  const delta = await waitFor(() => {
    const found = getItem(host, "Delta")

    expect(found).toHaveClass("charcuterie-item-enter")

    return found as HTMLElement
  })

  await waitFor(() => {
    expect(delta).not.toHaveClass("charcuterie-item-enter")
  }, MOTION_TIMEOUT)

  // Hidden and shown again, with a style flush at each step, which is
  // what restarts a CSS animation still named on the element.
  host.hidden = true

  delta.getBoundingClientRect()

  host.hidden = false

  delta.getBoundingClientRect()

  expect(delta.getAnimations()).toHaveLength(0)
})

test("a row that changed size without a change of keys does not send the rows after it sliding on the next add", async () => {
  unfreeze()

  const host = mount(
    <List initial={["Alpha", "Beta", "Gamma"]} />,
  )

  await waitFor(() => {
    expect(getItem(host, "Alpha")).not.toBeNull()
  })

  await userEvent.click(getButton(host, "Grow Alpha"))

  await userEvent.click(getButton(host, "Add"))

  await waitFor(() => {
    expect(getItem(host, "Delta")).not.toBeNull()
  })

  // Delta was appended after them, so neither moved.
  expect(getItem(host, "Beta")?.style.translate).toBe("")
  expect(getItem(host, "Beta")?.style.transition).toBe("")
  expect(getItem(host, "Gamma")?.style.transition).toBe("")
})

test("with motion frozen, a reorder leaves no inline transition behind", async () => {
  const host = mount(
    <List initial={["Alpha", "Beta", "Gamma"]} />,
  )

  await waitFor(() => {
    expect(getItem(host, "Alpha")).not.toBeNull()
  })

  await userEvent.click(getButton(host, "Reverse"))

  expect(getItem(host, "Alpha")?.style.transition).toBe("")
  expect(getItem(host, "Alpha")?.style.translate).toBe("")
})

const shownOrder = (host: HTMLElement) =>
  [
    ...host.querySelectorAll<HTMLElement>(
      "[data-motion-key]",
    ),
  ].map((element) => element.dataset.motionKey)

test("a capped newest-first list keeps its leaving last item at the bottom", async () => {
  unfreeze()

  const host = mount(
    <List initial={["Alpha", "Beta", "Gamma"]} />,
  )

  await waitFor(() => {
    expect(getItem(host, "Alpha")).not.toBeNull()
  })

  await userEvent.click(getButton(host, "Add capped"))

  expect(shownOrder(host)).toEqual([
    "Newest",
    "Alpha",
    "Beta",
    "Gamma",
  ])
  expect(getItem(host, "Gamma")).toHaveClass(
    "charcuterie-item-exit",
  )
})

test("an item added in front while another leaves does not move the leaving one", async () => {
  unfreeze()

  const host = mount(
    <List initial={["Alpha", "Beta", "Gamma"]} />,
  )

  await waitFor(() => {
    expect(getItem(host, "Alpha")).not.toBeNull()
  })

  await userEvent.click(getButton(host, "Remove Beta"))

  await userEvent.click(getButton(host, "Add to front"))

  expect(shownOrder(host)).toEqual([
    "Newest",
    "Alpha",
    "Beta",
    "Gamma",
  ])
})

test("two items removed one after the other keep their order while they leave", async () => {
  unfreeze()

  const host = mount(
    <List initial={["Alpha", "Beta", "Gamma", "Delta"]} />,
  )

  await waitFor(() => {
    expect(getItem(host, "Alpha")).not.toBeNull()
  })

  await userEvent.click(getButton(host, "Remove Beta"))

  await userEvent.click(getButton(host, "Remove Gamma"))

  expect(shownOrder(host)).toEqual([
    "Alpha",
    "Beta",
    "Gamma",
    "Delta",
  ])

  await waitFor(() => {
    expect(shownOrder(host)).toEqual(["Alpha", "Delta"])
  }, MOTION_TIMEOUT)
})

test("a leaving item that a reorder moves slides from where it was, instead of jumping", async () => {
  unfreeze()

  const host = mount(
    <List initial={["Alpha", "Beta", "Gamma", "Delta"]} />,
  )

  await waitFor(() => {
    expect(getItem(host, "Alpha")).not.toBeNull()
  })

  const beta = getItem(host, "Beta") as HTMLElement

  const topBefore = beta.getBoundingClientRect().top

  await userEvent.click(
    getButton(host, "Remove Beta and reverse"),
  )

  // Drawn after Alpha, its last-shown neighbour, at the end of the
  // reversed list…
  expect(shownOrder(host)).toEqual([
    "Delta",
    "Gamma",
    "Alpha",
    "Beta",
  ])

  // …and starting from where the user last saw it.
  expect(beta.style.transition).toContain("translate")
  expect(
    Math.abs(beta.getBoundingClientRect().top - topBefore),
  ).toBeLessThan(2)
})

test("an item that moves while it is still entering slides from where it is shown, instead of jumping", async () => {
  unfreeze()

  const host = mount(
    <List initial={["Alpha", "Beta", "Gamma"]} />,
  )

  await waitFor(() => {
    expect(getItem(host, "Alpha")).not.toBeNull()
  })

  await userEvent.click(getButton(host, "Add"))

  const delta = getItem(host, "Delta") as HTMLElement

  expect(delta).toHaveClass("charcuterie-item-enter")

  const topBefore = delta.getBoundingClientRect().top

  // Still entering (the motion is 600ms here), and moved to the top.
  await userEvent.click(getButton(host, "Reverse"))

  expect(shownOrder(host)[0]).toBe("Delta")
  expect(
    Math.abs(delta.getBoundingClientRect().top - topBefore),
  ).toBeLessThan(2)
})
