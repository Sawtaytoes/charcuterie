/**
 * `@charcuterie/ui` — the one sanctioned barrel.
 *
 * Components never import each other through this file; they import
 * the sibling module directly (`../Spinner/Spinner.tsx`). A barrel
 * that a package's own internals go through turns every component
 * into a dependency of every other one, which is how a 3 KB
 * `Spinner` starts pulling in `MediaTile`.
 *
 * `"./src/*"` is also in `exports`, for the budget-sensitive
 * consumers — `castkit/packages/slatecast` has 60 KB gz to spend and
 * should be able to reach one component without the barrel. Same
 * arrangement as `mux-magic/packages/tools`.
 *
 * Tokens are re-exported at `@charcuterie/ui/tokens` rather than
 * from here, so a React consumer never installs two package names
 * while Satori still gets `@charcuterie/tokens` with no React in
 * sight.
 */

export type { BadgeProps } from "./Badge/Badge.tsx"
export { Badge } from "./Badge/Badge.tsx"
export type { ButtonProps } from "./Button/Button.tsx"
export { Button } from "./Button/Button.tsx"
export type {
  CardPadding,
  CardProps,
  CardSurface,
} from "./Card/Card.tsx"
export { Card } from "./Card/Card.tsx"
export type { BadgeSize } from "./controlStyles.ts"
export {
  BADGE_SIZE_CLASS,
  CONTROL_SIZE_CLASS,
  DOT_SIZE_CLASS,
  ICON_CONTROL_SIZE_CLASS,
  MIN_TOUCH_TARGET_CLASS,
  SPINNER_SIZE_CLASS,
} from "./controlStyles.ts"
export type {
  EmptyStateProps,
  EmptyStateSize,
} from "./EmptyState/EmptyState.tsx"
export { EmptyState } from "./EmptyState/EmptyState.tsx"
export type { IconButtonProps } from "./IconButton/IconButton.tsx"
export { IconButton } from "./IconButton/IconButton.tsx"
export type { IntentAppearance } from "./intentStyles.ts"
export {
  DISABLED_CLASS,
  FOCUS_RING_CLASS,
  INTENT_APPEARANCE_CLASS,
  INTENT_CONTENT_CLASS,
  INTENT_HOVER_CLASS,
  INTENT_SOLID_FILL_CLASS,
} from "./intentStyles.ts"
export type {
  LiveStatusIndicatorProps,
  LiveStatusIndicatorSize,
} from "./LiveStatusIndicator/LiveStatusIndicator.tsx"
export { LiveStatusIndicator } from "./LiveStatusIndicator/LiveStatusIndicator.tsx"
export type {
  MediaTileProps,
  MediaTileRatio,
} from "./MediaTile/MediaTile.tsx"
export { MediaTile } from "./MediaTile/MediaTile.tsx"
export type { MediaStatus } from "./MediaTile/mediaStatus.ts"
export { mediaTransitions } from "./MediaTile/mediaStatus.ts"
export type {
  ProgressBarProps,
  ProgressBarSize,
} from "./ProgressBar/ProgressBar.tsx"
export { ProgressBar } from "./ProgressBar/ProgressBar.tsx"
export type { ProgressThreshold } from "./ProgressBar/progressValue.ts"
export {
  getProgressIntent,
  toProgressPercent,
  toProgressValue,
} from "./ProgressBar/progressValue.ts"
export type {
  SkeletonProps,
  SkeletonShape,
} from "./Skeleton/Skeleton.tsx"
export { Skeleton } from "./Skeleton/Skeleton.tsx"
export type { SpinnerProps } from "./Spinner/Spinner.tsx"
export { Spinner } from "./Spinner/Spinner.tsx"
export {
  getAsyncIntent,
  getAsyncLabel,
  getConnectionIntent,
  getConnectionLabel,
  getIsConnectionBusy,
} from "./statusIntent.ts"
export { toClassName } from "./toClassName.ts"
export type { VisuallyHiddenProps } from "./VisuallyHidden/VisuallyHidden.tsx"
export { VisuallyHidden } from "./VisuallyHidden/VisuallyHidden.tsx"
