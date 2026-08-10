import type { ColorSchemeMode } from "@charcuterie/logic"
import { type ReactNode, useState } from "react"

import { Badge } from "./Badge/Badge.tsx"
import { Button } from "./Button/Button.tsx"
import { Card } from "./Card/Card.tsx"
import { ColorSchemeToggle } from "./ColorSchemeToggle/ColorSchemeToggle.tsx"
import {
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from "./icons.storyHelpers.tsx"

/**
 * The furniture the four shell stories share: a rail's worth of
 * links, a page's worth of cards, the scheme control that lives in
 * the header, and the two things that make a page scroll sideways.
 *
 * `.storyHelpers.tsx` rather than `.tsx` because `react/no-multi-comp`
 * is switched off for that suffix, and it is excluded from the
 * package build so none of this ships.
 */

/**
 * A scheme control with its own state — `ColorSchemeToggle` rather
 * than `ColorSchemeSwitcher`, deliberately.
 *
 * The connected switcher writes `data-scheme` onto `<html>` and a
 * mode into `localStorage`. In a shell story that is a component
 * reaching outside its own canvas to re-theme Storybook and leave
 * a value behind for the next test, which is exactly the kind of
 * cross-test coupling `mountStory` exists to prevent. The
 * presentational half proves the same thing about `Header` — that
 * the actions slot holds the fleet's scheme control — and touches
 * nothing.
 */
export const HeaderSchemeToggle = (): ReactNode => {
  const [mode, setMode] =
    useState<ColorSchemeMode>("system")

  return (
    <ColorSchemeToggle
      icons={{
        dark: <MoonIcon />,
        light: <SunIcon />,
        system: <MonitorIcon />,
      }}
      mode={mode}
      onCycle={setMode}
      size="sm"
    />
  )
}

/** What a start rail holds: the app's sections. */
export const RailNavigation = (): ReactNode => (
  <>
    {["Queue", "Library", "Transfers", "Settings"].map(
      (section) => (
        <a
          className="rounded-md px-3 py-2 text-content-secondary text-sm hover:bg-intent-neutral-surface hover:text-content-primary"
          href={`#${section.toLowerCase()}`}
          key={section}
        >
          {section}
        </a>
      ),
    )}
  </>
)

/** What an end rail holds: the detail of whatever is selected. */
export const RailDetail = (): ReactNode => (
  <>
    <span className="font-semibold text-content-primary text-sm">
      Selected job
    </span>

    <span className="text-content-secondary text-sm">
      Disc 3 of 9 · reading at 6.0x
    </span>

    <Badge intent="success">Healthy</Badge>
  </>
)

/** An ordinary page, so a template shows something. */
export const PageContent = (): ReactNode => (
  <>
    <Card heading="Tonight's queue">
      <p className="text-content-secondary text-sm">
        Nine discs, three bays. The column stays readable at
        any window width because the cap is a token rather
        than a number somebody typed.
      </p>
    </Card>

    <Card
      actions={<Button size="sm">Start</Button>}
      heading="Bay 3"
    >
      <p className="text-content-secondary text-sm">
        Idle since 21:04.
      </p>
    </Card>
  </>
)

/**
 * Enough page to scroll, with **no landmarks in it**.
 *
 * `<PageContent />` twice would be the obvious way to make a tall
 * page and it is an accessibility violation: `Card` takes a
 * `region` landmark from its heading, so two copies are two pairs
 * of identically-named regions — axe's `landmark-unique`, and the
 * same "which one did the agent mean" ambiguity in a test. A
 * sticky-header demo needs height, not more landmarks.
 */
export const ScrollFiller = (): ReactNode => (
  <>
    {[
      "Bays are polled every two seconds.",
      "A stalled bay is one that has not moved a byte in forty.",
      "Verification runs after the last title, never during.",
      "The tower's USB hub is the single point of failure.",
      "Discs are ejected only once the hash matches.",
      "A retry lands in a different bay when one is free.",
      "Nothing here is a landmark, which is the point.",
      "Scroll to watch the header stay where it is.",
    ].map((line) => (
      <p
        className="text-content-secondary text-sm"
        key={line}
      >
        {line}
      </p>
    ))}
  </>
)

/**
 * The two things that actually make a page scroll sideways, and
 * they need different answers.
 *
 * The **path** is content that *can* wrap and does not, because
 * nothing in it is a break opportunity. `Main`'s `wrap-break-word`
 * handles it, so it is dropped in raw on purpose — if the shell
 * regresses, this is the fixture that notices.
 *
 * The **table** is content that genuinely cannot wrap: a table's
 * columns have min-content widths and no amount of
 * `overflow-wrap` reaches them. The only correct answer is a
 * scroll container around it — and because that container
 * scrolls, the columns off screen have to be reachable without a
 * mouse, which is axe's `scrollable-region-focusable`.
 *
 * There are two ways to satisfy it and this fixture takes the
 * better one: the row ends in a **link**, so tabbing to it
 * scrolls the container into view and the region needs nothing
 * else. The other way is `tabIndex={0}` on the container itself,
 * which is what a table of pure text needs — and which Biome's
 * `noNoninteractiveTabindex` rejects, unsafely-fixing the
 * attribute away before a suppression is even evaluated.
 * `Main.mdx` states both.
 */
export const OverflowingContent = (): ReactNode => (
  <>
    <p className="text-content-secondary text-sm">
      /mnt/Bunnies/Family/Media/Television/Some-Very-Long-Show-Name/Season-01/Some-Very-Long-Show-Name-S01E01-Pilot-2160p-HDR-DTS-HD-MA.mkv
    </p>

    <section
      aria-label="Transfer log, scrollable"
      className="charcuterie-scrollbar overflow-x-auto rounded-lg border border-border-subtle"
    >
      <table className="w-max border-collapse text-sm">
        <caption className="p-2 text-content-muted text-xs">
          Wider than a phone, on purpose.
        </caption>

        <thead>
          <tr>
            {[
              "Started",
              "Source volume",
              "Destination dataset",
              "Bytes moved",
              "Throughput",
              "Verified",
              "Job",
            ].map((column) => (
              <th
                className="whitespace-nowrap border-border-subtle border-b p-2 text-start text-content-secondary"
                key={column}
                scope="col"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          <tr>
            {[
              "21:04:11",
              "/mnt/Bunnies/Kevin/Incoming",
              "/mnt/Bunnies/Family/Media/Television",
              "48,912,338,112",
              "612 MB/s",
              "sha256 ok",
            ].map((cell) => (
              <td
                className="whitespace-nowrap p-2 text-content-primary"
                key={cell}
              >
                {cell}
              </td>
            ))}

            {/*
              The keyboard route into the off-screen columns.
              Tabbing to it scrolls the container, which is what
              axe's `scrollable-region-focusable` accepts and what
              makes the wide table usable without a mouse.
            */}
            <td className="whitespace-nowrap p-2">
              <a
                className="text-intent-accent-content underline"
                href="#transfer-4812"
              >
                Open
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </>
)
