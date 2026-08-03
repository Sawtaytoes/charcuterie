import type { ReactNode } from "react"
import { act } from "react"
import { createRoot } from "react-dom/client"
import {
  afterAll,
  afterEach,
  beforeAll,
  expect,
  test,
} from "vitest"

import { OverlayPanel } from "./OverlayPanel.tsx"
import type { OverlayStackValue } from "./OverlayStack.tsx"
import {
  OverlayStackProvider,
  useOverlayStack,
} from "./OverlayStack.tsx"

/**
 * The stack's bookkeeping, driven directly rather than through a
 * component's chrome — this is infrastructure with no story, so it
 * mounts its own root and drives it with `act`, which flushes the
 * passive effects the scroll lock and `requestCloseTop`'s live-top ref
 * both ride on. The act environment is turned on for this file only;
 * ui-dom isolates test files, so it never reaches the story-driven
 * suites next door.
 */
const reactEnvironment = globalThis as unknown as {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}

beforeAll(() => {
  reactEnvironment.IS_REACT_ACT_ENVIRONMENT = true
})

afterAll(() => {
  reactEnvironment.IS_REACT_ACT_ENVIRONMENT = false
})

const roots: {
  container: HTMLElement
  root: ReturnType<typeof createRoot>
}[] = []

const mount = async (ui: ReactNode) => {
  const container = document.createElement("div")

  document.body.append(container)

  const root = createRoot(container)

  await act(async () => {
    root.render(ui)
  })

  roots.push({ container, root })

  return root
}

afterEach(async () => {
  for (const { container, root } of roots.splice(0)) {
    await act(async () => {
      root.unmount()
    })

    container.remove()
  }
})

/**
 * The one component this file declares: it reports the live stack up
 * through `onStack` and renders two panels whose visibility the test
 * drives. `OverlayStackProvider` is rendered by the tests around it,
 * so this stays a single component (the `no-multi-comp` rule) while
 * still being a real consumer of the context.
 */
const Harness = ({
  isAVisible = false,
  isBVisible = false,
  onStack,
}: {
  isAVisible?: boolean
  isBVisible?: boolean
  onStack?: (stack: OverlayStackValue) => void
}): ReactNode => {
  onStack?.(useOverlayStack())

  return (
    <>
      <OverlayPanel
        aria-label="A"
        isVisible={isAVisible}
        onClose={() => {}}
      >
        first
      </OverlayPanel>

      <OverlayPanel
        aria-label="B"
        isVisible={isBVisible}
        onClose={() => {}}
      >
        second
      </OverlayPanel>
    </>
  )
}

test("registers in order, closes the top, and toggles the scrim with depth", async () => {
  const probe: { current: OverlayStackValue | null } = {
    current: null,
  }

  await mount(
    <OverlayStackProvider>
      <Harness
        onStack={(next) => {
          probe.current = next
        }}
      />
    </OverlayStackProvider>,
  )

  const stack = () => {
    if (!probe.current) {
      throw new Error("probe never rendered")
    }

    return probe.current
  }

  const scrim = () =>
    document.body.querySelector(".bg-scrim")

  expect(stack().depth).toBe(0)
  expect(scrim()).toBeNull()

  let closedTop = ""

  await act(async () => {
    stack().register({
      id: "a",
      onClose: () => {
        closedTop = "a"
      },
    })
  })

  expect(stack().depth).toBe(1)
  expect(stack().topId).toBe("a")
  // The scrim renders as long as at least one modal is open.
  expect(scrim()).not.toBeNull()

  await act(async () => {
    stack().register({
      id: "b",
      onClose: () => {
        closedTop = "b"
      },
    })
  })

  expect(stack().depth).toBe(2)
  // Last registered is the top.
  expect(stack().topId).toBe("b")

  // `requestCloseTop` targets the last, not the first.
  await act(async () => {
    stack().requestCloseTop()
  })

  expect(closedTop).toBe("b")

  await act(async () => {
    stack().unregister("b")
  })

  // The next one down becomes the top, and the scrim stays.
  expect(stack().topId).toBe("a")
  expect(scrim()).not.toBeNull()

  await act(async () => {
    stack().unregister("a")
  })

  // Empty, so the scrim goes.
  expect(stack().depth).toBe(0)
  expect(scrim()).toBeNull()
})

test("the scroll lock frees the page only when the last modal closes", async () => {
  const original =
    document.documentElement.style.overflow

  const root = await mount(
    <OverlayStackProvider>
      <Harness isAVisible isBVisible />
    </OverlayStackProvider>,
  )

  // Two open, one lock.
  expect(document.documentElement.style.overflow).toBe(
    "hidden",
  )

  await act(async () => {
    root.render(
      <OverlayStackProvider>
        <Harness isAVisible isBVisible={false} />
      </OverlayStackProvider>,
    )
  })

  // One still open — the ref count has not reached zero.
  expect(document.documentElement.style.overflow).toBe(
    "hidden",
  )

  await act(async () => {
    root.render(
      <OverlayStackProvider>
        <Harness isAVisible={false} isBVisible={false} />
      </OverlayStackProvider>,
    )
  })

  // Empty, so the page is restored to exactly what it was.
  expect(document.documentElement.style.overflow).toBe(
    original,
  )
})
