// Lint fixture — the clean control. If this file ever starts
// reporting, the rule has grown a false positive.

export const isDone = true

export const hasVisibleTarget: boolean = false

export const check = (isEnabled: boolean) => isEnabled

// Underscore-prefixed names are exempt: `_` is the conventional
// ignored-parameter placeholder.
export const _unused = true

// Not a boolean, so the prefix rule does not apply.
export const variantName = "daylight"
