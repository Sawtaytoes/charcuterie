import { describe, expect, test, vi } from "vitest"

import {
  alreadyRunningResponse,
  createMqttService,
  type MqttClientLike,
} from "./createMqttService.ts"

type Published = {
  isRetained: boolean
  payload: string
  qos: number
  topic: string
}

function createFakeClient(): MqttClientLike & {
  emit: (topic: string, payload?: unknown) => void
  published: Published[]
  subscriptions: string[]
} {
  let onMessage:
    | ((topic: string, payload: Buffer) => void)
    | undefined
  const published: Published[] = []
  const subscriptions: string[] = []

  const client: MqttClientLike & {
    emit: (topic: string, payload?: unknown) => void
    published: Published[]
    subscriptions: string[]
  } = {
    isConnected: true,
    emit(topic, payload = {}) {
      const raw =
        typeof payload === "string"
          ? payload
          : JSON.stringify(payload)
      onMessage?.(topic, Buffer.from(raw))
    },
    end() {
      client.isConnected = false
    },
    on(event, callback) {
      if (event === "message") {
        onMessage = callback as (
          topic: string,
          payload: Buffer,
        ) => void
      }
    },
    publish(topic, payload, opts) {
      published.push({
        isRetained: opts?.isRetained ?? false,
        payload:
          typeof payload === "string"
            ? payload
            : payload.toString(),
        qos: opts?.qos ?? 0,
        topic,
      })
    },
    published,
    subscribe(topic) {
      subscriptions.push(topic)
    },
    subscriptions,
  }
  return client
}

function parsePublished(row: Published): unknown {
  return JSON.parse(row.payload) as unknown
}

describe("createMqttService", () => {
  test("subscribes the cmd wildcard and publishes retained online status", async () => {
    const client = createFakeClient()
    await createMqttService({
      base: "board-game-picker",
      client,
    })

    expect(client.subscriptions).toEqual([
      "board-game-picker/cmd/+",
    ])
    expect(client.published).toEqual([
      {
        isRetained: true,
        payload: JSON.stringify({ online: true }),
        qos: 1,
        topic: "board-game-picker/status",
      },
    ])
  })

  test("runs a command and replies on resp, never retained", async () => {
    const client = createFakeClient()
    const mqtt = await createMqttService({
      base: "board-game-picker",
      client,
    })
    mqtt.handleCommand("sync", (payload) => ({
      ok: true,
      saw: payload,
    }))

    client.emit("board-game-picker/cmd/sync", {
      dryRun: true,
    })
    await Promise.resolve()

    const replies = client.published.filter(
      (row) => row.topic === "board-game-picker/resp/sync",
    )
    expect(replies).toHaveLength(1)
    expect(replies[0]?.isRetained).toBe(false)
    expect(replies[0]?.qos).toBe(1)
    const reply = replies[0]
    expect(reply).toBeDefined()
    if (reply === undefined) {
      return
    }
    expect(parsePublished(reply)).toEqual({
      ok: true,
      saw: { dryRun: true },
    })
  })

  test("rejects an overlapping command without starting a second run", async () => {
    const client = createFakeClient()
    const mqtt = await createMqttService({
      base: "board-game-picker",
      client,
    })

    let release!: () => void
    let started = 0
    mqtt.handleCommand("sync", async () => {
      started += 1
      await new Promise<void>((resolve) => {
        release = resolve
      })
      return { ok: true }
    })

    client.emit("board-game-picker/cmd/sync", {})
    client.emit("board-game-picker/cmd/sync", {})
    await Promise.resolve()

    expect(started).toBe(1)
    const overlap = client.published.find(
      (row) =>
        row.topic === "board-game-picker/resp/sync" &&
        row.payload ===
          JSON.stringify(alreadyRunningResponse),
    )
    expect(overlap?.isRetained).toBe(false)

    release()
    await vi.waitFor(() => {
      const successes = client.published.filter(
        (row) =>
          row.topic === "board-game-picker/resp/sync" &&
          row.payload !==
            JSON.stringify(alreadyRunningResponse),
      )
      expect(successes).toHaveLength(1)
    })
  })

  test("publishes a failed resp when the handler throws", async () => {
    const client = createFakeClient()
    const mqtt = await createMqttService({
      base: "board-game-picker",
      client,
    })
    mqtt.handleCommand("sync", () => {
      throw new Error("BGG timed out")
    })

    client.emit("board-game-picker/cmd/sync", {})
    await Promise.resolve()

    const replies = client.published.filter(
      (row) => row.topic === "board-game-picker/resp/sync",
    )
    const reply = replies[0]
    expect(reply).toBeDefined()
    if (reply === undefined) {
      return
    }
    expect(parsePublished(reply)).toEqual({
      error: "BGG timed out",
      ok: false,
    })
  })

  test("hands a non-JSON payload to the handler as the raw string", async () => {
    const client = createFakeClient()
    const mqtt = await createMqttService({
      base: "note-capture",
      client,
    })
    const seen: unknown[] = []
    mqtt.handleCommand("poll", (payload) => {
      seen.push(payload)
      return { ok: true }
    })

    client.emit("note-capture/cmd/poll", "not-json")
    await Promise.resolve()

    expect(seen).toEqual(["not-json"])
  })

  test("ignores a command that has no handler", async () => {
    const client = createFakeClient()
    await createMqttService({
      base: "board-game-picker",
      client,
    })
    const before = client.published.length
    client.emit("board-game-picker/cmd/unknown", {})
    await Promise.resolve()
    expect(client.published).toHaveLength(before)
  })

  test("refuses a multi-segment base or action", async () => {
    await expect(
      createMqttService({
        base: "board/game",
        client: createFakeClient(),
      }),
    ).rejects.toThrow(/single path segment/)

    const mqtt = await createMqttService({
      base: "board-game-picker",
      client: createFakeClient(),
    })
    expect(() => {
      mqtt.handleCommand("sync/now", () => ({ ok: true }))
    }).toThrow(/single path segment/)
  })

  test("connects with TLS on 8883 unless isTls is set", async () => {
    const seen: Array<{ port: number; protocol: string }> =
      []
    const client = createFakeClient()
    await createMqttService({
      base: "board-game-picker",
      connect: (connectOptions) => {
        seen.push({
          port: connectOptions.port,
          protocol: connectOptions.protocol,
        })
        return client
      },
      host: "mqtt.octen.dev",
    })
    expect(seen).toEqual([
      { port: 8883, protocol: "mqtts" },
    ])
  })

  test("connects without TLS on 1883", async () => {
    const seen: Array<{ port: number; protocol: string }> =
      []
    const client = createFakeClient()
    await createMqttService({
      base: "board-game-picker",
      connect: (connectOptions) => {
        seen.push({
          port: connectOptions.port,
          protocol: connectOptions.protocol,
        })
        return client
      },
      host: "homeassistant.octen",
      port: 1883,
    })
    expect(seen).toEqual([{ port: 1883, protocol: "mqtt" }])
  })
})
