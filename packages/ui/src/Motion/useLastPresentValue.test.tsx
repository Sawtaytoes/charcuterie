import type { ReactNode } from "react"
import { useState } from "react"
import { createRoot } from "react-dom/client"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { useLastPresentValue } from "./useLastPresentValue.ts"

const mount = (node: ReactNode) => {
  const host = document.createElement("div")

  document.body.append(host)

  createRoot(host).render(node)

  return host
}

const Selection = (): ReactNode => {
  const [selected, setSelected] = useState<string | null>(
    null,
  )

  const shown = useLastPresentValue(selected)

  return (
    <div>
      <button
        onClick={() => {
          setSelected((previous) =>
            previous === null ? "First" : null,
          )
        }}
        type="button"
      >
        Toggle
      </button>

      <output>{shown ?? "none"}</output>
    </div>
  )
}

test("the last present value is held after the value empties", async () => {
  const host = mount(<Selection />)

  const button = await waitFor(() => {
    const found = host.querySelector("button")

    expect(found).not.toBeNull()

    return found as HTMLButtonElement
  })

  const output = host.querySelector("output") as HTMLElement

  expect(output.textContent).toBe("none")

  await userEvent.click(button)

  expect(output.textContent).toBe("First")

  await userEvent.click(button)

  expect(output.textContent).toBe("First")
})
