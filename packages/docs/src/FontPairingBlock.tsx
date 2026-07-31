import {
  Badge,
  Button,
  Card,
  ProgressBar,
} from "@charcuterie/ui"

/**
 * One M5 font-candidate block, plus the candidate list itself.
 *
 * The toolbar's `Font` axis re-fonts every *other* story, which is
 * the right way to judge a candidate in situ. It is the wrong way to
 * *choose*, because comparing two faces means holding both in your
 * eye at once and a toolbar can only show one at a time. So this
 * page pins each pairing to its own block via a nested `data-font`
 * attribute — the same values the toolbar writes onto `<html>`,
 * which is why `fontCandidates.css` declares both selector forms.
 *
 * Every block renders the *same* content, and it is real product
 * text rather than pangrams: a rip that is failing, a bay label, a
 * duration, a byte count. A face that looks lovely over "Handgloves"
 * and then falls apart on `04:12:38 · 41.2 GB` is a face that fails
 * on ripdeck's actual surface, and that is the thing worth seeing.
 */

export type Pairing = {
  /** The `data-font` value. `null` is today's shipped state. */
  readonly id: string | null
  readonly name: string
  /** Why it is in the running — the trade, not the sales pitch. */
  readonly note: string
  readonly foundry: string
}

export const PAIRINGS: readonly Pairing[] = [
  {
    id: null,
    name: "System",
    note: "What ships today. Different on every machine in the fleet — Segoe on the Windows boxes, Roboto on the Pis — so the design system currently has no typographic opinion at all. This is the baseline, not a candidate.",
    foundry: "—",
  },
  {
    id: "source-sans-3",
    name: "Source Sans 3",
    note: "The fleet-consistency pick: image-viewer is locked to Source Sans Pro, and this is that face one major on. Calm, slightly narrow, disappears into the UI. The least fancy of the four, which may be the point or may be the objection.",
    foundry: "Adobe · US",
  },
  {
    id: "inter",
    name: "Inter",
    note: "The screen-first neutral. Tall x-height and open apertures hold up at 13px in a dense list, which is what most of these surfaces are. Safe, extremely common, and reads as 'a modern app' rather than as anything of ours.",
    foundry: "Rasmus Andersson · Sweden",
  },
  {
    id: "fraunces",
    name: "Fraunces + Inter",
    note: "The fanciest option, and the only one giving headings a face of their own. Fraunces is a variable display serif with an optical-size axis, so large headings get the display cut automatically. Body stays on Inter — a serif body in a 16-bay list would be a mistake. Watch whether the serif reads as characterful or as out-of-place next to a progress bar.",
    foundry: "Undercase Type · US",
  },
  {
    id: "bricolage",
    name: "Bricolage + Public Sans",
    note: "Fancy without going serif. Bricolage is a deliberately slightly-wonky grotesque; Public Sans under it is plain and civic, so the character stays in the headings. The risk is the opposite of Fraunces': the wonk may read as a mistake rather than as a choice.",
    foundry: "Mathieu Triay · UK / USWDS · US",
  },
]

/**
 * One pairing, rendered as a slice of an actual product surface.
 *
 * Headings use `--font-display` and body uses `--font-sans`; in
 * three of the five pairings those resolve to the same family, and
 * seeing that they *don't* diverge is as informative as seeing that
 * they do.
 */
export const FontPairingBlock = ({
  pairing,
}: {
  pairing: Pairing
}) => (
  <section
    // `undefined` rather than `"system"` — the baseline is the
    // absence of an override, so it inherits whatever the toolbar
    // says. Setting a value here would make this block ignore the
    // very axis it is documenting.
    data-font={pairing.id ?? undefined}
    className="border-border-subtle border-t pt-6"
  >
    <header className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h3
        className="text-content-primary text-xl font-semibold"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {pairing.name}
      </h3>
      <span className="text-content-tertiary text-xs">
        {pairing.foundry}
      </span>
    </header>

    <p className="text-content-secondary mb-6 max-w-prose text-sm">
      {pairing.note}
    </p>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card padding="md">
        <h4
          className="text-content-primary mb-1 text-2xl font-bold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Bay 07 — Disc 2 of 4
        </h4>
        <p className="text-content-secondary mb-4 text-sm">
          Ripping <em>The Leopard</em> (1963) · MakeMKV
          reported 3 titles, keeping the longest.
        </p>

        <ProgressBar
          value={62}
          label="Rip progress"
          intent="accent"
        />

        <dl className="text-content-secondary mt-4 grid grid-cols-3 gap-2 text-sm">
          <div>
            <dt className="text-content-tertiary text-xs">
              Elapsed
            </dt>
            <dd
              className="text-content-primary tabular-nums"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              04:12:38
            </dd>
          </div>
          <div>
            <dt className="text-content-tertiary text-xs">
              Written
            </dt>
            <dd
              className="text-content-primary tabular-nums"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              41.2 GB
            </dd>
          </div>
          <div>
            <dt className="text-content-tertiary text-xs">
              Rate
            </dt>
            <dd
              className="text-content-primary tabular-nums"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              18.4 MB/s
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button intent="accent" size="md">
            Open in Kavita
          </Button>
          <Button intent="neutral" size="md">
            Cancel rip
          </Button>
          <Badge intent="warning">Retry 2</Badge>
          <Badge intent="success">Verified</Badge>
        </div>
      </Card>

      <Card padding="md">
        {/* The type scale, top to bottom. Six steps is small enough
         * that a face's whole range is visible at once — where the
         * weights stop separating, and where a display face starts
         * looking oversized rather than large. */}
        <h4
          className="text-content-primary mb-3 text-lg font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          The scale
        </h4>

        <p
          className="text-content-primary text-2xl leading-tight font-bold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Charcuterie
        </p>
        <p
          className="text-content-primary text-xl leading-tight font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Comics, music, and discs
        </p>
        {/* `text-md`, not Tailwind's `text-base`: the scale here is
         * the token scale (xs…2xl) and `base` is not a step in it. */}
        <p className="text-content-primary mt-2 text-md">
          Body copy at the default step. The quick brown fox
          jumps over the lazy dog — 0123456789.
        </p>
        <p className="text-content-secondary text-sm">
          Secondary at the small step, which is where most
          of a dense list actually lives.
        </p>
        <p className="text-content-tertiary text-xs">
          Tertiary at the extra-small step: timestamps,
          counts, the things nobody reads until they matter.
        </p>

        {/* Numerals are the reason a face passes or fails here.
         * These strings are the ones that appear on the kiosk and
         * on ePaper, where a 1/l/I collision is a support call. */}
        <p
          className="text-content-secondary mt-4 text-sm tabular-nums"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          1Il · 0O · S5 · 2Z · rB8 · 3.14159
        </p>
      </Card>
    </div>
  </section>
)
