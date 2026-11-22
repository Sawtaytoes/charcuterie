import { join } from "node:path"

import { createRequirementsConfig } from "./vitest.requirements.shared.ts"

/**
 * Every requirement scenario except `@responsive` ones, in one
 * window, plus the unit tests of the requirement helpers.
 */
export default createRequirementsConfig({
  name: "requirements",
  include: [
    join(import.meta.dirname, "requirements/**/*.feature"),
    join(import.meta.dirname, "requirements/**/*.test.ts"),
  ],
  testNamePattern: /^(?![\s\S]*@responsive\b)/,
  windows: ["wide"],
})
