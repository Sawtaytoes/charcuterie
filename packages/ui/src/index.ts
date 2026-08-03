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
 * The token **types and values** are re-exported at
 * `@charcuterie/ui/tokens` rather than from here, so a React
 * consumer's TypeScript never names a second package while Satori
 * still gets `@charcuterie/tokens` with no React in sight.
 *
 * The token **stylesheet** is not, and M5 is why. There was a
 * `"./tokens.css": "./node_modules/@charcuterie/tokens/dist/theme.css"`
 * export here, and it resolved to nothing in the first real
 * consumer: a hoisting linker puts `@charcuterie/tokens` at the
 * *project* root, not inside this package, so that path exists only
 * under a nesting one. A CSS `@import` fails silently in Tailwind —
 * no error, no utilities, an unstyled app — which is exactly the
 * class of failure `portal:` was chosen to catch
 * ([decision](../../../docs/decisions/2026-07-29-consumers-link-tokens-by-portal-until-publish.md)).
 * So a consumer installs both package names and imports
 * `@charcuterie/tokens/theme.css` by its own name, which is what
 * this package's README has always told it to do.
 */

export type {
  AccordionHeadingLevel,
  AccordionItem,
  AccordionProps,
} from "./Accordion/Accordion.tsx"
export { Accordion } from "./Accordion/Accordion.tsx"
export type {
  AlertProps,
  AlertSize,
} from "./Alert/Alert.tsx"
export { Alert } from "./Alert/Alert.tsx"
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
export type { ColorSchemeSwitcherProps } from "./ColorSchemeSwitcher/ColorSchemeSwitcher.tsx"
export { ColorSchemeSwitcher } from "./ColorSchemeSwitcher/ColorSchemeSwitcher.tsx"
export type {
  ColorSchemeIcons,
  ColorSchemeToggleProps,
} from "./ColorSchemeToggle/ColorSchemeToggle.tsx"
export { ColorSchemeToggle } from "./ColorSchemeToggle/ColorSchemeToggle.tsx"
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
  DialogProps,
  DialogSize,
} from "./Dialog/Dialog.tsx"
export { Dialog } from "./Dialog/Dialog.tsx"
export type {
  EmptyStateProps,
  EmptyStateSize,
} from "./EmptyState/EmptyState.tsx"
export { EmptyState } from "./EmptyState/EmptyState.tsx"
export type { FieldProps } from "./Field/Field.tsx"
export { Field } from "./Field/Field.tsx"
export type { FieldGroupProps } from "./Field/FieldGroup.tsx"
export { FieldGroup } from "./Field/FieldGroup.tsx"
export type { FileDropZoneProps } from "./FileDropZone/FileDropZone.tsx"
export { FileDropZone } from "./FileDropZone/FileDropZone.tsx"
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
export type { LightboxProps } from "./Lightbox/Lightbox.tsx"
export { Lightbox } from "./Lightbox/Lightbox.tsx"
export type {
  LiveStatusIndicatorProps,
  LiveStatusIndicatorSize,
} from "./LiveStatusIndicator/LiveStatusIndicator.tsx"
export { LiveStatusIndicator } from "./LiveStatusIndicator/LiveStatusIndicator.tsx"
export type {
  LogLine,
  LogViewerProps,
} from "./LogViewer/LogViewer.tsx"
export { LogViewer } from "./LogViewer/LogViewer.tsx"
export type {
  MediaTileProps,
  MediaTileRatio,
} from "./MediaTile/MediaTile.tsx"
export { MediaTile } from "./MediaTile/MediaTile.tsx"
export type { MediaStatus } from "./MediaTile/mediaStatus.ts"
export { mediaTransitions } from "./MediaTile/mediaStatus.ts"
export type {
  MenuItem,
  MenuProps,
} from "./Menu/Menu.tsx"
export { Menu } from "./Menu/Menu.tsx"
export type { ModalProps } from "./Modal/Modal.tsx"
export { Modal } from "./Modal/Modal.tsx"
export type { PopoverProps } from "./Popover/Popover.tsx"
export { Popover } from "./Popover/Popover.tsx"
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
  SegmentedControlProps,
  SegmentedItem,
} from "./SegmentedControl/SegmentedControl.tsx"
export { SegmentedControl } from "./SegmentedControl/SegmentedControl.tsx"
export type {
  SelectItem,
  SelectOption,
  SelectOptionGroup,
  SelectProps,
} from "./Select/Select.tsx"
export { Select } from "./Select/Select.tsx"
export type {
  SkeletonProps,
  SkeletonShape,
} from "./Skeleton/Skeleton.tsx"
export { Skeleton } from "./Skeleton/Skeleton.tsx"
export type {
  SortableTableHeaderProps,
  SortDirection,
} from "./SortableTableHeader/SortableTableHeader.tsx"
export { SortableTableHeader } from "./SortableTableHeader/SortableTableHeader.tsx"
export type { SpinnerProps } from "./Spinner/Spinner.tsx"
export { Spinner } from "./Spinner/Spinner.tsx"
export type { SlotProps } from "./slotProps.ts"
export { mergeSlotProps } from "./slotProps.ts"
export {
  getAsyncIntent,
  getAsyncLabel,
  getConnectionIntent,
  getConnectionLabel,
  getIsConnectionBusy,
} from "./statusIntent.ts"
export type {
  TabItem,
  TabsActivation,
  TabsOrientation,
  TabsProps,
} from "./Tabs/Tabs.tsx"
export { Tabs } from "./Tabs/Tabs.tsx"
export type { ToastProps } from "./Toast/Toast.tsx"
export { Toast } from "./Toast/Toast.tsx"
export type {
  ToastRecord,
  ToastRegionProps,
} from "./Toast/ToastRegion.tsx"
export { ToastRegion } from "./Toast/ToastRegion.tsx"
export type { ToastStatus } from "./Toast/toastLifecycle.ts"
export { toastTransitions } from "./Toast/toastLifecycle.ts"
export type { TooltipProps } from "./Tooltip/Tooltip.tsx"
export { Tooltip } from "./Tooltip/Tooltip.tsx"
export { toClassName } from "./toClassName.ts"
export type { VisuallyHiddenProps } from "./VisuallyHidden/VisuallyHidden.tsx"
export { VisuallyHidden } from "./VisuallyHidden/VisuallyHidden.tsx"
