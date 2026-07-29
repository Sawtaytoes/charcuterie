/**
 * The two shared machines → an intent and a human label.
 *
 * This is the join M2 promised and the reason `Status` earned its
 * place as a fifth state kind. `Badge` and `LiveStatusIndicator`
 * consume `connectionTransitions` / `asyncTransitions` through
 * these functions, so a connection state has **one** colour and
 * **one** wording across the fleet — against four repos that each
 * spell the same four states differently today, and one
 * (`mux-magic`) whose `statusClassMap` is a
 * `Record<string, string>` that silently renders an unknown status
 * with no colour at all.
 *
 * Every switch here ends in `assertNeverStatus`, which is the whole
 * point: add a state to `connectionTransitions` and this file stops
 * compiling. A `Record<string, string>` would have shipped a blank
 * badge instead.
 */

import type {
  AsyncStatus,
  ConnectionStatus,
} from "@charcuterie/logic"
import { assertNeverStatus } from "@charcuterie/logic"
import type { IntentName } from "@charcuterie/tokens"

export const getConnectionIntent = (
  status: ConnectionStatus,
): IntentName => {
  switch (status) {
    case "connected":
      return "success"

    case "connecting":
      return "info"

    // Warning rather than danger, and this is the distinction the
    // shared machine exists for: a user who has seen data wants
    // "lost it, getting it back", not the cold-start spinner they
    // already sat through, and not the red of a dead link either.
    case "reconnecting":
      return "warning"

    case "disconnected":
      return "danger"

    default:
      return assertNeverStatus(status)
  }
}

/**
 * The ellipsis is a real `…`, not three dots, and the trailing one
 * is load-bearing: it is what makes "Reconnecting…" read as
 * in-progress to someone who glances at a wall-mounted panel from
 * across the room.
 */
export const getConnectionLabel = (
  status: ConnectionStatus,
): string => {
  switch (status) {
    case "connected":
      return "Connected"

    case "connecting":
      return "Connecting…"

    case "reconnecting":
      return "Reconnecting…"

    case "disconnected":
      return "Disconnected"

    default:
      return assertNeverStatus(status)
  }
}

/** Whether the state is one a moving affordance should mark. */
export const getIsConnectionBusy = (
  status: ConnectionStatus,
): boolean => {
  switch (status) {
    case "connecting":
    case "reconnecting":
      return true

    case "connected":
    case "disconnected":
      return false

    default:
      return assertNeverStatus(status)
  }
}

export const getAsyncIntent = (
  status: AsyncStatus,
): IntentName => {
  switch (status) {
    case "idle":
      return "neutral"

    case "loading":
      return "info"

    case "success":
      return "success"

    case "error":
      return "danger"

    default:
      return assertNeverStatus(status)
  }
}

export const getAsyncLabel = (
  status: AsyncStatus,
): string => {
  switch (status) {
    case "idle":
      return "Idle"

    case "loading":
      return "Loading…"

    case "success":
      return "Done"

    case "error":
      return "Failed"

    default:
      return assertNeverStatus(status)
  }
}
