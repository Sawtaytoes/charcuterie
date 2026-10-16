import { playgroundParameters } from "@charcuterie/storybook-config/story-parameters"
import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"
import { useState } from "react"

import { controlSizeArgType } from "../argTypes.storyHelpers.ts"
import { Button } from "../Button/Button.tsx"
import {
  StoryCell,
  StoryGrid,
  StorySection,
} from "../board.storyHelpers.tsx"
import {
  CommandPalette,
  type CommandPaletteProps,
} from "./CommandPalette.tsx"
import {
  CommandPalettePanel,
  type CommandPalettePanelProps,
} from "./CommandPalettePanel.tsx"
import {
  getWebSearchItem,
  LAUNCHER_ITEMS,
  LAUNCHER_PREFIXES,
  LAUNCHER_SUGGESTIONS,
  PanelFrame,
} from "./commandPalette.storyHelpers.tsx"
import type { CommandPaletteItem } from "./commandPaletteSections.ts"
import { useCommandPalette } from "./useCommandPalette.ts"

const meta = {
  title: "Components/Overlays/CommandPalette",
  component: CommandPalette,
  parameters: { layout: "padded" },
  argTypes: { itemSize: controlSizeArgType },
  args: {
    getFallbackItem: getWebSearchItem,
    isVisible: false,
    itemSize: "lg",
    items: LAUNCHER_ITEMS,
    label: "Search apps, bookmarks, and the web",
    maxResultsPerGroup: 6,
    onClose: () => {},
    placeholder: "Search apps, bookmarks, or the web",
    prefixes: LAUNCHER_PREFIXES,
    suggestions: LAUNCHER_SUGGESTIONS,
  },
} satisfies Meta<typeof CommandPalette>

export default meta

type Story = StoryObj<typeof meta>

/**
 * What an app writes: `useCommandPalette()` for the open state and the
 * global keys, a button for the pointer, and the palette.
 */
const LauncherDemo = ({
  isVisible: _isVisible,
  onClose: _onClose,
  ...paletteProps
}: CommandPaletteProps): ReactNode => {
  const palette = useCommandPalette()

  return (
    <div className="flex flex-col items-start gap-3">
      <Button
        appearance="soft"
        onClick={() => palette.open()}
        size="sm"
      >
        Search
      </Button>

      <p className="m-0 text-content-secondary text-sm">
        Or press Ctrl K, Ctrl Space, or /, or start typing.
      </p>

      <CommandPalette
        {...paletteProps}
        {...palette.paletteProps}
      />
    </div>
  )
}

export const Playground: Story = {
  parameters: playgroundParameters,
  render: (paletteProps) => (
    <LauncherDemo {...paletteProps} />
  ),
}

const panelProps = (
  paletteProps: CommandPaletteProps,
): CommandPalettePanelProps => {
  const {
    className: _className,
    isVisible: _isVisible,
    onClose: _onClose,
    ...rest
  } = paletteProps

  return rest
}

/**
 * The row's parts, and the three row sizes. Each panel is the
 * palette's contents laid out in place, so the boards can show every
 * case side by side; in an app it is always inside the dialog.
 */
export const AllVariants: Story = {
  render: (paletteProps) => (
    <div className="flex flex-col gap-6">
      <StorySection title="Rows: an icon, a highlighted title, a description (the folder), and a trailing hint. Every part but the title is optional.">
        <StoryGrid columns={2}>
          <StoryCell
            align="stretch"
            label="icon, description, hint"
          >
            <PanelFrame>
              <CommandPalettePanel
                {...panelProps(paletteProps)}
                defaultQuery="remote"
                label="Rows with every part"
              />
            </PanelFrame>
          </StoryCell>

          <StoryCell
            align="stretch"
            label="title only, and a long title that wraps"
          >
            <PanelFrame>
              <CommandPalettePanel
                {...panelProps(paletteProps)}
                defaultQuery="li"
                items={[
                  {
                    group: "Notes",
                    key: "list",
                    title: "Linen closet inventory",
                  },
                  {
                    group: "Notes",
                    key: "long",
                    title:
                      "Living room lamp timer schedule for the winter months, weekdays and weekends",
                  },
                ]}
                label="Rows with a title only"
              />
            </PanelFrame>
          </StoryCell>
        </StoryGrid>
      </StorySection>

      <StorySection title="itemSize sm, md and lg. The search field follows the rows.">
        <StoryGrid columns={3}>
          {(["sm", "md", "lg"] as const).map((itemSize) => (
            <StoryCell
              align="stretch"
              key={itemSize}
              label={`itemSize=${itemSize}`}
            >
              <PanelFrame>
                <CommandPalettePanel
                  {...panelProps(paletteProps)}
                  footer={null}
                  itemSize={itemSize}
                  label={`Search at ${itemSize}`}
                />
              </PanelFrame>
            </StoryCell>
          ))}
        </StoryGrid>
      </StorySection>
    </div>
  ),
}

/**
 * Every state the list can be in. The first is the reason the
 * component exists: it lists something before anything is typed.
 */
export const AllStates: Story = {
  render: (paletteProps) => (
    <StoryGrid columns={3}>
      <StoryCell
        align="stretch"
        label="before typing: suggestions"
      >
        <PanelFrame>
          <CommandPalettePanel
            {...panelProps(paletteProps)}
            label="Before typing"
          />
        </PanelFrame>
      </StoryCell>

      <StoryCell
        align="stretch"
        label={'"serv": word prefixes, then the fallback'}
      >
        <PanelFrame>
          <CommandPalettePanel
            {...panelProps(paletteProps)}
            defaultQuery="serv"
            label="Word prefixes"
          />
        </PanelFrame>
      </StoryCell>

      <StoryCell align="stretch" label={'"ha": initials'}>
        <PanelFrame>
          <CommandPalettePanel
            {...panelProps(paletteProps)}
            defaultQuery="ha"
            label="Initials"
          />
        </PanelFrame>
      </StoryCell>

      <StoryCell
        align="stretch"
        label={'"au lego": a prefix command'}
      >
        <PanelFrame>
          <CommandPalettePanel
            {...panelProps(paletteProps)}
            defaultQuery="au lego"
            label="Prefix command"
          />
        </PanelFrame>
      </StoryCell>

      <StoryCell
        align="stretch"
        label={'"zebra": only the fallback'}
      >
        <PanelFrame>
          <CommandPalettePanel
            {...panelProps(paletteProps)}
            defaultQuery="zebra"
            label="Only the fallback"
          />
        </PanelFrame>
      </StoryCell>

      <StoryCell
        align="stretch"
        label={'"zebra", no fallback: the empty label'}
      >
        <PanelFrame>
          <CommandPalettePanel
            {...panelProps(paletteProps)}
            defaultQuery="zebra"
            getFallbackItem={undefined}
            label="No matches"
          />
        </PanelFrame>
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * Opened over the page, before anything is typed. Like `Dialog`, the
 * palette is measured against the viewport, not a container, so this
 * story has no `ContainerBoard`: it is the window that varies. On a
 * wide window it hangs from the top at up to 45rem wide; in the Narrow
 * View it takes nearly the whole screen, and the key hints in the
 * footer give way to the prefix list.
 */
const OpenDemo = ({
  defaultQuery,
  isVisible: _isVisible,
  onClose: _onClose,
  ...paletteProps
}: CommandPaletteProps): ReactNode => {
  const [isVisible, setIsVisible] = useState(true)

  return (
    <div className="min-h-screen">
      <Button
        appearance="soft"
        onClick={() => setIsVisible(true)}
        size="sm"
      >
        Search
      </Button>

      <CommandPalette
        {...paletteProps}
        defaultQuery={defaultQuery}
        isVisible={isVisible}
        onClose={() => setIsVisible(false)}
      />
    </div>
  )
}

export const Responsive: Story = {
  render: (paletteProps) => <OpenDemo {...paletteProps} />,
}

/** Open with `serv` typed: matches under their groups, then the fallback row. */
export const OpenFiltered: Story = {
  args: { defaultQuery: "serv" },
  render: (paletteProps) => <OpenDemo {...paletteProps} />,
}

/** Open with `au lego` typed: one row, for the target that owns `au`. */
export const OpenPrefixCommand: Story = {
  args: { defaultQuery: "au lego" },
  render: (paletteProps) => <OpenDemo {...paletteProps} />,
}

/**
 * The whole keyboard path. Ctrl K, Ctrl Space or / open it with an
 * empty field; any other key opens it with that key typed. Arrow
 * keys, Home and End move; Enter opens the row; Ctrl Enter opens a
 * link row in a new tab; Escape closes, and focus goes back to where
 * it was. A clear button appears when the app passes `clearIcon`.
 */
const ClearIcon = (): ReactNode => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
    <path
      d="m6 6 12 12M18 6 6 18"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
    />
  </svg>
)

/**
 * Every row runs `onSelect` instead of navigating — the items, the
 * suggestions, the prefix rows and the fallback — so the story can
 * show what was chosen and never leaves the page.
 */
const InteractiveDemo = (
  paletteProps: CommandPaletteProps,
): ReactNode => {
  const [chosen, setChosen] = useState("nothing yet")

  const toChoice = (item: CommandPaletteItem) => ({
    ...item,
    href: undefined,
    onSelect: () => setChosen(item.title),
  })

  const items = paletteProps.items.map(toChoice)

  const suggestions = (paletteProps.suggestions ?? []).map(
    (group) => ({
      ...group,
      items: group.items.map(toChoice),
    }),
  )

  const prefixes = (paletteProps.prefixes ?? []).map(
    ({ getHref: _getHref, ...prefix }) => ({
      ...prefix,
      onSelect: (query: string) =>
        setChosen(`${prefix.label}: ${query}`),
    }),
  )

  const getFallbackItem = (query: string) => {
    const item = paletteProps.getFallbackItem?.(query)

    return item == null ? item : toChoice(item)
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <LauncherDemo
        {...paletteProps}
        getFallbackItem={getFallbackItem}
        items={items}
        prefixes={prefixes}
        suggestions={suggestions}
      />

      <label className="flex flex-col gap-1 text-content-secondary text-sm">
        A note on the page
        <input
          className="rounded-md border border-border-default bg-surface-raised px-3 py-2 text-content-primary"
          type="text"
        />
      </label>

      <p className="m-0 text-content-primary text-sm">
        Last chosen: {chosen}
      </p>
    </div>
  )
}

/**
 * The whole keyboard path. Ctrl K, Ctrl Space or / open it with an
 * empty field; any other key opens it with that key typed. Arrow
 * keys, Home and End move; Enter opens the row; Ctrl Enter opens a
 * link row in a new tab; Escape closes, and focus goes back to where
 * it was. A clear button appears when the app passes `clearIcon`.
 */
export const Interactive: Story = {
  args: { clearIcon: <ClearIcon /> },
  render: (paletteProps) => (
    <InteractiveDemo {...paletteProps} />
  ),
}
