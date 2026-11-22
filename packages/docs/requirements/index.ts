import { setWorldConstructor } from "quickpickle"

import { RequirementsWorld } from "./support/RequirementsWorld.ts"

/**
 * The requirements setup file. Vitest loads it before every feature.
 *
 * Every `steps/*.steps.ts` registers itself through the glob, so a
 * new step file cannot be forgotten here. The checker
 * (`pnpm requirements:check`) reads the same files.
 */
setWorldConstructor(RequirementsWorld)

import.meta.glob("./steps/*.steps.ts", { eager: true })
