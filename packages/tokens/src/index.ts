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
  buildColourProperties,
  buildDensityProperties,
  buildFirstPaintCss,
  buildFirstPaintRule,
  buildFirstPaintScript,
  buildThemeCss,
  buildVariablesCss,
  DEFAULT_COLOR_SCHEME_STORAGE_KEY,
} from "./buildCss.ts"
export type {
  CategoricalDistinctnessFailure,
  CategoricalIndex,
  CategoricalRole,
  CategoricalTuning,
} from "./categorical.ts"
export {
  buildCategoricalScheme,
  CATEGORICAL_ADJACENT_PAIRS,
  CATEGORICAL_BORDER_THRESHOLD,
  CATEGORICAL_DISTINCTNESS_FLOOR,
  CATEGORICAL_HUES,
  CATEGORICAL_INDEX_COUNT,
  CATEGORICAL_INDEXES,
  CATEGORICAL_PAIRS,
  getCategoricalDistinctnessFailures,
  TABLEAU_10_MINIMUM_DISTANCE,
} from "./categorical.ts"
export type { OkLab, OkLch } from "./colourSpace.ts"
export {
  getColourDistance,
  toGamut,
  toHex,
} from "./colourSpace.ts"
export type { ContrastResult } from "./contrast.ts"
export {
  getApcaLc,
  getContrast,
  getContrastRatio,
} from "./contrast.ts"
export type { ContrastCheck } from "./contrastAudit.ts"
export {
  auditScheme,
  getAliasDrift,
  getFailures,
  INTENT_NAMES,
} from "./contrastAudit.ts"
export { getCategoricalIndex } from "./getCategoricalIndex.ts"
export type { ResolvedTokens } from "./resolveTokens.ts"
export { resolveTokens } from "./resolveTokens.ts"

export {
  containerQuery,
  contentInlineSize,
  densityControl,
  densityFontScale,
  layer,
  screen,
  space,
} from "./scales.ts"
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
export {
  daylight,
  hairline,
  layered,
  legible,
  variants,
  variantsByName,
} from "./variants/index.ts"
