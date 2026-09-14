# The addon panel is closed, except on the Playground story

- **Status:** Accepted
- **Date:** 2026-09-13
- **Type:** Storybook docs site
- **Supersedes:** —
- **Superseded by:** —

## Decision

The Storybook addon panel — Controls, Actions, Interactions, Accessibility — starts
**closed** on every story. `packages/docs/.storybook/preview.tsx` spreads
`hiddenPanelOptions` into its `options`, beside `storySort`.

One story per component opens it again, and that story is the **`Playground`**. It carries
`parameters: playgroundParameters` and nothing else does.

**Every `Default` story was renamed to `Playground`** — 69 of them, plus the `<Canvas
of={…} />` reference in each `.mdx` and the `composeStories` identifier in each
`.test.tsx`. The five-story checklist in `packages/ui/README.md` now reads `Playground`,
`AllVariants`, `AllStates`, `Responsive`, `Interactive`.

Both constants live in `@charcuterie/storybook-config/story-parameters`, a leaf with **no
imports at all**. They are re-exported from `/preview` for a preview file's convenience,
but a `*.stories.tsx` imports the leaf: a unit test composes that file, and `/preview`
pulls `@storybook/addon-docs/blocks` for its React-Aria focus preload.

`Tokens/Specimen`'s `Default` story keeps its name. It is a fullscreen token board, not a
component playground, and it correctly shows no panel.

## Context

The owner reads this Storybook to look at components:

> *"I typically wanna come in and look at designs, not mess with them unless I need to do
> it in the playground."*

He believed a `Playground` story already existed. It did not. Each component shipped
`Default`, `AllVariants`, `AllStates`, `Responsive` and `Interactive`, and `Default` was
already the one story whose `args` drive a single instance — the playground under a name
that did not say so.

Two mechanisms were built and looked at side by side before the choice was made: hiding
only the Controls tab (`controls: { disable: true }`), and hiding the whole panel
(`options: { showPanel: false }`). He picked the whole panel.

## Why

**A board story has nothing for a control to do.** `AllVariants`, `AllStates`,
`Responsive` and `Categorical` each render their own matrix from a `render` function, so a
control moves at most one cell of the board and usually nothing at all. The panel was a
third of the canvas height spent on inputs that do not drive the picture.

**Hiding only the Controls tab reclaims no space.** The panel still opens at its full
height for Actions, Interactions and Accessibility. It removes the temptation, not the
clutter, and the clutter was the complaint.

**The name has to carry the rule.** "The panel opens on `Default`" is a sentence nobody
can predict. "The panel opens on `Playground`" is one nobody has to.

⚠️ **`showPanel` is re-applied on every story change.** The value lands in each story's
merged parameters, so opening the panel by hand on a board holds only until the next
story. It is a default, not a preference the manager remembers. The *Show addon panel*
button in the toolbar brings it back, with Controls fully usable, for as long as you stay
on that story.

## Evidence

Owner, this session: *"in Charcuterie Storybook, if the controls aren't used for a story,
is it possible to hide them by default? Only the Playground ones use them I believe. I
typically wanna come in and look at designs, not mess with them unless I need to do it in
the playground."*

Asked which of the two mechanisms he wanted, with both running at `1440x900` behind a
`devshare`, he chose **hide the whole panel**. Asked what to call the playground, he chose
**rename `Default` to `Playground`** over keeping the name.

Verified against the built site, not the dev server:

- `index.json` holds **69** `--playground` entries and one remaining `--default`
  (`tokens-specimen--default`).
- `Components/Data/Badge` → `Playground` paints the panel with **Controls (7)** selected.
- `All Variants` paints a full-height canvas with no panel.
- *Show addon panel* reopens it on `All Variants`; moving to `All States` closes it again.
- Sidebar root order survives the `...hiddenPanelOptions` spread beside the inline
  `storySort` literal: `Guides`, `Components`, then `Actions`, `Controls`, `Overlays`,
  `Layout`, `Data`.

Gates: `lint`, `typecheck`, `test` (1910 passed), `build:storybook`, and
`smoke:storybook` — *"475 Storybook entries rendered clean under SPA navigation"*.

Three story ids in `packages/docs/scripts/` were already stale from an earlier sidebar
regrouping (`components-dialog--default`, `components-shell--default`,
`components-toolbar--default`) and were corrected to their real group paths in the same
change.
