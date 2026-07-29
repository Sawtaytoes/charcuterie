/**
 * The status → intent join, and the reachability of the machines it
 * reads.
 *
 * The interesting assertions here are not "connected is green" —
 * they are the two things that make a shared machine better than the
 * `Record<string, string>` it replaces: **every** state has a colour
 * and a wording, and every state is actually reachable.
 */

import type {
  AsyncStatus,
  ConnectionStatus,
} from "@charcuterie/logic"
import {
  asyncTransitions,
  connectionTransitions,
  getUnreachableStates,
} from "@charcuterie/logic"
import { expect, test } from "vitest"

import { mediaTransitions } from "./MediaTile/mediaStatus.ts"
import {
  getAsyncIntent,
  getAsyncLabel,
  getConnectionIntent,
  getConnectionLabel,
  getIsConnectionBusy,
} from "./statusIntent.ts"

const connectionStatuses = Object.keys(
  connectionTransitions,
) as ConnectionStatus[]

const asyncStatuses = Object.keys(
  asyncTransitions,
) as AsyncStatus[]

test("every connection state has an intent and a wording", () => {
  // mux-magic's `statusClassMap` is keyed by `string`, so an
  // unrecognised status renders with no colour at all. The
  // exhaustive switch makes that a compile error; this makes it a
  // test failure too, for the JS consumers who have no compiler.
  for (const status of connectionStatuses) {
    expect(getConnectionIntent(status)).toBeTruthy()

    expect(getConnectionLabel(status)).toBeTruthy()
  }

  expect(connectionStatuses).toHaveLength(4)
})

test("reconnecting is not the same as connecting", () => {
  // The distinction the whole shared machine exists for, and the one
  // all four repos currently lose.
  expect(getConnectionIntent("connecting")).toBe("info")

  expect(getConnectionIntent("reconnecting")).toBe(
    "warning",
  )

  expect(getConnectionLabel("connecting")).not.toBe(
    getConnectionLabel("reconnecting"),
  )
})

test("only the in-flight states animate", () => {
  expect(getIsConnectionBusy("connecting")).toBe(true)

  expect(getIsConnectionBusy("reconnecting")).toBe(true)

  expect(getIsConnectionBusy("connected")).toBe(false)

  expect(getIsConnectionBusy("disconnected")).toBe(false)
})

test("connection wordings are distinct", () => {
  // Two states that read identically on a wall-mounted panel are two
  // states the user cannot tell apart, which defeats the point.
  const labels = connectionStatuses.map(getConnectionLabel)

  expect(new Set(labels).size).toBe(labels.length)
})

test("every async state has an intent and a wording", () => {
  for (const status of asyncStatuses) {
    expect(getAsyncIntent(status)).toBeTruthy()

    expect(getAsyncLabel(status)).toBeTruthy()
  }

  expect(
    new Set(asyncStatuses.map(getAsyncLabel)).size,
  ).toBe(asyncStatuses.length)
})

test("only failure is red", () => {
  expect(getAsyncIntent("error")).toBe("danger")

  expect(getAsyncIntent("idle")).toBe("neutral")

  expect(getAsyncIntent("success")).toBe("success")
})

test("no state of any machine this package renders is unreachable", () => {
  // A `failed` nobody can transition to is a badge variant that will
  // never render — almost always a typo in a transition table. The
  // check belongs to the *definition*, so each machine's consumer
  // runs it.
  expect(
    getUnreachableStates(
      connectionTransitions,
      "connecting",
    ),
  ).toEqual([])

  expect(
    getUnreachableStates(asyncTransitions, "idle"),
  ).toEqual([])

  expect(
    getUnreachableStates(mediaTransitions, "loading"),
  ).toEqual([])
})

test("a loaded image cannot become an error", () => {
  // MediaTile's one deliberate omission. A browser does not fire
  // `error` on an image it has already decoded, so an app that
  // thinks it saw that is misreading its own event wiring — and a
  // fallback flickering over a good poster is worse than a throw.
  expect(mediaTransitions.loaded).not.toContain("error")

  expect(mediaTransitions.loaded).toContain("loading")

  expect(mediaTransitions.error).toContain("loading")
})
