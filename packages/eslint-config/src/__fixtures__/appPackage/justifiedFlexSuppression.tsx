// Lint fixture — the escape hatch, used properly.
//
// A status string from a closed enum is bounded by construction,
// which the rule cannot see and the author can. One line saying so
// is the whole price of the hatch.

export const StatusRow = ({
  status,
  title,
}: {
  status: "done" | "failed" | "running"
  title: string
}) => (
  <div className="flex items-center justify-between gap-2">
    {/* eslint-disable-next-line charcuterie/no-unconstrained-flex-text -- a closed enum, never longer than "running" */}
    <span className="text-xs uppercase">{status}</span>
    <span className="min-w-0 wrap-anywhere text-sm">{title}</span>
  </div>
)
