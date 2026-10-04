import assert from "node:assert/strict"
import { createRequire } from "node:module"
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

for (const [name, require] of [
  ["workspace", rootRequire],
  ["standalone VRT", vrtRequire],
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
