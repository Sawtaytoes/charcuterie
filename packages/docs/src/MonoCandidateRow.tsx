import type { Candidate } from "./fontCandidates.ts"

/**
 * One monospace candidate: ligatures, a cursive-italic line, and the
 * numerals that decide it.
 *
 * Three separate samples because a mono is chosen for three
 * different jobs, and a face can win one and lose another:
 *
 *  - **the ligature line** is the reason this axis exists. Every
 *    candidate here has contextual alternates; they differ in how
 *    many and how loud.
 *  - **the italic line** is the actual gap between Dank Mono and
 *    the free options — a genuinely cursive italic rather than an
 *    obliqued roman.
 *  - **the numeral line** is the one that matters on a kiosk. `1Il`
 *    and `0O` collisions in a byte count are a support call, not a
 *    matter of taste, and a ligature set does nothing about them.
 */
export const MonoCandidateRow = ({
  candidate,
}: {
  candidate: Candidate
}) => (
  <section
    data-mono-font={candidate.id ?? "system"}
    className="border-border-subtle border-t pt-5"
  >
    <header className="mb-3 flex flex-wrap items-baseline gap-x-3">
      <h3
        data-display-face
        className="text-content-primary text-lg font-semibold"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {candidate.name}
      </h3>
      <span className="text-content-tertiary text-xs">
        {candidate.foundry}
      </span>
    </header>

    <p className="text-content-secondary mb-4 max-w-prose text-sm">
      {candidate.note}
    </p>

    <div
      className="text-content-primary flex flex-col gap-1 text-sm"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <span>
        {"=> -> <- >= <= != !== === |> ?? ?. && ||"}
      </span>
      <span>
        {
          "const isDone = rip?.status !== 'failed' && bay >= 7"
        }
      </span>
      <span className="italic">
        {
          "// cursive italic: if (retries > 2) abortRip(bay)"
        }
      </span>
      <span className="tabular-nums">
        1Il · 0O · S5 · 2Z · rB8 · 04:12:38 · 41.2 GB
      </span>
    </div>
  </section>
)
