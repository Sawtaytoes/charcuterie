/**
 * Adapter 1 of 3 — the framework-free core, in plain Node.
 *
 * Also adapters 4 and 5 in everything but name: the same suite
 * runs against the Jotai and signals stores, which is the store
 * seam paying for itself. If any of these three disagree, the
 * seam is not the "exactly three members, nothing to get subtly
 * wrong" interface it claims to be.
 *
 * `numRuns` is high here because these are thousands of command
 * sequences against plain objects — the whole run is
 * milliseconds. The DOM bindings run the identical suite at a
 * much lower count, because every command there is a render.
 */

import { createStore as createJotaiStore } from "jotai"

import { createCoreAdapter } from "../conformance/createCoreAdapter.ts"
import { runConformanceSuite } from "../conformance/runConformanceSuite.ts"
import { createStoreFromJotai } from "../jotai/index.ts"
import { createStoreFromSignals } from "../signals/index.ts"

runConformanceSuite(createCoreAdapter({ name: "core" }), {
  numRuns: 300,
})

runConformanceSuite(
  createCoreAdapter({
    createStore: createStoreFromJotai(createJotaiStore()),
    name: "core + jotai",
  }),
  { numRuns: 100 },
)

runConformanceSuite(
  createCoreAdapter({
    createStore: createStoreFromSignals,
    name: "core + @preact/signals-core",
  }),
  { numRuns: 100 },
)
