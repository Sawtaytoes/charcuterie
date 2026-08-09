import type { Meta, StoryObj } from "@storybook/react"

/**
 * `.charcuterie-scrollbar` is not a component — it is the one class
 * in `@charcuterie/ui/styles.css` a scrolling element opts into, so
 * it has no `.tsx` to attach a `component` to and is storied here in
 * the host instead, the same way `Tokens/Specimen` is.
 *
 * Every surface below reads its colour from a token, so the bars
 * flip with the `Scheme` toolbar on the same repaint as the page —
 * there is nothing in React observing the change. Drive the toolbar
 * between Dark and Light and watch the thumb and track move with it.
 *
 * `tabIndex={0}` on each scroll box is not decoration: a
 * keyboard-scrollable region has to be focusable, and axe fails the
 * story otherwise — which is the accessibility floor the whole
 * library is held to.
 */
const meta = {
  title: "Utilities/Scrollbar",
  parameters: {
    layout: "padded",
  },
} satisfies Meta

export default meta

type Story = StoryObj

const paragraphs = [
  "A scroll container earns its scrollbar only when its content overflows, so each box here is sized well under the text it holds.",
  "The designed bar is the ::-webkit-scrollbar path — a 12px track, a rounded 6px thumb, a track-coloured inset, no step arrows — which is what Chromium, Edge, and Safari paint.",
  "Firefox never sees those pseudo-elements, so it gets the closest standard-property match (scrollbar-width: thin + a token-tinted scrollbar-color), scoped so Chromium does not drop the designed bar.",
  "Both read the same three roles: border-strong for the thumb, surface-sunken for the track, content-muted for the thumb under the pointer.",
  "So one flip of data-scheme on the html element repaints the bar with the rest of the page, and nothing in the React tree has to know it happened.",
  "The fleet grew this affordance twice by hand before it was promoted here, which is exactly the duplication the design system exists to delete.",
]

/**
 * The common case — a vertical bar on an overflowing block of prose.
 */
export const Vertical: Story = {
  render: () => (
    <section
      aria-label="Vertically scrolling prose"
      className="charcuterie-scrollbar max-h-48 max-w-md overflow-y-auto rounded-md border border-border-subtle bg-surface-sunken p-4"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll container must be focusable or a keyboard user can see the pane and cannot scroll it — axe's `scrollable-region-focusable`. The rule is right about `<div>`s in general and wrong about scrollers.
      tabIndex={0}
    >
      <div className="flex flex-col gap-3">
        {paragraphs.map((text) => (
          <p
            className="text-content-secondary text-sm"
            key={text}
          >
            {text}
          </p>
        ))}
      </div>
    </section>
  ),
}

/**
 * A horizontal bar — the same class, no change, on an element that
 * overflows on the inline axis instead.
 */
export const Horizontal: Story = {
  render: () => (
    <section
      aria-label="Horizontally scrolling tiles"
      className="charcuterie-scrollbar max-w-md overflow-x-auto rounded-md border border-border-subtle bg-surface-sunken p-4"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll container must be focusable or a keyboard user can see the pane and cannot scroll it — axe's `scrollable-region-focusable`. The rule is right about `<div>`s in general and wrong about scrollers.
      tabIndex={0}
    >
      <div className="flex w-max gap-3">
        {Array.from({ length: 12 }, (_, index) => (
          <div
            className="flex size-24 shrink-0 items-center justify-center rounded-md bg-surface-raised text-content-primary"
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed decorative row of identical tiles has no stabler key
            key={index}
          >
            {index + 1}
          </div>
        ))}
      </div>
    </section>
  ),
}

/**
 * Both axes at once — the corner where the two bars meet is where
 * the track inset reads most clearly on the webkit path.
 */
export const BothAxes: Story = {
  render: () => (
    <section
      aria-label="Scrolling grid on both axes"
      className="charcuterie-scrollbar size-64 overflow-auto rounded-md border border-border-subtle bg-surface-sunken p-4"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll container must be focusable or a keyboard user can see the pane and cannot scroll it — axe's `scrollable-region-focusable`. The rule is right about `<div>`s in general and wrong about scrollers.
      tabIndex={0}
    >
      <div className="grid w-max grid-cols-6 gap-3">
        {Array.from({ length: 60 }, (_, index) => (
          <div
            className="flex size-20 shrink-0 items-center justify-center rounded-md bg-surface-raised text-content-primary"
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed decorative grid of identical cells has no stabler key
            key={index}
          >
            {index + 1}
          </div>
        ))}
      </div>
    </section>
  ),
}
