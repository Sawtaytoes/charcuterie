import { playgroundParameters } from "@charcuterie/storybook-config/story-parameters"
import type { Meta, StoryObj } from "@storybook/react"

import {
  controlSizeArgType,
  placementArgType,
} from "../argTypes.storyHelpers.ts"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StoryRow,
  StorySection,
} from "../board.storyHelpers.tsx"
import { Field } from "../Field/Field.tsx"
import { CatalogPicker } from "./CatalogPicker.tsx"
import {
  CATALOG_FAVORITES,
  CATALOG_GROUPS,
  CATALOG_ITEMS,
  CatalogPickerHarness,
  ClearIcon,
  InlineCatalogPanel,
} from "./catalogPicker.storyHelpers.tsx"

const meta = {
  title: "Components/Controls/CatalogPicker",
  component: CatalogPicker,
  parameters: { layout: "padded" },
  argTypes: {
    placement: placementArgType,
    size: controlSizeArgType,
  },
  args: {
    clearIcon: <ClearIcon />,
    favorites: CATALOG_FAVORITES,
    groups: CATALOG_GROUPS,
    items: CATALOG_ITEMS,
    label: "Agent",
    onChange: () => undefined,
    searchPlaceholder: "Search models…",
    value: "contoso/ct-lumen-4",
  },
} satisfies Meta<typeof CatalogPicker>

export default meta

type Story = StoryObj<typeof meta>

/**
 * Forty-odd invented models across six groups, with four favorites
 * and a pinned "Default". Open it, browse a group on the rail, or type
 * to search all of them at once.
 */
export const Playground: Story = {
  parameters: playgroundParameters,
  render: (args) => (
    <CatalogPickerHarness
      favorites={args.favorites}
      groups={args.groups}
      initialValue={args.value}
      isDisabled={args.isDisabled}
      items={args.items}
      label={args.label}
      placeholder={args.placeholder}
      size={args.size}
    />
  ),
}

/**
 * The trigger at each size, with an icon, with an initials badge, with
 * the accent ring of a second account, and with nothing chosen.
 */
export const AllVariants: Story = {
  render: () => (
    <StoryGrid columns={3}>
      {(["sm", "md", "lg"] as const).map((size) => (
        <StoryCell key={size} label={`size="${size}"`}>
          <CatalogPickerHarness
            initialValue="northwind/nw-swift-3"
            label={`Agent ${size} icon`}
            size={size}
          />
          <CatalogPickerHarness
            initialValue="tailspin/ts-glide-2"
            label={`Agent ${size} badge`}
            size={size}
          />
          <CatalogPickerHarness
            initialValue="contoso-work/ct-lumen-4"
            label={`Agent ${size} accent`}
            size={size}
          />
          <CatalogPickerHarness
            label={`Agent ${size} empty`}
            placeholder="Choose an agent…"
            size={size}
          />
        </StoryCell>
      ))}
    </StoryGrid>
  ),
}

/**
 * The panel drawn in place, so every state sits on one board: the
 * Favorites tab, a group tab with a disabled row, a search across
 * every group, and a search with no matches. The disabled trigger is
 * last.
 */
export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <StoryRow>
        <StorySection title="Favorites, with the chosen row">
          <InlineCatalogPanel
            label="Favorites panel"
            value="contoso/ct-lumen-4"
          />
        </StorySection>

        <StorySection title="A group, with a disabled row">
          <InlineCatalogPanel
            label="Group panel"
            value="fabrikam/fb-loom-7"
          />
        </StorySection>

        <StorySection title="Searching every group">
          <InlineCatalogPanel
            defaultQuery="lumen"
            label="Search panel"
            value="contoso/ct-lumen-4"
          />
        </StorySection>

        <StorySection title="No matches">
          <InlineCatalogPanel
            defaultQuery="zzz"
            label="Empty panel"
          />
        </StorySection>
      </StoryRow>

      <StorySection title="Disabled">
        <StoryRow>
          <CatalogPickerHarness
            initialValue="contoso/ct-lumen-4"
            isDisabled
            label="Disabled agent"
          />
        </StoryRow>
      </StorySection>
    </div>
  ),
}

/**
 * Inside a `Field` the trigger stretches to its container, the value
 * at the inline start and the chevron at the inline end; a name wider
 * than the container ends in an ellipsis. The panel is sized against
 * the window, not the container: it caps to the viewport, rail and
 * all, on a 384px phone.
 */
export const Responsive: Story = {
  render: () => (
    <ContainerBoard>
      {(width) => (
        <div className="flex flex-col gap-4">
          <Field label={`Agent at ${width}`}>
            <CatalogPickerHarness
              initialValue="northwind/nw-swift-3"
              label={`Agent at ${width}`}
            />
          </Field>
          <Field label={`Long agent at ${width}`}>
            <CatalogPickerHarness
              initialValue="tailspin/ts-tailwind-research-preview-with-a-very-long-name"
              label={`Long agent at ${width}`}
            />
          </Field>
        </div>
      )}
    </ContainerBoard>
  ),
}

/**
 * The complete keyboard path. Open with Enter or Space; type to search
 * every group; ArrowUp and ArrowDown move the highlight, Home and End
 * jump; Enter chooses and closes. Tab moves to the rail, where the
 * arrows move between groups and Enter shows one; Tab goes back to the
 * search field. Escape clears a query, then closes and returns focus
 * to the trigger.
 */
export const Interactive: Story = {
  render: () => (
    <CatalogPickerHarness
      initialValue="northwind/nw-harbor-4"
      label="Agent"
    />
  ),
}

/**
 * No favorites: the rail starts at the first group, and opening lands
 * on the chosen row's group.
 */
export const WithoutFavorites: Story = {
  render: () => (
    <CatalogPickerHarness
      favorites={[]}
      initialValue="litware/lw-margin-2"
      label="Agent without favorites"
    />
  ),
}
