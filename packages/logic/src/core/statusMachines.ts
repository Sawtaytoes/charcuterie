/**
 * The two machines that are genuinely fleet-wide.
 *
 * The plan lists six lifecycles the fleet hand-rolls. Four of them
 * — ripdeck's bay, mux-magic's job, the toast lifecycle, castkit's
 * optimistic mutation — are that app's domain, and a shared
 * library guessing at a bay's states would be worse than the
 * `Record<string, string>` it replaced.
 *
 * These two are different. **Connection** appears in four repos
 * with four different spellings of the same four states, and
 * **async request** is every fetch in the fleet. Both are
 * about the transport, not the domain, so `LiveStatusIndicator`
 * and `Spinner` can consume them directly in M3.
 *
 * Apps define their own with `createStatus` and test them with
 * `getUnreachableStates`.
 */

import type { StatusTransitions } from "./createStatus.ts"

export type ConnectionStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "reconnecting"

/**
 * `reconnecting` is a distinct state from `connecting`, and the
 * distinction is the whole reason this is shared: a user who has
 * seen data wants "lost it, getting it back", not the cold-start
 * spinner they already sat through. All four repos currently
 * collapse the two and read wrong on a flaky link.
 */
export const connectionTransitions: StatusTransitions<ConnectionStatus> =
  {
    connected: ["disconnected", "reconnecting"],
    connecting: ["connected", "disconnected"],
    disconnected: ["connecting"],
    reconnecting: ["connected", "disconnected"],
  }

export type AsyncStatus =
  | "error"
  | "idle"
  | "loading"
  | "success"

export const asyncTransitions: StatusTransitions<AsyncStatus> =
  {
    error: ["idle", "loading"],
    idle: ["loading"],
    loading: ["error", "success"],
    success: ["idle", "loading"],
  }
