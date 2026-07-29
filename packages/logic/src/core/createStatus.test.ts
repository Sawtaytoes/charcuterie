/**
 * The Status kind's three compile-and-run guarantees, and the two
 * machine definitions the fleet shares.
 *
 * The conformance suite already proves no illegal transition is
 * reachable at runtime. What it cannot check is the *definition*:
 * a `failed` state nobody can transition into is a badge variant
 * that will never render, and it looks perfectly healthy from the
 * outside.
 */

import { expect, test } from "vitest"

import {
  assertNeverStatus,
  createStatus,
  getUnreachableStates,
} from "./createStatus.ts"
import type {
  AsyncStatus,
  ConnectionStatus,
} from "./statusMachines.ts"
import {
  asyncTransitions,
  connectionTransitions,
} from "./statusMachines.ts"

test("every state of the shared machines is reachable from its initial state", () => {
  expect(
    getUnreachableStates(
      connectionTransitions,
      "connecting",
    ),
  ).toEqual([])

  expect(
    getUnreachableStates(asyncTransitions, "idle"),
  ).toEqual([])
})

test("getUnreachableStates finds a state nothing points at", () => {
  const transitions = {
    done: [],
    // Nothing transitions *to* `orphaned`.
    orphaned: ["done"],
    running: ["done"],
    waiting: ["running"],
  } as const

  expect(
    getUnreachableStates(transitions, "waiting"),
  ).toEqual(["orphaned"])
})

test("an illegal transition throws, and says what was legal", () => {
  const status = createStatus<ConnectionStatus>({
    initialState: "connecting",
    transitions: connectionTransitions,
  })

  expect(() => {
    status.transitionTo("reconnecting")
  }).toThrow(
    /Illegal status transition: "connecting" → "reconnecting"\. Legal from "connecting": connected, disconnected\./,
  )

  expect(status.getState().status).toBe("connecting")
})

test("transitioning to the current state is a no-op, not a throw", () => {
  const status = createStatus<AsyncStatus>({
    initialState: "idle",
    transitions: asyncTransitions,
  })

  // `idle` is not in its own transition list, but re-asserting
  // where you already are is not an illegal move — a component
  // re-reporting its state should not crash the app.
  expect(() => {
    status.transitionTo("idle")
  }).not.toThrow()
})

test("reset returns to the initial state from a terminal one", () => {
  const status = createStatus<ConnectionStatus>({
    initialState: "connecting",
    transitions: connectionTransitions,
  })

  status.transitionTo("disconnected")

  // `disconnected` has no legal edge back to `connecting` — a
  // retry button is a reset, not a transition.
  expect(status.can("connecting")).toBe(true)

  status.reset()

  expect(status.is("connecting")).toBe(true)
})

test("an initial state outside the transition table is rejected at construction", () => {
  expect(() =>
    createStatus({
      initialState: "ripping" as ConnectionStatus,
      transitions: connectionTransitions,
    }),
  ).toThrow(/is not a state in the transition table/)
})

test("assertNeverStatus names the state that was not handled", () => {
  const describeStatus = (status: AsyncStatus): string => {
    switch (status) {
      case "error":
        return "failed"
      case "idle":
        return "waiting"
      case "loading":
        return "working"
      case "success":
        return "done"
      default:
        // Adding a state to `asyncTransitions` without adding a
        // case here stops this file compiling, which is the
        // whole point of the helper.
        return assertNeverStatus(status)
    }
  }

  expect(describeStatus("loading")).toBe("working")

  expect(() =>
    describeStatus("quarantined" as AsyncStatus),
  ).toThrow(/Unhandled status/)
})
