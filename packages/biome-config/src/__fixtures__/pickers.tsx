// Lint fixture for `@charcuterie/biome-config/app` — one raw
// `<select>`, one deprecated `<Select>`, and the import that
// brings it in. All three are what the app config exists to
// catch; `Picker` beside them is what it must leave alone.
import { Picker, Select } from "@charcuterie/ui"

export const RawSelect = () => (
  <select name="quality">
    <option value="high">High</option>
  </select>
)

export const DeprecatedSelect = () => (
  <Select label="Quality" options={[]} />
)

export const Chosen = () => (
  <Picker label="Quality" options={[]} />
)
