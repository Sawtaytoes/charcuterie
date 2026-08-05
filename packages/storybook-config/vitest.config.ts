import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    name: "storybook-config",
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
})
