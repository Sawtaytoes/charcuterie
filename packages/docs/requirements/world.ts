import { QuickPickleWorld } from "quickpickle"
import {
  expect,
  userEvent,
  type within,
} from "storybook/test"

import { mountStory } from "../../ui/src/mountStory.testHelpers.ts"
import {
  type AgentTarget,
  expectAgentDrivable,
} from "../../ui/src/testing/index.ts"

type Canvas = ReturnType<typeof within>
type Role = AgentTarget["role"]
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
    await this.press("Tab")
    await expect(this.byRole(role, name)).toHaveFocus()
  }

  async press(key: string) {
    if (key === "Tab") {
      await userEvent.tab()

      return
    }

    await userEvent.keyboard(
      key === "Space" ? " " : `{${key}}`,
    )
  }

  expectAccessible(role: Role, name: string | RegExp) {
    return expectAgentDrivable(this.scope(), { role, name })
  }

  async expectUnfocused(role: Role, name: string) {
    await expect(this.byRole(role, name)).not.toHaveFocus()
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
