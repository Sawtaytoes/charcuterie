# @charcuterie/tokens

## 0.2.0

### Minor Changes

- a653015: The ePaper Spectra 6 palette is the one castkit measured, not the one this package invented.

  `epaperColours.spectra6` shipped plausible primaries — `#D02F2A`, `#E8C11C`, `#2B4C9B`,
  `#2E7D46`, and `#FFFFFF` for the paper — and not one of them is a colour an E6 render
  pipeline maps 1:1, so none of the six was the colour that reached a panel. The paper is
  the bigger miss: an E6 panel cannot produce `#FFFFFF`, so every contrast number ever
  computed for this profile was against a white the hardware never shows.

  Values now come from Pimoroni's `inky` driver (`inky_e673.py`) by way of
  `castkit/packages/core/src/panels/palette.ts`, at the fleet's `saturation` of 0.5:
  `#000000`, `#D0D2D2`, `#CE2426`, `#E8DF24`, `#1F1EAF`, `#1DAD23`. `mono` is unchanged in
  effect but now has its own constants — a 1-bit pHAT's white really is `#FFFFFF`.

  **Breaking for anyone reading these literals**, which is the point of a token package:
  five of the six change value. Nothing else in the package moves, and the four variants x
  two schemes are untouched.

## 0.1.0

### Minor Changes

- Initial public release of the Charcuterie fleet library: the design tokens, the five state kinds (Visibility, VisibilityGroup, SinglePicker, MultiplePicker, RovingFocus, Status), the component set, and the shared ESLint + Biome configs.
