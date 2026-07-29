// Lint fixture — the clean control, and the near-miss set.
//
// The near misses are the point. `border-red-500` contains
// `border-r`, `rounded-lg` contains `rounded-l`, and
// `place-items-center` starts `pl`. A pattern that fires on any
// of them is a pattern somebody will switch off within a week.

export const LogicalLiteral = () => (
  <div className="flex items-center ps-4 me-2">
    <span className="text-start border-s">Inbox</span>
  </div>
)

export const LogicalModifier = () => (
  <div className="p-2 sm:ps-6 hover:me-1">Bay 3</div>
)

export const LogicalRounded = () => (
  <div className="rounded-se-lg rounded-e">Card</div>
)

export const LogicalTemplate = ({
  gap,
}: {
  gap: string
}) => <div className={`flex ${gap} pe-3`}>Queue</div>

export const LogicalInset = () => (
  <div className="absolute start-0 end-0">Bar</div>
)

export const NearMisses = () => (
  <div className="border-red-500 rounded-lg place-items-center">
    <span className="text-relaxed">Bright</span>
  </div>
)
