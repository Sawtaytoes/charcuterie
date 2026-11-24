# The requirements lock hashes files from the bundler's import graph

- **Status:** Accepted
- **Date:** 2026-11-23
- **Type:** Testing convention
- **Supersedes:** [Requirements are locked by ID and checked before the browser runs](2026-11-22-requirements-are-locked-by-id-and-checked-before-the-browser.md), in part: rule 1, how the lock finds and hashes code. IDs, retirements, tags, the checks, and the trace stand.
- **Superseded by:** —

## Decision

1. **Files, not functions.** `requirements.lock.json` records the files a requirement's
   steps load. esbuild finds them: the checker asks it for the import graph and hashes
   each file it lists. The checker does not resolve imports itself.
2. **Shared files once.** The files every scenario loads (the runtime files and everything
   they import) are listed once, under `shared`. A requirement's `code` lists only the
   files its step files add. The requirements config and the root `vitest.config.ts` are
   shared.
3. **Hashes ignore what does not run.** Code is hashed as esbuild compiles it, so comments,
   formatting, and types do not count. An unused value import counts, because it runs the
   imported module.
4. **The walk stops at the code under test and at npm.** `subjects` names the components
   and the workspace libraries they build on (`ui`, `logic`, `tokens`). Anything resolved
   inside `node_modules` is not followed. Other workspace packages are followed through
   their `node_modules` link.
5. **A file read another way is followed the way Vite loads it.** `?raw`, `?url`, CSS
   `url()`, and `new URL` data are hashed byte for byte, a subject included. `?worker`,
   `?inline`, and a `new URL` worker are built as entries, to the end of any chain, so
   what they import counts. A `new URL` template is read as Vite's glob. The workspace
   `package.json` files that chose an import are hashed with it: the package's own and
   the nearest one above the target. When one use of a file needs more of it than
   another, the stricter use wins: bytes, then data, then manifest fields.
6. **Every file that runs follows the rules.** The `quickpickle` hook ban, the glob ban,
   the JSX pragma ban, and the string-literal `import()` rule apply to every file the
   scenarios run, not only to files in the requirements directory. A file read only as
   text is exempt.

## Context

The first lock hashed each requirement's code at the level of single declarations, through
a module resolver written by hand. Twelve review rounds each found more resolver cases to
patch: `export *` order, JSON and CSS re-exports, type-only locals, nested `exports`
conditions, and more. `sources.js` grew to 2,746 lines.

The precision did not pay off. Because `index.ts` loads every step file for every
scenario, all 38 locked files appeared in every one of the 27 requirements. 109 of 201
code units were reached by all of them. The lock was 4,178 lines, and adding Dialog and
Field marked all six Button requirements as changed. The lock would have grown with
requirements times components.

## Why

Two independent design reviews (Codex and Gemini Neon) recommended file-level hashes from
a real bundler graph. A bundler already resolves imports exactly as Vite does, because Vite
uses esbuild. So the hand-written resolver and its edge cases go away.

Measured on the Dialog and Field branch:

| | Declaration-level lock | File-level lock |
| --- | --- | --- |
| `sources.js` | 2,746 lines | 1,374 lines, plus 247 in `graph.js` |
| Lock file | 4,178 lines | 978 lines |
| Check time | about 1 second | about 1.6 seconds |
| A new component's files | mark every existing requirement | mark none |
| A story file change | marks every requirement, when the story has JSX args | marks that story's requirements |
| A helper body change | marks the requirements that call it | marks the requirements whose step files import it (today, all) |

Planted edits, all caught: a weakened `expectFocused` (27 requirements), an edit to
`expectAgentDrivable.ts` (27), an extra Field story (the 12 Field requirements), a
top-level keyboard patch in `dialog.steps.ts` (the 9 Dialog requirements), a World edit
(`Every requirement`), a root `vitest.config.ts` edit (`Every requirement`), and an
unused value import in a helper (27). A comment, a type-only change, and a component edit
changed nothing.

The cost is precision inside the helpers. A change to one helper function now marks every
requirement whose step file imports the helper file, which today is all of them. Splitting
`controls.steps.ts` by concern narrows that if it becomes noise. A top-level statement in
one step file also runs during other step files' scenarios but names only its own
requirements. The lock still goes stale, so the change still reaches review.

## Evidence

The owner, T3 Code chat `5309f491-ab8b-4c0d-ba57-064cd046d58d`, 2026-11-23, on the pilot:
*"I was hoping you'd have done this by now, so your report would be 'yes, this is good' or
'no, this has too many issues with the abstraction'."* On the reviews: *"Verify this stuff
with Gemini Neon as you go. I wanna see what it thinks too along with other agents."*

The planted edits and their results are reproducible with the checker's tests in
`packages/ci/src/requirements/requirements.test.js` (`the file-level lock`).
