import type { ReactNode } from "react"
import { useState } from "react"
import type { Root } from "react-dom/client"
import { createRoot } from "react-dom/client"
import { expect, userEvent, waitFor } from "storybook/test"
import { afterEach, beforeEach, test } from "vitest"

import { Menu } from "../Menu/Menu.tsx"
import { Modal } from "../Modal/Modal.tsx"
import { OverlayStackProvider } from "./OverlayStack.tsx"

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

const StackedModals = (): ReactNode => {
  const [isOuterVisible, setIsOuterVisible] =
    useState(false)

  const [isInnerVisible, setIsInnerVisible] =
    useState(false)

  return (
    <OverlayStackProvider>
      <button
        onClick={() => {
          setIsOuterVisible(true)
        }}
        type="button"
      >
        Open outer
      </button>

      <Modal
        aria-label="Outer"
        isVisible={isOuterVisible}
        onClose={() => {
          setIsOuterVisible(false)
        }}
      >
        <button
          onClick={() => {
            setIsInnerVisible(true)
          }}
          type="button"
        >
          Open inner
        </button>
      </Modal>

      <Modal
        aria-label="Inner"
        isVisible={isInnerVisible}
        onClose={() => {
          setIsInnerVisible(false)
        }}
      >
        <button type="button">Inside inner</button>
      </Modal>
    </OverlayStackProvider>
  )
}

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

  // The inner closes, and focus goes back into the outer, to the
  // button that opened the inner.
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

const MenuThenModal = (): ReactNode => {
  const [isMenuVisible, setIsMenuVisible] = useState(false)

  const [isModalVisible, setIsModalVisible] =
    useState(false)

  return (
    <>
      <Menu
        isVisible={isMenuVisible}
        items={[
          {
            key: "rename",
            label: "Rename",
            onSelect: () => {
              setIsModalVisible(true)
            },
          },
        ]}
        onDismiss={() => {
          setIsMenuVisible(false)
        }}
        trigger={
          <button
            onClick={() => {
              setIsMenuVisible((isVisible) => !isVisible)
            }}
            type="button"
          >
            Actions
          </button>
        }
      />

      <Modal
        aria-label="Rename"
        isVisible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false)
        }}
      >
        <button type="button">Inside rename</button>
      </Modal>
    </>
  )
}

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

const SwappedModals = (): ReactNode => {
  const [isFirstVisible, setIsFirstVisible] =
    useState(false)

  const [isSecondVisible, setIsSecondVisible] =
    useState(false)

  return (
    <OverlayStackProvider>
      <button
        onClick={() => {
          setIsFirstVisible(true)
        }}
        type="button"
      >
        Open first
      </button>

      <Modal
        aria-label="First"
        isVisible={isFirstVisible}
        onClose={() => {
          setIsFirstVisible(false)
        }}
      >
        <button
          onClick={() => {
            setIsFirstVisible(false)

            setIsSecondVisible(true)
          }}
          type="button"
        >
          Next
        </button>
      </Modal>

      <Modal
        aria-label="Second"
        isVisible={isSecondVisible}
        onClose={() => {
          setIsSecondVisible(false)
        }}
      >
        <button type="button">Inside second</button>
      </Modal>
    </OverlayStackProvider>
  )
}

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
