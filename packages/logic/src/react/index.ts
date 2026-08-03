/**
 * `@charcuterie/logic` — the React 19 binding, and the package's
 * default entry.
 *
 * Every hook here is a thin wrapper: it builds its core once,
 * subscribes with `useSyncExternalStore`, and returns the core's
 * commands unchanged. All the behaviour lives in
 * `@charcuterie/logic/core`, which is why the same model-based
 * suite can run against the core, this binding, and the Preact
 * one and expect identical answers.
 *
 * The cores are re-exported here so a consumer never has to
 * import from two entry points to get a type.
 */

export * from "../core/index.ts"
export type {
  ColorSchemeApplier,
  UseColorSchemeOptions,
} from "./useColorScheme.ts"
export { useColorScheme } from "./useColorScheme.ts"
export { useClonedChild } from "./useClonedChild.ts"
export { useLatestRef } from "./useLatestRef.ts"
export { useLinkedIds } from "./useLinkedIds.ts"
export { useMultiplePicker } from "./useMultiplePicker.ts"
export { useRovingFocus } from "./useRovingFocus.ts"
export { useSinglePicker } from "./useSinglePicker.ts"
export { useStatus } from "./useStatus.ts"
export { useStoreValue } from "./useStoreValue.ts"
export { useUniqueId } from "./useUniqueId.ts"
export { useVisibility } from "./useVisibility.ts"
export { useVisibilityGroup } from "./useVisibilityGroup.ts"
