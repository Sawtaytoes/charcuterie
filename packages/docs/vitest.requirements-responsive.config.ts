import {
  createRequirementsConfig,
  responsiveFeatureFiles,
} from "./vitest.requirements.shared.ts"

/**
 * `@responsive` scenarios only, in all four standard windows.
 * With no such scenario this project has no files, and Vitest skips it.
 */
export default createRequirementsConfig({
  name: "requirements-responsive",
  include: responsiveFeatureFiles(),
  testNamePattern: /@responsive\b/,
  windows: ["narrow", "tall", "wide", "ultrawide"],
})
