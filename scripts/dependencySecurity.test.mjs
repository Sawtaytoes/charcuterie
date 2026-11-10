import assert from "node:assert/strict"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  writeFileSync,
} from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"

const rootRequire = createRequire(
  new URL("../package.json", import.meta.url),
)
const vrtRequire = createRequire(
  new URL(
    "../packages/ci/src/vrt/package.json",
    import.meta.url,
  ),
)

// The workspace reaches reg-suit through the docs package, which runs VRT.
const docsRequire = createRequire(
  new URL("../packages/docs/package.json", import.meta.url),
)

for (const [name, require, regSuitRequire] of [
  ["workspace", rootRequire, docsRequire],
  ["standalone VRT", vrtRequire, vrtRequire],
]) {
  const braces = require("braces")

  test(`${name}: deep braces and parentheses fail before recursive walkers`, () => {
    for (const [open, close] of [
      ["{", "}"],
      ["(", ")"],
    ]) {
      const attack = `${open.repeat(4000)}a${close.repeat(4000)}`
      for (const operation of [
        braces,
        braces.parse,
        braces.compile,
        braces.expand,
        braces.stringify,
      ]) {
        assert.throws(() => operation(attack), {
          name: "SyntaxError",
          message:
            "Input nesting depth exceeds maximum (100)",
        })
      }
    }
  })

  test(`${name}: normal globs, boundary depth and literal braces still work`, () => {
    assert.deepEqual(braces.expand("src/{a,b}.{js,ts}"), [
      "src/a.js",
      "src/a.ts",
      "src/b.js",
      "src/b.ts",
    ])
    assert.equal(braces.compile("{a,b}"), "(a|b)")
    assert.doesNotThrow(() =>
      braces.compile(
        `${"{".repeat(100)}a${"}".repeat(100)}`,
      ),
    )
    assert.doesNotThrow(() =>
      braces.compile("\\{".repeat(1000)),
    )
    assert.doesNotThrow(() =>
      braces.compile(`"${"{".repeat(1000)}"`),
    )
    assert.doesNotThrow(() =>
      braces.compile(`[${"{".repeat(1000)}]`),
    )
  })

  test(`${name}: reg-suit dependencies retain their required APIs`, () => {
    const editorRequire = createRequire(
      require.resolve("external-editor"),
    )
    const tmp = editorRequire("tmp")
    const file = tmp.fileSync({
      prefix: "security-regression-",
    })
    assert.equal(typeof file.name, "string")
    file.removeCallback()
    assert.throws(() =>
      tmp.fileSync({ prefix: "../../escape" }),
    )
    const publisherRequire = createRequire(
      require.resolve("reg-publish-s3-plugin"),
    )
    const uuid = publisherRequire("uuid")
    assert.equal(uuid.validate(uuid.v4()), true)
    assert.throws(
      () =>
        uuid.v5("fixture", uuid.v5.DNS, new Uint8Array(1)),
      RangeError,
    )
    assert.equal(
      typeof require("reg-publish-s3-plugin"),
      "function",
    )
  })

  test(`${name}: reg-suit's rimraf runs on the patched glob major`, () => {
    const rimrafRequire = createRequire(
      createRequire(
        regSuitRequire.resolve("reg-suit/package.json"),
      ).resolve("reg-suit-core"),
    )
    const { rimrafSync } = rimrafRequire("rimraf")
    const globRequire = createRequire(
      rimrafRequire.resolve("rimraf"),
    )
    const [globMajor, globMinor, globPatch] = globRequire(
      "glob/package.json",
    )
      .version.split(".")
      .map(Number)
    assert.ok(
      globMajor > 14 ||
        (globMajor === 14 &&
          (globMinor > 0 || globPatch >= 2)),
      "glob must be 14.0.2 or later (GHSA-3g3m-2fjr-6pw4)",
    )
    const [minimatchMajor, minimatchMinor, minimatchPatch] =
      createRequire(globRequire.resolve("glob"))(
        "minimatch/package.json",
      )
        .version.split(".")
        .map(Number)
    assert.ok(
      minimatchMajor > 11 ||
        (minimatchMajor === 11 &&
          (minimatchMinor > 0 || minimatchPatch >= 1)),
      "minimatch must be 11.0.1 or later (GHSA-g3hv-75wg-m249)",
    )

    const root = mkdtempSync(
      join(tmpdir(), "security-regression-"),
    )
    mkdirSync(join(root, "actual"))
    writeFileSync(join(root, "actual", "a.png"), "")
    writeFileSync(join(root, "keep.txt"), "")
    writeFileSync(join(root, "drop.log"), "")
    rimrafSync(join(root, "*.log"), { glob: {} })
    assert.deepEqual(readdirSync(root).sort(), [
      "actual",
      "keep.txt",
    ])
    rimrafSync(join(root, "actual"))
    assert.deepEqual(readdirSync(root), ["keep.txt"])
    rimrafSync(root)
    assert.equal(existsSync(root), false)
  })
}

const CachePolicy = rootRequire("http-cache-semantics")
const request = {
  url: "https://example.invalid/resource",
  headers: {},
}
const staleRequest = {
  ...request,
  headers: { "cache-control": "max-stale=100000" },
}

for (const headers of [
  {
    "cache-control": "max-age=3600",
    "set-cookie": "session=fixture",
  },
  { "cache-control": "max-age=1, proxy-revalidate" },
  { "cache-control": "no-cache" },
]) {
  test(`cache restrictions cannot be bypassed by max-stale: ${JSON.stringify(headers)}`, () => {
    const policy = new CachePolicy(request, {
      status: 200,
      headers,
    })
    const now = policy.now()
    policy.now = () => now + 7200000
    assert.equal(
      policy.satisfiesWithoutRevalidation(staleRequest),
      false,
    )
  })
}

test("ordinary expired entries still support max-stale", () => {
  const policy = new CachePolicy(request, {
    status: 200,
    headers: { "cache-control": "max-age=1" },
  })
  const now = policy.now()
  policy.now = () => now + 2000
  assert.equal(
    policy.satisfiesWithoutRevalidation(staleRequest),
    true,
  )
})

test("explicit public cookies and private caches retain their opt-in behavior", () => {
  for (const [headers, options] of [
    [
      {
        "cache-control": "public, max-age=3600",
        "set-cookie": "session=fixture",
      },
      {},
    ],
    [
      {
        "cache-control": "max-age=3600",
        "set-cookie": "session=fixture",
      },
      { shared: false },
    ],
  ]) {
    const policy = new CachePolicy(
      request,
      { status: 200, headers },
      options,
    )
    assert.equal(
      policy.satisfiesWithoutRevalidation(request),
      true,
    )
  }
})
