import { execFile, fork } from "node:child_process"
import { createReadStream } from "node:fs"
import {
  chmod,
  mkdir,
  realpath,
  stat,
  unlink,
} from "node:fs/promises"
import http from "node:http"
import os from "node:os"
import path from "node:path"
import { promisify } from "node:util"
import metadata from "../package.json" with { type: "json" }

const run = promisify(execFile)
export const previewRoot =
  process.env.MODEL_VIEWER_ROOT ||
  path.join(
    os.tmpdir(),
    `model-viewer-${process.getuid?.() ?? "user"}`,
  )
export const socketPath =
  process.env.MODEL_VIEWER_SOCKET ||
  path.join(previewRoot, "service.sock")
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".stl": "application/octet-stream",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".css": "text/css",
}
export function isWithin(root, file) {
  const relative = path.relative(root, file)
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  )
}
export async function staticServer(directory, port = 0) {
  const root = await realpath(directory)
  const server = http.createServer(
    async (request, response) => {
      if (!["GET", "HEAD"].includes(request.method)) {
        response.writeHead(405)
        response.end()
        return
      }
      try {
        const url = new URL(request.url, "http://localhost")
        let pathname = decodeURIComponent(url.pathname)
        if (pathname.endsWith("/")) pathname += "index.html"
        const file = await realpath(
          path.resolve(root, `.${pathname}`),
        )
        if (!isWithin(root, file)) {
          response.writeHead(403)
          response.end()
          return
        }
        const information = await stat(file)
        if (!information.isFile()) {
          response.writeHead(404)
          response.end()
          return
        }
        response.writeHead(200, {
          "content-type":
            types[path.extname(file)] ||
            "application/octet-stream",
          "content-length": information.size,
          "x-content-type-options": "nosniff",
          "cache-control": "no-cache",
        })
        if (request.method === "HEAD") {
          response.end()
          return
        }
        const stream = createReadStream(file)
        stream.on("error", () => response.destroy())
        response.on("close", () => stream.destroy())
        stream.pipe(response)
      } catch {
        response.writeHead(404)
        response.end()
      }
    },
  )
  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, "127.0.0.1", resolve)
  })
  return server
}
export function serviceRequest(body) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        socketPath,
        path: "/serve",
        method: "POST",
        headers: { "content-type": "application/json" },
      },
      (response) => {
        let content = ""
        response.on("data", (chunk) => {
          content += chunk
        })
        response.on("end", () => {
          try {
            const value = JSON.parse(content)
            if (response.statusCode !== 200)
              reject(new Error(value.error || content))
            else resolve(value)
          } catch (error) {
            reject(error)
          }
        })
      },
    )
    request.setTimeout(15000, () =>
      request.destroy(
        new Error("Preview service did not respond"),
      ),
    )
    request.on("error", reject)
    request.end(JSON.stringify(body))
  })
}
export async function daemon() {
  await mkdir(previewRoot, { recursive: true, mode: 0o700 })
  // Refuse a second daemon; unlink only a socket which no process answers.
  try {
    await serviceRequest({ probe: true })
    throw new Error("Preview service is already running")
  } catch (error) {
    if (!["ENOENT", "ECONNREFUSED"].includes(error.code))
      throw error
    await unlink(socketPath).catch((error) => {
      if (error.code !== "ENOENT") throw error
    })
  }
  const active = new Map()
  const service = http.createServer(
    async (request, response) => {
      const send = (status, body) => {
        response.writeHead(status, {
          "content-type": "application/json",
        })
        response.end(JSON.stringify(body))
      }
      if (
        request.method !== "POST" ||
        request.url !== "/serve"
      ) {
        send(404, { error: "Unknown request" })
        return
      }
      let content = ""
      try {
        for await (const chunk of request) {
          content += chunk
          if (content.length > 16384)
            throw new Error("Request too large")
        }
        const body = JSON.parse(content)
        if (body.probe) {
          send(200, { version: metadata.version })
          return
        }
        const root = await realpath(previewRoot)
        const directory = await realpath(body.directory)
        if (
          directory === root ||
          !isWithin(root, directory)
        )
          throw new Error(
            "Only staged preview directories can be shared",
          )
        if (
          !Number.isInteger(body.port ?? 0) ||
          body.port < 0 ||
          body.port > 65535
        )
          throw new Error("Invalid port")
        let entry = active.get(directory)
        if (!entry) {
          const child = fork(
            new URL("./worker.js", import.meta.url),
            [directory, String(body.port || 0)],
            {
              stdio: ["ignore", "ignore", "inherit", "ipc"],
            },
          )
          const port = await new Promise(
            (resolve, reject) => {
              const timeout = setTimeout(() => {
                child.kill()
                reject(
                  new Error("Preview worker did not start"),
                )
              }, 10000)
              child.once("message", (message) => {
                clearTimeout(timeout)
                resolve(message.port)
              })
              child.once("error", (error) => {
                clearTimeout(timeout)
                reject(error)
              })
              child.once("exit", () => {
                clearTimeout(timeout)
                reject(new Error("Preview worker exited"))
                active.delete(directory)
              })
            },
          )
          entry = { child, port }
          active.set(directory, entry)
        }
        try {
          const { stdout } = await run(
            "devshare",
            [
              String(entry.port),
              String(body.name || "model-preview"),
            ],
            {
              timeout: 12000,
              env: {
                ...process.env,
                DEVSHARE_SESSION_ID: body.sessionId || "",
              },
              maxBuffer: 65536,
            },
          )
          const url = stdout.trim().split("\n").at(-1)
          if (!/^https?:\/\//.test(url))
            throw new Error("Devshare did not return a URL")
          send(200, {
            directory,
            port: entry.port,
            url,
            version: metadata.version,
          })
        } catch (error) {
          entry.child.kill()
          active.delete(directory)
          throw error
        }
      } catch (error) {
        send(400, { error: error.message })
      }
    },
  )
  await new Promise((resolve, reject) => {
    service.once("error", reject)
    service.listen(socketPath, resolve)
  })
  await chmod(socketPath, 0o600)
  console.log(`Model viewer service: ${socketPath}`)
  const stop = () => {
    for (const { child } of active.values()) child.kill()
    service.close(() => {
      unlink(socketPath).catch(() => {})
      process.exit(0)
    })
  }
  process.once("SIGTERM", stop)
  process.once("SIGINT", stop)
  return service
}
