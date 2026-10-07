import { execFileSync, spawnSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { createServer } from "node:http"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { gzipSync } from "node:zlib"

import { afterEach, describe, expect, it } from "vitest"

import {
  actualPathsFromReport,
  createPublishedStore,
  isCompleteSnapshot,
  listPublishedObjects,
  MISSING_REPORT,
  selectPublishedBaseline,
} from "./selectPublishedBaseline.js"
import { buildRegConfig } from "./writeRegConfig.js"

const docsDependencyRoot = fileURLToPath(
  new URL("../../../docs/", import.meta.url),
)
const require = createRequire(
  join(docsDependencyRoot, "package.json"),
)
const directories = []
const environment = {
  VRT_REPORT_BASE_URL: "https://reports.example.test",
  VRT_S3_BUCKET: "fixture",
  VRT_S3_ENDPOINT: "http://s3.example.test",
  VRT_S3_PUBLIC_URL: "reports.example.test",
  VRT_S3_REGION: "garage",
}
afterEach(() => {
  directories.splice(0).forEach((path) => {
    rmSync(path, { recursive: true, force: true })
  })
})
const scratch = () => {
  const cwd = mkdtempSync(
    join(tmpdir(), "published-baseline-test-"),
  )
  directories.push(cwd)
  return cwd
}
const repository = () => {
  const cwd = scratch()
  const git = (...args) =>
    execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: "pipe",
    }).trim()
  git("init", "-q", "-b", "main")
  git("config", "user.name", "Fixture")
  git("config", "user.email", "fixture@example.invalid")
  const commit = (value) => {
    writeFileSync(join(cwd, "README.md"), value)
    git("add", ".")
    git("commit", "-qm", value)
    return git("rev-parse", "HEAD")
  }
  const published = commit("published main")
  const docs = commit("documentation only")
  const baseKey = commit("more documentation only")
  git("update-ref", "refs/remotes/origin/main", baseKey)
  git("checkout", "-qb", "feature")
  const actualKey = commit("feature UI")
  return {
    cwd,
    git,
    commit,
    published,
    docs,
    baseKey,
    actualKey,
    defaultBranch: "main",
  }
}
const report = (names = ["nested/shot.png"]) => ({
  newItems: names.map((raw) => ({
    raw,
    encoded: encodeURIComponent(raw),
  })),
  passedItems: [],
  failedItems: [],
  deletedItems: [
    { raw: "removed.png", encoded: "removed.png" },
  ],
})
const store = (snapshots) => ({
  publisher: {
    resolveInBucket: (key) => key,
    async listItems(_, prefix) {
      const contents = Object.entries(snapshots)
        .flatMap(([key, value]) =>
          value.objects.map((path) => ({
            key: `${key}/${path}`,
          })),
        )
        .filter((item) => item.key.startsWith(prefix))
      return { contents, isTruncated: false }
    },
  },
  readReport: async (path) =>
    snapshots[path.split("/")[0]].report,
})
const complete = () => ({
  objects: [
    "index.html",
    "out.json",
    "actual/nested/shot.png",
  ],
  report: report(),
})

describe("published baseline ancestry", () => {
  it("falls through missing docs snapshots and an incomplete upload to the nearest complete main ancestor", async () => {
    const repo = repository()
    const result = await selectPublishedBaseline({
      ...repo,
      ...store({
        [repo.published]: complete(),
        [repo.baseKey]: {
          objects: ["index.html", "out.json"],
          report: report(),
        },
        [repo.actualKey]: complete(),
      }),
    })
    expect(result).toEqual({
      actualKey: repo.actualKey,
      expectedKey: repo.published,
      baseKey: repo.baseKey,
      isInitialBaseline: false,
    })
  })
  it("keeps a fully published original Git base", async () => {
    const repo = repository()
    expect(
      (
        await selectPublishedBaseline({
          ...repo,
          ...store({
            [repo.published]: complete(),
            [repo.baseKey]: complete(),
          }),
        })
      ).expectedKey,
    ).toBe(repo.baseKey)
  })
  it("uses the reviewed predecessor when the pinned plugin has no intersection in a default-only main clone", async () => {
    const repo = repository()
    repo.git("checkout", "main")
    repo.git("branch", "-D", "feature")
    const actualKey = repo.commit("next main publication")
    repo.git(
      "update-ref",
      "refs/remotes/origin/main",
      actualKey,
    )
    const previousCwd = process.cwd()
    let baseKey
    try {
      process.chdir(repo.cwd)
      const {
        CommitExplorer,
      } = require("reg-keygen-git-hash-plugin/lib/commit-explorer.js")
      baseKey = new CommitExplorer().getBaseCommitHash()
    } finally {
      process.chdir(previousCwd)
    }
    expect(baseKey).toBeNull()
    for (const event of [
      { ref: "refs/heads/main", before: repo.baseKey },
      {},
    ]) {
      const result = await selectPublishedBaseline({
        ...repo,
        baseKey,
        actualKey,
        event,
        ...store({
          [repo.baseKey]: complete(),
          [actualKey]: complete(),
        }),
      })
      expect(result.expectedKey).toBe(repo.baseKey)
      expect(result.actualKey).toBe(actualKey)
    }
  })
  it("preserves an original older release base even when a newer reviewed predecessor exists", async () => {
    const repo = repository()
    const result = await selectPublishedBaseline({
      ...repo,
      baseKey: repo.published,
      event: {
        pull_request: {
          base: { ref: "main", sha: repo.baseKey },
        },
      },
      ...store({
        [repo.published]: complete(),
        [repo.baseKey]: complete(),
      }),
    })
    expect(result.expectedKey).toBe(repo.published)
  })
  it("falls back from an unpublished old release intersection to a complete reviewed predecessor", async () => {
    const repo = repository()
    for (const event of [
      {
        pull_request: {
          base: { ref: "main", sha: repo.baseKey },
        },
      },
      { ref: "refs/heads/main", before: repo.baseKey },
    ]) {
      const result = await selectPublishedBaseline({
        ...repo,
        baseKey: repo.published,
        event,
        ...store({
          [repo.baseKey]: complete(),
          [repo.actualKey]: complete(),
        }),
      })
      expect(result.expectedKey).toBe(repo.baseKey)
      expect(result.baseKey).toBe(repo.baseKey)
    }
  })
  it("rejects malformed raw PR/push bases that point to the actual reviewed main commit itself", async () => {
    const repo = repository()
    repo.git("checkout", "main")
    const actualKey = repo.git("rev-parse", "HEAD")
    for (const event of [
      { ref: "refs/heads/main", before: actualKey },
      {
        pull_request: {
          base: { ref: "main", sha: actualKey },
        },
      },
    ]) {
      await expect(
        selectPublishedBaseline({
          ...repo,
          baseKey: null,
          actualKey,
          event,
          ...store({ [actualKey]: complete() }),
        }),
      ).rejects.toThrow("cannot equal actual")
    }
  })
  it("never picks an unrelated or current feature snapshot", async () => {
    const repo = repository()
    await expect(
      selectPublishedBaseline({
        ...repo,
        ...store({
          [repo.actualKey]: complete(),
          ["f".repeat(40)]: complete(),
        }),
      }),
    ).rejects.toThrow("feature snapshot cannot bootstrap")
    await expect(
      selectPublishedBaseline({
        ...repo,
        baseKey: repo.actualKey,
        ...store({ [repo.actualKey]: complete() }),
      }),
    ).rejects.toThrow()
  })
  it("uses the reviewed default predecessor when the pinned plugin selects a normal merge's feature parent", async () => {
    const repo = repository()
    repo.git("checkout", "main")
    repo.git(
      "merge",
      "--no-ff",
      "feature",
      "-m",
      "reviewed merge",
    )
    const actualKey = repo.git("rev-parse", "HEAD")
    repo.git(
      "update-ref",
      "refs/remotes/origin/main",
      actualKey,
    )
    const previousCwd = process.cwd()
    let baseKey
    let pluginActual
    try {
      process.chdir(repo.cwd)
      const {
        CommitExplorer,
      } = require("reg-keygen-git-hash-plugin/lib/commit-explorer.js")
      const explorer = new CommitExplorer()
      baseKey = explorer.getBaseCommitHash()
      pluginActual = explorer.getCurrentCommitHash()
    } finally {
      process.chdir(previousCwd)
    }
    expect(baseKey).toBe(repo.actualKey)
    expect(pluginActual).toBe(actualKey)
    for (const event of [
      { ref: "refs/heads/main", before: repo.baseKey },
      {
        pull_request: {
          base: { ref: "main", sha: repo.baseKey },
        },
      },
      {},
    ]) {
      const fixture = store({
        [repo.baseKey]: complete(),
        [baseKey]: complete(),
        [actualKey]: complete(),
      })
      const requested = []
      const listItems = fixture.publisher.listItems
      fixture.publisher.listItems = (marker, prefix) => {
        requested.push(prefix)
        return listItems(marker, prefix)
      }
      expect(
        await selectPublishedBaseline({
          ...repo,
          baseKey,
          actualKey,
          event,
          ...fixture,
        }),
      ).toEqual({
        actualKey,
        expectedKey: repo.baseKey,
        baseKey: repo.baseKey,
        isInitialBaseline: false,
      })
      expect(requested).toEqual([`${repo.baseKey}/`])
    }
  })
  it("still refuses a merged feature snapshot when no default ancestor was published", async () => {
    const repo = repository()
    repo.git("checkout", "main")
    repo.git(
      "merge",
      "--no-ff",
      "feature",
      "-m",
      "reviewed merge",
    )
    repo.git(
      "update-ref",
      "refs/remotes/origin/main",
      "HEAD",
    )
    await expect(
      selectPublishedBaseline({
        ...repo,
        actualKey: repo.git("rev-parse", "HEAD"),
        baseKey: repo.actualKey,
        ...store({ [repo.actualKey]: complete() }),
      }),
    ).rejects.toThrow("feature snapshot cannot bootstrap")
  })
  it("rejects an event predecessor that points to the merged feature parent", async () => {
    const repo = repository()
    repo.git("checkout", "main")
    repo.git(
      "merge",
      "--no-ff",
      "feature",
      "-m",
      "reviewed merge",
    )
    repo.git(
      "update-ref",
      "refs/remotes/origin/main",
      "HEAD",
    )
    const actualKey = repo.git("rev-parse", "HEAD")
    for (const event of [
      { ref: "refs/heads/main", before: repo.actualKey },
      {
        pull_request: {
          base: { ref: "main", sha: repo.actualKey },
        },
      },
    ]) {
      await expect(
        selectPublishedBaseline({
          ...repo,
          actualKey,
          baseKey: repo.actualKey,
          event,
          ...store({
            [repo.baseKey]: complete(),
            [repo.actualKey]: complete(),
          }),
        }),
      ).rejects.toThrow("first-parent history")
    }
  })
  it("does not replace a nonancestor plugin base with an otherwise valid event predecessor", async () => {
    const repo = repository()
    repo.git(
      "checkout",
      "-qb",
      "unreviewed",
      repo.published,
    )
    const unrelated = repo.commit("unreviewed UI")
    await expect(
      selectPublishedBaseline({
        ...repo,
        baseKey: unrelated,
        event: {
          pull_request: {
            base: { ref: "main", sha: repo.baseKey },
          },
        },
        ...store({
          [repo.baseKey]: complete(),
          [unrelated]: complete(),
        }),
      }),
    ).rejects.toThrow()
  })
  it("explicitly initializes a truly empty bucket, including a first commit with no Git base", async () => {
    const repo = repository()
    repo.git("checkout", "main")
    repo.git("reset", "--hard", repo.published)
    repo.git(
      "update-ref",
      "refs/remotes/origin/main",
      repo.published,
    )
    expect(
      await selectPublishedBaseline({
        ...repo,
        actualKey: repo.published,
        baseKey: null,
        ...store({}),
      }),
    ).toMatchObject({
      expectedKey: null,
      isInitialBaseline: true,
    })
  })
  it("blocks first-main/retry bootstrap after the first PR populated only feature snapshots", async () => {
    const repo = repository()
    await expect(
      selectPublishedBaseline({
        ...repo,
        baseKey: null,
        ...store({ [repo.actualKey]: complete() }),
      }),
    ).rejects.toThrow("empty per-repository bucket")
  })
  it("fails closed on corrupt existing metadata instead of trying an older snapshot", async () => {
    const repo = repository()
    await expect(
      selectPublishedBaseline({
        ...repo,
        ...store({
          [repo.published]: complete(),
          [repo.baseKey]: {
            ...complete(),
            report: { passedItems: [] },
          },
        }),
      }),
    ).rejects.toThrow("Invalid published report")
  })
  it("treats a disappearing report object as incomplete, while permission and network errors fail closed", async () => {
    const repo = repository()
    const fixture = store({
      [repo.published]: complete(),
      [repo.baseKey]: complete(),
    })
    fixture.readReport = async (path) =>
      path.startsWith(repo.baseKey)
        ? MISSING_REPORT
        : report()
    expect(
      (
        await selectPublishedBaseline({
          ...repo,
          ...fixture,
        })
      ).expectedKey,
    ).toBe(repo.published)
    for (const message of ["AccessDenied", "ECONNRESET"]) {
      const failure = {
        ...fixture,
        publisher: {
          ...fixture.publisher,
          listItems: async () => {
            throw new Error(message)
          },
        },
      }
      await expect(
        selectPublishedBaseline({ ...repo, ...failure }),
      ).rejects.toThrow(message)
    }
  })
  it("rejects stale extra PNGs and invalid or duplicate report paths", async () => {
    expect(actualPathsFromReport(report())).toEqual(
      new Set(["nested/shot.png"]),
    )
    for (const names of [
      ["../bad.png"],
      ["/bad.png"],
      ["shot.png", "shot.png"],
      [],
    ])
      expect(() =>
        actualPathsFromReport(report(names)),
      ).toThrow()
    const fixture = store({
      abc: {
        ...complete(),
        objects: [
          ...complete().objects,
          "actual/stale.png",
        ],
      },
    })
    expect(
      await isCompleteSnapshot(
        fixture.publisher,
        "abc",
        fixture.readReport,
      ),
    ).toBe(false)
  })
})

describe("authenticated pinned publisher", () => {
  it("paginates prefix listings, downloads gzip metadata, distinguishes missing from auth errors, and never issues per-image HEADs", async () => {
    const requests = []
    let responseMode = "complete"
    const server = createServer((request, response) => {
      const url = new URL(request.url, "http://localhost")
      requests.push({
        method: request.method,
        path: url.pathname,
        prefix: url.searchParams.get("prefix"),
      })
      if (responseMode === "denied") {
        response.writeHead(403, {
          "content-type": "application/xml",
        })
        return response.end(
          "<Error><Code>AccessDenied</Code><Message>Fixture denied</Message></Error>",
        )
      }
      if (url.searchParams.has("list-type")) {
        if (responseMode === "malformed-list") {
          response.writeHead(200, {
            "content-type": "application/xml",
          })
          return response.end("<ListBucketResult />")
        }
        const prefix = url.searchParams.get("prefix")
        const names = url.searchParams.has(
          "continuation-token",
        )
          ? ["actual/nested/shot.png"]
          : ["index.html", "out.json"]
        response.writeHead(200, {
          "content-type": "application/xml",
        })
        return response.end(
          `<ListBucketResult><IsTruncated>${!url.searchParams.has("continuation-token")}</IsTruncated>${!url.searchParams.has("continuation-token") ? "<NextContinuationToken>next-page</NextContinuationToken>" : ""}${names.map((name) => `<Contents><Key>${prefix}${name}</Key></Contents>`).join("")}</ListBucketResult>`,
        )
      }
      if (responseMode === "missing") {
        response.writeHead(404, {
          "content-type": "application/xml",
        })
        return response.end(
          "<Error><Code>NoSuchKey</Code><Message>Fixture missing</Message></Error>",
        )
      }
      response.writeHead(200, {
        "content-type": "application/json",
        "content-encoding": "gzip",
      })
      response.end(gzipSync(JSON.stringify(report())))
    })
    await new Promise((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    )
    try {
      const config = buildRegConfig(environment)
      config.plugins["reg-publish-s3-plugin"].pathPrefix =
        "reports"
      Object.assign(
        config.plugins["reg-publish-s3-plugin"].sdkOptions,
        {
          endpoint: `http://127.0.0.1:${server.address().port}`,
          credentials: {
            accessKeyId: "fixture",
            secretAccessKey: "fixture",
          },
          maxAttempts: 1,
        },
      )
      const fixture = createPublishedStore(
        config,
        scratch(),
        docsDependencyRoot,
      )
      expect(
        await isCompleteSnapshot(
          fixture.publisher,
          "abc",
          fixture.readReport,
        ),
      ).toBe(true)
      expect(
        requests.every(
          (request) => request.method === "GET",
        ),
      ).toBe(true)
      expect(
        requests.filter(
          (request) => request.prefix === "reports/abc/",
        ),
      ).toHaveLength(2)
      expect(
        requests.some(
          (request) =>
            request.path ===
            "/fixture/reports/abc/out.json",
        ),
      ).toBe(true)
      responseMode = "missing"
      expect(
        await isCompleteSnapshot(
          fixture.publisher,
          "abc",
          fixture.readReport,
        ),
      ).toBe(false)
      responseMode = "denied"
      await expect(
        isCompleteSnapshot(
          fixture.publisher,
          "abc",
          fixture.readReport,
        ),
      ).rejects.toMatchObject({ name: "AccessDenied" })
      responseMode = "malformed-list"
      await expect(
        isCompleteSnapshot(
          fixture.publisher,
          "abc",
          fixture.readReport,
        ),
      ).rejects.toThrow("Invalid S3 listing metadata")
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })
  it("rejects broken or repeated pagination tokens", async () => {
    for (const page of [
      { contents: [] },
      { contents: [], isTruncated: "false" },
      { contents: [], isTruncated: true, nextMarker: {} },
    ]) {
      await expect(
        listPublishedObjects(
          { listItems: async () => page },
          "",
        ),
      ).rejects.toThrow("metadata")
    }
    await expect(
      listPublishedObjects(
        {
          listItems: async () => ({
            contents: [],
            isTruncated: true,
          }),
        },
        "",
      ),
    ).rejects.toThrow("pagination")
    await expect(
      listPublishedObjects(
        {
          listItems: async () => ({
            contents: [],
            isTruncated: true,
            nextMarker: "same",
          }),
        },
        "",
      ),
    ).rejects.toThrow("pagination")
  })
})

describe("pinned CLI and original actual key", () => {
  it("uses the same config and selected bridge in the native docs writer, with preflight before both capture paths", () => {
    const repo = repository()
    const selection = {
      actualKey: repo.actualKey,
      expectedKey: repo.published,
      isInitialBaseline: false,
    }
    const selectionPath = join(repo.cwd, "selection.json")
    writeFileSync(selectionPath, JSON.stringify(selection))
    const nativeWriter = fileURLToPath(
      new URL(
        "../../../docs/scripts/writeRegConfig.mjs",
        import.meta.url,
      ),
    )
    execFileSync(process.execPath, [nativeWriter], {
      cwd: repo.cwd,
      env: {
        ...process.env,
        ...environment,
        VRT_BASELINE_FILE: selectionPath,
      },
    })
    expect(
      JSON.parse(
        readFileSync(
          join(repo.cwd, ".regconfig.json"),
          "utf8",
        ),
      ),
    ).toEqual(buildRegConfig(environment, selection))
    const nativeWorkflow = readFileSync(
      new URL(
        "../../../../.github/workflows/ci.yml",
        import.meta.url,
      ),
      "utf8",
    )
    const nativeJob = nativeWorkflow.slice(
      nativeWorkflow.indexOf("  vrt:"),
    )
    expect(
      nativeJob.indexOf("selectPublishedBaseline.js"),
    ).toBeLessThan(
      nativeJob.indexOf("pnpm build:storybook"),
    )
    expect(nativeJob).toContain(
      'VRT_DEPENDENCY_ROOT="$PWD"',
    )
    expect(
      nativeJob.indexOf("selectPublishedBaseline.js"),
    ).toBeLessThan(
      nativeJob.indexOf("exec playwright install chromium"),
    )
    const shared = readFileSync(
      new URL(
        "../../../../.github/workflows/shared-vrt.yml",
        import.meta.url,
      ),
      "utf8",
    )
    expect(
      shared.indexOf(
        "Select a complete published baseline",
      ),
    ).toBeLessThan(
      shared.indexOf("      - name: Set up with the repo"),
    )
  })
  it("fails the actual CLI before comparison when bridge keys are invalid or HEAD changes after preflight", () => {
    const repo = repository()
    const config = buildRegConfig(environment, {
      actualKey: repo.actualKey,
      expectedKey: repo.published,
      isInitialBaseline: false,
    })
    delete config.plugins["reg-publish-s3-plugin"]
    const bridgePath = Object.keys(config.plugins)[0]
    const cli = require.resolve("reg-suit/lib/cli.js")
    const run = () => {
      writeFileSync(
        join(repo.cwd, "config.json"),
        JSON.stringify(config),
      )
      return spawnSync(
        process.execPath,
        [cli, "--config", "config.json", "run"],
        { cwd: repo.cwd, encoding: "utf8" },
      )
    }
    config.plugins[bridgePath].actualKey = "invalid"
    const invalid = run()
    expect(invalid.status).toBe(1)
    expect(invalid.stderr).toContain(
      "Invalid preflight snapshot keys",
    )
    expect(invalid.stdout).not.toContain(
      "Comparison Complete",
    )
    config.plugins[bridgePath].actualKey = repo.actualKey
    config.plugins[bridgePath].expectedKey = repo.actualKey
    const self = run()
    expect(self.status).toBe(1)
    expect(self.stderr).toContain(
      "Invalid preflight snapshot keys",
    )
    expect(self.stdout).not.toContain("Comparison Complete")
    config.plugins[bridgePath].expectedKey = repo.published
    repo.commit("HEAD changed after preflight")
    const changed = run()
    expect(changed.status).toBe(1)
    expect(changed.stderr).toContain(
      "Git HEAD changed after baseline preflight",
    )
    expect(changed.stdout).not.toContain(
      "Comparison Complete",
    )
    expect(
      existsSync(join(repo.cwd, ".reg/out.json")),
    ).toBe(false)
  })
  it("preserves the native actual key, including a PR merge clone, and loads the local bridge in the real CLI", async () => {
    const repo = repository()
    repo.git("checkout", "main")
    repo.git(
      "merge",
      "--no-ff",
      "feature",
      "-m",
      "PR merge clone",
    )
    repo.git("checkout", "-B", "feature")
    const {
      CommitExplorer,
    } = require("reg-keygen-git-hash-plugin/lib/commit-explorer.js")
    const previousCwd = process.cwd()
    let actualKey
    try {
      process.chdir(repo.cwd)
      const explorer = new CommitExplorer()
      explorer.getBaseCommitHash()
      actualKey = explorer.getCurrentCommitHash()
      const native = require("reg-keygen-git-hash-plugin")()
        .keyGenerator
      native.init({
        workingDirs: { base: repo.cwd },
        logger: {
          error() {},
          colors: { red: (value) => value },
        },
      })
      await native.getExpectedKey().catch(() => null)
      expect(await native.getActualKey()).toBe(actualKey)
    } finally {
      process.chdir(previousCwd)
    }
    const config = buildRegConfig(environment, {
      actualKey,
      expectedKey: repo.published,
      isInitialBaseline: false,
    })
    delete config.plugins["reg-publish-s3-plugin"]
    config.core.ximgdiff = { invocationType: "none" }
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
      "base64",
    )
    mkdirSync(join(repo.cwd, ".vrt-actual"))
    writeFileSync(
      join(repo.cwd, ".vrt-actual/shot.png"),
      png,
    )
    mkdirSync(join(repo.cwd, ".reg/expected"), {
      recursive: true,
    })
    writeFileSync(
      join(repo.cwd, ".reg/expected/shot.png"),
      png,
    )
    writeFileSync(
      join(repo.cwd, "config.json"),
      JSON.stringify(config),
    )
    const cli = require.resolve("reg-suit/lib/cli.js")
    const output = execFileSync(
      process.execPath,
      [cli, "--config", "config.json", "run"],
      { cwd: repo.cwd, encoding: "utf8" },
    )
    expect(output).toContain(
      `previous snapshot key: '${repo.published}'`,
    )
    expect(output).toContain(
      `current snapshot key: '${actualKey}'`,
    )
    expect(
      JSON.parse(
        readFileSync(
          join(repo.cwd, ".reg/out.json"),
          "utf8",
        ),
      ).passedItems,
    ).toHaveLength(1)
    for (const selection of [
      null,
      {},
      {
        actualKey,
        expectedKey: null,
        isInitialBaseline: false,
      },
    ])
      expect(() =>
        buildRegConfig(environment, selection),
      ).toThrow("Invalid preflight")
  })
})
