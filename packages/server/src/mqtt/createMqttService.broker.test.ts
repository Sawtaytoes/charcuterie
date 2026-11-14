import { connect, type MqttClient } from "mqtt"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest"

import {
  createMqttService,
  type MqttService,
} from "./createMqttService.ts"
import {
  type FakeBroker,
  getIsTopicMatch,
  startFakeBroker,
} from "./fakeBroker.testHelpers.ts"

// The real `mqtt` client against a broker on a real socket. A fake
// client cannot show this bug, because the reconnect, the
// resubscribe, and the last will all belong to the library and the
// broker.
const BASE = "reconnect-test"
const STATUS_TOPIC = `${BASE}/status`
const ONLINE = JSON.stringify({ online: true })
const OFFLINE = JSON.stringify({ online: false })

let broker: FakeBroker
let service: MqttService | undefined
let observer: MqttClient | undefined

const startService = () =>
  createMqttService({
    base: BASE,
    host: "127.0.0.1",
    isTls: false,
    port: broker.port,
    reconnectPeriodMs: 50,
  })

const startObserver = async (): Promise<{
  messages: Array<{ topic: string; payload: string }>
}> => {
  const messages: Array<{
    topic: string
    payload: string
  }> = []
  const client = connect({
    clientId: "observer",
    host: "127.0.0.1",
    port: broker.port,
    reconnectPeriod: 0,
  })
  observer = client
  client.on("message", (topic, payload) => {
    messages.push({ payload: payload.toString(), topic })
  })
  await new Promise<void>((resolve) => {
    client.on("connect", () => resolve())
  })
  await client.subscribeAsync(`${BASE}/#`)
  return { messages }
}

beforeEach(async () => {
  broker = await startFakeBroker()
})

afterEach(async () => {
  service?.close()
  service = undefined
  observer?.end(true)
  observer = undefined
  await broker.close()
})

describe("createMqttService against a broker", () => {
  test("announces online, and the broker holds the will", async () => {
    service = await startService()

    await vi.waitFor(() => {
      expect(broker.getRetained(STATUS_TOPIC)).toBe(ONLINE)
    })
  })

  test("sets online back after a dropped connection reconnects", async () => {
    service = await startService()
    await vi.waitFor(() => {
      expect(broker.getRetained(STATUS_TOPIC)).toBe(ONLINE)
    })

    expect(broker.dropClients("mqttjs_")).toBe(1)

    // The broker publishes the will at once: Home Assistant sees the
    // app go offline.
    await vi.waitFor(() => {
      expect(
        broker.routed.some(
          ({ payload, topic }) =>
            topic === STATUS_TOPIC && payload === OFFLINE,
        ),
      ).toBe(true)
    })

    // Then the client reconnects, and the app must say so.
    await vi.waitFor(
      () => {
        expect(service?.getIsConnected()).toBe(true)
        expect(broker.getRetained(STATUS_TOPIC)).toBe(
          ONLINE,
        )
      },
      { timeout: 4_000 },
    )
  })

  test("restores the app's own retained status, not a bare online", async () => {
    service = await startService()
    const status = { online: true, version: "1.2.3" }
    service.publishStatus(status)
    await vi.waitFor(() => {
      expect(broker.getRetained(STATUS_TOPIC)).toBe(
        JSON.stringify(status),
      )
    })

    broker.dropClients("mqttjs_")

    await vi.waitFor(
      () => {
        expect(
          broker.routed.at(-1)?.topic === STATUS_TOPIC &&
            broker.getRetained(STATUS_TOPIC),
        ).toBe(JSON.stringify(status))
        expect(
          broker.routed.some(
            ({ payload }) => payload === OFFLINE,
          ),
        ).toBe(true)
      },
      { timeout: 4_000 },
    )
  })

  test("still answers commands after the reconnect", async () => {
    service = await startService()
    service.handleCommand("ping", () => ({ ok: true }))
    const { messages } = await startObserver()
    await vi.waitFor(() => {
      expect(broker.getRetained(STATUS_TOPIC)).toBe(ONLINE)
    })

    broker.dropClients("mqttjs_")
    await vi.waitFor(
      () => {
        expect(broker.getRetained(STATUS_TOPIC)).toBe(
          ONLINE,
        )
        expect(
          broker.routed.some(
            ({ payload }) => payload === OFFLINE,
          ),
        ).toBe(true)
      },
      { timeout: 4_000 },
    )

    // mqtt resubscribes after its SUBACK; give it a moment, then ask.
    await vi.waitFor(
      async () => {
        await observer?.publishAsync(
          `${BASE}/cmd/ping`,
          "{}",
        )
        expect(
          messages.some(
            ({ topic }) => topic === `${BASE}/resp/ping`,
          ),
        ).toBe(true)
      },
      { interval: 100, timeout: 4_000 },
    )
  })
})

describe("the fake broker's topic filter", () => {
  test.each([
    ["a/+/c", "a/b/c", true],
    ["a/#", "a/b/c", true],
    ["a/+", "a/b/c", false],
    ["a/b", "a/b", true],
    ["a/b/c", "a/b", false],
  ])("%s matches %s: %s", (filter, topic, isMatch) => {
    expect(getIsTopicMatch({ filter, topic })).toBe(isMatch)
  })
})
