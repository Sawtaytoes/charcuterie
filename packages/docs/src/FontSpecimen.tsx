import { BodyCandidateBlock } from "./BodyCandidateBlock.tsx"
import {
  BODIES,
  HEADINGS,
  MONOS,
} from "./fontCandidates.ts"
import { HeadingCandidateRow } from "./HeadingCandidateRow.tsx"
import { MonoCandidateRow } from "./MonoCandidateRow.tsx"

/**
 * The M5 font bake-off: two axes, compared one at a time.
 *
 * The toolbar's Heading and Body axes re-font every *other* story,
 * which is the right way to judge a candidate in situ. It is the
 * wrong way to *choose*, because comparing two faces means holding
 * both in your eye at once and a toolbar can only show one.
 *
 * So each section below pins its own axis and lets the other one
 * float to whatever the toolbar says. Pick a heading in the
 * toolbar, then scan the body list under it; or pin a body and scan
 * headings. That composition is the whole point of splitting the
 * axes, and it is why nothing here hardcodes a pairing.
 */
export const FontSpecimen = () => (
  <div className="bg-surface-base text-content-primary min-h-screen p-8">
    <h2
      data-display-face
      className="text-content-primary mb-2 text-2xl font-bold"
      style={{ fontFamily: "var(--font-display)" }}
    >
      Font candidates
    </h2>
    <p className="text-content-secondary mb-8 max-w-prose text-sm">
      Every heading composes with every body — 7 x 10 — and
      the two lists below each vary one axis while
      inheriting the other from the toolbar. All faces are
      self-hosted woff2, latin only; nothing reaches
      fonts.gstatic.com at runtime. Flip{" "}
      <strong>Density</strong>, <strong>Variant</strong> and{" "}
      <strong>Scheme</strong> to judge a candidate under the
      condition it will actually be read in — the kiosk Pis
      run <code>density=kiosk</code>, ripdeck's bay list
      runs <code>compact</code>, and every app is currently
      dark.
    </p>

    <h3
      data-display-face
      className="text-content-primary mt-2 mb-1 text-xl font-bold"
      style={{ fontFamily: "var(--font-display)" }}
    >
      Headings
    </h3>
    <p className="text-content-secondary mb-6 max-w-prose text-sm">
      Body copy in each block stays on the toolbar's Body
      face, so these are judged against whatever you have
      chosen to pair them with.
    </p>
    <div className="mb-12 flex flex-col gap-6">
      {HEADINGS.map((candidate) => (
        <HeadingCandidateRow
          key={candidate.name}
          candidate={candidate}
        />
      ))}
    </div>

    <h3
      data-display-face
      className="text-content-primary mt-2 mb-1 text-xl font-bold"
      style={{ fontFamily: "var(--font-display)" }}
    >
      Body faces
    </h3>
    <p className="text-content-secondary mb-6 max-w-prose text-sm">
      Ordered roundest-workhorse first. Headings in each
      block follow the toolbar's Heading face.
    </p>
    <div className="mb-12 flex flex-col gap-6">
      {BODIES.map((candidate) => (
        <BodyCandidateBlock
          key={candidate.name}
          candidate={candidate}
        />
      ))}
    </div>

    <h3
      data-display-face
      className="text-content-primary mt-2 mb-1 text-xl font-bold"
      style={{ fontFamily: "var(--font-display)" }}
    >
      Monospace
    </h3>
    <p className="text-content-secondary mb-6 max-w-prose text-sm">
      Dank Mono first, because it is the pick; the three
      under it are the licensable fallback plan rather than
      rival proposals. All four have ligatures — they differ
      in how many, how loud, and whether the italic is
      genuinely cursive or just an obliqued roman.
    </p>
    <div className="flex flex-col gap-6">
      {MONOS.map((candidate) => (
        <MonoCandidateRow
          key={candidate.name}
          candidate={candidate}
        />
      ))}
    </div>
  </div>
)
