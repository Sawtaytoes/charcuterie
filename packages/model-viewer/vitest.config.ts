import { defineConfig } from "vitest/config"
export default defineConfig({
  root: import.meta.dirname,
  test: {
    name: "model-viewer",
    include: ["src/**/*.test.js"],
  },
})
