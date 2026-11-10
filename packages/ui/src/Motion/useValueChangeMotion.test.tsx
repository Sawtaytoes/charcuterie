import type { ReactNode } from "react"
import { useState } from "react"
import type { Root } from "react-dom/client"
import { createRoot } from "react-dom/client"
import { expect, userEvent, waitFor } from "storybook/test"
import { afterEach, beforeEach, test } from "vitest"

import { useValueChangeMotion } from "./useValueChangeMotion.ts"

/**
 * As in `usePresence.test.tsx`: the class must come off when its
 * animation ends, and that needs the animation, so these tests lift
 * the suite's motion freeze.
 */
const FREEZE_ID = "charcuterie-freeze-motion"

let frozenStyle: HTMLElement | null = null

const mounted: { host: HTMLElement; root: Root }[] = []

beforeEach(() => {
  frozenStyle = document.getElementById(FREEZE_ID)

  frozenStyle?.remove()
})

afterEach(() => {
  for (const { host, root } of mounted.splice(0)) {
    root.unmount()

    host.remove()
  }

  if (frozenStyle !== null && !frozenStyle.isConnected) {
    document.head.append(frozenStyle)
  }
})

const mount = (node: ReactNode) => {
  const host = document.createElement("div")

  // Long enough that a loaded host cannot finish a pop between two
  // lines of a test.
  host.style.setProperty("--duration-slow", "600ms")

  document.body.append(host)

  const root = createRoot(host)

  root.render(node)

  mounted.push({ host, root })

  return host
}

const Balance = (): ReactNode => {
  const [value, setValue] = useState<number | null>(null)

  const changeMotion = useValueChangeMotion(value)

  return (
    <div>
      <button
        onClick={() => {
          setValue((previous) => (previous ?? 0) + 1)
        }}
        type="button"
      >
        Change
      </button>

      <output {...changeMotion}>{value}</output>
    </div>
  )
}

const mountBalance = async () => {
  const host = mount(<Balance />)

  const button = await waitFor(() => {
    const found = host.querySelector("button")

    if (found === null) {
      throw new Error("not mounted yet")
    }

    return found
  })

  const output = host.querySelector("output") as HTMLElement

  return { button, output }
}

test("a value pops on each change, but not on arrival", async () => {
  const { button, output } = await mountBalance()

  // null → 1 is data arriving.
  await userEvent.click(button)

  expect(output.className).toBe("")

  await userEvent.click(button)

  expect(output).toHaveClass("charcuterie-value-changed")

  // A change during the pop swaps the name, which restarts it.
  await userEvent.click(button)

  expect(output).toHaveClass(
    "charcuterie-value-changed-again",
  )
})

test("the pop class comes off when the pop ends", async () => {
  const { button, output } = await mountBalance()

  await userEvent.click(button)

  await userEvent.click(button)

  expect(output).toHaveClass("charcuterie-value-changed")

  await waitFor(
    () => {
      expect(output.className).toBe("")
    },
    { timeout: 5_000 },
  )
})
