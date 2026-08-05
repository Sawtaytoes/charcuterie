# `Field` adopts the child control's own `id`; the `Field` prop wins when both are set

- **Status:** Accepted
- **Date:** 2026-08-05
- **Type:** Component behaviour
- **Supersedes:** —
- **Superseded by:** —

## Decision

`Field`'s control `id` precedence is `<Field id>` → **the child control's own
`id`** → generated `<baseId>-control`. When both a `<Field id>` and a child `id`
are present, the **`Field` prop wins**.

## Context

`Field` clones a generated `<baseId>-control` id onto its child and uses it for
`<label htmlFor>`. It honoured an `id` passed to the `Field`, but a control
written the way an author actually writes one —
`<Field label="Rename pattern"><input id="rename-pattern" /></Field>` — had its
`rename-pattern` overwritten. The label/control pair still agreed (both got the
minted id), so nothing inside the component broke; what broke was everything
*outside* pointing in — a deep link, an autofill hint, a server-rendered error
summary, an existing selector in a consumer's own tests. The backlog logged this
as needing a decision about the "both set" case.

## Why

Adopting the child's `id` is what the author expects: they put the id where they
can see it. The `Field` prop still wins when both are set because it is the outer,
later declaration and last-writer-wins is the slot's rule for a *value* (a `ref`
or `on*` would merge; an `id` is a value). "Child always wins" was rejected — it
would flip the existing, documented "a caller's id passed to the Field wins"
behaviour; a dev-warning on conflict was rejected as noise for a case with a
well-defined answer. The owner chose "Field prop wins, else adopt child."

Non-breaking: the only changed output is the case where the child had an `id` and
the `Field` did not — previously lost, now honoured.

## Evidence

- `AdoptsChildId` story + test: `<input id="rename-pattern">` inside a `Field`
  keeps `id="rename-pattern"`, the label still finds it by role+name, axe clean.
- Precedence lives in one expression in `Field.tsx`:
  `receivedSlotProps.id ?? childId ?? \`${baseId}-control\``.
