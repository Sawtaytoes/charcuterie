// Lint fixture. `it()` where the house standardises on `test()`.

import { expect, it } from "vitest"

it("uses the wrong alias", () => {
  expect(true).toBe(true)
})
