/**
 * Filter-and-join. Deliberately not `clsx`.
 *
 * Every call site in this package passes a flat list of strings and
 * conditionals, which is four lines of work — and a published
 * component library's dependency list is a thing consumers inherit,
 * so it earns its entries. `clsx` also accepts objects and nested
 * arrays, both of which make a className harder for the Tailwind
 * scanner and for `tailwindCandidates.test.ts` to read statically.
 */
export const toClassName = (
  ...parts: (false | string | null | undefined)[]
) => parts.filter(Boolean).join(" ")
