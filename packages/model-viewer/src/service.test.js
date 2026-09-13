import { execFile, spawn } from "node:child_process"
import {
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises"
import http from "node:http"
import os from "node:os"
import path from "node:path"
import { promisify } from "node:util"
import { expect, it } from "vitest"

const run = promisify(execFile)
it("keeps two previews alive after their launcher exits and isolates their workers", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "viewer-service-test-"),
  )
  const bin = path.join(root, "bin")
  await mkdir(bin)
  await writeFile(
    path.join(bin, "devshare"),
    '#!/usr/bin/env node\nconsole.log("http://127.0.0.1:" + process.argv[2])\n',
    { mode: 0o755 },
  )
  const env = {
    ...process.env,
    MODEL_VIEWER_ROOT: root,
    PATH: `${bin}:${process.env.PATH}`,
  }
  const cli = new URL("./cli.js", import.meta.url)
  const child = spawn(
    process.execPath,
    [cli.pathname, "daemon"],
    { env, stdio: ["ignore", "pipe", "pipe"] },
  )
  const request = (body) =>
    new Promise((resolve, reject) => {
      const socket = http.request(
        {
          socketPath: path.join(root, "service.sock"),
          path: "/serve",
          method: "POST",
        },
        (response) => {
          let text = ""
          response.on("data", (data) => {
            text += data
          })
          response.on("end", () =>
            resolve({
              status: response.statusCode,
              ...JSON.parse(text),
            }),
          )
        },
      )
      socket.on("error", reject)
      socket.end(JSON.stringify(body))
    })
  try {
    await new Promise((resolve, reject) => {
      child.stdout.once("data", resolve)
      child.once("error", reject)
      child.once("exit", (code) =>
        reject(new Error(`Service exited: ${code}`)),
      )
    })
    const model = path.join(root, "part.stl")
    await writeFile(
      model,
      "solid part\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 20 0 0\nvertex 0 20 0\nendloop\nendfacet\nendsolid part",
    )
    const first = await run(
      process.execPath,
      [cli.pathname, model],
      { env },
    )
    const second = await run(
      process.execPath,
      [cli.pathname, model],
      { env },
    )
    const urls = [first, second].map((result) =>
      result.stdout.trim().split("\n").at(-1),
    )
    expect(urls[0]).not.toBe(urls[1])
    for (const url of urls) {
      expect(
        (await fetch(`${url}/version.json`)).status,
      ).toBe(200)
      expect(
        (await (await fetch(`${url}/models.json`)).json())
          .models,
      ).toHaveLength(1)
    }
    expect(
      (await request({ directory: os.tmpdir() })).status,
    ).toBe(400)
    expect((await request({ probe: true })).version).toBe(
      "0.1.0",
    )
    // Linux runtime proof: stopping one listening process must not stop its sibling or supervisor.
    if (process.platform === "linux") {
      const { readFile } = await import("node:fs/promises")
      const children = (
        await readFile(
          `/proc/${child.pid}/task/${child.pid}/children`,
          "utf8",
        )
      )
        .trim()
        .split(/\s+/)
        .map(Number)
      expect(children).toHaveLength(2)
      process.kill(children[0], "SIGTERM")
      expect(
        (await fetch(`${urls[1]}/version.json`)).status,
      ).toBe(200)
      expect((await request({ probe: true })).version).toBe(
        "0.1.0",
      )
    }
  } finally {
    const stopped = new Promise((resolve) =>
      child.once("exit", resolve),
    )
    child.kill("SIGTERM")
    await stopped
    await rm(root, { recursive: true, force: true })
  }
}, 15000)
