import {
  type MqttClient,
  connect as mqttConnect,
} from "mqtt"

import {
  actionFromCommandTopic,
  commandWildcard,
  responseTopic,
  statusTopic,
} from "./topics.ts"

export type MqttPublishOptions = {
  qos?: 0 | 1 | 2
  isRetained?: boolean
}

/**
 * The slice of a broker client this service touches. Injected in
 * tests so a handler can be proven without a broker. Names follow
 * the house `is`/`has` rule; the mqtt library's `connected` /
 * `retain` stay inside `adaptMqttClient`.
 */
export type MqttClientLike = {
  isConnected: boolean
  subscribe: (
    topic: string,
    opts?: { qos?: 0 | 1 | 2 },
  ) => unknown
  publish: (
    topic: string,
    payload: string | Buffer,
    opts?: MqttPublishOptions,
  ) => unknown
  on: (
    event: string,
    callback: (...args: never[]) => void,
  ) => unknown
  end: (isForced?: boolean) => unknown
}

export type MqttConnectOptions = {
  host: string
  port: number
  protocol: "mqtt" | "mqtts"
  username?: string
  password?: string
  reconnectPeriod: number
}

export type MqttConnect = (
  options: MqttConnectOptions,
) => MqttClientLike

export type CommandHandler = (
  payload: unknown,
) => Promise<unknown> | unknown

export type CreateMqttServiceOptions = {
  /** Topic prefix, e.g. `board-game-picker`. */
  base: string
  host?: string
  port?: number
  username?: string
  password?: string
  /**
   * Force TLS. Defaults to on when `port` is 8883, off otherwise —
   * matching `mqtt.octen.dev:8883` vs a LAN 1883 broker.
   */
  isTls?: boolean
  /**
   * Skip `mqtt.connect` and use this client. For tests, and for an
   * app that already owns the socket.
   */
  client?: MqttClientLike
  connect?: MqttConnect
  connectTimeoutMs?: number
}

export type MqttService = {
  handleCommand: (
    action: string,
    handler: CommandHandler,
  ) => void
  publishStatus: (
    payload: unknown,
    options?: { isRetained?: boolean },
  ) => void
  publish: (
    topic: string,
    payload: unknown,
    options?: MqttPublishOptions,
  ) => void
  getIsConnected: () => boolean
  close: () => void
}

const DEFAULT_CONNECT_TIMEOUT_MS = 20_000
const ALREADY_RUNNING = {
  ok: false,
  reason: "already-running",
} as const

function encodePayload(payload: unknown): string {
  if (typeof payload === "string") {
    return payload
  }
  return JSON.stringify(payload)
}

function decodePayload(raw: Buffer): unknown {
  const text = raw.toString()
  if (text.length === 0) {
    return undefined
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function getIsTls({
  isTls,
  port,
}: {
  isTls: boolean | undefined
  port: number
}): boolean {
  return isTls ?? port === 8883
}

function assertAction(action: string): void {
  if (action.length === 0 || action.includes("/")) {
    throw new Error(
      `MQTT action must be a single path segment, got ${JSON.stringify(action)}`,
    )
  }
}

/**
 * Map the mqtt library onto `MqttClientLike` so `connected` /
 * `retain` never leak into our types.
 */
function adaptMqttClient(raw: MqttClient): MqttClientLike {
  return {
    end: (isForced) => raw.end(isForced),
    get isConnected() {
      return raw.connected
    },
    on: (event, callback) => {
      ;(
        raw.on as (
          eventName: string,
          listener: (...args: never[]) => void,
        ) => void
      )(event, callback)
    },
    publish: (topic, payload, opts) =>
      raw.publish(topic, payload, {
        qos: opts?.qos ?? 1,
        retain: opts?.isRetained ?? false,
      }),
    subscribe: (topic, opts) =>
      raw.subscribe(topic, { qos: opts?.qos ?? 1 }),
  }
}

function connectDefault(
  options: MqttConnectOptions & { base: string },
): MqttClientLike {
  return adaptMqttClient(
    mqttConnect({
      host: options.host,
      password: options.password,
      port: options.port,
      protocol: options.protocol,
      reconnectPeriod: options.reconnectPeriod,
      username: options.username,
      will: {
        payload: JSON.stringify({ online: false }),
        qos: 1,
        retain: true,
        topic: statusTopic(options.base),
      },
    }),
  )
}

/**
 * House MQTT cmd/resp for a Node app. Subscribe to
 * `<base>/cmd/<action>`, reply on `<base>/resp/<action>` (never
 * retained), optional retained `<base>/status`.
 *
 * Overlapping commands for the same action are rejected with
 * `{ ok: false, reason: "already-running" }` rather than queued — a
 * nightly must not start twice.
 */
export async function createMqttService(
  options: CreateMqttServiceOptions,
): Promise<MqttService> {
  const { base } = options
  if (base.length === 0 || base.includes("/")) {
    throw new Error(
      `MQTT base must be a single path segment, got ${JSON.stringify(base)}`,
    )
  }

  const port = options.port ?? 8883
  const isTls = getIsTls({ isTls: options.isTls, port })
  const handlers = new Map<string, CommandHandler>()
  const running = new Set<string>()

  const client =
    options.client ??
    (await connectClient(options, { base, isTls, port }))

  const publish = (
    topic: string,
    payload: unknown,
    publishOptions: MqttPublishOptions = {},
  ): void => {
    if (!client.isConnected) {
      return
    }
    client.publish(topic, encodePayload(payload), {
      isRetained: publishOptions.isRetained ?? false,
      qos: publishOptions.qos ?? 1,
    })
  }

  const publishStatus = (
    payload: unknown,
    statusOptions: { isRetained?: boolean } = {},
  ): void => {
    publish(statusTopic(base), payload, {
      isRetained: statusOptions.isRetained ?? true,
      qos: 1,
    })
  }

  const handleCommand = (
    action: string,
    handler: CommandHandler,
  ): void => {
    assertAction(action)
    handlers.set(action, handler)
  }

  client.subscribe(commandWildcard(base), { qos: 1 })
  client.on(
    "message",
    // mqtt's listener is `(topic, payload) => void`; the like-type
    // is looser so a fake client can register it.
    ((topic: string, raw: Buffer) => {
      void dispatchCommand({
        base,
        handlers,
        publish,
        raw,
        running,
        topic,
      })
    }) as (...args: never[]) => void,
  )

  if (client.isConnected) {
    publishStatus({ online: true })
  }

  return {
    close: () => {
      client.end(true)
    },
    getIsConnected: () => client.isConnected,
    handleCommand,
    publish,
    publishStatus,
  }
}

async function connectClient(
  options: CreateMqttServiceOptions,
  {
    base,
    isTls,
    port,
  }: { base: string; isTls: boolean; port: number },
): Promise<MqttClientLike> {
  const host = options.host
  if (host === undefined || host.length === 0) {
    throw new Error(
      "MQTT host is required when no client is injected",
    )
  }

  const connect =
    options.connect ??
    ((connectOptions: MqttConnectOptions) =>
      connectDefault({ ...connectOptions, base }))
  const client = connect({
    host,
    password: options.password,
    port,
    protocol: isTls ? "mqtts" : "mqtt",
    reconnectPeriod: 5000,
    username: options.username,
  })

  if (client.isConnected) {
    return client
  }

  const timeoutMs =
    options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `mqtt connect timeout after ${timeoutMs}ms`,
        ),
      )
    }, timeoutMs)
    client.on("connect", (() => {
      clearTimeout(timer)
      resolve()
    }) as (...args: never[]) => void)
    client.on("error", ((error: Error) => {
      clearTimeout(timer)
      reject(error)
    }) as (...args: never[]) => void)
  })

  return client
}

async function dispatchCommand({
  base,
  handlers,
  publish,
  raw,
  running,
  topic,
}: {
  base: string
  handlers: Map<string, CommandHandler>
  publish: MqttService["publish"]
  raw: Buffer
  running: Set<string>
  topic: string
}): Promise<void> {
  const action = actionFromCommandTopic({ base, topic })
  if (action === undefined) {
    return
  }
  const handler = handlers.get(action)
  if (handler === undefined) {
    return
  }
  const replyTo = responseTopic(base, action)
  if (running.has(action)) {
    publish(replyTo, ALREADY_RUNNING)
    return
  }
  running.add(action)
  try {
    const result = await handler(decodePayload(raw))
    if (result !== undefined) {
      publish(replyTo, result)
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error)
    publish(replyTo, { error: message, ok: false })
  } finally {
    running.delete(action)
  }
}

export const alreadyRunningResponse = ALREADY_RUNNING
