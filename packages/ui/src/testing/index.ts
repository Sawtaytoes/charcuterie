/**
 * `@charcuterie/ui/testing` — the drivability gates, shipped so
 * consumers can hold their own components to them.
 *
 * A separate entry point rather than part of the barrel: nothing
 * here belongs in an app's production bundle, and a deep import is
 * what keeps it out without a build-time trick.
 */

export type {
  AgentQueries,
  AgentTarget,
} from "./expectAgentDrivable.ts"
export {
  expectAgentDrivable,
  expectHiddenFromAgents,
} from "./expectAgentDrivable.ts"
