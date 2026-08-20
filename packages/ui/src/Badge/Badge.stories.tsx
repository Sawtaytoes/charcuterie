import {
  asyncTransitions,
  useStatus,
} from "@charcuterie/logic"
import {
  CATEGORICAL_HUES,
  CATEGORICAL_INDEXES,
  getCategoricalIndex,
} from "@charcuterie/tokens"
import type { Meta, StoryObj } from "@storybook/react"
import {
  categoricalArgType,
  intentArgType,
} from "../argTypes.storyHelpers.ts"
import { Button } from "../Button/Button.tsx"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StoryRow,
  StorySection,
} from "../board.storyHelpers.tsx"
import { DotIcon } from "../icons.storyHelpers.tsx"
import {
  getAsyncIntent,
  getAsyncLabel,
} from "../statusIntent.ts"
import { Badge } from "./Badge.tsx"

const INTENTS = [
  "neutral",
  "accent",
  "success",
  "warning",
  "danger",
  "info",
] as const

const meta = {
  title: "Components/Badge",
  component: Badge,
  parameters: { layout: "padded" },
  argTypes: {
    categorical: categoricalArgType,
    intent: intentArgType,
  },
  // The component's own defaults, restated — Storybook does not
  // seed `args` from docgen, so an unstated default shows in the
  // props table with nothing selected in its control.
  args: {
    appearance: "soft",
    intent: "neutral",
    overflow: "truncate",
    size: "md",
  },
} satisfies Meta<typeof Badge>

export default meta

type Story = StoryObj<typeof meta>

/**
 * A badge has no role by design — it is a word about something
 * else, not a live region — so the handle an agent reads off the row
 * is its text.
 */
export const Default: Story = {
  args: { children: "running", intent: "info" },
}

export const AllVariants: Story = {
  args: { children: "running" },
  // `categorical` is destructured out rather than spread: this board
  // is about intents, and the type refuses a badge holding both — a
  // badge is one colour.
  render: ({ categorical, ...badgeProps }) => (
    <StorySection title="Six intents x three appearances. rip-deck declares this map twice, in two files, with hardcoded hexes.">
      <StoryGrid columns={6}>
        {(["soft", "solid", "outline"] as const).flatMap(
          (appearance) =>
            INTENTS.map((intent) => (
              <StoryCell
                key={`${appearance}-${intent}`}
                label={`${appearance} · ${intent}`}
              >
                <Badge
                  {...badgeProps}
                  appearance={appearance}
                  intent={intent}
                >
                  {intent}
                </Badge>
              </StoryCell>
            )),
        )}
      </StoryGrid>
    </StorySection>
  ),
}

export const AllStates: Story = {
  args: { children: "running" },
  render: ({ categorical, ...badgeProps }) => (
    <StorySection title="A badge is static — no hover, no focus, no disabled. What varies is size, an optional glyph, and how it sits in a real row.">
      <StoryGrid columns={2}>
        <StoryCell label="sm">
          <Badge {...badgeProps} size="sm" />
        </StoryCell>

        <StoryCell label="md">
          <Badge {...badgeProps} size="md" />
        </StoryCell>

        <StoryCell label="with a glyph">
          <Badge
            {...badgeProps}
            icon={<DotIcon />}
            intent="success"
          >
            verified
          </Badge>
        </StoryCell>

        <StoryCell label="in a job row">
          <div className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface-raised p-2">
            <span className="text-content-primary text-sm">
              Blade Runner (1982)
            </span>

            <Badge intent="success" size="sm">
              completed
            </Badge>
          </div>
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * The numbered family, which means nothing on purpose.
 *
 * Ten hues, contrast-gated in both schemes and both directions, so
 * a user picking a colour for a label cannot pick one that is
 * unreadable. That is the whole difference between this and
 * `Swatch`: `Swatch` takes a colour arriving from the world — a
 * physical sticker, an accent pulled off an album cover — and can
 * make no promises about it at all.
 *
 * Flip the scheme in the toolbar. Every pill here holds its ratio
 * on both sides, and the ring stays separable on both.
 */
export const Categorical: Story = {
  args: { children: "label" },
  render: ({ intent, ...badgeProps }) => (
    <StorySection title="Ten indexes x three appearances. Numbered, not named — a user's label is not a status.">
      <StoryGrid columns={5}>
        {(["soft", "solid", "outline"] as const).flatMap(
          (appearance) =>
            CATEGORICAL_INDEXES.map((index) => (
              <StoryCell
                key={`${appearance}-${index}`}
                label={`${appearance} · ${index} ${CATEGORICAL_HUES[index].label}`}
              >
                <Badge
                  {...badgeProps}
                  appearance={appearance}
                  categorical={index}
                >
                  {CATEGORICAL_HUES[index].label}
                </Badge>
              </StoryCell>
            )),
        )}
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * Invented labels, coloured by `getCategoricalIndex(name)` — the
 * deterministic fallback for the rows that existed before anybody
 * thought about colour.
 *
 * The point of the row is what it looks like *as a row*: this is
 * how a task list reads when a dozen labels are on screen at once,
 * which is the only place a categorical palette is really tested.
 * Nobody compares two swatches in a specimen board; they scan a
 * list for the green one.
 */
export const CategoricalLabels: Story = {
  args: { children: "label" },
  render: () => (
    <StorySection title="Colour from the name, so a hundred pre-existing rows need no migration — and a stored pick still wins.">
      <div className="flex flex-wrap gap-2">
        {[
          "Homelab",
          "Errands",
          "Anime backlog",
          "Garage",
          "Kitchen",
          "Reading",
          "Music library",
          "Firmware",
          "Bikes",
          "Prints",
        ].map((label) => (
          <Badge
            categorical={getCategoricalIndex(label)}
            key={label}
          >
            {label}
          </Badge>
        ))}
      </div>
    </StorySection>
  ),
}

/**
 * A label longer than the space it is given, which is the case that
 * shipped broken: `shrink-0` plus `whitespace-nowrap` and no cap let
 * the pill paint straight across the next column.
 *
 * `truncate` keeps the row height fixed and paints an ellipsis —
 * and because that ellipsis is painted rather than inserted, a
 * triple-click still selects the whole string and a screen reader
 * still reads it. Hovering a clipped pill shows the rest.
 *
 * `wrap` is the answer where hover does not exist. The kiosk is a
 * touch context, so a pill whose full text matters wraps there
 * rather than hiding half of itself behind an affordance nobody can
 * reach.
 */
export const Responsive: Story = {
  args: {
    children: "quarantined — checksum mismatch on title 4",
    intent: "warning",
  },
  render: (badgeProps) => (
    <div className="flex flex-col gap-8">
      <StorySection title="overflow: truncate (default) — one line, capped, hover for the rest">
        <ContainerBoard>
          <Badge {...badgeProps} />
        </ContainerBoard>
      </StorySection>

      <StorySection title="overflow: wrap — the pill grows instead">
        <ContainerBoard>
          <Badge {...badgeProps} overflow="wrap" />
        </ContainerBoard>
      </StorySection>
    </div>
  ),
}

const AsyncStatusBadge = () => {
  const { reset, status, transitionTo } = useStatus({
    initialState: "idle",
    transitions: asyncTransitions,
  })

  return (
    <StoryRow>
      <Badge intent={getAsyncIntent(status)}>
        {getAsyncLabel(status)}
      </Badge>

      <Button
        appearance="soft"
        onClick={() => {
          transitionTo("loading")
        }}
        size="sm"
      >
        Start
      </Button>

      <Button
        appearance="soft"
        intent="success"
        onClick={() => {
          transitionTo("success")
        }}
        size="sm"
      >
        Succeed
      </Button>

      <Button
        appearance="soft"
        intent="danger"
        onClick={() => {
          transitionTo("error")
        }}
        size="sm"
      >
        Fail
      </Button>

      <Button appearance="ghost" onClick={reset} size="sm">
        Reset
      </Button>
    </StoryRow>
  )
}

/**
 * The M2 join, live: one `asyncTransitions` machine, one
 * `getAsyncIntent`, and a badge that cannot render a state the
 * machine does not have.
 *
 * Press *Succeed* before *Start* and the badge does not move:
 * `idle → success` is not a legal edge, so the core throws (loudly,
 * in the console) rather than painting a green pill over a job that
 * never ran. That is the difference between this and mux-magic's
 * `Record<string, string>`, which renders whatever string it is
 * handed and colours an unknown one as nothing at all.
 */
export const Interactive: Story = {
  args: { children: "running" },
  render: () => <AsyncStatusBadge />,
}
