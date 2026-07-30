import {
  composeStories,
  composeStory,
} from "@storybook/react"
import { expect, fn, userEvent } from "storybook/test"
import { test } from "vitest"

import { UndoIcon } from "../icons.storyHelpers.tsx"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import meta, * as stories from "./IconButton.stories.tsx"

const { Default, RawGlyph } = composeStories(stories)

/**
 * The assertion the fleet fails today: plex-channels renders `↶`
 * into a bare `<button>`, so a screen reader announces "↶" and this
 * query finds nothing.
 */
test("a glyph gets a name", async () => {
  const { canvas } = await mountStory(Default)

  expectAgentDrivable(canvas, {
    name: "Undo",
    role: "button",
  })
})

test("the same is true of a raw text glyph", async () => {
  const { canvas } = await mountStory(RawGlyph)

  // The glyph is unchanged from what plex-channels ships; the *name*
  // is what this component adds. A font without the code point
  // renders nothing at all — as this repo's headless chromium does —
  // and the name still resolves.
  expectAgentDrivable(canvas, {
    name: "Undo",
    role: "button",
  })
})

test("Tab reaches it and Enter activates", async () => {
  const onClick = fn()

  const { canvas } = await mountStory(
    composeStory(
      {
        args: {
          children: <UndoIcon />,
          label: "Undo",
          onClick,
        },
      },
      meta,
    ),
  )

  const button = expectAgentDrivable(canvas, {
    name: "Undo",
    role: "button",
  })

  await userEvent.tab()

  await expect(button).toHaveFocus()

  await userEvent.keyboard("{Enter}")

  await expect(onClick).toHaveBeenCalledTimes(1)
})
