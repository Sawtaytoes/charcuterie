import {
  Badge,
  Button,
  Card,
  ProgressBar,
} from "@charcuterie/ui"

import type { Candidate } from "./fontCandidates.ts"

/**
 * One body candidate, rendered as a slice of an actual product
 * surface.
 *
 * Real product text rather than pangrams, on purpose: a face that
 * looks lovely over "Handgloves" and then falls apart on
 * `04:12:38 · 41.2 GB` is a face that fails on ripdeck's actual
 * surface, and that is the thing worth seeing. The numeral line at
 * the bottom is the other half of it — `1Il` and `0O` collisions
 * are a support call on a kiosk, not a matter of taste.
 *
 * Pins `data-body-font` only; the heading follows the toolbar's
 * Heading axis, so a chosen heading can be held fixed while the
 * bodies underneath it are compared.
 */
export const BodyCandidateBlock = ({
  candidate,
}: {
  candidate: Candidate
}) => (
  <section
    data-body-font={candidate.id ?? undefined}
    className="border-border-subtle border-t pt-5"
  >
    <header className="mb-2 flex flex-wrap items-baseline gap-x-3">
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

    <Card padding="md">
      <p className="text-content-primary mb-1 text-md font-semibold">
        Ripping <em>The Leopard</em> (1963)
      </p>
      <p className="text-content-secondary mb-4 text-sm">
        MakeMKV reported 3 titles, keeping the longest.
        Queued behind 2 discs on Bay 04.
      </p>

      <ProgressBar
        value={62}
        label="Rip progress"
        intent="accent"
      />

      <dl className="mt-4 grid grid-cols-3 gap-2">
        <div>
          <dt className="text-content-tertiary text-xs">
            Elapsed
          </dt>
          <dd
            className="text-content-primary text-sm tabular-nums"
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
            className="text-content-primary text-sm tabular-nums"
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
            className="text-content-primary text-sm tabular-nums"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            18.4 MB/s
          </dd>
        </div>
      </dl>

      <p className="text-content-secondary mt-4 text-sm">
        Body copy at the small step, which is where most of
        a dense list actually lives — 0123456789.
      </p>
      <p className="text-content-tertiary text-xs">
        Tertiary at the extra-small step: timestamps,
        counts, the things nobody reads until they matter.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
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
  </section>
)
