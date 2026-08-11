// Lint fixture — the same four rows as
// `unconstrainedFlexText.tsx`, in the state each repo actually
// shipped on 2026-08-11, plus the near misses.
//
// **The four fixes are not the same fix, and that is the point.**
// `min-w-0 wrap-anywhere` (gallery-downloader, points-market's
// heading), `flex-wrap` + `shrink-0` + `ml-auto` (points-market's
// price row), `truncate` + `title` (mail-sifter's host), and
// *removing* `shrink-0` (rip-deck). A rule that demanded one of
// them would be wrong about the other three, so it accepts any.
//
// Everything here must stay clean. If it ever does not, an escape
// stopped being recognised.

type ErrorEntry = {
  occurredAt: string
  source: string
}

type ShopItem = {
  name: string
  pricePoints: number
  quantity: number
}

type Purchase = {
  costPoints: number
  isFulfilled: boolean
  itemName: string
}

const formatPoints = (points: number) => `${points}`

const hostOf = (url: string) => url.split("/")[2] ?? url

/** gallery-downloader 81e2c2a — `min-w-0 wrap-anywhere`. */
export const ErrorRow = ({ entry }: { entry: ErrorEntry }) => (
  <div className="flex flex-col gap-2 rounded-lg border px-3 py-2.5">
    <div className="flex items-baseline justify-between gap-3">
      <span className="min-w-0 text-xs font-semibold wrap-anywhere text-intent-danger-content">
        {entry.source}
      </span>
      <span className="shrink-0 text-xs text-content-muted">
        {entry.occurredAt}
      </span>
    </div>
  </div>
)

/** points-market e6438b7 — the heading wraps, the row wraps. */
export const ItemCard = ({ item }: { item: ShopItem }) => (
  <div className="flex flex-1 flex-col gap-2 p-3">
    <div className="flex items-start justify-between gap-2">
      <h3 className="m-0 min-w-0 wrap-anywhere text-sm font-semibold leading-tight">
        {item.name}
      </h3>
      <Badge intent="warning">{item.quantity} left</Badge>
    </div>
    <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 pt-1">
      <span className="shrink-0 text-base font-bold tabular-nums">
        {formatPoints(item.pricePoints)}
      </span>
      <Button className="ml-auto" intent="accent" size="sm">
        Buy
      </Button>
    </div>
  </div>
)

/**
 * points-market e6438b7 — the chip wraps on a phone and sizes to
 * its content at `sm`. `flex-wrap sm:flex-nowrap` with no
 * `shrink-0` on the chip itself is a considered pairing, not the
 * contradiction `no-shrink-0-with-flex-wrap` is looking for.
 */
export const RecentBuy = ({
  purchase,
}: {
  purchase: Purchase
}) => (
  <li className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border px-3 py-1.5 text-sm sm:flex-nowrap sm:rounded-full">
    <Badge intent={purchase.isFulfilled ? "success" : "warning"}>
      {purchase.isFulfilled ? "received" : "waiting"}
    </Badge>
    <span className="min-w-0 font-medium">
      {purchase.itemName}
    </span>
    <span className="shrink-0 tabular-nums text-content-muted">
      {formatPoints(purchase.costPoints)} pts
    </span>
  </li>
)

/** rip-deck ce66aab — `shrink-0` removed, `min-w-0` added. */
export const RipControls = ({
  percentText,
  title,
}: {
  percentText: string
  title: string
}) => (
  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
    <span className="flex min-w-0 max-w-full flex-wrap items-baseline gap-x-2">
      <span className="min-w-0 break-words font-semibold">
        {title}
      </span>
    </span>
    <div className="relative z-10 flex min-w-0 flex-wrap items-center gap-2">
      <span className="tabular-nums text-content-secondary">
        {percentText}
      </span>
      <Button size="sm">Keep trying</Button>
      <Button size="sm">Give up</Button>
      <Button size="sm">Cancel</Button>
    </div>
  </div>
)

/**
 * mail-sifter 8ed11f4 — `truncate` plus a `title`, because the
 * full URL is already the card's own `href`. Ellipsis is a first-
 * class answer, not a workaround.
 */
export const LinkCardHost = ({ url }: { url: string }) => (
  <div className="flex items-center gap-2">
    <span
      className="block truncate font-mono text-xs text-content-muted"
      title={hostOf(url)}
    >
      {hostOf(url)}
    </span>
    <Badge intent="neutral">link</Badge>
  </div>
)

/**
 * Near misses. A column flex container is out of scope, static
 * text is authored and bounded, `{children}` is somebody else's
 * markup, a `{rows.map(…)}` renders a list rather than a text run,
 * and a className the rule cannot read statically is a className
 * whose escapes it cannot see either.
 */
export const NearMisses = ({
  children,
  labelClassName,
  rows,
  title,
}: {
  children: string
  labelClassName: string
  rows: string[]
  title: string
}) => (
  <>
    <div className="flex flex-col gap-1">
      <span className="text-sm">{title}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-sm">Ready</span>
      <span className={labelClassName}>{title}</span>
      <span className="text-sm">{children}</span>
      <span className="text-sm">
        {rows.map((row) => (
          <em key={row}>{row}</em>
        ))}
      </span>
    </div>
  </>
)
