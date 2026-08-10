import type { Plugin } from "vite"

import {
  type CompressionAlgorithm,
  compressDirectory,
  DEFAULT_THRESHOLD_BYTES,
} from "./compressDirectory.ts"

const formatKilobytes = (bytes: number) =>
  `${(bytes / 1_024).toFixed(1)} kB`

/**
 * Emit `.br` and `.gz` siblings for the build output, so
 * `createStaticHandler`'s `precompressed` lookup has something to
 * find.
 *
 * **Build time, not request time.** The bytes are identical for
 * every visitor and change only when the build does, so deriving
 * them per request spends CPU on a cache-miss that never had to
 * exist — and does it while the user waits. Brotli quality 11 is
 * affordable exactly once.
 *
 * ```ts
 * // vite.config.ts
 * import { precompressAssets } from "@charcuterie/server/vite"
 *
 * export default createViteConfig({
 *   plugins: [react(), precompressAssets()],
 * })
 * ```
 *
 * Ordering is handled by `enforce: "post"` + `apply: "build"`: the
 * files have to exist on disk before they can be compressed, and
 * `writeBundle` is the first hook where that is true.
 *
 * Defaults to `["br", "gz"]`. `zst` is supported but near-pointless
 * as a third: the handler prefers Brotli, every browser that speaks
 * zstd also speaks Brotli, and `gz` is already the floor for the
 * ones that speak neither.
 */
export const precompressAssets = ({
  algorithms = ["br", "gz"],
  thresholdBytes = DEFAULT_THRESHOLD_BYTES,
}: {
  algorithms?: readonly CompressionAlgorithm[]
  thresholdBytes?: number
} = {}): Plugin => {
  let outputDirectory = ""
  let isSilent = false

  return {
    apply: "build",
    enforce: "post",
    name: "charcuterie:precompress-assets",

    configResolved: (config) => {
      outputDirectory = config.build.outDir
      isSilent = config.logLevel === "silent"
    },

    writeBundle: {
      order: "post",
      sequential: true,
      handler: async () => {
        const artifacts = await compressDirectory({
          algorithms,
          directory: outputDirectory,
          thresholdBytes,
        })

        if (isSilent || artifacts.length === 0) return

        const originalBytes = artifacts
          .filter(({ algorithm }) => algorithm === "br")
          .reduce(
            (total, { originalBytes: bytes }) =>
              total + bytes,
            0,
          )

        const compressedBytes = artifacts
          .filter(({ algorithm }) => algorithm === "br")
          .reduce(
            (total, { compressedBytes: bytes }) =>
              total + bytes,
            0,
          )

        console.info(
          `precompressed ${artifacts.length} files — brotli: ${formatKilobytes(originalBytes)} → ${formatKilobytes(compressedBytes)}`,
        )
      },
    },
  }
}
