import { describe, expect, test } from "vitest"

import {
  actionFromCommandTopic,
  commandTopic,
  commandWildcard,
  responseTopic,
  statusTopic,
} from "./topics.ts"

describe("topic helpers", () => {
  test("build the house cmd/resp/status shape", () => {
    expect(commandTopic("board-game-picker", "sync")).toBe(
      "board-game-picker/cmd/sync",
    )
    expect(responseTopic("board-game-picker", "sync")).toBe(
      "board-game-picker/resp/sync",
    )
    expect(statusTopic("board-game-picker")).toBe(
      "board-game-picker/status",
    )
    expect(commandWildcard("board-game-picker")).toBe(
      "board-game-picker/cmd/+",
    )
  })

  test("reads a single-segment action back off a command topic", () => {
    expect(
      actionFromCommandTopic({
        base: "board-game-picker",
        topic: "board-game-picker/cmd/sync",
      }),
    ).toBe("sync")
  })

  test("rejects a topic that is not a command under the base", () => {
    expect(
      actionFromCommandTopic({
        base: "board-game-picker",
        topic: "board-game-picker/resp/sync",
      }),
    ).toBeUndefined()
    expect(
      actionFromCommandTopic({
        base: "board-game-picker",
        topic: "note-capture/cmd/poll",
      }),
    ).toBeUndefined()
  })

  test("rejects an empty or multi-segment action", () => {
    expect(
      actionFromCommandTopic({
        base: "board-game-picker",
        topic: "board-game-picker/cmd/",
      }),
    ).toBeUndefined()
    expect(
      actionFromCommandTopic({
        base: "board-game-picker",
        topic: "board-game-picker/cmd/sync/extra",
      }),
    ).toBeUndefined()
  })
})
