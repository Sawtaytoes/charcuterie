/**
 * `@charcuterie/logic/core` — the framework-free half.
 *
 * Zero dependencies, no React, no Preact, no DOM. Everything here
 * is a plain factory over an injected store, which is what lets
 * the model-based suite run thousands of command sequences in
 * milliseconds in plain Node — and what lets the same suite then
 * run against the React and Preact bindings unchanged.
 *
 * House convention: one barrel per package entry, and modules
 * inside it never import each other *through* it. Deep imports
 * stay available via the `"./*"` entry in `package.json` for
 * budget-sensitive consumers — `slatecast` has 60 KB gz to spend.
 */

export { areArraysEqual } from "./arrays.ts"
export type {
  ColorScheme,
  ColorSchemeApplier,
  ColorSchemeMode,
  ColorSchemeOptions,
  ColorSchemePersistence,
  ColorSchemeResolver,
  ColorSchemeState,
  ResolvedColorScheme,
} from "./createColorScheme.ts"
export {
  createColorScheme,
  DEFAULT_COLOR_SCHEME_ORDER,
  nextColorSchemeMode,
  selectMode,
  selectResolvedScheme,
} from "./createColorScheme.ts"
export type {
  LinkedIds,
  LinkedIdsState,
} from "./createLinkedIds.ts"
export {
  createLinkedIds,
  selectAriaControls,
  selectAriaLabelledBy,
} from "./createLinkedIds.ts"
export type {
  MediaQuery,
  MediaQueryMatcher,
  MediaQueryOptions,
  MediaQueryState,
} from "./createMediaQuery.ts"
export {
  createMediaQuery,
  selectIsMatching,
} from "./createMediaQuery.ts"
export type {
  MultiplePicker,
  MultiplePickerOptions,
  MultiplePickerState,
} from "./createMultiplePicker.ts"
export {
  createMultiplePicker,
  selectFormValues,
  selectIsValueIncluded,
  selectSelectedValues,
} from "./createMultiplePicker.ts"
export { createRandomString } from "./createRandomString.ts"
export type {
  RovingFocus,
  RovingFocusOptions,
  RovingFocusState,
} from "./createRovingFocus.ts"
export {
  createRovingFocus,
  selectActiveIndex,
  selectActiveValue,
  selectTabIndex,
} from "./createRovingFocus.ts"
export type {
  SinglePicker,
  SinglePickerOptions,
  SinglePickerState,
} from "./createSinglePicker.ts"
export {
  createSinglePicker,
  selectIsValueSelected,
  selectSelectedValue,
} from "./createSinglePicker.ts"
export type {
  Status,
  StatusOptions,
  StatusState,
  StatusTransitions,
} from "./createStatus.ts"
export {
  assertNeverStatus,
  createStatus,
  getUnreachableStates,
  selectStatus,
} from "./createStatus.ts"
export { createStore } from "./createStore.ts"
export type {
  Visibility,
  VisibilityOptions,
  VisibilityState,
} from "./createVisibility.ts"
export {
  createVisibility,
  selectIsVisible,
} from "./createVisibility.ts"
export type {
  VisibilityGroup,
  VisibilityGroupOptions,
  VisibilityGroupState,
} from "./createVisibilityGroup.ts"
export {
  createVisibilityGroup,
  selectIsKeyPending,
  selectIsKeyVisible,
  selectVisibleKey,
} from "./createVisibilityGroup.ts"
export type {
  AsyncStatus,
  ConnectionStatus,
} from "./statusMachines.ts"
export {
  asyncTransitions,
  connectionTransitions,
} from "./statusMachines.ts"
export type {
  CharcuterieStore,
  CreateCharcuterieStore,
  Listener,
  ReadableCore,
  StoreOptions,
  Unsubscribe,
} from "./types.ts"
