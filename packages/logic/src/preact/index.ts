/**
 * `@charcuterie/logic/preact` — the Preact binding.
 *
 * A separate entry point rather than a `preact/compat` alias.
 * `castkit/packages/slatecast` has a 60 KB gz budget and compat
 * is most of it, so the one place the two bindings genuinely
 * differ — `useSyncExternalStore`, which only compat has — is
 * hand-written here instead.
 *
 * Everything else is a mirror of `../react`, and the mirrors are
 * kept honest by `runConformanceSuite`: the same model-based
 * command sequences run against the core, the React binding, and
 * this one, and all three have to answer identically.
 */

export * from "../core/index.ts"
export { useClonedChild } from "./useClonedChild.ts"
export { useLatestRef } from "./useLatestRef.ts"
export { useLinkedIds } from "./useLinkedIds.ts"
export { useMediaQuery } from "./useMediaQuery.ts"
export { useMultiplePicker } from "./useMultiplePicker.ts"
export { useRovingFocus } from "./useRovingFocus.ts"
export { useSinglePicker } from "./useSinglePicker.ts"
export { useStatus } from "./useStatus.ts"
export { useStoreValue } from "./useStoreValue.ts"
export { useUniqueId } from "./useUniqueId.ts"
export { useVisibility } from "./useVisibility.ts"
export { useVisibilityGroup } from "./useVisibilityGroup.ts"
