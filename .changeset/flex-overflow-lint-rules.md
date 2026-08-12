---
"@charcuterie/eslint-config": minor
---

Add the opt-in flex-overflow rules: `charcuterie/no-unconstrained-flex-text` (warn) and `charcuterie/no-shrink-0-with-flex-wrap` (error).

Four repos independently rediscovered the same CSS rule on 2026-08-11 while bumping to `@charcuterie/ui@2.11.0`. A flex item's automatic minimum size resolves against its content's **min-content width**, so one long unbreakable token — a URI, a hostname, an item name — becomes the row's floor and shoves the sibling beside it out of the container. The 17px type ramp is what consumed the slack hiding it.

`min-w-0` alone is not enough (the text spills instead); only `overflow-wrap: anywhere` shrinks the min-content size. But the four shipped fixes were four *different* fixes — `min-w-0 wrap-anywhere`, `flex-wrap` + `shrink-0`, `truncate` + `title`, and *removing* `shrink-0` — so the rule flags the dangerous shape and accepts any escape.

```js
import { createFlexOverflowRules } from "@charcuterie/eslint-config"

createFlexOverflowRules({
  files: ["packages/web/**/*.tsx"],
  // "warn" by default; promote once the app is swept.
  severity: "error",
})
```

`no-unconstrained-flex-text` **warns** because it cannot know whether `{status}` is `"OK"` or a 300-character URL, and a rule that fires constantly gets switched off. `no-shrink-0-with-flex-wrap` **errors** because the two classes contradict each other outright — pointed at rip-deck it found the known `RipCard` bug plus the identical uncaught shape in `HeldBayCard` and `QuarantinedBayCard`.

**Internal change worth knowing about:** all `charcuterie/*` rules now live in one plugin object (`src/plugin.js`, exported as `charcuteriePlugin`), so the component-choice and flex-overflow blocks can be enabled side by side without flat config's `Cannot redefine plugin` error. `componentChoicePlugin` is kept as an alias of the same reference.
