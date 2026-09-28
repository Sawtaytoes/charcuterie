import { playgroundParameters } from "@charcuterie/storybook-config/story-parameters"
import type { Meta, StoryObj } from "@storybook/react"
import { type ReactNode, useState } from "react"

import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StorySection,
} from "../board.storyHelpers.tsx"
import { RouterLinkProvider } from "../RouterLink/RouterLinkProvider.tsx"
import type { RouterLinkProps } from "../RouterLink/routerLink.ts"
import type { BreadcrumbItem } from "./Breadcrumbs.tsx"
import { Breadcrumbs } from "./Breadcrumbs.tsx"

/**
 * A stand-in for react-router's `<Link>`, marked so `Routed` (and its
 * test) can show which rungs the injected router was handed.
 */
const SoftRouterLink = ({
  href,
  ...linkProps
}: RouterLinkProps): ReactNode => (
  <a {...linkProps} data-router="soft" href={href} />
)

/** A document trail ending on the current page. */
const DOCUMENT_TRAIL: BreadcrumbItem[] = [
  { href: "/", label: "Library" },
  { href: "/handbook", label: "Handbook" },
  { href: "/handbook/runbooks", label: "runbooks" },
  { label: "restoring-a-snapshot.md" },
]

/**
 * A trail that sits above a heading which already names the page, so
 * every rung is a link and none of them is current.
 */
const PLACE_TRAIL: BreadcrumbItem[] = [
  { href: "/places", label: "Places" },
  { href: "/places/office", label: "Office" },
  {
    href: "/places/office/shelves",
    label: "Office Shelves",
  },
]

const LONG_TRAIL: BreadcrumbItem[] = [
  { href: "/", label: "Library" },
  { href: "/archive", label: "Archive" },
  { href: "/archive/2026", label: "2026" },
  {
    href: "/archive/2026/field-recordings",
    label: "Field recordings",
  },
  {
    label:
      "a-very-long-file-name-with-no-spaces-at-all-0123456789abcdef.flac",
  },
]

const meta = {
  title: "Components/Layout/Breadcrumbs",
  component: Breadcrumbs,
  parameters: { layout: "padded" },
  // The component's own default, restated so the props table and the
  // control agree.
  args: {
    items: DOCUMENT_TRAIL,
    label: "Breadcrumb",
  },
} satisfies Meta<typeof Breadcrumbs>

export default meta

type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: playgroundParameters,
}

/**
 * The shapes a trail takes. Each cell's landmark carries its own name,
 * because four `<nav>`s all called "Breadcrumb" on one page is axe's
 * `landmark-unique` — the same rule an app with two trails would hit.
 */
export const AllVariants: Story = {
  render: () => (
    <StorySection title="The last rung with nowhere to go is the current page. Give every rung an href and none is current.">
      <StoryGrid columns={2}>
        <StoryCell
          align="stretch"
          label="ends on the current page"
        >
          <Breadcrumbs
            items={DOCUMENT_TRAIL}
            label="Document trail"
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="every rung a link (above a heading)"
        >
          <div className="flex flex-col gap-1">
            <Breadcrumbs
              items={PLACE_TRAIL.slice(0, -1)}
              label="Place trail"
            />
            <h3 className="m-0 font-semibold text-content-primary text-lg">
              Office Shelves
            </h3>
          </div>
        </StoryCell>

        <StoryCell
          align="stretch"
          label="onSelect rungs (no URL)"
        >
          <Breadcrumbs
            items={[
              { label: "G:", onSelect: () => {} },
              { label: "Photos", onSelect: () => {} },
              { label: "2026" },
            ]}
            label="Folder trail"
          />
        </StoryCell>

        <StoryCell align="stretch" label='separator="/"'>
          <Breadcrumbs
            items={DOCUMENT_TRAIL}
            label="Slash trail"
            separator="/"
          />
        </StoryCell>

        <StoryCell align="stretch" label="one rung">
          <Breadcrumbs
            items={[{ label: "Library" }]}
            label="Root trail"
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="all links, last included"
        >
          <Breadcrumbs
            items={PLACE_TRAIL}
            label="Full place trail"
          />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * Hover and focus, forced by the pseudo-states addon. A link rung and
 * a button rung sit side by side in each state: they must be
 * indistinguishable, because to the reader they are the same thing.
 */
export const AllStates: Story = {
  parameters: {
    pseudo: {
      focusVisible: [
        "#focus-link a",
        "#focus-button button",
      ],
      hover: ["#hover-link a", "#hover-button button"],
    },
  },
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell label="link · rest">
        <Breadcrumbs
          items={PLACE_TRAIL.slice(0, 1)}
          label="Link at rest"
        />
      </StoryCell>

      <StoryCell label="button · rest">
        <Breadcrumbs
          items={[{ label: "Places", onSelect: () => {} }]}
          label="Button at rest"
        />
      </StoryCell>

      <StoryCell label="link · hover (forced)">
        <div id="hover-link">
          <Breadcrumbs
            items={PLACE_TRAIL.slice(0, 1)}
            label="Link hovered"
          />
        </div>
      </StoryCell>

      <StoryCell label="button · hover (forced)">
        <div id="hover-button">
          <Breadcrumbs
            items={[
              { label: "Places", onSelect: () => {} },
            ]}
            label="Button hovered"
          />
        </div>
      </StoryCell>

      <StoryCell label="link · focus-visible (forced)">
        <div id="focus-link">
          <Breadcrumbs
            items={PLACE_TRAIL.slice(0, 1)}
            label="Link focused"
          />
        </div>
      </StoryCell>

      <StoryCell label="button · focus-visible (forced)">
        <div id="focus-button">
          <Breadcrumbs
            items={[
              { label: "Places", onSelect: () => {} },
            ]}
            label="Button focused"
          />
        </div>
      </StoryCell>

      <StoryCell label="current page">
        <Breadcrumbs
          items={[{ label: "Office Shelves" }]}
          label="Current only"
        />
      </StoryCell>

      <StoryCell label="plain text rung (not last)">
        <Breadcrumbs
          items={[
            { label: "Places" },
            { href: "/places/office", label: "Office" },
          ]}
          label="Text rung"
        />
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * A trail wraps; it never truncates. The narrow panel breaks the
 * row between rungs first and then, for the one segment with no
 * spaces in it, inside the segment — so every word is still there.
 */
export const Responsive: Story = {
  render: () => (
    <ContainerBoard>
      {(width) => (
        <Breadcrumbs
          items={LONG_TRAIL}
          label={`Trail at ${width}`}
        />
      )}
    </ContainerBoard>
  ),
}

/**
 * The seam: an in-app `href` goes through the injected router, the
 * same way `TextLink` routes, so a Charcuterie app wired with
 * `ReactRouterAdapter` gets soft navigation with no extra prop.
 */
export const Routed: Story = {
  decorators: [
    (Story) => (
      <RouterLinkProvider link={SoftRouterLink}>
        <Story />
      </RouterLinkProvider>
    ),
  ],
  args: { items: PLACE_TRAIL.slice(0, -1) },
}

const FOLDERS = ["G:", "Photos", "2026", "Garden"]

/**
 * The keyboard path, and the state-driven trail image-viewer and
 * mux-magic need: Tab walks the rungs in order, Enter or Space climbs
 * to one, and the current folder is text, so Tab skips it.
 */
export const Interactive: Story = {
  render: () => {
    const [depth, setDepth] = useState(FOLDERS.length)

    const visible = FOLDERS.slice(0, depth)

    return (
      <div className="flex flex-col gap-3">
        <Breadcrumbs
          items={visible.map((folder, index) => ({
            key: folder,
            label: folder,
            onSelect:
              index === visible.length - 1
                ? undefined
                : () => {
                    setDepth(index + 1)
                  },
          }))}
          label="Folder trail"
        />

        <p className="m-0 text-content-secondary text-sm">
          Showing {visible.join(" / ")}
        </p>
      </div>
    )
  },
}
