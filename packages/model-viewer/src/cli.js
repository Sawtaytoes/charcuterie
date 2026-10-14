#!/usr/bin/env node
import { execFile } from "node:child_process"
import { access, readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { parseArgs, promisify } from "node:util"
import metadata from "../package.json" with { type: "json" }
import {
  daemon,
  serviceRequest,
  staticServer,
} from "./server.js"
import { parseSpec, stagePreview } from "./stage.js"

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      title: { type: "string" },
      shot: { type: "string" },
      note: { type: "string" },
      name: { type: "string" },
      port: { type: "string" },
      manifest: { type: "string" },
      "stage-only": { type: "boolean" },
      "no-share": { type: "boolean" },
      version: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  })
  if (values.version) console.log(metadata.version)
  else if (
    values.help ||
    (!positionals.length && !values.manifest)
  ) {
    console.log(
      "model-viewer [--title TEXT] [--note TEXT] [--name NAME] [--port N] FILE.stl[,label=TEXT,color=0xRRGGBB,visible=false,offset=x;y;z]\nmodel-viewer --manifest models.json [--stage-only | --no-share]  # a manifest with a replay section stages the G-code replay page\nmodel-viewer daemon  # runtime-owned service; installed once per container",
    )
  } else if (positionals[0] === "daemon") await daemon()
  else {
    const manifest = values.manifest
      ? JSON.parse(await readFile(values.manifest, "utf8"))
      : { models: positionals.map(parseSpec) }
    if (values.title) manifest.title = values.title
    if (values.note) manifest.note = values.note
    const port = Number(values.port || 0)
    if (!Number.isInteger(port) || port < 0 || port > 65535)
      throw new Error("Invalid port")
    const directory = await stagePreview(
      manifest,
      values.manifest
        ? path.dirname(path.resolve(values.manifest))
        : process.cwd(),
    )
    if (values["stage-only"]) console.log(directory)
    else if (values["no-share"]) {
      const server = await staticServer(directory, port)
      console.log(
        `serving ${directory} on http://127.0.0.1:${server.address().port}/`,
      )
      if (values.shot)
        await screenshot(
          `http://127.0.0.1:${server.address().port}/`,
          values.shot,
        )
    } else {
      let result
      try {
        result = await serviceRequest({
          directory,
          port,
          name:
            values.name ||
            manifest.title ||
            "model-preview",
          sessionId:
            process.env.DEVSHARE_SESSION_ID ??
            process.env.CLAUDE_CODE_SESSION_ID ??
            "",
        })
      } catch (error) {
        if (["ENOENT", "ECONNREFUSED"].includes(error.code))
          throw new Error(
            "The local model-viewer service is not running. Install/start it through the container runtime; --no-share serves in the foreground.",
          )
        throw error
      }
      console.log(
        `serving ${directory} on http://127.0.0.1:${result.port}/\n${result.url}`,
      )
      if (values.shot)
        await screenshot(
          `http://127.0.0.1:${result.port}/`,
          values.shot,
        )
    }
  }
} catch (error) {
  console.error(`model-viewer: ${error.message}`)
  process.exitCode = 1
}

async function screenshot(url, file) {
  const folders = await readdir("/opt/pw-browsers").catch(
    () => [],
  )
  const browsers = folders
    .filter((name) => name.startsWith("chromium-"))
    .sort()
    .reverse()
    .map(
      (name) =>
        `/opt/pw-browsers/${name}/chrome-linux64/chrome`,
    )
  browsers.push(
    "/opt/google/chrome/chrome",
    "/usr/bin/chromium",
  )
  for (const browser of browsers) {
    try {
      await access(browser)
      await promisify(execFile)(
        browser,
        [
          "--headless=new",
          "--disable-gpu",
          "--use-gl=swiftshader",
          "--enable-unsafe-swiftshader",
          "--no-sandbox",
          "--hide-scrollbars",
          "--virtual-time-budget=20000",
          "--window-size=1500,900",
          `--screenshot=${path.resolve(file)}`,
          url,
        ],
        { timeout: 90000, maxBuffer: 1048576 },
      )
      await access(file)
      console.log(`screenshot -> ${path.resolve(file)}`)
      return
    } catch {
      /* Try the next installed browser; the preview service stays running. */
    }
  }
  console.error(
    "Screenshot failed; the preview URL remains available",
  )
}
