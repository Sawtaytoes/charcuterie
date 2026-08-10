---
"@charcuterie/tokens": minor
---

Audit interactive states, not just resting ones — and fix the three fills that failed AA
while hovered.

`contrastAudit.ts` contained **zero occurrences of "hover"**. It measured
`intent.<name>.onSolid` on `solid` and `intent.<name>.content` on `surface`, and never on
`solidHover`/`surfaceHover` — so `yarn check:contrast` reported "All variants clear WCAG
2.2 AA" while `daylight`'s dark accent button sat at **4.47:1** against its white label for
as long as a pointer was on it. `daylight` is the `:root` default, so that was every accent
button in the fleet.

Every resting pair now has its hover twin at the same threshold: **35 gated pairs per scheme
becomes 48**. Three fills failed, and each is corrected at the *hover* token rather than the
resting colour or the foreground:

| Variant / scheme | Token | Before | After |
| --- | --- | --- | --- |
| daylight / dark | `intent.accent.solidHover` | `#6A64F0` — 4.47:1 | `#534DD5` — 6.19:1 |
| hairline / dark | `intent.accent.solidHover` | `#6D78DC` — 3.91:1 | `#555FBD` — 5.59:1 |
| hairline / dark | `intent.danger.solidHover` | `#E0524C` — 3.83:1 | `#BD3E39` — 5.37:1 |

The rule they follow is what every light scheme here already did: **a hover moves away from
its own label's lightness** — a white-label fill deepens, a dark-label fill brightens — so
the hovered state reads better than the resting one, not worse.

New export `RESTING_ROLE_BY_INTENT_ROLE`, keyed by every member of `IntentRole`: adding a
future `solidPressed` is a typecheck error until it is classified as a state of another
role, and a test failure until `auditScheme` pairs it with a foreground.

**Consumers will see a visual change** on the hovered accent button in dark schemes
(`daylight`, `hairline`) and the hovered danger button in `hairline` dark. Nothing moves in
any light scheme, and no resting colour changes anywhere. See
`docs/decisions/2026-08-10-interactive-states-are-audited-not-just-resting-states.md`.
