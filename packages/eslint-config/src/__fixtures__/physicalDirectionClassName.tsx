// Lint fixture. Every className below reaches for a physical
// direction where the logical form exists.

export const PhysicalLiteral = () => (
  <div className="flex items-center pl-4 mr-2">
    <span className="text-left border-l">Inbox</span>
  </div>
)

export const PhysicalModifier = () => (
  <div className="p-2 sm:pl-6 hover:mr-1">Bay 3</div>
)

export const PhysicalNegative = () => (
  <div className="-ml-2">Overhang</div>
)

export const PhysicalRounded = () => (
  <div className="rounded-tl-lg rounded-r">Card</div>
)

export const PhysicalTemplate = ({
  gap,
}: {
  gap: string
}) => <div className={`flex ${gap} pr-3`}>Queue</div>

export const PhysicalFloat = () => (
  <div className="float-right">Aside</div>
)

export const PhysicalInset = () => (
  <div className="absolute left-0 right-0">Bar</div>
)
