import {
  FontPairingBlock,
  PAIRINGS,
} from "./FontPairingBlock.tsx"

/**
 * The M5 font bake-off, all candidates on one page.
 *
 * The toolbar's `Font` axis re-fonts every *other* story, which is
 * the right way to judge a candidate in situ. It is the wrong way to
 * *choose*, because comparing two faces means holding both in your
 * eye at once and a toolbar can only show one at a time. So this
 * page pins each pairing to its own block via a nested `data-font`
 * attribute — the same values the toolbar writes onto `<html>`,
 * which is why `fontCandidates.css` declares both selector forms.
 */
export const FontSpecimen = () => (
  <div className="bg-surface-base text-content-primary min-h-screen p-8">
    <h2
      className="text-content-primary mb-2 text-2xl font-bold"
      style={{ fontFamily: "var(--font-display)" }}
    >
      Font candidates
    </h2>
    <p className="text-content-secondary mb-8 max-w-prose text-sm">
      Five blocks, identical content, one pairing each. All
      faces are self-hosted woff2 (latin only) — nothing
      here reaches fonts.gstatic.com at runtime, which is
      the rule image-viewer already settled. Flip{" "}
      <strong>Variant</strong>, <strong>Density</strong> and{" "}
      <strong>Scheme</strong> in the toolbar to judge a
      pairing under the condition it will actually be read
      in; the kiosk Pis run <code>density=kiosk</code> and
      every app is currently dark.
    </p>

    <div className="flex flex-col gap-10">
      {PAIRINGS.map((pairing) => (
        <FontPairingBlock
          key={pairing.name}
          pairing={pairing}
        />
      ))}
    </div>
  </div>
)
