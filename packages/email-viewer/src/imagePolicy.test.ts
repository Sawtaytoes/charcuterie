import { describe, expect, test } from "vitest"
import {
  hasImageSafetyWarning,
  shouldLoadRemoteImages,
} from "./imagePolicy.ts"
import type { EmailLink } from "./types.ts"

const ordinaryLink: EmailLink = {
  href: "https://community.example/topic/1",
  host: "community.example",
  text: "Read the topic",
  warning: null,
}

const mismatchLink: EmailLink = {
  claimedHost: "community.example",
  href: "https://elsewhere.example/topic/1",
  host: "elsewhere.example",
  text: "community.example",
  warning: "text-host-mismatch",
}

describe("reader remote-image policy", () => {
  test("loads images in ordinary mail without asking", () => {
    expect(
      shouldLoadRemoteImages({
        blockedLinkCount: 0,
        isSenderTrustedForImages: false,
        links: [ordinaryLink],
        remoteImageCount: 4,
      }),
    ).toBe(true)
  })

  test("keeps images parked when visible text names a different host", () => {
    expect(
      shouldLoadRemoteImages({
        blockedLinkCount: 0,
        isSenderTrustedForImages: false,
        links: [mismatchLink],
        remoteImageCount: 4,
      }),
    ).toBe(false)
  })

  test("keeps images parked when the sanitizer removed an unsafe address", () => {
    const body = {
      blockedLinkCount: 1,
      isSenderTrustedForImages: false,
      links: [ordinaryLink],
      remoteImageCount: 4,
    }

    expect(hasImageSafetyWarning(body)).toBe(true)
    expect(shouldLoadRemoteImages(body)).toBe(false)
  })

  test("honors an explicit trusted-sender override on warned mail", () => {
    expect(
      shouldLoadRemoteImages({
        blockedLinkCount: 1,
        isSenderTrustedForImages: true,
        links: [mismatchLink],
        remoteImageCount: 4,
      }),
    ).toBe(true)
  })

  test("does not claim to load images when the message has none", () => {
    expect(
      shouldLoadRemoteImages({
        blockedLinkCount: 0,
        isSenderTrustedForImages: false,
        links: [],
        remoteImageCount: 0,
      }),
    ).toBe(false)
  })
})
