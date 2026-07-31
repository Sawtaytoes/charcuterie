import type { Candidate } from "./fontCandidates.ts"

/**
 * One heading candidate, at the three sizes a heading actually
 * appears at.
 *
 * The block pins `data-heading-font` and deliberately does *not*
 * pin a body — so the surrounding prose stays on whatever the
 * toolbar's Body axis says. That is what makes the two specimens
 * compose: each isolates one axis and inherits the other, so
 * choosing a body and then scanning headings under it is one
 * toolbar click rather than a rebuild.
 *
 * `data-display-face` marks the elements that carry the display
 * family. It is what `fontCandidates.css` hangs Fraunces Soft's
 * `font-variation-settings` on — scoped to these elements rather
 * than to the container, because variation settings are a
 * low-level override that would otherwise leak onto body copy in a
 * different family entirely.
 */
export const HeadingCandidateRow = ({
  candidate,
}: {
  candidate: Candidate
}) => (
  <section
    data-heading-font={candidate.id ?? "system"}
    className="border-border-subtle border-t pt-5"
  >
    <header className="mb-3 flex flex-wrap items-baseline gap-x-3">
      <h3 className="text-content-primary text-sm font-semibold">
        {candidate.name}
      </h3>
      <span className="text-content-tertiary text-xs">
        {candidate.foundry}
      </span>
    </header>

    <p
      data-display-face
      className="text-content-primary text-2xl leading-tight font-bold"
      style={{ fontFamily: "var(--font-display)" }}
    >
      Bay 07 — Disc 2 of 4
    </p>
    <p
      data-display-face
      className="text-content-primary mt-1 text-xl leading-tight font-semibold"
      style={{ fontFamily: "var(--font-display)" }}
    >
      Comics, music, and discs
    </p>
    <p
      data-display-face
      className="text-content-primary mt-1 text-lg font-semibold"
      style={{ fontFamily: "var(--font-display)" }}
    >
      Recently added — 41 items
    </p>

    <p className="text-content-secondary mt-3 max-w-prose text-sm">
      {candidate.note}
    </p>
  </section>
)
