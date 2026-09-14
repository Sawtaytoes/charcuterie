---
"@charcuterie/storybook-config": minor
---

Two story parameters, so a Storybook can hide the addon panel and let one story ask for it
back.

`hiddenPanelOptions` (`{ showPanel: false }`) is spread into a preview's `options`, beside
`storySort`. `playgroundParameters` (`{ options: { showPanel: true } }`) goes on the one
story per component whose `args` drive a single instance. Charcuterie's own docs site is the
first consumer, and its `Default` stories are now named `Playground`.

A specimen board — `AllVariants`, `AllStates`, `Responsive` — renders its own matrix from a
`render` function, so a control moves at most one cell of it and usually nothing at all. The
panel was a third of the canvas height spent on inputs that do not drive the picture.

Both constants live at `@charcuterie/storybook-config/story-parameters`, a new subpath with
**no imports at all**, and are re-exported from `/preview`. A `*.stories.tsx` must import the
leaf: a unit test composes that file through `composeStories`, and `/preview` pulls
`@storybook/addon-docs/blocks` for its React-Aria focus preload.

⚠️ `showPanel` is re-applied on every story change, because the value lands in each story's
merged parameters. Opening the panel by hand on a board holds only until the next story. It
is a default, not a preference the manager remembers.

Nothing changes for a consumer that does not spread `hiddenPanelOptions`.
