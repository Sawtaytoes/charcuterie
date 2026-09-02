import { describe, expect, test } from "vitest"

import {
  getNearerThumb,
  getThumbBounds,
  moveThumb,
  snapRange,
} from "./rangeSliderValue.ts"

const bounds = { max: 100, min: 0, step: 1 }

describe("snapRange", () => {
  test("it snaps both ends onto the step grid", () => {
    expect(
      snapRange(
        { end: 78, start: 22 },
        { max: 100, min: 0, step: 5 },
      ),
    ).toEqual({ end: 80, start: 20 })
  })

  /**
   * `value` seeds rather than controls, so a backwards pair is a state
   * an app can genuinely be in for a frame — a typed start committing
   * before its end catches up. A negative-width fill paints nothing,
   * so the pair is put in order here instead.
   */
  test("a backwards pair comes back in order", () => {
    expect(
      snapRange({ end: 20, start: 80 }, bounds),
    ).toEqual({ end: 80, start: 20 })
  })

  test("neither end escapes the range, and a NaN does not reach the style attribute", () => {
    expect(
      snapRange({ end: 400, start: -40 }, bounds),
    ).toEqual({ end: 100, start: 0 })

    expect(
      snapRange(
        { end: Number.NaN, start: Number.NaN },
        bounds,
      ),
    ).toEqual({ end: 0, start: 0 })
  })
})

describe("moveThumb", () => {
  test("it moves the thumb it is given and leaves the other alone", () => {
    expect(
      moveThumb({
        bounds,
        next: 30,
        range: { end: 80, start: 20 },
        thumb: "start",
      }),
    ).toEqual({ end: 80, start: 30 })

    expect(
      moveThumb({
        bounds,
        next: 60,
        range: { end: 80, start: 20 },
        thumb: "end",
      }),
    ).toEqual({ end: 60, start: 20 })
  })

  /**
   * The crossing rule, and the whole reason this module exists. A
   * thumb pushed past its partner stops **on** it: the range collapses
   * to zero width and the two handles keep their identities.
   */
  test("a thumb stops on the other one rather than crossing it", () => {
    expect(
      moveThumb({
        bounds,
        next: 95,
        range: { end: 80, start: 20 },
        thumb: "start",
      }),
    ).toEqual({ end: 80, start: 80 })

    expect(
      moveThumb({
        bounds,
        next: 5,
        range: { end: 80, start: 20 },
        thumb: "end",
      }),
    ).toEqual({ end: 20, start: 20 })
  })

  test("a collapsed range opens again from either side", () => {
    const collapsed = { end: 40, start: 40 }

    expect(
      moveThumb({
        bounds,
        next: 25,
        range: collapsed,
        thumb: "start",
      }),
    ).toEqual({ end: 40, start: 25 })

    expect(
      moveThumb({
        bounds,
        next: 55,
        range: collapsed,
        thumb: "end",
      }),
    ).toEqual({ end: 55, start: 40 })
  })

  /**
   * The snap happens on the global grid and the clamp happens after
   * it. Snapping against the other thumb as an anchor would put the
   * two handles on different ladders — 7–19 by 4 is the range that
   * shows it, since neither end of it is on a zero-anchored grid.
   */
  test("both thumbs stay on one grid, anchored on min", () => {
    const coarse = { max: 19, min: 7, step: 4 }

    expect(
      moveThumb({
        bounds: coarse,
        next: 10,
        range: { end: 19, start: 7 },
        thumb: "start",
      }),
    ).toEqual({ end: 19, start: 11 })

    expect(
      moveThumb({
        bounds: coarse,
        next: 14,
        range: { end: 19, start: 11 },
        thumb: "end",
      }),
    ).toEqual({ end: 15, start: 11 })
  })

  test("a float step does not accumulate drift", () => {
    expect(
      moveThumb({
        bounds: { max: 1, min: 0, step: 0.1 },
        next: 0.30000000000000004,
        range: { end: 0.8, start: 0.2 },
        thumb: "start",
      }),
    ).toEqual({ end: 0.8, start: 0.3 })
  })
})

describe("getNearerThumb", () => {
  test("the nearer end picks up the press", () => {
    const range = { end: 80, start: 20 }

    expect(getNearerThumb({ at: 25, range })).toBe("start")

    expect(getNearerThumb({ at: 75, range })).toBe("end")
  })

  /**
   * Two thumbs on the same value is the state the clamping rule makes
   * reachable, so the tie rule is what stops a collapsed range being
   * stuck. The press's side decides.
   */
  test("a collapsed pair is opened by the side the press landed on", () => {
    const collapsed = { end: 40, start: 40 }

    expect(
      getNearerThumb({ at: 10, range: collapsed }),
    ).toBe("start")

    expect(
      getNearerThumb({ at: 90, range: collapsed }),
    ).toBe("end")
  })

  test("a press outside the span picks the end it is outside of", () => {
    const range = { end: 80, start: 20 }

    expect(getNearerThumb({ at: 0, range })).toBe("start")

    expect(getNearerThumb({ at: 100, range })).toBe("end")
  })
})

describe("getThumbBounds", () => {
  /**
   * How the clamping rule reaches a screen reader: a slider's only
   * vocabulary for "this handle stops here" is `aria-valuemax`.
   */
  test("each thumb reports the other as its own bound", () => {
    const range = { end: 80, start: 20 }

    expect(
      getThumbBounds({ bounds, range, thumb: "start" }),
    ).toEqual({ max: 80, min: 0 })

    expect(
      getThumbBounds({ bounds, range, thumb: "end" }),
    ).toEqual({ max: 100, min: 20 })
  })

  test("a reversed range still reports two ordered bounds", () => {
    expect(
      getThumbBounds({
        bounds: { max: 0, min: 100, step: 1 },
        range: { end: 20, start: 80 },
        thumb: "start",
      }),
    ).toEqual({ max: 80, min: 0 })
  })
})
