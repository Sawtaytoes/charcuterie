import { QuickPickleWorld } from "quickpickle"
import {
  expect,
  userEvent,
  type within,
} from "storybook/test"

import { mountStory } from "../../ui/src/mountStory.testHelpers.ts"

type Canvas = ReturnType<typeof within>
type Role = Parameters<Canvas["getByRole"]>[0]
type Story = Parameters<typeof mountStory>[0]

/** One fresh World per scenario. App-specific fixtures belong in step files. */
export class RequirementsWorld extends QuickPickleWorld {
  canvas?: Canvas
  page?: Canvas
  actionCount = 0

  async open(story: Story) {
    const { canvas, body } = await mountStory(story)

    this.canvas = canvas
    this.page = body
  }

  private scope(isPage = false): Canvas {
    const scope = isPage ? this.page : this.canvas

    if (!scope)
      throw new Error(
        "Open a story before querying the page",
      )

    return scope
  }

  byRole(
    role: Role,
    name: string | RegExp,
    isPage = false,
  ) {
    return this.scope(isPage).getByRole(role, { name })
  }

  async click(role: Role, name: string, isPage = false) {
    await userEvent.click(this.byRole(role, name, isPage))
  }

  async fill(role: Role, name: string, value: string) {
    await userEvent.clear(this.byRole(role, name))
    await userEvent.type(this.byRole(role, name), value)
  }

  async tabTo(role: Role, name: string) {
    await userEvent.tab()
    await expect(this.byRole(role, name)).toHaveFocus()
  }

  async press(key: string) {
    await userEvent.keyboard(
      key === "Space" ? " " : `{${key}}`,
    )
  }

  async expectVisible(
    role: Role,
    name: string,
    isPage = false,
  ) {
    await expect(
      this.byRole(role, name, isPage),
    ).toBeVisible()
  }

  async expectDisabled(role: Role, name: string) {
    await expect(this.byRole(role, name)).toBeDisabled()
  }

  async expectBusy(role: Role, name: string) {
    await expect(this.byRole(role, name)).toHaveAttribute(
      "aria-busy",
      "true",
    )
  }

  async expectText(role: Role, name: string, text: string) {
    await expect(this.byRole(role, name)).toHaveTextContent(
      text,
    )
  }

  async expectStatus() {
    await expect(
      this.scope().getByRole("status"),
    ).toBeVisible()
  }

  expectActionCount(count: number) {
    expect(this.actionCount).toBe(count)
  }
}
