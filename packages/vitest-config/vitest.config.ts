import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    name: "vitest-config",
    include: ["src/**/*.test.{js,ts}"],
    exclude: ["**/node_modules/**"],
  },
})
