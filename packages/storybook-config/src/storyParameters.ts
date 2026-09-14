/**
 * Story parameters with no browser or Storybook imports at all.
 *
 * This leaf is separate from `preview.tsx` on purpose. A
 * `*.stories.tsx` file is imported by `composeStories` in unit
 * tests, and `preview.tsx` pulls `@storybook/addon-docs/blocks` for
 * its React-Aria focus preload — a side effect a Vitest run has no
 * use for. Importing a plain object should not cost a docs bundle.
 */

/**
 * The addon panel, closed — the default state of every story that
 * is not a playground.
 *
 * A Charcuterie story is one of two things. A **specimen board**
 * (`AllVariants`, `AllStates`, `Responsive`) renders a whole matrix
 * from its own `render`, so a control moves at most one cell of it
 * and usually nothing at all; the panel is a third of the canvas
 * height spent on nothing. A **playground** (`Playground`, one per
 * component) renders a single instance straight from `args`, and
 * there a control is the whole point.
 *
 * So the panel is closed unless a story asks for it, and
 * `playgroundParameters` is how a story asks. Spread this into the
 * preview's `options`, beside `storySort`:
 *
 * @example
 *   options: {
 *     ...hiddenPanelOptions,
 *     storySort: { order: [...] },
 *   }
 *
 * ⚠️ **`showPanel` is re-applied on every story change**, because
 * the value lands in each story's merged parameters. Opening the
 * panel by hand on a board holds only until the next story — it is
 * a default, not a preference the manager remembers.
 */
export const hiddenPanelOptions = {
  showPanel: false,
} as const

/**
 * The story-level opt-in that brings the addon panel back.
 *
 * One story per component carries it, and that story is the
 * `Playground`. Anything else showing a panel is a story that
 * should have been a playground, or a board that wants trimming.
 *
 * @example
 *   export const Playground: Story = {
 *     args: { children: "running" },
 *     parameters: playgroundParameters,
 *   }
 */
export const playgroundParameters = {
  options: {
    showPanel: true,
  },
} as const
