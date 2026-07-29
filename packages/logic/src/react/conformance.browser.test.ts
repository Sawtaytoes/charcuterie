import { createReactAdapter } from "../conformance/createReactAdapter.ts"
import { runConformanceSuite } from "../conformance/runConformanceSuite.ts"

/**
 * `numRuns` is two orders of magnitude below the core's, and that
 * is the correct trade rather than a compromise. Every command
 * here is a React render inside `act`; the core covers the state
 * space exhaustively in Node, and this run exists to prove the
 * *binding* — one core per hook, a real subscription, a re-render
 * on every change — behaves identically on the sequences it does
 * see.
 */
runConformanceSuite(createReactAdapter(), { numRuns: 15 })
