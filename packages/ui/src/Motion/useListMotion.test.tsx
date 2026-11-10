import type { ReactNode } from "react"
import { useState } from "react"
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

afterEach(() => {
  if (frozenStyle !== null && !frozenStyle.isConnected) {
    document.head.append(frozenStyle)
  }
})

const unfreeze = () => {
  frozenStyle?.remove()
}

const List = ({
  initial,
}: {
  initial: string[]
}): ReactNode => {
  const [names, setNames] = useState(initial)

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

      <ul>
        {entries.map(({ item, key, motionProps }) => (
          <li key={key} {...motionProps}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

const mount = (node: ReactNode) => {
  const host = document.createElement("div")

  document.body.append(host)

  createRoot(host).render(node)

  return host
}

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

  await userEvent.click(
    host.querySelector("button") as HTMLButtonElement,
  )

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

  await userEvent.click(
    host.querySelectorAll("button")[1] as HTMLButtonElement,
  )

  expect(alpha).toHaveClass("charcuterie-item-exit")
  expect(alpha).toHaveAttribute("inert")
  expect(alpha).toHaveAttribute("aria-hidden", "true")
  expect(host.querySelector("li")).toBe(alpha)

  await waitFor(() => {
    expect(alpha.isConnected).toBe(false)
  })
})

test("with motion frozen, a removed item is gone in the same commit", async () => {
  const host = mount(
    <List initial={["Alpha", "Beta", "Gamma"]} />,
  )

  await waitFor(() => {
    expect(getItem(host, "Alpha")).not.toBeNull()
  })

  await userEvent.click(
    host.querySelectorAll("button")[1] as HTMLButtonElement,
  )

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

  await userEvent.click(
    host.querySelectorAll("button")[2] as HTMLButtonElement,
  )

  const alpha = getItem(host, "Alpha") as HTMLElement

  // The slide is a transition back to no offset, so mid-flight the
  // element sits away from its laid-out place.
  expect(alpha.style.transition).toContain("translate")

  await waitFor(() => {
    expect(alpha.style.transition).toBe("")
  })
})
