import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { brotliDecompressSync, gunzipSync } from "node:zlib"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest"

import { compressDirectory } from "./compressDirectory.ts"

const COMPRESSIBLE = `body{color:red}${" /* pad */".repeat(400)}`

let directory = ""

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "charc-press-"))
})

afterEach(async () => {
  await rm(directory, { force: true, recursive: true })
})

describe("compressDirectory", () => {
  test("writes siblings that decompress to the original", async () => {
    await writeFile(
      join(directory, "app.css"),
      COMPRESSIBLE,
    )

    await compressDirectory({ directory })

    expect(
      brotliDecompressSync(
        await readFile(join(directory, "app.css.br")),
      ).toString(),
    ).toBe(COMPRESSIBLE)
    expect(
      gunzipSync(
        await readFile(join(directory, "app.css.gz")),
      ).toString(),
    ).toBe(COMPRESSIBLE)
  })

  test("leaves the original in place", async () => {
    await writeFile(
      join(directory, "app.css"),
      COMPRESSIBLE,
    )

    await compressDirectory({ directory })

    expect(
      (
        await readFile(join(directory, "app.css"))
      ).toString(),
    ).toBe(COMPRESSIBLE)
  })

  test("recurses into nested directories", async () => {
    await mkdir(join(directory, "assets"))
    await writeFile(
      join(directory, "assets", "app.js"),
      COMPRESSIBLE,
    )

    const artifacts = await compressDirectory({ directory })

    expect(artifacts).toHaveLength(2)
    expect(
      await readdir(join(directory, "assets")),
    ).toContain("app.js.br")
  })

  test("skips already-compressed formats", async () => {
    await writeFile(
      join(directory, "font.woff2"),
      COMPRESSIBLE,
    )
    await writeFile(
      join(directory, "logo.png"),
      COMPRESSIBLE,
    )

    const artifacts = await compressDirectory({ directory })

    expect(artifacts).toEqual([])
  })

  test("skips files under the threshold", async () => {
    await writeFile(join(directory, "tiny.js"), "let x=1")

    const artifacts = await compressDirectory({ directory })

    expect(artifacts).toEqual([])
  })

  // High-entropy bytes do not compress. Writing a larger sibling
  // would cost the client bytes *and* a decompress. Seeded xorshift
  // rather than `randomBytes` so the assertion is deterministic.
  test("discards a sibling that grew", async () => {
    let seed = 0x9e37_79b9
    const incompressible = Buffer.from(
      Array.from({ length: 4_096 }, () => {
        seed ^= seed << 13
        seed ^= seed >>> 17
        seed ^= seed << 5
        return seed & 0xff
      }),
    )
    await writeFile(
      join(directory, "noise.wasm"),
      incompressible,
    )

    const artifacts = await compressDirectory({
      algorithms: ["gz"],
      directory,
    })

    expect(artifacts).toEqual([])
    expect(await readdir(directory)).not.toContain(
      "noise.wasm.gz",
    )
  })

  test("honours the requested algorithms", async () => {
    await writeFile(join(directory, "app.js"), COMPRESSIBLE)

    const artifacts = await compressDirectory({
      algorithms: ["br"],
      directory,
    })

    expect(
      artifacts.map(({ algorithm }) => algorithm),
    ).toEqual(["br"])
  })

  test("reports the sizes it achieved", async () => {
    await writeFile(join(directory, "app.js"), COMPRESSIBLE)

    const [artifact] = await compressDirectory({
      algorithms: ["br"],
      directory,
    })

    expect(artifact?.originalBytes).toBe(
      COMPRESSIBLE.length,
    )
    expect(artifact?.compressedBytes).toBeLessThan(
      COMPRESSIBLE.length,
    )
  })
})
