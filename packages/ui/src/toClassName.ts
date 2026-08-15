import { extendTailwindMerge } from "tailwind-merge"

/**
 * `ease-standard` is ours, from the motion tokens — Tailwind ships
 * `ease-linear`/`ease-in`/`ease-out`/`ease-in-out` and knows nothing
 * about it. Without this it lands in no class group, so a caller
 * passing `ease-linear` would get BOTH and the winner would be decided
 * by stylesheet source order — exactly the bug this file now exists to
 * prevent, one utility further along.
 *
 * Nothing else needs registering. Verified empirically rather than
 * assumed: `toClassName.test.ts` asserts the merge is a no-op across
 * every class string in this package and every string
 * `getControlClassName` composes.
 */
const mergeClassNames = extendTailwindMerge({
  extend: {
    classGroups: { ease: [{ ease: ["standard"] }] },
  },
})

/**
 * Join a class list, and let a later class beat an earlier one that
 * targets the same CSS property.
 *
 * ### Why this is not a plain join any more
 *
 * It was, and that was a bug. `getControlClassName` assembles
 * `toClassName(CONTROL_BASE_CLASS, …, className)`, and
 * `CONTROL_BASE_CLASS` opens with `inline-flex`. A caller writing
 *
 * ```tsx
 * <Button className="hidden lg:inline-flex" />
 * ```
 *
 * emitted `class="inline-flex … hidden lg:inline-flex"`. Both are
 * display utilities at equal specificity, so the winner is decided by
 * **source order in the generated stylesheet**, not by order in the
 * class attribute — and the caller has no way to win. `className` is a
 * documented escape hatch, and it did not work for the most common
 * thing an escape hatch is used for.
 *
 * It failed *silently and invisibly*. mail-sifter's header used exactly
 * that class to hide a duplicate button below `lg`; it never hid, and
 * nobody noticed for weeks because at 390px the header happened to fit
 * anyway. It only surfaced when an unrelated type-ramp change pushed the
 * width to 427px and scrolled the page sideways. Two more repos hit the
 * same shape independently.
 *
 * ### Why `tailwind-merge` and not `clsx`
 *
 * The old docblock argued against taking a dependency, on the grounds
 * that a published component library's dependency list is inherited by
 * consumers and that `clsx`'s object and nested-array forms make a
 * className harder for the Tailwind scanner and for
 * `tailwindCandidates.test.ts` to read statically.
 *
 * The first half still stands and this entry earns its place; the
 * second half does not transfer. `tailwind-merge` does not change the
 * *input* shape at all — this still takes a flat list of strings and
 * conditionals, and every call site is still statically scannable. It
 * changes only which of two conflicting classes survives.
 *
 * ### It is a no-op on everything this package emits
 *
 * Merging could in principle drop one of our own classes. It does not:
 * the test file checks all 358 class-string literals in `src` and all
 * 288 strings `getControlClassName` composes, and the merge changes
 * none of them. So this only ever acts on a genuine caller conflict —
 * which is the entire point.
 */
export const toClassName = (
  ...parts: (false | string | null | undefined)[]
) => mergeClassNames(parts.filter(Boolean).join(" "))
