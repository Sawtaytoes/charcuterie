# Logical properties only, enforced on `className` and nowhere else

**Status:** Accepted
**Date:** 2026-07-29
**Type:** Convention + tooling
**Supersedes:** —
**Superseded by:** —

## Decision

Every spatial value in this fleet is expressed **logically**: `padding-inline`,
`margin-block`, `inset-inline-start`, `border-inline-start`, `text-align: start`. In
Tailwind that means `ps-`/`pe-`, `ms-`/`me-`, `start-`/`end-`, `border-s`/`border-e`,
`rounded-s`/`rounded-e`, `text-start`/`text-end`. Never `left`/`right`.

It is enforced by `no-restricted-syntax` entries shipped from
`@charcuterie/eslint-config`, applied by the consumer to its component sources.

**The rule's scope is `className` string literals and template chunks — and nothing
else.** Physical property *names* in style objects and TypeScript identifiers are
deliberately not matched.

## Context

The plan called for the rule and specified its shape:

> **Enforce it:** an ESLint `no-restricted-syntax` rule on `className` string literals
> rejecting `pl-`/`pr-`/`ml-`/`mr-`/`left-`/`right-`/`text-left`/`text-right` inside
> `@charcuterie/ui`, with a fixture-driven regression test like the existing house rules.

Two things had to be decided during implementation: how wide to cast the net, and how to
anchor the pattern.

## Why

**Why a rule and not a preference.** Logical properties cost nothing today and make RTL
nearly free later. A preference that costs nothing survives right up until the first
person in a hurry; a rule survives after that.

**Why not style-object property names.** Matching `Property[key.name="left"]` would fire
on `getBoundingClientRect().left`, Floating UI placements, gradient stops, and every
other legitimate use of the word. A rule that cries wolf gets switched off, and a
switched-off rule enforces nothing — the same reasoning that keeps the contrast gate
scoped to real control boundaries rather than every line on screen. `className` is where
the fleet's spacing actually lives, so that is where the net is cast.

**Why both `Literal` and `TemplateElement`.** A plain `className="pl-2"` is a `Literal`;
`` className={`flex ${gap} pl-2`} `` puts the offending text in a `TemplateElement` that
the `Literal` selector never sees. Covering only the first would look like enforcement
while missing the more common shape in real components.

**Why the anchors are load-bearing.** `border-red-500` contains `border-r`,
`rounded-lg` contains `rounded-l`, `place-items-center` starts with `pl`. The pattern
anchors each alternative — a leading `(?:^|[\s:])` so a modifier like `sm:pl-2` matches
but `bright-` does not, and a trailing `(?=\s|$)` on the utilities that are valid bare.
`packages/eslint-config/src/__fixtures__/logicalDirectionClassName.tsx` exists to keep
all three near misses clean; a false positive here would get the rule disabled within a
week.

## Evidence

`packages/eslint-config/src/houseRules.test.ts` runs the real `ESLint` class over both
fixtures: 8 violations found in the physical fixture, zero in the logical one including
the near misses. Following
`mux-magic/packages/tools/src/eslintBooleanPrefixRule.test.ts`, the test asserts against
the engine rather than a rule-tester harness — which is what catches the failure mode
this repo is most likely to hit: a rule configured correctly that never *applies*,
because a `files` glob or a parser option is wrong. That silent no-op is
indistinguishable from "clean" in CI.

Verification item 7 in the plan ("the lint rule fires on a fixture") is satisfied by
that test.
