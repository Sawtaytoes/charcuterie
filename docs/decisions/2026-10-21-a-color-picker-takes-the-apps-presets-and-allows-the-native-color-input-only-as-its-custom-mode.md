# A color picker takes the app's presets and allows the native color input only as its custom mode

Status: Accepted
Date: 2026-10-21
Type: API
Supersedes: None
Superseded by: None

## Decision

`ColorPicker` in `@charcuterie/ui` is the shared shape for "pick a color, from our list or your
own":

- **The presets are the app's**, passed as `{ name, value }[]` with `#RRGGBB` values. They are
  `Swatch`-class data, not `categorical` tokens, so the library does not re-theme or
  contrast-gate them. A choice from the library's own ten hues stays a `categorical` picker
  ([categorical decision](2026-08-19-categorical-is-a-curated-palette-not-ungoverned-colour.md)).
- **The presets are a `Combobox`**, each row a `Swatch` and its name, so typing "pink"
  narrows the list. A hex code in the search finds its preset.
- **`isCustomAllowed` adds a "Custom color…" row** that is always listed. It reveals a panel
  under the trigger with the browser's `<input type="color">` and a hex field. The native color
  input is allowed **only** inside this custom mode. It is never the whole picker.
- **A custom color is a draft until the person applies it** (Use color or Enter), and it is
  reported as `#RRGGBB` in upper case. Escape and Cancel drop the draft.
- **`getColorError(hex)` is the app's rule.** A non-null answer is shown under the hex field
  and blocks applying. It is asked of custom colors only.

## Context

The owner, looking at an app's native color input on a child's color, asked for predefined
colors plus a custom choice, a combobox, and more shades (several pinks). Docket already had a
presets-only swatch row, and Tally Marks needed presets plus custom, so the shape is shared and
belongs here first.

## Why

The native color input alone offers sixteen million colors with no names, and nothing stops a
person picking one that cannot be seen where the app draws it. Presets fix that, but a closed
list cannot satisfy a family that wants a shade nobody listed. The custom mode keeps the
browser's wheel and eyedropper, which nobody wants rebuilt, while the app's rule keeps the
custom value inside what the app can draw. Applying on every wheel movement would write dozens of
values to an app's server during one drag, so the panel applies on request.

## Evidence

- Owner, chat `47e61bb7-a7b1-4cf4-aa3b-9f168b1c912a`, 2026-10-21: "I'd add more colors to the
  selection. Some people might have multiple girls who want various shades of pink."
- Same chat: "We can also make this a combobox."
- Same chat, showing a native color input on a child's color: "Having predefined colors along
  with the option to choose a custom color would be great!"
