import type { ComponentProps } from "react"
import { createElement } from "react"
import { renderToString } from "react-dom/server"
import { expect, test } from "vitest"

import { Modal } from "../Modal/Modal.tsx"

// Node has no `document` and no `HTMLElement`. A route can render a
// dialog that is already open, so the panel must not touch either
// while it renders.
test("an open Modal renders on the server", () => {
  const props: Omit<
    ComponentProps<typeof Modal>,
    "children"
  > = {
    "aria-label": "Server",
    isVisible: true,
    onClose: () => {},
  }

  expect(() =>
    renderToString(
      createElement(
        Modal,
        props as ComponentProps<typeof Modal>,
        "Body",
      ),
    ),
  ).not.toThrow()
})
