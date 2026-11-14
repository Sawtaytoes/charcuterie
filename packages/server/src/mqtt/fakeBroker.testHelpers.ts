import { once } from "node:events"
import {
  type AddressInfo,
  createServer,
  type Socket,
} from "node:net"
import mqttPacket, {
  type IConnectPacket,
  type IPublishPacket,
  type Packet,
} from "mqtt-packet"

/**
 * A small MQTT 3.1.1 broker for tests, on a real TCP socket.
 *
 * It does what the service relies on a broker to do, and nothing
 * else: CONNACK, SUBACK, PUBACK, PINGRESP, retained messages, `+`
 * and `#` wildcards, and the last will when a connection drops
 * without a DISCONNECT. Every message goes out at QoS 0. The real
 * `mqtt` client talks to it, so its reconnect, resubscribe, and will
 * are the library's own.
 */
export type FakeBroker = {
  port: number
  /** The retained payload on `topic`, as text, or `undefined`. */
  getRetained: (topic: string) => string | undefined
  /** Every publish the broker routed, wills included, in order. */
  routed: Array<{
    topic: string
    payload: string
    isRetained: boolean
  }>
  /**
   * Cut every connection whose client id starts with `prefix`, as a
   * network failure does: no DISCONNECT, so the broker sends the will.
   */
  dropClients: (prefix: string) => number
  close: () => Promise<void>
}

type Connection = {
  clientId: string
  hasDisconnected: boolean
  socket: Socket
  subscriptions: string[]
  will: IConnectPacket["will"]
}

export const getIsTopicMatch = ({
  filter,
  topic,
}: {
  filter: string
  topic: string
}): boolean => {
  const filterLevels = filter.split("/")
  const topicLevels = topic.split("/")

  for (const [index, level] of filterLevels.entries()) {
    if (level === "#") {
      return true
    }
    if (index >= topicLevels.length) {
      return false
    }
    if (level !== "+" && level !== topicLevels[index]) {
      return false
    }
  }

  return filterLevels.length === topicLevels.length
}

export const startFakeBroker =
  async (): Promise<FakeBroker> => {
    const connections = new Set<Connection>()
    const retained = new Map<string, Buffer>()
    const routed: FakeBroker["routed"] = []

    const send = (socket: Socket, packet: Packet) => {
      if (!socket.destroyed) {
        socket.write(mqttPacket.generate(packet))
      }
    }

    const deliver = (
      connection: Connection,
      {
        isRetained,
        payload,
        topic,
      }: {
        isRetained: boolean
        payload: Buffer
        topic: string
      },
    ) => {
      send(connection.socket, {
        cmd: "publish",
        dup: false,
        payload,
        qos: 0,
        retain: isRetained,
        topic,
      })
    }

    const route = ({
      isRetained,
      payload,
      topic,
    }: {
      isRetained: boolean
      payload: Buffer
      topic: string
    }) => {
      routed.push({
        isRetained,
        payload: payload.toString(),
        topic,
      })
      if (isRetained) {
        if (payload.length === 0) {
          retained.delete(topic)
        } else {
          retained.set(topic, payload)
        }
      }
      for (const connection of connections) {
        if (
          connection.subscriptions.some((filter) =>
            getIsTopicMatch({ filter, topic }),
          )
        ) {
          deliver(connection, {
            isRetained: false,
            payload,
            topic,
          })
        }
      }
    }

    const server = createServer((socket) => {
      const parser = mqttPacket.parser({
        protocolVersion: 4,
      })
      let connection: Connection | undefined

      parser.on("packet", (packet: Packet) => {
        switch (packet.cmd) {
          case "connect": {
            connection = {
              clientId: packet.clientId,
              hasDisconnected: false,
              socket,
              subscriptions: [],
              will: packet.will,
            }
            connections.add(connection)
            send(socket, {
              cmd: "connack",
              returnCode: 0,
              sessionPresent: false,
            })
            return
          }
          case "subscribe": {
            const current = connection
            if (current === undefined) {
              return
            }
            current.subscriptions.push(
              ...packet.subscriptions.map(
                ({ topic }) => topic,
              ),
            )
            send(socket, {
              cmd: "suback",
              granted: packet.subscriptions.map(() => 0),
              messageId: packet.messageId,
            })
            for (const [topic, payload] of retained) {
              if (
                packet.subscriptions.some((subscription) =>
                  getIsTopicMatch({
                    filter: subscription.topic,
                    topic,
                  }),
                )
              ) {
                deliver(current, {
                  isRetained: true,
                  payload,
                  topic,
                })
              }
            }
            return
          }
          case "publish": {
            const publishPacket = packet as IPublishPacket
            if (
              publishPacket.qos > 0 &&
              publishPacket.messageId !== undefined
            ) {
              send(socket, {
                cmd: "puback",
                messageId: publishPacket.messageId,
              })
            }
            route({
              isRetained: publishPacket.retain,
              payload: Buffer.from(publishPacket.payload),
              topic: publishPacket.topic,
            })
            return
          }
          case "pingreq": {
            send(socket, { cmd: "pingresp" })
            return
          }
          case "disconnect": {
            if (connection) {
              connection.hasDisconnected = true
            }
            socket.end()
            return
          }
          default:
            return
        }
      })

      socket.on("data", (chunk: Buffer) => {
        parser.parse(chunk)
      })
      socket.on("error", () => {
        // A dropped client resets its socket. That is the test's point.
      })
      socket.on("close", () => {
        if (connection === undefined) {
          return
        }
        connections.delete(connection)
        const { hasDisconnected, will } = connection
        if (!hasDisconnected && will) {
          route({
            isRetained: will.retain ?? false,
            payload: Buffer.from(will.payload),
            topic: will.topic,
          })
        }
      })
    })

    server.listen(0, "127.0.0.1")
    await once(server, "listening")
    const { port } = server.address() as AddressInfo

    return {
      close: async () => {
        for (const connection of connections) {
          connection.hasDisconnected = true
          connection.socket.destroy()
        }
        server.close()
        await once(server, "close")
      },
      dropClients: (prefix) => {
        let count = 0
        for (const connection of connections) {
          if (connection.clientId.startsWith(prefix)) {
            connection.socket.destroy()
            count += 1
          }
        }
        return count
      },
      getRetained: (topic) =>
        retained.get(topic)?.toString(),
      port,
      routed,
    }
  }
