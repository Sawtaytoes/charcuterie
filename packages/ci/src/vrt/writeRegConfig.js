#!/usr/bin/env node
/**
 * Write `.regconfig.json` for reg-suit from the environment, so no repo
 * commits one and no endpoint, bucket or host name lands in a public repo.
 *
 * The same settings `packages/docs/scripts/writeRegConfig.mjs` has used
 * since the first VRT run: a 2% threshold with antialiasing tolerated, the
 * git-hash key generator (the baseline is the snapshot of the merge base's
 * nearest keyed ancestor), and the S3 publisher over path-style addressing,
 * which is what Garage speaks.
 *
 *   VRT_S3_BUCKET        the repo's own bucket
 *   VRT_S3_ENDPOINT      S3 API endpoint (LAN only)
 *   VRT_S3_REGION        region name the store expects
 *   VRT_S3_PUBLIC_URL    host the published report is served from. The S3
 *                        plugin prepends `https://` itself, so a full URL is
 *                        cut down to its host here rather than doubled.
 *   VRT_REPORT_BASE_URL  report host, read by reportStatus.js; required here
 *                        too so a missing secret fails before the capture
 *   VRT_ACTUAL_DIR       shots directory (default .vrt-actual)
 *   VRT_WORKING_DIR      reg-suit scratch (default .reg)
 *
 *   node writeRegConfig.js [--out .regconfig.json]
 */

import { writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { DEFAULT_ACTUAL_DIR } from "./captureOptions.js"

export const REQUIRED_ENVIRONMENT = Object.freeze([
  "VRT_REPORT_BASE_URL",
  "VRT_S3_BUCKET",
  "VRT_S3_ENDPOINT",
  "VRT_S3_PUBLIC_URL",
  "VRT_S3_REGION",
])

export const DEFAULT_WORKING_DIR = ".reg"

/**
 * `reg-publish-s3-plugin` builds the report URL as
 * `https://<customDomain>/<key>/index.html`, so it wants a bare host. A
 * secret written as a URL produced `https://https://…` on the first Forgejo
 * run; accept either spelling.
 *
 * @param {string} value
 */
export const toCustomDomain = (value) =>
  value.replace(/^[a-z]+:\/\//i, "").replace(/\/+$/, "")

/**
 * @param {Record<string, string | undefined>} env
 */
export const buildRegConfig = (env) => {
  const missing = REQUIRED_ENVIRONMENT.filter(
    (name) => !env[name],
  )

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "A caller passes them with `secrets: inherit`.",
    )
  }

  return {
    core: {
      actualDir: env.VRT_ACTUAL_DIR || DEFAULT_ACTUAL_DIR,
      addIgnore: true,
      enableAntialias: true,
      thresholdRate: 0.02,
      workingDir:
        env.VRT_WORKING_DIR || DEFAULT_WORKING_DIR,
      ximgdiff: { invocationType: "client" },
    },
    plugins: {
      "reg-keygen-git-hash-plugin": {},
      "reg-publish-s3-plugin": {
        bucketName: env.VRT_S3_BUCKET,
        customDomain: toCustomDomain(
          env.VRT_S3_PUBLIC_URL ?? "",
        ),
        sdkOptions: {
          endpoint: env.VRT_S3_ENDPOINT,
          forcePathStyle: true,
          region: env.VRT_S3_REGION,
        },
      },
    },
  }
}

const isMain =
  process.argv[1] != null &&
  resolve(process.argv[1]) ===
    fileURLToPath(import.meta.url)

if (isMain) {
  const outIndex = process.argv.indexOf("--out")
  const outPath =
    outIndex === -1
      ? ".regconfig.json"
      : process.argv[outIndex + 1]

  try {
    await writeFile(
      outPath ?? ".regconfig.json",
      `${JSON.stringify(buildRegConfig(process.env), null, 2)}\n`,
    )
    console.log(`[vrt] wrote ${outPath}`)
  } catch (error) {
    console.error(
      `[vrt] ${error instanceof Error ? error.message : error}`,
    )
    process.exitCode = 1
  }
}
