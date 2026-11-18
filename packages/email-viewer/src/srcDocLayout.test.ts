import { describe, expect, test } from "vitest"

import { buildEmailSrcDoc, scaleToFit } from "./srcDoc.ts"

describe("frame width", () => {
  test("ordinary mail gets no width floor at all", () => {
    const doc = buildEmailSrcDoc("<p>Hi</p>", {
      fixedLayoutWidth: 0,
    })
    // The blocked-image placeholder has its own min-width; what matters is that
    // the body gets no floor.
    expect(doc).not.toContain("body { min-width:")
  })

  test("a declared fixed-width layout becomes a floor, not a target", () => {
    const doc = buildEmailSrcDoc(
      '<table width="600"></table>',
      {
        fixedLayoutWidth: 600,
      },
    )
    expect(doc).toContain("body { min-width: 600px; }")
    // max-content was the first attempt and is the bug being fixed: it is
    // unbounded, so on a frame wider than 600 the body grew to the longest line
    // in the document and clipped the message off the right edge.
    expect(doc).not.toContain("width: max-content")
  })

  test("a hostile width is clamped before it reaches the sheet", () => {
    const doc = buildEmailSrcDoc("<p>Hi</p>", {
      fixedLayoutWidth: 99999,
    })
    expect(doc).toContain("body { min-width: 1400px; }")
  })

  test("images are capped against the viewport, not the parent", () => {
    // body is width:max-content under ms-fixed-width, so a plain max-width:100%
    // is no cap at all — a 4032px photo rendered at 4032px.
    const doc = buildEmailSrcDoc("<img>", {})
    expect(doc).toContain(
      "max-width: min(100%, calc(100vw - 32px))",
    )
  })
})

describe("scale to fit", () => {
  test("a message that already fits is never scaled", () => {
    expect(
      scaleToFit({
        fixedLayoutWidth: 600,
        frameWidth: 1200,
      }),
    ).toBe(1)
    // 600 + the body's 32px of padding is exactly the frame: still a fit.
    expect(
      scaleToFit({
        fixedLayoutWidth: 600,
        frameWidth: 632,
      }),
    ).toBe(1)
  })

  test("prose has no declared width, so there is nothing to scale", () => {
    expect(
      scaleToFit({ fixedLayoutWidth: 0, frameWidth: 390 }),
    ).toBe(1)
  })

  test("an unmeasured frame scales nothing", () => {
    // The first render has no measurement yet. Scaling on a 0 frame would
    // divide the message down to the floor and then snap back a paint later.
    expect(
      scaleToFit({ fixedLayoutWidth: 720, frameWidth: 0 }),
    ).toBe(1)
  })

  test("the divisor includes the body padding the table has to fit inside", () => {
    // 390 / (720 + 32), not 390 / 720 — the bare ratio leaves the last 32px
    // of the message off the right edge, which is the bug in miniature.
    expect(
      scaleToFit({
        fixedLayoutWidth: 720,
        frameWidth: 390,
      }),
    ).toBe(0.5186)
  })

  test("a hostile ratio bottoms out at the floor", () => {
    expect(
      scaleToFit({
        fixedLayoutWidth: 1400,
        frameWidth: 200,
      }),
    ).toBe(0.3)
  })

  test("scaling is opt-in, and off it changes no rule", () => {
    const doc = buildEmailSrcDoc(
      '<table width="720"></table>',
      {
        fixedLayoutWidth: 720,
        frameWidth: 390,
        isScaledToFit: false,
      },
    )
    expect(doc).not.toContain("zoom:")
    expect(doc).toContain("body { min-width: 720px; }")
  })

  test("a scaled message is zoomed, not transformed", () => {
    const doc = buildEmailSrcDoc(
      '<table width="720"></table>',
      {
        fixedLayoutWidth: 720,
        frameWidth: 390,
        isScaledToFit: true,
      },
    )
    // zoom is a layout scale, so the frame has nothing left to scroll
    // sideways; a transform would paint smaller and keep the full-size box.
    expect(doc).toContain("body { zoom: 0.5186;")
    // The floor stays — the body is still laid out at the width the message
    // was designed for, and only the painting is smaller.
    expect(doc).toContain("body { min-width: 720px; }")
  })

  test("the two viewport-anchored lengths are restated against the scale", () => {
    const doc = buildEmailSrcDoc(
      '<table width="720"><img></table>',
      {
        fixedLayoutWidth: 720,
        frameWidth: 390,
        isScaledToFit: true,
      },
    )
    // 100vh resolves against the frame and is then scaled, so a message
    // scaled to 0.5186 would paint its surface over half the frame.
    expect(doc).toContain("min-height: 192.83vh")
    // Same trap on the image cap: 100vw - 32px scaled is a fraction of the
    // column the image sits in. Inside a scaled message the cap is the
    // message's own declared width.
    expect(doc).toContain(
      "img { max-width: min(100%, 688px)",
    )
  })

  test("the reader masthead spacer keeps its viewport height after scaling", () => {
    const doc = buildEmailSrcDoc(
      '<table width="720"></table>',
      {
        fixedLayoutWidth: 720,
        frameWidth: 390,
        isScaledToFit: true,
        readerHeaderInset: 128,
      },
    )
    expect(doc).toContain("height:246.8184px!important")
  })

  test("a message that fits gets none of the scale sheet", () => {
    const doc = buildEmailSrcDoc(
      '<table width="600"></table>',
      {
        fixedLayoutWidth: 600,
        frameWidth: 1200,
        isScaledToFit: true,
      },
    )
    expect(doc).not.toContain("zoom:")
    expect(doc).toContain(
      "max-width: min(100%, calc(100vw - 32px))",
    )
  })
})

describe("blocked images", () => {
  test("a parked image gets a placeholder rather than the broken glyph", () => {
    const doc = buildEmailSrcDoc(
      '<img data-ms-blocked-image="">',
      {},
    )
    expect(doc).toContain("img[data-ms-blocked-image]")
    expect(doc).toContain(
      "content: url('data:image/svg+xml;utf8,",
    )
  })

  test("asking for images widens img-src and nothing else", () => {
    const off = buildEmailSrcDoc("<img>", {
      hasLoadedImages: false,
    })
    const on = buildEmailSrcDoc("<img>", {
      hasLoadedImages: true,
    })
    expect(off).toContain("img-src data:")
    expect(on).toContain("img-src data: https: http:")
    expect(on).toContain("default-src 'none'")
    expect(on).toContain("script-src 'none'")
  })
})
