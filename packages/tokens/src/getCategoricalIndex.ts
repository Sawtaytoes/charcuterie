/**
 * A name in, a categorical index out, the same answer forever.
 *
 * The consuming problem is Docket's, and it is the ordinary one for
 * this family: a task tracker full of labels and projects that
 * existed before anybody thought about colour. Nobody is going to
 * open a hundred rows and pick a swatch for each, and a colour
 * assigned at random on first render is a different colour on the
 * next machine, the next reload, and the server-rendered copy. So
 * the fallback has to be a **pure function of the name** — and once
 * the user does pick, the stored index simply wins.
 *
 * ### Why this lives in `@charcuterie/tokens`
 *
 * `@charcuterie/logic` was the other candidate and is the wrong
 * one twice over. Its stated scope is the fleet's **state kinds** —
 * Visibility, Picker, RovingFocus, Status — and a hash is not
 * state; more concretely, this function's return type *is*
 * `CategoricalIndex`, so putting it in `logic` would make every
 * consumer of a colour question take a dependency on the state
 * package to answer it. `tokens` already owns the index, is
 * zero-dependency and React-free, and is the package a Node service
 * or a Satori render can import — which is exactly where a
 * "precompute the colour for this row" call wants to be.
 *
 * ### What it does not do
 *
 * **No normalization.** `"Homelab"` and `"homelab"` are different
 * names and get different colours, because case-folding, trimming
 * and unicode normalization are all policy the consumer owns and
 * none of them are reversible from in here. If a rename should keep
 * its colour, hash the row's **id** rather than its name — which is
 * the better call whenever an id exists, and is the whole reason
 * the parameter is `key` rather than `name`.
 */

import type { CategoricalIndex } from "./categorical.ts"
import {
  CATEGORICAL_INDEX_COUNT,
  CATEGORICAL_INDEXES,
} from "./categorical.ts"

/**
 * FNV-1a, 32-bit. The offset basis and prime are the published
 * constants.
 *
 * Chosen for what it is not: it has no seed, no `Math.random`, no
 * dependence on object key order, and no platform-specific string
 * hashing — so the answer is identical in the browser, in Node, in
 * a Satori render, and in whatever runs this next year. That is the
 * entire requirement; the cryptographic properties of the hash are
 * irrelevant here and a cryptographic one would cost a dependency
 * this package refuses to take.
 *
 * `Math.imul` and `>>> 0` are load-bearing, not ceremony. JavaScript
 * multiplies as float64, so `hash * 16777619` silently loses the
 * low bits past 2^53 and the avalanche with it — the classic way
 * this function ends up mapping half the alphabet to the same
 * bucket while looking correct.
 */
const FNV_OFFSET_BASIS = 2166136261

const FNV_PRIME = 16777619

const getHash = (key: string) => {
  let hash = FNV_OFFSET_BASIS

  for (
    let position = 0;
    position < key.length;
    position += 1
  ) {
    // UTF-16 code units, hashed a byte at a time, so the result
    // does not depend on a `TextEncoder` being present.
    const codeUnit = key.charCodeAt(position)

    hash = Math.imul(hash ^ (codeUnit & 0xff), FNV_PRIME)

    hash = Math.imul(hash ^ (codeUnit >>> 8), FNV_PRIME)
  }

  return hash >>> 0
}

/**
 * The categorical index a key falls on when nobody has chosen one.
 *
 * A **fallback**, never an override: a stored choice wins, and a
 * consumer that forgets that has turned a user's picked colour into
 * a hash of its own row name. The intended call is
 * `label.categorical ?? getCategoricalIndex(label.id)`.
 */
export const getCategoricalIndex = (
  key: string,
): CategoricalIndex =>
  CATEGORICAL_INDEXES[
    getHash(key) % CATEGORICAL_INDEX_COUNT
  ] as CategoricalIndex
