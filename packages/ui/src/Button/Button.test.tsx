import {
  composeStories,
  composeStory,
} from "@storybook/react"
import { expect, fn, userEvent } from "storybook/test"
import { test } from "vitest"

import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import meta, * as stories from "./Button.stories.tsx"

const { AllStates, Default, Loading } =
  composeStories(stories)

test("is drivable by role and name", async () => {
  const { canvas } = await mountStory(Default)

  expectAgentDrivable(canvas, {
    name: "Start rip",
    role: "button",
  })
})

/**
 * The keyboard contract, asserted rather than assumed: Tab reaches
 * it, Enter activates, Space activates. Every hand-rolled
 * `<div onClick>` in the fleet fails all three.
 */
test("Tab reaches it, and Enter and Space both activate", async () => {
  const onClick = fn()

  const { canvas } = await mountStory(
    composeStory(
      { args: { children: "Start rip", onClick } },
      meta,
    ),
  )

  const button = expectAgentDrivable(canvas, {
    name: "Start rip",
    role: "button",
  })

  await userEvent.tab()

  await expect(button).toHaveFocus()

  await userEvent.keyboard("{Enter}")

  await expect(onClick).toHaveBeenCalledTimes(1)

  await userEvent.keyboard(" ")

  await expect(onClick).toHaveBeenCalledTimes(2)
})

test("a disabled button is skipped by Tab and ignores a click", async () => {
  const onClick = fn()

  const { canvas } = await mountStory(
    composeStory(
      {
        args: {
          children: "Start rip",
          isDisabled: true,
          onClick,
        },
      },
      meta,
    ),
  )

  const button = canvas.getByRole("button", {
    name: "Start rip",
  })

  await userEvent.click(button)

  // A `<div role="button">` with a guard clause looks the same and
  // is not the same: a real `disabled` is skipped by Tab, ignored
  // by click, and reported to AT.
  await expect(onClick).not.toHaveBeenCalled()
  await expect(button).toBeDisabled()

  await userEvent.tab()

  await expect(button).not.toHaveFocus()
})

test("loading disables the button and announces the work", async () => {
  const { canvas } = await mountStory(Loading)

  const button = expectAgentDrivable(canvas, {
    name: /Ripping disc 3/,
    role: "button",
  })

  await expect(button).toBeDisabled()
  await expect(button).toHaveAttribute("aria-busy", "true")

  // The spinner's label lives in a `role="status"`, so a screen
  // reader hears the work start rather than only seeing it.
  await expect(
    canvas.getByRole("status"),
  ).toBeInTheDocument()
})

test("the states board really renders a busy button", async () => {
  const { canvas } = await mountStory(AllStates)

  await expect(
    canvas.getByRole("button", { name: /loading/i }),
  ).toHaveAttribute("aria-busy", "true")
})
