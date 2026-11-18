import { describe, expect, test } from "vitest"

import { formatBytes } from "./formatBytes.ts"

describe("formatBytes", () => {
  test("keeps Mail Sifter's rendering", () => {
    expect(formatBytes(912)).toBe("912 B")
    expect(formatBytes(482_133)).toBe("471 KB")
    expect(formatBytes(2_340_112)).toBe("2.2 MB")
  })

  test("says nothing for a size that is not one", () => {
    expect(formatBytes(Number.NaN)).toBe("")
    expect(formatBytes(-1)).toBe("")
  })
})
