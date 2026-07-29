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
    files: [
      "packages/docs/**/*.tsx",
      "packages/ui/**/*.tsx",
    ],
  }),
  // The logical-properties rule applies to shipped component
  // markup, which as of M3 is `packages/ui` — every className in
  // there is the fleet's markup, so `pl-`/`mr-`/`text-left` fail
  // the lint rather than reaching a consumer.
  createLogicalPropertiesRules({
    files: [
      "packages/docs/**/*.tsx",
      "packages/ui/**/*.tsx",
    ],
  }),
  createStoryOverrides({}),
  createTestRules({}),
)
