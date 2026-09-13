import {
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { staticServer } from "./server.js"
import { parseSpec } from "./stage.js"

describe("preview files", () => {
  it("serves only the staged directory and refuses symlink escapes and writes", async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "viewer-test-"),
    )
    await mkdir(path.join(root, "public"))
    await writeFile(
      path.join(root, "private.txt"),
      "private",
    )
    await writeFile(
      path.join(root, "public/index.html"),
      "preview",
    )
    await symlink(
      path.join(root, "private.txt"),
      path.join(root, "public/leak.txt"),
    )
    const server = await staticServer(
      path.join(root, "public"),
    )
    const url = `http://127.0.0.1:${server.address().port}`
    try {
      expect(await (await fetch(url)).text()).toBe(
        "preview",
      )
      expect((await fetch(`${url}/leak.txt`)).status).toBe(
        403,
      )
      expect(
        (await fetch(`${url}/..%2fprivate.txt`)).status,
      ).toBe(403)
      expect(
        (await fetch(url, { method: "POST" })).status,
      ).toBe(405)
      const head = await fetch(url, { method: "HEAD" })
      expect(head.headers.get("content-length")).toBe("7")
      expect(await head.text()).toBe("")
    } finally {
      server.closeAllConnections()
      await new Promise((resolve) => server.close(resolve))
      await rm(root, { recursive: true })
    }
  })
  it("preserves the legacy STL arguments without interpreting labels as code", () => {
    expect(
      parseSpec(
        "part.stl,label=<script>,color=0xabcdef,visible=false,offset=1;2;3",
      ),
    ).toEqual({
      file: "part.stl",
      label: "<script>",
      color: 0xabcdef,
      visible: false,
      offset: [1, 2, 3],
    })
    expect(() => parseSpec("part.stl,color=oops")).toThrow()
    expect(() =>
      parseSpec("part.stl,unknown=yes"),
    ).toThrow()
  })
})
