import type { ReactNode } from "react"

/**
 * Story-only icons. **Nothing here ships.**
 *
 * The library deliberately owns no icon set — `IconButton`,
 * `EmptyState`, `Badge`, and `MediaTile` all take a `ReactNode`, and
 * lucide (ISC) is the fleet recommendation — but the boards still
 * have to show *something*, and what they show should be what an app
 * will actually pass: an inline SVG inheriting `currentColor`.
 *
 * They are hand-drawn rather than copied, and they exist for a second
 * reason worth writing down: **this sandbox's headless Chromium has
 * no font covering `⚙`, `↶`, `▨`, or `⚠`** — every one of those
 * measures blank, so a glyph-only board screenshots as an empty box
 * and a reviewer cannot tell a missing font from a broken component.
 * `IconButton`'s `RawGlyph` story keeps one glyph on purpose, because
 * a raw glyph is what plex-channels renders today and the point of
 * that story is that it gets a *name* regardless.
 */

/**
 * `aria-hidden` is repeated on every `<svg>` below rather than living
 * here, because Biome's `noSvgWithoutTitle` cannot see through a
 * spread — and a rule that fires on correct code gets switched off,
 * which would then miss the icon that really is unlabelled. Every
 * icon in this file is decoration beside a real name.
 */
const iconProps = {
  className: "size-[1.15em] shrink-0",
  fill: "none",
  focusable: false,
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 1.75,
  viewBox: "0 0 24 24",
  xmlns: "http://www.w3.org/2000/svg",
} as const

export const SettingsIcon = (): ReactNode => (
  <svg {...iconProps} aria-hidden="true">
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />

    <circle cx="16" cy="7" r="2.2" />

    <circle cx="10" cy="17" r="2.2" />
  </svg>
)

export const UndoIcon = (): ReactNode => (
  <svg {...iconProps} aria-hidden="true">
    <path d="M9 14 4 9l5-5" />

    <path d="M4 9h9a6 6 0 0 1 0 12h-3" />
  </svg>
)

export const RedoIcon = (): ReactNode => (
  <svg {...iconProps} aria-hidden="true">
    <path d="m15 14 5-5-5-5" />

    <path d="M20 9h-9a6 6 0 0 0 0 12h3" />
  </svg>
)

export const PlayIcon = (): ReactNode => (
  <svg {...iconProps} aria-hidden="true">
    <path d="M8 5.5v13l11-6.5z" />
  </svg>
)

export const InboxIcon = (): ReactNode => (
  <svg {...iconProps} aria-hidden="true">
    <path d="M3 13h4l2 3h6l2-3h4" />

    <path d="M5 5h14l2 8v6H3v-6z" />
  </svg>
)

export const SearchIcon = (): ReactNode => (
  <svg {...iconProps} aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="6.5" />

    <path d="m15.5 15.5 4.5 4.5" />
  </svg>
)

export const AlertIcon = (): ReactNode => (
  <svg {...iconProps} aria-hidden="true">
    <path d="M12 4 2.5 20h19z" />

    <path d="M12 10v4.5M12 17.5h.01" />
  </svg>
)

export const ImageOffIcon = (): ReactNode => (
  <svg {...iconProps} aria-hidden="true">
    <path d="M4 4h16v16H4z" />

    <path d="m4 20 6-7 4 4 3-3 3 3.5" />

    <path d="m3 3 18 18" />
  </svg>
)

export const DotIcon = (): ReactNode => (
  <svg
    {...iconProps}
    aria-hidden="true"
    fill="currentColor"
    stroke="none"
  >
    <circle cx="12" cy="12" r="4" />
  </svg>
)
