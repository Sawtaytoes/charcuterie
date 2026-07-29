import {
  createLogicalPropertiesRules,
  createReactRules,
  createStoryOverrides,
  createTestRules,
  createTypedRules,
} from "@charcuterie/eslint-config"
import { defineConfig } from "eslint/config"

export default defineConfig(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/storybook-static/**",
      ".yarn/**",
      "packages/eslint-config/src/__fixtures__/**",
      "packages/tokens/preview/**",
    ],
  },
  createTypedRules({
    tsconfigRootDir: import.meta.dirname,
  }),
  createReactRules({
    files: ["packages/docs/**/*.tsx"],
  }),
  // The logical-properties rule applies to shipped component
  // markup. `packages/docs` is where the first of it lives; M3
  // adds `packages/ui/**/*.tsx` alongside it.
  createLogicalPropertiesRules({
    files: ["packages/docs/**/*.tsx"],
  }),
  createStoryOverrides({}),
  createTestRules({}),
)
