// Lint fixture — the escape hatch with the reason left off, which
// is the one shape that makes the hatch decorative. Without the
// line, nobody learns why the row was safe and the next agent
// copies the disable instead of the reasoning.

export const StatusRow = ({
  status,
  title,
}: {
  status: "done" | "failed" | "running"
  title: string
}) => (
  <div className="flex items-center justify-between gap-2">
    {/* eslint-disable-next-line charcuterie/no-unconstrained-flex-text */}
    <span className="text-xs uppercase">{status}</span>
    <span className="min-w-0 wrap-anywhere text-sm">{title}</span>
  </div>
)
