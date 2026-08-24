import type { Meta, StoryObj } from "@storybook/react"

import { categoricalArgType } from "../argTypes.storyHelpers.ts"
import {
  StoryCell,
  StoryGrid,
  StoryRow,
  StorySection,
} from "../board.storyHelpers.tsx"
import { Card } from "../Card/Card.tsx"
import { Avatar } from "./Avatar.tsx"

/**
 * **Invented, every one of them.** The component was built for a
 * household task board, so its real fixture is a list of the people
 * who live there — which must never reach a published repo and
 * doubly never a committed screenshot, because a PNG is opaque to
 * every grep and no text scrub can redact it.
 *
 * So this is a fictional studio's roster: two-word names, a mononym,
 * a name whose first character is outside the BMP, and a
 * non-human account.
 */
const ROSTER = [
  { id: "user-1", name: "Ada Lovelace" },
  { id: "user-2", name: "Wren Okonkwo" },
  { id: "user-3", name: "Bo" },
  { id: "user-4", name: "Ines Marchetti" },
  { id: "user-5", name: "Tomas Ericsson" },
] as const

/**
 * A photo that needs no network and no fixture file. The initials
 * behind it are what the reader sees the moment it is absent, which
 * is the state that actually matters.
 */
const PORTRAIT_URL = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#2F6F4E"/><circle cx="32" cy="24" r="12" fill="#F2E8CF"/><rect x="12" y="40" width="40" height="28" rx="14" fill="#F2E8CF"/></svg>',
)}`

/** 404s, which is what makes the fallback real rather than mocked. */
const MISSING_PORTRAIT_URL =
  "/charcuterie-missing-portrait.png"

/**
 * A stand-in for an app's own glyph set. The library ships none, so
 * a story that wants one has to bring it — and a letter is the safe
 * choice in a sandbox whose font may lack the symbol.
 */
const AgentGlyph = () => <span>{"AI"}</span>

const meta = {
  title: "Components/Data/Avatar",
  component: Avatar,
  parameters: { layout: "padded" },
  argTypes: { categorical: categoricalArgType },
  args: {
    appearance: "soft",
    categorical: undefined,
    categoricalKey: undefined,
    icon: undefined,
    imageUrl: undefined,
    initials: undefined,
    name: "Ada Lovelace",
    size: "md",
  },
} satisfies Meta<typeof Avatar>

export default meta

type Story = StoryObj<typeof meta>

/**
 * Two letters on a colour nobody chose. The name is on the chip for
 * a screen reader and on hover for a pointer, and it is not printed
 * anywhere — `getByRole("img", { name: "Ada Lovelace" })` resolves.
 */
export const Default: Story = {}

/**
 * The three appearances, and the ten colours the scale holds.
 *
 * `soft` is the default because a lane of solid chips competes with
 * the card titles beside them. `solid` is for a chip that is the
 * only colour in its row; `outline` is the quiet one.
 */
export const AllVariants: Story = {
  render: (avatarProps) => (
    <StorySection title="The colour is a hash of the key, so the same person is the same colour on every machine and every reload.">
      <StoryGrid columns={3}>
        {(["soft", "outline", "solid"] as const).map(
          (appearance) => (
            <StoryCell key={appearance} label={appearance}>
              <StoryRow>
                {ROSTER.map((person) => (
                  <Avatar
                    {...avatarProps}
                    appearance={appearance}
                    categoricalKey={person.id}
                    key={person.id}
                    name={person.name}
                  />
                ))}
              </StoryRow>
            </StoryCell>
          ),
        )}
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * Everything the chip can be showing, including the two that are
 * easy to get wrong: a photo that does not load, and nobody at all.
 */
export const AllStates: Story = {
  render: (avatarProps) => (
    <StoryGrid columns={2}>
      <StoryCell label="sizes">
        <StoryRow>
          <Avatar {...avatarProps} size="sm" />

          <Avatar {...avatarProps} size="md" />

          <Avatar {...avatarProps} size="lg" />
        </StoryRow>
      </StoryCell>

      <StoryCell label="a mononym gets one letter">
        <Avatar {...avatarProps} name="Bo" />
      </StoryCell>

      <StoryCell label="a glyph instead of the letters">
        <Avatar
          {...avatarProps}
          icon={<AgentGlyph />}
          name="Agentic"
        />
      </StoryCell>

      <StoryCell label="a chosen colour beats the hash">
        <StoryRow>
          <Avatar
            {...avatarProps}
            categorical={4}
            name="Wren Okonkwo"
          />

          <Avatar
            {...avatarProps}
            categorical={9}
            name="Ines Marchetti"
          />
        </StoryRow>
      </StoryCell>

      <StoryCell label="a photo, clipped to the circle">
        <Avatar
          {...avatarProps}
          imageUrl={PORTRAIT_URL}
          name="Tomas Ericsson"
          size="lg"
        />
      </StoryCell>

      <StoryCell label="a photo that 404s falls back to the letters">
        <Avatar
          {...avatarProps}
          imageUrl={MISSING_PORTRAIT_URL}
          name="Kit Sandoval"
          size="lg"
        />
      </StoryCell>

      <StoryCell label="unassigned draws nothing at all">
        {/*
         * There is no chip in this cell, and that is the assertion.
         * A grey "None" placeholder is a fact nobody needed,
         * repeated down every unassigned row at the same weight as
         * the chips that mean something.
         */}
        <Avatar {...avatarProps} name={null} />
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * The placement it was built for: a row per task, the chip answering
 * "whose is this?" without spending a column on the word.
 *
 * The middle row is unassigned. It draws nothing, so the row is
 * shorter by exactly one chip and says nothing false.
 */
export const InAList: Story = {
  render: () => (
    <Card heading="Today">
      <ul className="flex list-none flex-col gap-2 p-0">
        {[
          {
            assignee: ROSTER[0],
            title:
              "Fold the second scheduler into the broker",
          },
          {
            assignee: undefined,
            title: "Fingerprint duplicate uploads",
          },
          {
            assignee: ROSTER[1],
            title: "One composed Storybook for the fleet",
          },
          {
            assignee: ROSTER[3],
            title: "Retire the legacy rest_command bridge",
          },
        ].map((task) => (
          <li
            className="flex items-center gap-3"
            key={task.title}
          >
            <Avatar
              categoricalKey={task.assignee?.id}
              name={task.assignee?.name}
              size="sm"
            />

            <span className="text-content-secondary text-sm">
              {task.title}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  ),
}
