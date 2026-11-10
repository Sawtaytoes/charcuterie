import type { ReactNode } from "react"
import { useState } from "react"
import { createRoot } from "react-dom/client"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { useValueChangeClass } from "./useValueChangeClass.ts"

const mount = (node: ReactNode) => {
  const host = document.createElement("div")

  document.body.append(host)

  createRoot(host).render(node)

  return host
}

const Balance = (): ReactNode => {
  const [value, setValue] = useState<number | null>(null)

  const changedClass = useValueChangeClass(value)

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

      <output className={changedClass}>{value}</output>
    </div>
  )
}

test("a value pops on each change, but not on arrival", async () => {
  const host = mount(<Balance />)

  const button = await waitFor(() => {
    const found = host.querySelector("button")

    expect(found).not.toBeNull()

    return found as HTMLButtonElement
  })

  const output = host.querySelector("output") as HTMLElement

  // null → 1 is data arriving.
  await userEvent.click(button)

  expect(output.className).toBe("")

  await userEvent.click(button)

  expect(output).toHaveClass("charcuterie-value-changed")

  // A second change swaps the name, which restarts the animation.
  await userEvent.click(button)

  expect(output).toHaveClass(
    "charcuterie-value-changed-again",
  )
})
