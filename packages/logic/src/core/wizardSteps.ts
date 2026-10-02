export type WizardStep = {
  key: string
  ordinal: number
  status: "done" | "current" | "upcoming"
  isSelectable: boolean
}

/** Derive numbered progress and backward navigation from the current stage. */
export const getWizardSteps = ({
  keys,
  currentKey,
}: {
  keys: readonly string[]
  currentKey: string
}): WizardStep[] => {
  const currentIndex = keys.indexOf(currentKey)
  return keys.map((key, index) => ({
    key,
    ordinal: index + 1,
    status:
      index === currentIndex
        ? "current"
        : currentIndex >= 0 && index < currentIndex
          ? "done"
          : "upcoming",
    isSelectable: currentIndex >= 0 && index < currentIndex,
  }))
}
