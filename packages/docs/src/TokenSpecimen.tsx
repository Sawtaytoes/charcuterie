import type { ReactNode } from "react"

/**
 * Every class name is written out in full, deliberately.
 *
 * Tailwind v4 scans source text for *complete* class strings, so
 * `` `bg-intent-${intent}-solid` `` generates nothing at all and
 * fails silently — the element simply renders unstyled, which
 * reads as "the token layer is broken" rather than "the scanner
 * never saw it". Interpolated utility names are the single most
 * common way to lose an afternoon to Tailwind, so the fleet
 * writes them out.
 */
const INTENT_STYLES = [
  {
    name: "neutral",
    pill: "bg-intent-neutral-surface text-intent-neutral-content border-intent-neutral-border",
    solid:
      "bg-intent-neutral-solid text-intent-neutral-on-solid",
  },
  {
    name: "accent",
    pill: "bg-intent-accent-surface text-intent-accent-content border-intent-accent-border",
    solid:
      "bg-intent-accent-solid text-intent-accent-on-solid",
  },
  {
    name: "success",
    pill: "bg-intent-success-surface text-intent-success-content border-intent-success-border",
    solid:
      "bg-intent-success-solid text-intent-success-on-solid",
  },
  {
    name: "warning",
    pill: "bg-intent-warning-surface text-intent-warning-content border-intent-warning-border",
    solid:
      "bg-intent-warning-solid text-intent-warning-on-solid",
  },
  {
    name: "danger",
    pill: "bg-intent-danger-surface text-intent-danger-content border-intent-danger-border",
    solid:
      "bg-intent-danger-solid text-intent-danger-on-solid",
  },
  {
    name: "info",
    pill: "bg-intent-info-surface text-intent-info-content border-intent-info-border",
    solid: "bg-intent-info-solid text-intent-info-on-solid",
  },
] as const

/**
 * `disabled` is missing from this list on purpose — it is shown
 * further down on an actually-disabled `<button>`.
 *
 * WCAG 1.4.3 exempts *inactive controls*, not low-contrast prose,
 * and the contrast audit's exemption is written to match. Render
 * the same colour as a paragraph and axe is right to fail it: at
 * 2.6:1 it is unreadable body text. The exemption is only honest
 * where the role is actually used.
 */
const CONTENT_STYLES = [
  {
    name: "primary",
    className: "text-content-primary",
  },
  {
    name: "secondary",
    className: "text-content-secondary",
  },
  { name: "muted", className: "text-content-muted" },
] as const

const SURFACE_STYLES = [
  { name: "base", className: "bg-surface-base" },
  { name: "raised", className: "bg-surface-raised" },
  { name: "sunken", className: "bg-surface-sunken" },
  {
    name: "overlay",
    className: "bg-surface-overlay",
  },
] as const

const panelStyle = {
  borderWidth: "1px",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-5)",
  marginBlockEnd: "var(--space-5)",
}

const headingStyle = {
  fontSize: "var(--font-size-lg)",
  fontWeight: "var(--font-weight-medium)",
  marginBlockEnd: "var(--space-3)",
}

/**
 * The throwaway component M1's Storybook shell is built against.
 *
 * Deliberately **not** a library component and not a candidate to
 * become one — it exists to answer one question: does flipping
 * `data-scheme`, `data-density`, or `data-variant` on `<html>`
 * repaint everything without React knowing? If it does here, the
 * token layer works, and M3 can start building real components
 * against a substrate that has already been proven.
 *
 * Two things it demonstrates on purpose:
 *
 *  - **Colours come from Tailwind utilities** (`bg-surface-raised`,
 *    `text-content-muted`, `bg-intent-danger-solid`). Those exist
 *    only because `@charcuterie/tokens/theme.css` put `--color-*`
 *    into a `@theme` block. That is the exact mechanism mux-magic
 *    picks up in its four-line swap.
 *  - **Radius, spacing, and type come through `var()`** rather
 *    than a utility, because `theme.css` currently maps only the
 *    colour namespace into `@theme`. Mapping `--radius-*`,
 *    `--space-*`, and `--font-size-*` onto Tailwind's `--radius-*`
 *    / `--spacing-*` / `--text-*` namespaces is a real open item;
 *    writing it as `var()` here keeps the gap visible instead of
 *    letting it fall back to Tailwind's defaults unnoticed.
 */
export const TokenSpecimen = ({
  heading = "Token specimen",
}: {
  heading?: string
}): ReactNode => (
  <div
    className="bg-surface-base text-content-primary"
    style={{
      fontFamily: "var(--font-sans)",
      fontSize: "var(--font-size-md)",
      padding: "var(--space-6)",
    }}
  >
    <h1
      style={{
        fontSize: "var(--font-size-2xl)",
        fontWeight: "var(--font-weight-semibold)",
        lineHeight: "var(--line-height-tight)",
        marginBlockEnd: "var(--space-1)",
      }}
    >
      {heading}
    </h1>

    <p
      className="text-content-secondary"
      style={{ marginBlockEnd: "var(--space-6)" }}
    >
      Every value below is a CSS custom property. Switch
      Scheme, Density, or Variant in the toolbar — React
      never re-renders.
    </p>

    <section
      className="bg-surface-raised border-border-subtle"
      style={{
        ...panelStyle,
        boxShadow: "var(--elevation-low)",
      }}
    >
      <h2 style={headingStyle}>Content roles</h2>

      <ul
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        {CONTENT_STYLES.map((role) => (
          <li key={role.name} className={role.className}>
            content.{role.name} — the quick brown fox jumps
            over the lazy dog
          </li>
        ))}
      </ul>
    </section>

    <section
      className="bg-surface-raised border-border-subtle"
      style={panelStyle}
    >
      <h2 style={headingStyle}>
        Intents — tinted pill, then solid fill
      </h2>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-2)",
          marginBlockEnd: "var(--space-4)",
        }}
      >
        {INTENT_STYLES.map((intent) => (
          <span
            key={intent.name}
            className={intent.pill}
            style={{
              borderWidth: "1px",
              borderRadius: "var(--radius-full)",
              paddingInline: "var(--space-3)",
              paddingBlock: "var(--space-1)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            {intent.name}
          </span>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-2)",
        }}
      >
        {INTENT_STYLES.map((intent) => (
          <button
            key={intent.name}
            type="button"
            className={intent.solid}
            style={{
              blockSize: "var(--control-height-md)",
              paddingInline:
                "var(--control-padding-inline-md)",
              borderRadius: "var(--radius-md)",
              fontWeight: "var(--font-weight-medium)",
            }}
          >
            {intent.name}
          </button>
        ))}

        <button
          type="button"
          disabled
          className="bg-surface-sunken text-content-disabled border-border-subtle"
          style={{
            blockSize: "var(--control-height-md)",
            paddingInline:
              "var(--control-padding-inline-md)",
            borderRadius: "var(--radius-md)",
            borderWidth: "1px",
            fontWeight: "var(--font-weight-medium)",
          }}
        >
          disabled
        </button>
      </div>
    </section>

    <section
      className="bg-surface-sunken border-border-default"
      style={{ ...panelStyle, marginBlockEnd: "0" }}
    >
      <h2 style={headingStyle}>Surfaces</h2>

      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
        }}
      >
        {SURFACE_STYLES.map((surface) => (
          <div
            key={surface.name}
            className={`${surface.className} border-border-strong text-content-secondary`}
            style={{
              borderWidth: "1px",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-4)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            {surface.name}
          </div>
        ))}
      </div>
    </section>
  </div>
)
