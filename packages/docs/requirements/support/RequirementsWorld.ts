import { QuickPickleWorld } from "quickpickle"
import type { within } from "storybook/test"

export type Canvas = ReturnType<typeof within>

/**
 * One World per scenario, holding STATE only.
 *
 * Behavior lives in `helpers/` as plain functions that take the
 * World. A method here could be called from anywhere as
 * `world.something()`, and nothing would say which file it came
 * from; a helper is an import, so the trace
 * (`pnpm requirements:which <file.feature:line>`) can name the exact
 * function a step reaches. Keep this class small.
 */
export class RequirementsWorld extends QuickPickleWorld {
  /**
   * `document.body`, where every query looks: a dialog or a listbox
   * portals out of the story's canvas. Set by `openStory`.
   */
  page?: Canvas

  /** The story's own canvas element, for an audit of the story alone. */
  storyRoot?: HTMLElement

  /**
   * Activation counts, keyed by the accessible name of the control
   * whose handler a fixture installed. Keyed by name so "the button
   * named X has been activated" can only ever count X.
   */
  activations = new Map<string, number>()
}
