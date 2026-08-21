import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    name: "biome-config",
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "src/__fixtures__/**"],
  },
})
