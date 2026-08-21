import { charcuterieManagerConfig } from "@charcuterie/storybook-config/manager"
import { addons } from "storybook/manager-api"

/**
 * The sidebar's `deprecated` badge, and nothing else.
 *
 * It lives in `@charcuterie/storybook-config` rather than here
 * because every app's Storybook wants the same mark on the same
 * components — this package is the reference consumer of its own
 * shared setup, exactly as it is for the theme axes in
 * `preview.tsx`.
 */
addons.setConfig(charcuterieManagerConfig)
