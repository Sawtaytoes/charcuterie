---
"@charcuterie/ui": minor
---

`className` can now override a component's base utilities. It could not before,
and failed silently when it did not.

`toClassName` was a filter-and-join with no conflict resolution, so
`getControlClassName(CONTROL_BASE_CLASS, …, className)` emitted both classes and
let the generated stylesheet's source order pick a winner. A caller writing
`<Button className="hidden lg:inline-flex" />` got
`class="inline-flex … hidden lg:inline-flex"`, where `.hidden` and `.inline-flex`
sit at equal specificity — so the caller could not win, whatever they wrote. The
same applied to every base-class category a consumer might reasonably override:
display, `rounded-md`, `border`, `whitespace-nowrap`, `font-medium`, and the
`h-`/`px-`/`text-` triplet from `CONTROL_SIZE_CLASS`.

It failed invisibly. mail-sifter used exactly that class to hide a duplicate
header button below `lg`; it never hid, and went unnoticed for weeks because the
header happened to fit anyway — surfacing only when an unrelated type-ramp change
pushed it 37px wider and scrolled the page sideways. Two other repos hit the same
shape independently.

`toClassName` now resolves conflicts with `tailwind-merge` — the third runtime
dependency this package has taken (MIT, ~7 KB gz, no transitive deps). The
docblock's standing argument against a dependency was about `clsx`'s object and
nested-array forms hurting static scanning; that does not transfer, since the
*input* shape here is unchanged and every call site stays statically scannable.

**Nothing this package emits changes.** That was measured, not assumed: the merge
is a no-op across all 358 class-string literals in `src` and all 288 strings
`getControlClassName` composes, and both checks are now tests. So this only ever
acts on a genuine caller conflict.

`ease-standard` is registered explicitly in the merge config — it is ours, from
the motion tokens, and would otherwise land in no class group and fail to merge.

Fixes #81.
