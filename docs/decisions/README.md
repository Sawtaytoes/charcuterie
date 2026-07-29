# Decision records

One decision per file, `YYYY-MM-DD-<kebab-slug>.md`, newest first.

**Never edit a past decision to change its meaning** — supersede it with a new dated file
and cross-link both directions. Before proposing a change, read this index: a settled
decision overrides an instinct.

| Date | Decision | Summary |
| --- | --- | --- |
| 2026-07-29 | [ePaper is a profile, not a scheme](2026-07-29-epaper-is-a-profile-not-a-scheme.md) | ePaper ships as `@charcuterie/tokens/epaper`, outside the three composing axes, because it *removes* capabilities (no hover, opacity, shadow, transition; six colours) rather than restyling them — and `data-scheme="epaper"` would wrongly imply a `data-variant` still applies. |
| 2026-07-29 | [Gate contrast on WCAG 2.2 AA, report APCA](2026-07-29-contrast-gate-wcag-report-apca.md) | WCAG 2.2 fails CI; APCA Lc is printed next to every number but never gated, since WCAG 3 is still a draft. Only pairs WCAG actually requires are gated — scoping 1.4.11 to real control boundaries took the audit from 65 reported failures to 7 real ones. Also fails on alias drift. |
| 2026-07-29 | [`colour` in TypeScript, `--color-*` in CSS](2026-07-29-colour-in-typescript-color-in-css.md) | Deliberate split: TS matches the fleet's British spelling (`e6Colour`, `colourMode`), CSS matches Tailwind v4's `@theme` namespace, which is the only one that generates `bg-*`/`text-*`. Renaming the CSS side silently produces zero utilities. |

## Still to be recorded

These were settled in the plan but are not yet in effect in code, so they get their record
when the code lands rather than now:

- The winning visual direction (**pending — M0 is awaiting the owner's pick**)
- The state-layer choice: Charcuterie's model on `@floating-ui/react`, and why not
  Radix / Base UI / Ark UI — M2
- The five state kinds, extending the original three-state thesis — M2
- Logical properties only, and its ESLint rule — M3 (already followed throughout
  `packages/tokens`; the record waits for the rule that enforces it)
- The external-API `open` carve-out versus the `is`/`has` boolean rule — M2
- Tokens as a separate zero-dependency package — M1
- Lockstep versioning for `tokens`/`logic`/`ui` — M1
- Temporal, not date-fns, and that the library owns no date logic — M6
