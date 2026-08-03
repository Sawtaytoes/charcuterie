import { useVisibility } from "@charcuterie/logic"
import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"

import { Button } from "../Button/Button.tsx"
import { StoryRow } from "../board.storyHelpers.tsx"
import { Lightbox } from "./Lightbox.tsx"

/**
 * An inline SVG rather than a fixture file or a placeholder service:
 * it decodes synchronously and needs no network, so the enlarged
 * image is deterministic in CI — the same reason `MediaTile`'s
 * stories draw their posters this way.
 */
const toPosterSrc = (label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"><rect width="200" height="300" fill="#3E38C4"/><text x="100" y="150" fill="#FFFFFF" font-family="sans-serif" font-size="18" text-anchor="middle">${label}</text></svg>`,
  )}`

const POSTER = toPosterSrc("THE OUTFIT")

/**
 * A small poster thumbnail, exactly as a card would render it —
 * `object-cover` at a fixed poster trim. It is the child the
 * `Lightbox` trigger wraps.
 */
const PosterThumb = (): ReactNode => (
  <img
    alt=""
    className="h-40 w-28 rounded-md object-cover ring-1 ring-border-subtle"
    src={POSTER}
  />
)

const meta = {
  title: "Components/Lightbox",
  component: Lightbox,
  parameters: { layout: "padded" },
  args: {
    alt: "THE OUTFIT poster",
    src: POSTER,
  },
} satisfies Meta<typeof Lightbox>

export default meta

type Story = StoryObj<typeof meta>

/**
 * The uncontrolled default: the thumbnail *is* the trigger, and the
 * component owns its open state. This is what a rip card passes —
 * one `Lightbox` with the poster as its `thumbnail`.
 */
export const Default: Story = {
  args: {
    thumbnail: <PosterThumb />,
  },
}

export const WithCaption: Story = {
  args: {
    caption: "2022 · Blu-ray · 1080p",
    thumbnail: <PosterThumb />,
  },
}

/**
 * Boards here are a trigger plus one open overlay, not a grid — a
 * lightbox is a `Modal` underneath, and two dialogs in the top layer
 * side by side is not a thing the platform can do.
 */
export const AllStates: Story = {
  render: () => (
    <StoryRow>
      <Lightbox
        alt="THE OUTFIT poster"
        src={POSTER}
        thumbnail={<PosterThumb />}
      />

      <Lightbox
        alt="THE OUTFIT poster"
        caption="2022 · Blu-ray · 1080p"
        src={POSTER}
        thumbnail={<PosterThumb />}
      />
    </StoryRow>
  ),
}

/**
 * The controlled case: some other control opens the lightbox, and
 * this renders only the overlay. `isOpen` present makes the internal
 * store go unread — the caller's `useVisibility` is the one truth.
 */
const ControlledDemo = (): ReactNode => {
  const { hide, isVisible, show } = useVisibility()

  return (
    <>
      <Button appearance="soft" onClick={show} size="sm">
        View the poster
      </Button>

      <Lightbox
        alt="THE OUTFIT poster"
        caption="Opened from a button, not the image"
        isOpen={isVisible}
        onOpenChange={(isNextOpen) => {
          if (!isNextOpen) {
            hide()
          }
        }}
        src={POSTER}
      />
    </>
  )
}

export const Controlled: Story = {
  render: () => <ControlledDemo />,
}

/**
 * The keyboard contract, inherited from `Modal` and asserted here so
 * the skin cannot quietly drop it: the trigger opens, Escape routes
 * through `onClose`, and focus returns to the thumbnail button.
 */
export const Interactive: Story = {
  args: {
    thumbnail: <PosterThumb />,
  },
}
