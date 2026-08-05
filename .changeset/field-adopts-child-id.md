---
"@charcuterie/ui": patch
---

Field: adopt the control's own `id` instead of overwriting it. A control written
`<input id="rename-pattern" />` used to lose its id to a minted `<baseId>-control`,
breaking the outside-in references the id exists for (a deep link, an autofill hint,
a server-rendered error summary, a consumer's own selector). Precedence is now
`<Field id>` → the child's own `id` → generated; the `Field` prop still wins when
both are set (it is the outer, later declaration). The `<label htmlFor>` follows
`controlId` as before, so the label/control pair still agrees. Reported by a consumer.
