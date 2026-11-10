import type { ReactNode } from "react"
import type { Root } from "react-dom/client"
import { createRoot } from "react-dom/client"
import { expect, userEvent, waitFor } from "storybook/test"
import { afterEach, beforeEach, test } from "vitest"

import {
  MenuThenModal,
  ModalWithoutOpener,
  StackedModals,
  SwappedModals,
} from "./overlayReturnFocus.storyHelpers.tsx"

/**
 * About focus during the exit motion, so the suite's motion freeze is
 * lifted: frozen, a closed panel unmounts in the same commit, which is
 * the path that already worked.
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

  document.body.append(host)

  const root = createRoot(host)

  root.render(node)

  mounted.push({ host, root })

  return host
}

const getButton = (name: string) =>
  [...document.querySelectorAll("button")].find(
    (button) => button.textContent === name,
  ) as HTMLButtonElement

test("closing a modal that a stacked modal covered returns focus to the button that opened it", async () => {
  mount(<StackedModals />)

  await waitFor(() => {
    expect(getButton("Open outer")).toBeDefined()
  })

  const outerTrigger = getButton("Open outer")

  await userEvent.click(outerTrigger)

  await waitFor(() => {
    expect(getButton("Open inner")).toBeDefined()
  })

  await userEvent.click(getButton("Open inner"))

  await waitFor(() => {
    expect(getButton("Inside inner")).toBeDefined()
  })

  // The inner closes, and focus goes back into the outer. (It goes to
  // the outer's first button, which here is also the one that opened
  // the inner: when the outer's focus manager is turned back on, it
  // runs its initial focus again.)
  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(getButton("Open inner")).toHaveFocus()
  })

  // The outer closes. Its focus manager was re-enabled when the inner
  // left, but focus still goes back to the button that opened the
  // OUTER, not to a button inside the outer, which is inert while it
  // leaves and cannot hold focus.
  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(outerTrigger).toHaveFocus()
  })
})

test("a modal opened from a menu item returns focus to the menu's trigger, once the item has gone", async () => {
  mount(<MenuThenModal />)

  await waitFor(() => {
    expect(getButton("Actions")).toBeDefined()
  })

  await userEvent.click(getButton("Actions"))

  const item = await waitFor(() => {
    const found = document.querySelector<HTMLElement>(
      '[role="menuitem"]',
    )

    expect(found).not.toBeNull()

    return found as HTMLElement
  })

  await userEvent.click(item)

  await waitFor(() => {
    expect(getButton("Inside rename")).toHaveFocus()
  })

  // The menu has finished leaving, so the item that opened the modal
  // is gone from the page.
  await waitFor(
    () => {
      expect(item.isConnected).toBe(false)
    },
    { timeout: 5_000 },
  )

  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(getButton("Actions")).toHaveFocus()
  })
})

test("a modal that replaced another returns focus to the first one's opener", async () => {
  mount(<SwappedModals />)

  await waitFor(() => {
    expect(getButton("Open first")).toBeDefined()
  })

  await userEvent.click(getButton("Open first"))

  await waitFor(() => {
    expect(getButton("Next")).toHaveFocus()
  })

  const next = getButton("Next")

  await userEvent.click(next)

  await waitFor(() => {
    expect(getButton("Inside second")).toHaveFocus()
  })

  // The first modal has finished leaving, and "Next" with it.
  await waitFor(
    () => {
      expect(next.isConnected).toBe(false)
    },
    { timeout: 5_000 },
  )

  await userEvent.keyboard("{Escape}")

  await waitFor(() => {
    expect(getButton("Open first")).toHaveFocus()
  })
})

test("a modal that opened while nothing had focus leaves focus where it was when it closes", async () => {
  mount(<ModalWithoutOpener />)

  const search = await waitFor(() => {
    const found = document.querySelector<HTMLInputElement>(
      'input[aria-label="Search"]',
    )

    expect(found).not.toBeNull()

    return found as HTMLInputElement
  })

  // Focused once, then left, so it is in the focus history.
  search.focus()

  search.blur()

  expect(document.activeElement).toBe(document.body)

  // Opened the way a timer opens it, without moving focus first.
  getButton("Open from a timer").click()

  await waitFor(() => {
    expect(getButton("Inside timer")).toHaveFocus()
  })

  await userEvent.keyboard("{Escape}")

  await waitFor(
    () => {
      expect(getButton("Inside timer")).toBeUndefined()
    },
    { timeout: 5_000 },
  )

  expect(search).not.toHaveFocus()
})
