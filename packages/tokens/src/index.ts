/**
 * The one sanctioned barrel for `@charcuterie/tokens`.
 *
 * House convention: a package gets exactly one barrel, and modules
 * inside the package never import each other *through* it. Deep
 * imports stay available via the `"./*"` entry in `package.json`
 * for budget-sensitive consumers — `slatecast` has 60 KB gz to
 * spend and should not pull the variant table to read one radius.
 */

export {
  getApcaLc,
  getContrast,
  getContrastRatio,
} from "./contrast.ts"
export type { ContrastResult } from "./contrast.ts"

export {
  auditScheme,
  getAliasDrift,
  getFailures,
  INTENT_NAMES,
} from "./contrastAudit.ts"
export type { ContrastCheck } from "./contrastAudit.ts"

export {
  buildColourProperties,
  buildDensityProperties,
  buildThemeCss,
  buildVariablesCss,
} from "./buildCss.ts"

export { resolveTokens } from "./resolveTokens.ts"
export type { ResolvedTokens } from "./resolveTokens.ts"

export {
  container,
  densityControl,
  densityFontScale,
  layer,
  screen,
  space,
} from "./scales.ts"

export {
  daylight,
  hairline,
  layered,
  legible,
  variants,
  variantsByName,
} from "./variants/index.ts"

export type {
  BorderRole,
  ContentRole,
  ControlSize,
  ControlTokens,
  Density,
  ElevationStep,
  IntentName,
  IntentRole,
  MotionTokens,
  RadiusStep,
  Scheme,
  SchemeColours,
  SurfaceRole,
  TypographyTokens,
  Variant,
} from "./types.ts"
