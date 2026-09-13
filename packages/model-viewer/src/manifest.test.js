import { expect, it } from "vitest"
import { initialView } from "./manifest.js"

it("preserves inside and holder links without patching the generated HTML", () => {
  const manifest = {
    queryViews: {
      "inside=1": "inside",
      "holder=0": "without-holder",
    },
    views: { inside: {}, "without-holder": {} },
  }
  expect(
    initialView(manifest, new URLSearchParams("inside=1")),
  ).toBe("inside")
  expect(
    initialView(manifest, new URLSearchParams("holder=0")),
  ).toBe("without-holder")
  expect(
    initialView(manifest, new URLSearchParams("view=top")),
  ).toBe("top")
  expect(
    initialView(
      manifest,
      new URLSearchParams("view=unknown"),
    ),
  ).toBe("iso")
})
