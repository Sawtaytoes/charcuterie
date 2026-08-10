import { describe, expect, test } from "vitest"

import {
  getIsImmutablePath,
  IMMUTABLE_CACHE_CONTROL,
  REVALIDATE_CACHE_CONTROL,
  resolveCacheControl,
} from "./cachePolicy.ts"

describe("getIsImmutablePath", () => {
  test("matches the default assets prefix", () => {
    expect(
      getIsImmutablePath({
        pathname: "/assets/index-D7e1J0tu.js",
      }),
    ).toBe(true)
  })

  test("rejects the entry HTML", () => {
    expect(
      getIsImmutablePath({ pathname: "/index.html" }),
    ).toBe(false)
  })

  test("rejects an unhashed file at the root", () => {
    expect(
      getIsImmutablePath({
        pathname: "/command-descriptions.js",
      }),
    ).toBe(false)
  })

  test("honours custom prefixes", () => {
    expect(
      getIsImmutablePath({
        immutablePathPrefixes: ["/static/", "/images/"],
        pathname: "/images/box-art-abc.png",
      }),
    ).toBe(true)
  })

  // A prefix list is a whitelist, so an app that renames
  // `assetsDir` and forgets to say so gets the *safe* answer —
  // revalidated — rather than a year of stale caching.
  test("custom prefixes replace the default", () => {
    expect(
      getIsImmutablePath({
        immutablePathPrefixes: ["/static/"],
        pathname: "/assets/index-D7e1J0tu.js",
      }),
    ).toBe(false)
  })
})

describe("resolveCacheControl", () => {
  test("hashed assets are immutable", () => {
    expect(
      resolveCacheControl({
        pathname: "/assets/index-D7e1J0tu.js",
      }),
    ).toBe(IMMUTABLE_CACHE_CONTROL)
  })

  test("everything else revalidates", () => {
    expect(
      resolveCacheControl({ pathname: "/index.html" }),
    ).toBe(REVALIDATE_CACHE_CONTROL)
  })

  // The regression that started all of this: `no-store` on a
  // content-hashed bundle re-downloaded a megabyte on every load.
  test("never emits no-store", () => {
    expect(IMMUTABLE_CACHE_CONTROL).not.toContain(
      "no-store",
    )
    expect(REVALIDATE_CACHE_CONTROL).not.toContain(
      "no-store",
    )
  })
})
