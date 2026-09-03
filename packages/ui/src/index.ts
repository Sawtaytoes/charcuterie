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
  ActionTileItem,
  ActionTilesAccent,
  ActionTilesProps,
} from "./ActionTiles/ActionTiles.tsx"
export { ActionTiles } from "./ActionTiles/ActionTiles.tsx"
export type { AdaptiveGridProps } from "./AdaptiveGrid/AdaptiveGrid.tsx"
export { AdaptiveGrid } from "./AdaptiveGrid/AdaptiveGrid.tsx"
export type { ColumnChoice } from "./AdaptiveGrid/chooseColumns.ts"
export {
  chooseColumns,
  DEFAULT_MAX_AUTO_COLUMNS,
  DEFAULT_MAX_MANUAL_COLUMNS,
  DEFAULT_MIN_COLUMN_INLINE_SIZE_PX,
  getColumnChoices,
  getContentMaxInlineSize,
} from "./AdaptiveGrid/chooseColumns.ts"
export type {
  BlockSizeResolver,
  ColumnPersistence,
} from "./AdaptiveGrid/useAdaptiveColumns.ts"
export {
  localStorageColumnPersistence,
  readStoredChoice,
  useAdaptiveColumns,
  viewportBlockSizeResolver,
} from "./AdaptiveGrid/useAdaptiveColumns.ts"
export type {
  AlertProps,
  AlertSize,
} from "./Alert/Alert.tsx"
export { Alert } from "./Alert/Alert.tsx"
export type {
  AvatarProps,
  AvatarSize,
} from "./Avatar/Avatar.tsx"
export { Avatar } from "./Avatar/Avatar.tsx"
export type { BadgeProps } from "./Badge/Badge.tsx"
export { Badge } from "./Badge/Badge.tsx"
export type { BadgeShapeProps } from "./Badge/useBadgeShape.tsx"
export type { BadgeButtonProps } from "./BadgeButton/BadgeButton.tsx"
export { BadgeButton } from "./BadgeButton/BadgeButton.tsx"
export type {
  BoardMove,
  BoardProps,
} from "./Board/Board.tsx"
export { Board } from "./Board/Board.tsx"
export type { BoardItem } from "./Board/BoardCard.tsx"
export type { BoardLane } from "./Board/BoardLaneList.tsx"
export type {
  BoardDropLane,
  BoardDropTarget,
  BoardPoint,
  BoardRect,
} from "./Board/boardMove.ts"
export {
  chooseDropIndex,
  chooseDropTarget,
  describeMove,
  getIsMoveMeaningful,
  toSettledIndex,
} from "./Board/boardMove.ts"
export type { ButtonProps } from "./Button/Button.tsx"
export { Button } from "./Button/Button.tsx"
export type { ButtonLinkProps } from "./ButtonLink/ButtonLink.tsx"
export { ButtonLink } from "./ButtonLink/ButtonLink.tsx"
export type {
  CardPadding,
  CardProps,
  CardSurface,
} from "./Card/Card.tsx"
export { Card } from "./Card/Card.tsx"
export type { CardAccentEdge } from "./Card/cardAccentEdge.ts"
export type { CheckboxProps } from "./Checkbox/Checkbox.tsx"
export { Checkbox } from "./Checkbox/Checkbox.tsx"
export type { ColorSchemeSwitcherProps } from "./ColorSchemeSwitcher/ColorSchemeSwitcher.tsx"
export { ColorSchemeSwitcher } from "./ColorSchemeSwitcher/ColorSchemeSwitcher.tsx"
export type {
  ColorSchemeIcons,
  ColorSchemeToggleProps,
} from "./ColorSchemeToggle/ColorSchemeToggle.tsx"
export { ColorSchemeToggle } from "./ColorSchemeToggle/ColorSchemeToggle.tsx"
export type { ComboboxProps } from "./Combobox/Combobox.tsx"
export { Combobox } from "./Combobox/Combobox.tsx"
export type {
  CopyButtonProps,
  CopyStatus,
} from "./CopyButton/CopyButton.tsx"
export { CopyButton } from "./CopyButton/CopyButton.tsx"
export { copyText } from "./CopyButton/copyText.ts"
export {
  CATEGORICAL_APPEARANCE_CLASS,
  CATEGORICAL_CONTENT_CLASS,
  CATEGORICAL_HOVER_BORDER_CLASS,
  CATEGORICAL_HOVER_CLASS,
  CATEGORICAL_RING_CLASS,
  CATEGORICAL_SOLID_FILL_CLASS,
} from "./categoricalStyles.ts"
export type { BadgeSize } from "./controlStyles.ts"
export {
  BADGE_SIZE_CLASS,
  CONTROL_BASE_CLASS,
  CONTROL_SIZE_CLASS,
  DOT_SIZE_CLASS,
  getControlClassName,
  ICON_CONTROL_SIZE_CLASS,
  MIN_TOUCH_TARGET_CLASS,
  SPINNER_SIZE_CLASS,
} from "./controlStyles.ts"
export type {
  DataTableColumn,
  DataTableProps,
  DataTableSelection,
  DataTableSort,
} from "./DataTable/DataTable.tsx"
export { DataTable } from "./DataTable/DataTable.tsx"
export type { DatePickerProps } from "./DatePicker/DatePicker.tsx"
export { DatePicker } from "./DatePicker/DatePicker.tsx"
export type { DatePreset } from "./DatePicker/datePresets.ts"
export { DEFAULT_DATE_PRESETS } from "./DatePicker/datePresets.ts"
export type {
  DateInputKeywords,
  DateInputResult,
  ParseDateInputOptions,
} from "./DatePicker/parseDateInput.ts"
export {
  DEFAULT_DATE_INPUT_KEYWORDS,
  parseDateInput,
} from "./DatePicker/parseDateInput.ts"
export type {
  DateRange,
  PlainDate,
  PlainDateFormatOptions,
} from "./DatePicker/plainDate.ts"
export {
  addDays,
  addMonths,
  clampPlainDate,
  comparePlainDates,
  formatPlainDate,
  getDayNumber,
  getDaysBetween,
  getDaysInMonth,
  getFirstDayOfWeek,
  getIsLeapYear,
  getIsSameDay,
  getIsValidPlainDate,
  getIsWithinRange,
  getLocalPlainDate,
  getMonthNames,
  getPlainDateFromDayNumber,
  getWeekday,
  getWeekdayNames,
  parseIsoDate,
  toIsoDate,
} from "./DatePicker/plainDate.ts"
export type {
  DeploymentUpdate,
  UseDeploymentUpdateOptions,
} from "./DeploymentUpdate/useDeploymentUpdate.ts"
export {
  DEFAULT_DEPLOYMENT_EVENTS_PATH,
  DEFAULT_DEPLOYMENT_PATH,
  useDeploymentUpdate,
} from "./DeploymentUpdate/useDeploymentUpdate.ts"
export type {
  DialogProps,
  DialogSize,
} from "./Dialog/Dialog.tsx"
export { Dialog } from "./Dialog/Dialog.tsx"
export type {
  DropRailProps,
  DropRailTarget,
} from "./DropRail/DropRail.tsx"
export { DropRail } from "./DropRail/DropRail.tsx"
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
export type { HeaderProps } from "./Header/Header.tsx"
export { Header } from "./Header/Header.tsx"
export type { IconButtonProps } from "./IconButton/IconButton.tsx"
export { IconButton } from "./IconButton/IconButton.tsx"
export type { IntentAppearance } from "./intentStyles.ts"
export {
  ARIA_DISABLED_CLASS,
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
  ListboxItem,
  ListboxProps,
} from "./Listbox/Listbox.tsx"
export { Listbox } from "./Listbox/Listbox.tsx"
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
export type { MainProps } from "./Main/Main.tsx"
export { Main } from "./Main/Main.tsx"
export type { ScrollMemoryProviderProps } from "./Main/ScrollMemoryProvider.tsx"
export { ScrollMemoryProvider } from "./Main/ScrollMemoryProvider.tsx"
export type { ScrollEntry } from "./Main/scrollMemory.ts"
export type {
  MarkdownEditorProps,
  MarkdownImageUpload,
} from "./MarkdownEditor/MarkdownEditor.tsx"
export { MarkdownEditor } from "./MarkdownEditor/MarkdownEditor.tsx"
export { toMarkdownImage } from "./MarkdownEditor/markdownCommands.ts"
export type {
  MarkdownEditorLine,
  MarkdownEditorLineKind,
  MarkdownSpan,
  MarkdownSpanKind,
} from "./MarkdownEditor/markdownSpans.ts"
export {
  toLineIndex,
  toMarkdownLines,
} from "./MarkdownEditor/markdownSpans.ts"
export type { InlineMarkdownRun } from "./MarkdownLine/inlineMarkdown.ts"
export {
  toInlineMarkdownRuns,
  toPlainMarkdownText,
} from "./MarkdownLine/inlineMarkdown.ts"
export type { MarkdownLineProps } from "./MarkdownLine/MarkdownLine.tsx"
export { MarkdownLine } from "./MarkdownLine/MarkdownLine.tsx"
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
export type {
  NavLayout,
  NavProps,
} from "./Nav/Nav.tsx"
export { Nav } from "./Nav/Nav.tsx"
export type {
  NavItem,
  NavRailItem,
} from "./Nav/navItems.ts"
export {
  getIsCurrentHref,
  resolveActiveKey,
} from "./Nav/navItems.ts"
export type {
  NavLayoutMode,
  NavLayoutState,
  ResolvedNavLayout,
  UseNavLayoutOptions,
} from "./Nav/useNavLayout.ts"
export { useNavLayout } from "./Nav/useNavLayout.ts"
export type {
  NavBarItem,
  NavBarProps,
} from "./NavBar/NavBar.tsx"
export { NavBar } from "./NavBar/NavBar.tsx"
export type {
  PickerOption,
  PickerProps,
} from "./Picker/Picker.tsx"
export { Picker } from "./Picker/Picker.tsx"
export type { PopoverProps } from "./Popover/Popover.tsx"
export { Popover } from "./Popover/Popover.tsx"
export type {
  PortraitTileItem,
  PortraitTilesLayout,
  PortraitTilesProps,
} from "./PortraitTiles/PortraitTiles.tsx"
export { PortraitTiles } from "./PortraitTiles/PortraitTiles.tsx"
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
  QueryBuilderLabels,
  QueryBuilderProps,
} from "./QueryBuilder/QueryBuilder.tsx"
export { QueryBuilder } from "./QueryBuilder/QueryBuilder.tsx"
export type {
  RadioGroupProps,
  RadioItem,
} from "./RadioGroup/RadioGroup.tsx"
export { RadioGroup } from "./RadioGroup/RadioGroup.tsx"
export type {
  RailLandmark,
  RailProps,
  RailSide,
} from "./Rail/Rail.tsx"
export { Rail } from "./Rail/Rail.tsx"
export type {
  RangeSliderProps,
  RangeSliderTick,
} from "./RangeSlider/RangeSlider.tsx"
export { RangeSlider } from "./RangeSlider/RangeSlider.tsx"
export type { RangeSliderValue } from "./RangeSlider/rangeSliderValue.ts"
export type {
  ReorderListItem,
  ReorderListProps,
  ReorderListRenderArguments,
} from "./ReorderList/ReorderList.tsx"
export { ReorderList } from "./ReorderList/ReorderList.tsx"
export { AnchorLink } from "./RouterLink/AnchorLink.tsx"
export {
  RouterLinkProvider,
  useRouterLink,
} from "./RouterLink/RouterLinkProvider.tsx"
export type {
  RouterLinkComponent,
  RouterLinkProps,
} from "./RouterLink/routerLink.ts"
export { getIsRoutedHref } from "./RouterLink/routerLink.ts"
export type { UnstyledLinkProps } from "./RouterLink/UnstyledLink.tsx"
export { UnstyledLink } from "./RouterLink/UnstyledLink.tsx"
export type { SearchInputProps } from "./SearchInput/SearchInput.tsx"
export { SearchInput } from "./SearchInput/SearchInput.tsx"
export type {
  SegmentedControlProps,
  SegmentedItem,
} from "./SegmentedControl/SegmentedControl.tsx"
export { SegmentedControl } from "./SegmentedControl/SegmentedControl.tsx"
// DEPRECATED 2026-08-20. `Select` is the native `<select>` and
// nothing new gets one — `Picker` is the drop-in, `Combobox` when
// the list wants typing. It stays exported so the fleet's existing
// call sites keep compiling while they convert, and for no other
// reason; see the decision record next to the component.
export type {
  SelectItem,
  SelectOption,
  SelectOptionGroup,
  SelectProps,
} from "./Select/Select.tsx"
export { Select } from "./Select/Select.tsx"
export type {
  ContentWidth,
  ScreenStep,
} from "./Shell/contentWidth.ts"
export type { ShellProps } from "./Shell/Shell.tsx"
export { Shell } from "./Shell/Shell.tsx"
export type {
  SkeletonProps,
  SkeletonShape,
} from "./Skeleton/Skeleton.tsx"
export { Skeleton } from "./Skeleton/Skeleton.tsx"
export type {
  SliderProps,
  SliderSize,
} from "./Slider/Slider.tsx"
export { Slider } from "./Slider/Slider.tsx"
export type {
  SortableTableHeaderProps,
  SortDirection,
} from "./SortableTableHeader/SortableTableHeader.tsx"
export { SortableTableHeader } from "./SortableTableHeader/SortableTableHeader.tsx"
export type { SpinnerProps } from "./Spinner/Spinner.tsx"
export { Spinner } from "./Spinner/Spinner.tsx"
export type {
  Step,
  StepperOrientation,
  StepperProps,
  StepStatus,
} from "./Stepper/Stepper.tsx"
export { Stepper } from "./Stepper/Stepper.tsx"
export type {
  SwatchAppearance,
  SwatchProps,
  SwatchSize,
} from "./Swatch/Swatch.tsx"
export { Swatch } from "./Swatch/Swatch.tsx"
export type { SwitchProps } from "./Switch/Switch.tsx"
export { Switch } from "./Switch/Switch.tsx"
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
  TabsLinkProps,
  TabsPanelProps,
  TabsProps,
} from "./Tabs/Tabs.tsx"
export { Tabs } from "./Tabs/Tabs.tsx"
export type {
  TabItem,
  TabLinkItem,
  TabsActivation,
  TabsOrientation,
} from "./Tabs/tabItems.ts"
export type {
  TextLinkAppearance,
  TextLinkProps,
} from "./TextLink/TextLink.tsx"
export { TextLink } from "./TextLink/TextLink.tsx"
export type { TimecodeInputProps } from "./TimecodeInput/TimecodeInput.tsx"
export { TimecodeInput } from "./TimecodeInput/TimecodeInput.tsx"
export type {
  FormatTimecodeOptions,
  TimecodeInputResult,
  TimecodeRange,
} from "./TimecodeInput/timecode.ts"
export {
  clampTimecode,
  formatTimecode,
  parseTimecodeInput,
} from "./TimecodeInput/timecode.ts"
export type { ToastProps } from "./Toast/Toast.tsx"
export { Toast } from "./Toast/Toast.tsx"
export type {
  ToastRecord,
  ToastRegionProps,
} from "./Toast/ToastRegion.tsx"
export { ToastRegion } from "./Toast/ToastRegion.tsx"
export type { ToastStatus } from "./Toast/toastLifecycle.ts"
export { toastTransitions } from "./Toast/toastLifecycle.ts"
export { chooseVisibleCount } from "./Toolbar/chooseVisibleCount.ts"
export type {
  ToolbarAction,
  ToolbarControl,
  ToolbarItem,
  ToolbarProps,
} from "./Toolbar/Toolbar.tsx"
export { Toolbar } from "./Toolbar/Toolbar.tsx"
export type { TooltipProps } from "./Tooltip/Tooltip.tsx"
export { Tooltip } from "./Tooltip/Tooltip.tsx"
export { toClassName } from "./toClassName.ts"
export { DEFAULT_GRID_GAP_PX } from "./VirtualizedGrid/gridGap.ts"
export type { VirtualizedGridProps } from "./VirtualizedGrid/VirtualizedGrid.tsx"
export { VirtualizedGrid } from "./VirtualizedGrid/VirtualizedGrid.tsx"
export type { VisuallyHiddenProps } from "./VisuallyHidden/VisuallyHidden.tsx"
export { VisuallyHidden } from "./VisuallyHidden/VisuallyHidden.tsx"
