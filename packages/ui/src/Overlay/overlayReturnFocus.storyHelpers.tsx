import type { ReactNode } from "react"
import { useState } from "react"

import { Menu } from "../Menu/Menu.tsx"
import { Modal } from "../Modal/Modal.tsx"
import { OverlayStackProvider } from "./OverlayStack.tsx"

/**
 * The page shapes `overlayReturnFocus.test.tsx` opens and closes.
 *
 * `.storyHelpers.tsx` rather than `.tsx` because `react/no-multi-comp`
 * is switched off for that suffix, and it is excluded from the
 * package build so none of this ships.
 */

export const StackedModals = (): ReactNode => {
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

export const MenuThenModal = (): ReactNode => {
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

export const SwappedModals = (): ReactNode => {
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

/**
 * A modal that opens on its own, with nothing focused, as a timeout
 * warning does. A field the user focused earlier sits beside it.
 */
export const ModalWithoutOpener = (): ReactNode => {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <>
      <input aria-label="Search" type="search" />

      <button
        onClick={() => {
          setIsVisible(true)
        }}
        type="button"
      >
        Open from a timer
      </button>

      <Modal
        aria-label="Timer"
        isVisible={isVisible}
        onClose={() => {
          setIsVisible(false)
        }}
      >
        <button type="button">Inside timer</button>
      </Modal>
    </>
  )
}
