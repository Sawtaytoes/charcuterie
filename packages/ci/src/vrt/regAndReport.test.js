import { readFile } from "node:fs/promises"

import { describe, expect, it } from "vitest"

import { FREEZE_MOTION_CSS } from "./freezeMotion.js"
import {
  buildComment,
  buildReportUrl,
  commentMarker,
  countResult,
  decideVerdict,
  detectHost,
  parseRegSuitOutput,
  requestHeaders,
  summarize,
} from "./reportStatus.js"
import { buildRegConfig } from "./writeRegConfig.js"

const storeEnvironment = {
  VRT_REPORT_BASE_URL: "https://reports.example.test",
  VRT_S3_BUCKET: "vrt-example",
  VRT_S3_ENDPOINT: "http://s3.example.test:3900",
  VRT_S3_PUBLIC_URL: "https://reports.example.test",
  VRT_S3_REGION: "garage",
}

describe("buildRegConfig", () => {
  it("writes the settings the docs capture has used since the first run", () => {
    expect(buildRegConfig(storeEnvironment)).toEqual({
      core: {
        actualDir: ".vrt-actual",
        addIgnore: true,
        enableAntialias: true,
        thresholdRate: 0.02,
        workingDir: ".reg",
        ximgdiff: { invocationType: "client" },
      },
      plugins: {
        "reg-keygen-git-hash-plugin": {},
        "reg-publish-s3-plugin": {
          bucketName: "vrt-example",
          customDomain: "https://reports.example.test",
          sdkOptions: {
            endpoint: "http://s3.example.test:3900",
            forcePathStyle: true,
            region: "garage",
          },
        },
      },
    })
  })

  it("honors a custom actual and working directory", () => {
    const config = buildRegConfig({
      ...storeEnvironment,
      VRT_ACTUAL_DIR: "shots",
      VRT_WORKING_DIR: ".reg-web",
    })

    expect(config.core.actualDir).toBe("shots")
    expect(config.core.workingDir).toBe(".reg-web")
  })

  it("names every missing secret at once", () => {
    expect(() =>
      buildRegConfig({ VRT_S3_BUCKET: "vrt-example" }),
    ).toThrow(
      "VRT_REPORT_BASE_URL, VRT_S3_ENDPOINT, VRT_S3_PUBLIC_URL, VRT_S3_REGION",
    )
  })
})

describe("detectHost", () => {
  it("reads GitHub from its API URL", () => {
    expect(
      detectHost({
        GITHUB_API_URL: "https://api.github.com",
        GITHUB_SERVER_URL: "https://github.com",
      }),
    ).toEqual({
      apiUrl: "https://api.github.com",
      kind: "github",
    })
  })

  it("reads Forgejo from the variables a Forgejo job really sets", () => {
    // Copied from a Forgejo 16 Actions job's environment.
    expect(
      detectHost({
        FORGEJO_SERVER_URL: "https://forge.example.test",
        GITHUB_API_URL: "https://forge.example.test/api/v1",
        GITHUB_SERVER_URL: "https://forge.example.test",
      }),
    ).toEqual({
      apiUrl: "https://forge.example.test/api/v1",
      kind: "forgejo",
    })
  })

  it("builds Forgejo's API root when only the server is known", () => {
    expect(
      detectHost({
        FORGEJO_SERVER_URL: "https://forge.example.test/",
      }),
    ).toEqual({
      apiUrl: "https://forge.example.test/api/v1",
      kind: "forgejo",
    })
  })

  it("defaults to GitHub with no environment at all", () => {
    expect(detectHost({})).toEqual({
      apiUrl: "https://api.github.com",
      kind: "github",
    })
  })
})

describe("requestHeaders", () => {
  it("uses each host's own authorization scheme", () => {
    expect(
      requestHeaders("github", "t").authorization,
    ).toBe("Bearer t")
    expect(
      requestHeaders("forgejo", "t").authorization,
    ).toBe("token t")
    expect(
      requestHeaders("forgejo", "t"),
    ).not.toHaveProperty("x-github-api-version")
  })
})

describe("parseRegSuitOutput", () => {
  it("finds the key and the URL, colored or not", () => {
    const output = [
      "[reg-suit] info Detected the previous snapshot key: 'aaaa1111'",
      "[reg-suit] info \u001b[32mThe current snapshot key: 'bbbb2222'\u001b[39m",
      "[reg-suit] info Report URL: https://reports.example.test/bbbb2222/index.html",
    ].join("\n")

    expect(parseRegSuitOutput(output)).toEqual({
      key: "bbbb2222",
      url: "https://reports.example.test/bbbb2222/index.html",
    })
  })

  it("returns nulls for output with neither", () => {
    expect(parseRegSuitOutput("")).toEqual({
      key: null,
      url: null,
    })
  })
})

describe("buildReportUrl", () => {
  it("prefers reg-suit's own URL", () => {
    expect(
      buildReportUrl({
        baseUrl: "https://b.test",
        key: "k",
        reportUrl: "https://a.test/k/index.html",
      }),
    ).toBe("https://a.test/k/index.html")
  })

  it("joins the key onto the report host", () => {
    expect(
      buildReportUrl({
        baseUrl: "https://b.test/",
        key: "k",
      }),
    ).toBe("https://b.test/k/index.html")
  })

  it("returns null when it has nothing to build from", () => {
    expect(
      buildReportUrl({ baseUrl: "https://b.test" }),
    ).toBeNull()
  })
})

describe("verdict", () => {
  const out = {
    deletedItems: [],
    failedItems: ["a.png"],
    newItems: ["b.png", "c.png"],
    passedItems: ["d.png"],
  }

  it("counts reg-cli's out.json", () => {
    expect(countResult(out)).toEqual({
      added: 2,
      changed: 1,
      deleted: 0,
      passed: 1,
    })
    expect(countResult({})).toEqual({
      added: 0,
      changed: 0,
      deleted: 0,
      passed: 0,
    })
  })

  it("fails a changed shot on a pull request only", () => {
    expect(decideVerdict({ changed: 1 }, true)).toEqual({
      isRegression: true,
      state: "failure",
    })
    expect(decideVerdict({ changed: 1 }, false)).toEqual({
      isRegression: false,
      state: "success",
    })
    expect(decideVerdict({ changed: 0 }, true).state).toBe(
      "success",
    )
  })

  it("writes one comment per context, with the report link", () => {
    const body = buildComment({
      context: "vrt",
      counts: countResult(out),
      reportUrl: "https://b.test/k/index.html",
      repository: "owner/app",
    })

    expect(body.startsWith(commentMarker("vrt"))).toBe(true)
    expect(commentMarker("vrt")).not.toBe(
      commentMarker("vrt/web"),
    )
    expect(body).toContain("app (`vrt`)")
    expect(body).toContain("| 1 | 2 | 0 | 1 |")
    expect(body).toContain("(https://b.test/k/index.html)")
    expect(summarize(countResult(out))).toBe(
      "1 changed · 2 new · 0 deleted · 1 unchanged",
    )
  })
})

describe("FREEZE_MOTION_CSS", () => {
  it("is the same stylesheet storybook-config ships", async () => {
    // The capture runs from a bare checkout with no build, so it carries a
    // copy. This is what stops the copy drifting.
    const source = await readFile(
      new URL(
        "../../../storybook-config/src/testDeterminism.ts",
        import.meta.url,
      ),
      "utf8",
    )
    const original =
      /export const FREEZE_MOTION_CSS = `([^`]*)`/.exec(
        source,
      )

    expect(original?.[1]).toBe(FREEZE_MOTION_CSS)
  })
})
