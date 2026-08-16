/**
 * `@charcuterie/server/mqtt` — Node cmd/resp over the house broker.
 *
 * **A subpath export with an optional peer dependency.** The base
 * package serves a Vite SPA and must not drag `mqtt` into every
 * consumer; apps that only serve assets never resolve it. MQTT is
 * Node-only. It does not live in `@charcuterie/streams` (browser,
 * push-only).
 */

export {
  alreadyRunningResponse,
  type CommandHandler,
  type CreateMqttServiceOptions,
  createMqttService,
  type MqttClientLike,
  type MqttConnect,
  type MqttConnectOptions,
  type MqttPublishOptions,
  type MqttService,
} from "./createMqttService.ts"
export {
  actionFromCommandTopic,
  commandTopic,
  commandWildcard,
  responseTopic,
  statusTopic,
} from "./topics.ts"
