import { describe, expect, test } from "vitest"

import { createQueryClient } from "./createQueryClient.ts"

describe("createQueryClient", () => {
  test("does not force retries off — react-query's resilient default stands", () => {
    const client = createQueryClient()
    const { queries, mutations } =
      client.getDefaultOptions()

    // We set no `retry`, so react-query applies its own default
    // (3 for queries, 0 for mutations) rather than a fleet opinion.
    expect(queries?.retry).toBeUndefined()
    expect(mutations?.retry).toBeUndefined()
  })

  test("an override wins without dropping the sibling defaults", () => {
    const client = createQueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 5_000 },
      },
    })
    const { queries } = client.getDefaultOptions()

    // A polling app opts out of retries here...
    expect(queries?.retry).toBe(false)
    // ...and its other options merge in cleanly.
    expect(queries?.staleTime).toBe(5_000)
  })

  test("top-level client config passes through", () => {
    const client = createQueryClient({
      defaultOptions: { queries: { gcTime: 1_000 } },
    })

    expect(client.getDefaultOptions().queries?.gcTime).toBe(
      1_000,
    )
  })
})
