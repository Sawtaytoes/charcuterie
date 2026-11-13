import { describe, expect, it } from "vitest"

import {
  chooseSharedMemory,
  MINIMUM_SHARED_MEMORY_BYTES,
  readAvailableSharedMemory,
} from "./sharedMemory.js"

const MEBIBYTE = 1024 * 1024

describe("chooseSharedMemory", () => {
  it("keeps shared memory in /dev/shm when it has room", () => {
    const choice = chooseSharedMemory(2048 * MEBIBYTE)

    expect(choice.isInMemory).toBe(true)
    expect(choice.ignoreDefaultArgs).toEqual([
      "--disable-dev-shm-usage",
    ])
    expect(choice.message).toContain("2048 MiB free")
  })

  it("accepts exactly the minimum", () => {
    expect(
      chooseSharedMemory(MINIMUM_SHARED_MEMORY_BYTES)
        .isInMemory,
    ).toBe(true)
  })

  it("keeps Playwright's temp-file default for Docker's 64 MiB /dev/shm", () => {
    const choice = chooseSharedMemory(64 * MEBIBYTE)

    expect(choice.isInMemory).toBe(false)
    expect(choice.ignoreDefaultArgs).toEqual([])
    expect(choice.message).toContain("only 64 MiB free")
  })

  it("keeps the default when /dev/shm cannot be read", () => {
    const choice = chooseSharedMemory(null)

    expect(choice.isInMemory).toBe(false)
    expect(choice.ignoreDefaultArgs).toEqual([])
    expect(choice.message).toContain("could not be read")
  })
})

describe("readAvailableSharedMemory", () => {
  it("returns null for a path that does not exist", async () => {
    expect(
      await readAvailableSharedMemory(
        "/no/such/shared-memory-directory",
      ),
    ).toBeNull()
  })

  it("reads the free bytes of a real filesystem", async () => {
    const available = await readAvailableSharedMemory("/")

    expect(available).toBeGreaterThan(0)
  })
})
