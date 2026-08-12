// Lint fixture. Every row below is a real one, copied from the
// repo and commit that shipped its fix on 2026-08-11 — this file
// is the state of the code *before* those fixes.
//
// - `ErrorRow`  — gallery-downloader, 81e2c2a
// - `ItemCard`  — points-market, e6438b7
// - `RecentBuy` — points-market, e6438b7
// - `RipControls` — rip-deck, ce66aab

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

/**
 * gallery-downloader. `webtoons:<uri>` on the left, a timestamp on
 * the right; the source span's min-content width shoved the
 * timestamp clean out of the card, and the page measured 1528px in
 * a 1440px window.
 */
export const ErrorRow = ({ entry }: { entry: ErrorEntry }) => (
  <div className="flex flex-col gap-2 rounded-lg border px-3 py-2.5">
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs font-semibold text-intent-danger-content">
        {entry.source}
      </span>
      <span className="shrink-0 text-xs text-content-muted">
        {entry.occurredAt}
      </span>
    </div>
  </div>
)

/**
 * points-market. The `<h3>`'s automatic minimum is its longest
 * word, which on an 11rem grid column is wider than the room left
 * beside the badge — so the badge left the card. The price/Buy row
 * below it is the same bug one line down.
 */
export const ItemCard = ({ item }: { item: ShopItem }) => (
  <div className="flex flex-1 flex-col gap-2 p-3">
    <div className="flex items-start justify-between gap-2">
      <h3 className="m-0 text-sm font-semibold leading-tight">
        {item.name}
      </h3>
      <Badge intent="warning">{item.quantity} left</Badge>
    </div>
    <div className="mt-auto flex items-center justify-between gap-2 pt-1">
      <span className="text-base font-bold tabular-nums">
        {formatPoints(item.pricePoints)}
      </span>
      <Button intent="accent" size="sm">
        Buy
      </Button>
    </div>
  </div>
)

/** points-market again — `Remove` escaped the chip at 390px. */
export const RecentBuy = ({
  purchase,
}: {
  purchase: Purchase
}) => (
  <li className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm">
    <Badge intent={purchase.isFulfilled ? "success" : "warning"}>
      {purchase.isFulfilled ? "received" : "waiting"}
    </Badge>
    <span className="font-medium">{purchase.itemName}</span>
    <span className="tabular-nums text-content-muted">
      {formatPoints(purchase.costPoints)} pts
    </span>
  </li>
)

/**
 * rip-deck. `shrink-0` pinned this row at max-content, so its own
 * `flex-wrap` could never engage: the widest single line
 * (`43.0% · Keep trying · Give up · Cancel`) set the card's floor
 * and anything narrower overflowed the document.
 */
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
    <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-2">
      <span className="tabular-nums text-content-secondary">
        {percentText}
      </span>
      <Button size="sm">Keep trying</Button>
      <Button size="sm">Give up</Button>
      <Button size="sm">Cancel</Button>
    </div>
  </div>
)
