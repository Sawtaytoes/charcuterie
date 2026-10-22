import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./ColorPicker.stories.tsx"
import { parseHexColor } from "./parseHexColor.ts"

const {
  AllStates,
  AllVariants,
  CustomPanel,
  Interactive,
  Playground,
  Responsive,
} = composeStories(stories)

const openInteractive = async () => {
  const mounted = await mountStory(Interactive)

  await userEvent.click(
    expectAgentDrivable(mounted.canvas, {
      name: "Interactive color: Blue",
      role: "button",
    }),
  )

  const input = expectAgentDrivable(mounted.body, {
    role: "combobox",
  })

  await waitFor(() => {
    expect(input).toHaveFocus()
  })

  return { ...mounted, input }
}

test("the trigger names the preset and shows its swatch", async () => {
  const { canvas, canvasElement } =
    await mountStory(Playground)

  const trigger = expectAgentDrivable(canvas, {
    name: "Color: Hot Pink",
    role: "button",
  })

  await expect(trigger).toHaveTextContent("Hot Pink")

  const swatchDot = trigger.querySelector(
    '[role="img"] > span',
  ) as HTMLElement

  await expect(
    getComputedStyle(swatchDot).backgroundColor,
  ).toBe("rgb(255, 0, 110)")

  await expectNoAxeViolations(canvasElement)
})

test("typing a name narrows the list to that family", async () => {
  const { body, input } = await openInteractive()

  await userEvent.type(input, "pink")

  await waitFor(() => {
    const names = body
      .getAllByRole("option")
      .map((option: HTMLElement) =>
        // The tick is drawn in every row and shown on the chosen one.
        option.textContent?.replace("✓", "").trim(),
      )

    // "Hot Pink" by its name, the rest by their `keywords`.
    expect(names).toStrictEqual([
      "Raspberry",
      "Hot Pink",
      "Blush",
      "Bubblegum",
      "Cotton Candy",
      "Custom color…",
    ])
  })
})

test("a hex code finds its preset", async () => {
  const { body, input } = await openInteractive()

  await userEvent.type(input, "#ff69")

  await waitFor(() => {
    body.getByRole("option", { name: "Bubblegum" })
  })
})

test("choosing a preset changes the value and the trigger", async () => {
  const { body, canvas } = await openInteractive()

  await userEvent.click(
    body.getByRole("option", { name: "Raspberry" }),
  )

  await waitFor(() => {
    expectAgentDrivable(canvas, {
      name: "Interactive color: Raspberry",
      role: "button",
    })
  })

  await expect(
    canvas.getByText("Value: #DB2777"),
  ).toBeInTheDocument()
})

test("a custom color is applied from the hex field and the trigger reads its code", async () => {
  const { body, canvas } = await openInteractive()

  await userEvent.click(
    body.getByRole("option", { name: "Custom color…" }),
  )

  const hexInput = expectAgentDrivable(canvas, {
    name: "Hex code",
    role: "textbox",
  })

  await waitFor(() => {
    expect(hexInput).toHaveFocus()
  })

  await userEvent.clear(hexInput)
  await userEvent.type(hexInput, "c2185b{Enter}")

  await waitFor(() => {
    expectAgentDrivable(canvas, {
      name: "Interactive color: #C2185B",
      role: "button",
    })
  })

  await expect(
    canvas.getByText("Value: #C2185B"),
  ).toBeInTheDocument()

  // Applying closes the panel and returns focus to the trigger.
  await expect(
    canvas.queryByRole("textbox", { name: "Hex code" }),
  ).toBeNull()
})

test("a hex typed into the search seeds the custom panel", async () => {
  const { body, canvas, input } = await openInteractive()

  await userEvent.type(input, "7b1fa2")

  await userEvent.click(
    body.getByRole("option", {
      name: "Custom color #7B1FA2…",
    }),
  )

  await expect(
    expectAgentDrivable(canvas, {
      name: "Hex code",
      role: "textbox",
    }),
  ).toHaveValue("#7B1FA2")
})

test("the app's rule blocks a custom color with its own message", async () => {
  const { canvas, canvasElement } =
    await mountStory(CustomPanel)

  await CustomPanel.play?.({
    canvasElement,
  } as never)

  const hexInput = expectAgentDrivable(canvas, {
    name: "Hex code",
    role: "textbox",
  })

  await expect(hexInput).toHaveAttribute(
    "aria-invalid",
    "true",
  )

  await expect(
    canvas.getByText(/Gray, white, and black/),
  ).toBeInTheDocument()

  await expect(
    expectAgentDrivable(canvas, {
      name: "Use color",
      role: "button",
    }),
  ).toBeDisabled()

  await userEvent.clear(hexInput)
  await userEvent.type(hexInput, "E040FB")

  await waitFor(() => {
    expect(hexInput).not.toHaveAttribute("aria-invalid")
  })

  await expect(
    expectAgentDrivable(canvas, {
      name: "Use color",
      role: "button",
    }),
  ).toBeEnabled()

  await expectNoAxeViolations(canvasElement)
})

test("an unreadable code explains itself and cannot be applied", async () => {
  const { canvas, canvasElement } =
    await mountStory(CustomPanel)

  await CustomPanel.play?.({
    canvasElement,
  } as never)

  const hexInput = expectAgentDrivable(canvas, {
    name: "Hex code",
    role: "textbox",
  })

  await userEvent.clear(hexInput)
  await userEvent.type(hexInput, "12345")

  await expect(
    canvas.getByText(/three or six hex digits/),
  ).toBeInTheDocument()

  await expect(
    expectAgentDrivable(canvas, {
      name: "Use color",
      role: "button",
    }),
  ).toBeDisabled()
})

test("the color wheel follows the hex field", async () => {
  const { canvas, canvasElement } =
    await mountStory(CustomPanel)

  await CustomPanel.play?.({
    canvasElement,
  } as never)

  const hexInput = expectAgentDrivable(canvas, {
    name: "Hex code",
    role: "textbox",
  })

  await userEvent.clear(hexInput)
  await userEvent.type(hexInput, "#0af")

  await expect(
    canvas.getByLabelText("Rule color: color wheel"),
  ).toHaveValue("#00aaff")
})

test("Escape and Cancel drop the draft and keep the value", async () => {
  const { canvas, canvasElement } =
    await mountStory(CustomPanel)

  await CustomPanel.play?.({
    canvasElement,
  } as never)

  const hexInput = expectAgentDrivable(canvas, {
    name: "Hex code",
    role: "textbox",
  })

  await userEvent.clear(hexInput)
  await userEvent.type(hexInput, "E040FB{Escape}")

  await expect(
    canvas.queryByRole("textbox", { name: "Hex code" }),
  ).toBeNull()

  await expect(
    canvas.getByText("Value: #808080"),
  ).toBeInTheDocument()
})

test("every state is named and has no axe violations", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  expectAgentDrivable(canvas, {
    name: "Preset color: Bubblegum",
    role: "button",
  })
  expectAgentDrivable(canvas, {
    name: "Custom color: #C2185B",
    role: "button",
  })
  expectAgentDrivable(canvas, {
    name: "Empty color: Choose a color",
    role: "button",
  })

  await expect(
    expectAgentDrivable(canvas, {
      name: "Disabled color: Purple",
      role: "button",
    }),
  ).toBeDisabled()

  await expectNoAxeViolations(canvasElement)
})

test("presets only offers no custom row", async () => {
  const { body, canvas } = await mountStory(AllStates)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Presets-only color: Green",
      role: "button",
    }),
  )

  await waitFor(() => {
    expect(
      body.getAllByRole("option").length,
    ).toBeGreaterThan(0)
  })

  await expect(
    body.queryByRole("option", { name: "Custom color…" }),
  ).toBeNull()
})

test("every size renders a named trigger", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllVariants)

  for (const size of ["sm", "md", "lg"]) {
    expectAgentDrivable(canvas, {
      name: `Color ${size}: Blue`,
      role: "button",
    })
  }

  await expectNoAxeViolations(canvasElement)
})

test("a stretched trigger keeps its chevron inside", async () => {
  const { canvas } = await mountStory(Responsive)

  for (const trigger of canvas.getAllByRole("button", {
    name: /^Color at .*: Cotton Candy$/,
  })) {
    const triggerBox = trigger.getBoundingClientRect()
    const chevronBox = (
      trigger.querySelector("svg") as SVGElement
    ).getBoundingClientRect()

    await expect(trigger.scrollWidth).toBe(
      trigger.clientWidth,
    )
    await expect(chevronBox.right).toBeLessThanOrEqual(
      triggerBox.right,
    )
  }
})

test.each([
  ["3a86ff", "#3A86FF"],
  ["#3A86FF", "#3A86FF"],
  [" #38f ", "#3388FF"],
  ["abc", "#AABBCC"],
  ["12345", null],
  ["#GGGGGG", null],
  ["#3A86FF80", null],
  ["", null],
])("parseHexColor(%j) is %j", (text, expected) => {
  expect(parseHexColor(text)).toBe(expected)
})
