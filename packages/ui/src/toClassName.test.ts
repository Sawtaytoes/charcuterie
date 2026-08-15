import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"

import {
  type BadgeSize,
  getControlClassName,
} from "./controlStyles.ts"
import { INTENT_APPEARANCE_CLASS } from "./intentStyles.ts"
import { toClassName } from "./toClassName.ts"

describe("a caller's class beats the base class", () => {
  // The bug this file exists for. `CONTROL_BASE_CLASS` opens with
  // `inline-flex`; both it and `hidden` are display utilities at equal
  // specificity, so before the merge the winner was decided by
  // stylesheet source order and the caller could not win.
  test("display: `hidden` removes `inline-flex`", () => {
    expect(
      toClassName("inline-flex items-center", "hidden"),
    ).toBe("items-center hidden")
  })

  test("the responsive form that shipped broken still works", () => {
    // mail-sifter's header, verbatim: hide below `lg`, show above.
    // The unprefixed `hidden` must beat the base `inline-flex` while
    // the `lg:` variant is left alone — they are different breakpoints
    // and must not cancel each other.
    const result = toClassName(
      "inline-flex cursor-pointer items-center",
      "hidden lg:inline-flex",
    )

    expect(result).toContain("hidden")
    expect(result).toContain("lg:inline-flex")
    expect(result.split(" ")).not.toContain("inline-flex")
  })

  test.each([
    ["rounded-md", "rounded-full"],
    ["border-border-default", "border-transparent"],
    ["bg-surface-base", "bg-surface-raised"],
    ["whitespace-nowrap", "whitespace-normal"],
    ["font-medium", "font-bold"],
    ["h-(--control-height-md)", "h-(--control-height-lg)"],
    ["px-(--control-padding-inline-md)", "px-0"],
    ["text-sm", "text-lg"],
    // Ours, not Tailwind's — registered explicitly in the merge
    // config, and it would silently fail to merge without that.
    ["ease-standard", "ease-linear"],
  ])("%s is overridden by %s", (base, override) => {
    expect(toClassName(base, override)).toBe(override)
  })
})

describe("it does not over-merge", () => {
  // The dangerous direction, and the reason this was measured rather
  // than assumed: `text-md` is OUR font-size (theme.css bridges
  // `--text-*` onto `--font-size-*`), and `text-content-primary` is a
  // colour. A merge that classified both as `text-*` would silently
  // drop the colour from every control in the package.
  test("a custom font size does not eat a custom text colour", () => {
    const result = toClassName(
      "text-md",
      "text-content-primary",
    )

    expect(result).toContain("text-md")
    expect(result).toContain("text-content-primary")
  })

  test("a custom easing does not eat a duration", () => {
    const result = toClassName(
      "ease-standard duration-(--duration-fast)",
    )

    expect(result).toContain("ease-standard")
    expect(result).toContain("duration-(--duration-fast)")
  })

  test("falsy parts are still dropped", () => {
    expect(
      toClassName(
        "a-class",
        false,
        null,
        undefined,
        "b-class",
      ),
    ).toBe("a-class b-class")
  })
})

/**
 * Adopting a merge could in principle drop one of the package's OWN
 * classes — a conflict we shipped on purpose, or one it misreads.
 * These two tests are the evidence that it does not, and they are the
 * reason the change is safe to make globally rather than only where a
 * consumer `className` is folded in.
 *
 * They also fail loudly if a future class introduces a real internal
 * conflict, which is worth knowing about on its own.
 */
describe("merging is a no-op on what this package emits", () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap(
      (entry) => {
        const path = join(dir, entry.name)

        if (entry.isDirectory()) {
          return entry.name === "node_modules"
            ? []
            : walk(path)
        }

        return /\.tsx?$/.test(path) &&
          !/\.test\./.test(path)
          ? [path]
          : []
      },
    )

  const looksLikeClassList = (value: string) =>
    value.includes(" ") &&
    value
      .split(" ")
      .every((token) =>
        /^[a-z0-9:[\]()\-_/.&>*+#!,%'"$@=~^|?]+$/i.test(
          token,
        ),
      ) &&
    /(flex|grid|text-|bg-|border|rounded|p[xytblr]?-|m[xytblr]?-|h-|w-|size-|gap-|items-|justify-|absolute|relative|hidden|block|inline|font-|shadow|outline|transition|duration|ease-|select-|cursor-|overflow|z-|opacity|ring|space-|min-|max-|whitespace|truncate|leading|tracking)/.test(
      value,
    )

  test("every class-string literal in src survives untouched", () => {
    const damaged: {
      after: string
      before: string
      file: string
    }[] = []

    let checked = 0

    for (const file of walk(
      join(import.meta.dirname ?? "src"),
    )) {
      const source = readFileSync(file, "utf8")

      for (const match of source.matchAll(
        /"([a-z0-9][^"\n]*?)"/g,
      )) {
        const value = match[1]

        if (!looksLikeClassList(value)) {
          continue
        }

        checked++

        const merged = toClassName(value)

        if (merged !== value) {
          damaged.push({
            after: merged,
            before: value,
            file,
          })
        }
      }
    }

    // A guard on the guard: if the heuristic stops matching, this
    // test would pass by checking nothing.
    expect(checked).toBeGreaterThan(300)
    expect(damaged).toEqual([])
  })

  test("every composed control class string survives untouched", () => {
    const intents = Object.keys(
      INTENT_APPEARANCE_CLASS,
    ) as (keyof typeof INTENT_APPEARANCE_CLASS)[]

    const appearances = Object.keys(
      INTENT_APPEARANCE_CLASS[intents[0]],
    ) as (keyof (typeof INTENT_APPEARANCE_CLASS)[(typeof intents)[0]])[]

    const damaged: string[] = []

    let composed = 0

    for (const intent of intents) {
      for (const appearance of appearances) {
        for (const size of [
          "sm",
          "md",
          "lg",
        ] as BadgeSize[] & string[]) {
          for (const sizing of [
            "control",
            "icon",
          ] as const) {
            for (const isFullWidth of [false, true]) {
              const value = getControlClassName({
                appearance,
                className: undefined,
                disabledClass: "disabled:opacity-50",
                intent,
                isFullWidth,
                size,
                sizing,
              })

              composed++

              // `getControlClassName` already routes through
              // `toClassName`, so re-merging must be idempotent.
              if (toClassName(value) !== value) {
                damaged.push(value)
              }
            }
          }
        }
      }
    }

    expect(composed).toBeGreaterThan(200)
    expect(damaged).toEqual([])
  })
})
