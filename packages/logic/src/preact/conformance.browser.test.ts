import { createPreactAdapter } from "../conformance/createPreactAdapter.ts"
import { runConformanceSuite } from "../conformance/runConformanceSuite.ts"

/**
 * The third adapter. `useStoreValue` here is a hand-written
 * subscribe-in-an-effect rather than `useSyncExternalStore`, so
 * this run is the only thing standing between that file and a
 * silently-missed update between render and effect.
 */
runConformanceSuite(createPreactAdapter(), { numRuns: 15 })
