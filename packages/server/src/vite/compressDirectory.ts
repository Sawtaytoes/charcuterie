import {
  readdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises"
import { extname, join } from "node:path"
import { promisify } from "node:util"
import {
  brotliCompress,
  constants,
  gzip,
  zstdCompress,
} from "node:zlib"

const compressBrotli = promisify(brotliCompress)
const compressGzip = promisify(gzip)
const compressZstd = promisify(zstdCompress)

export type CompressionAlgorithm = "br" | "gz" | "zst"

/**
 * Extensions worth compressing.
 *
 * The omissions are the point: `.png`, `.jpg`, `.webp`, `.woff2` and
 * friends are already compressed, so a second pass spends build time
 * to produce a *larger* file that then loses the `Content-Encoding`
 * negotiation anyway. `.woff2` is Brotli internally — compressing it
 * again is the clearest case.
 */
const COMPRESSIBLE_EXTENSIONS = new Set([
  ".css",
  ".cjs",
  ".html",
  ".js",
  ".json",
  ".map",
  ".mjs",
  ".svg",
  ".txt",
  ".wasm",
  ".webmanifest",
  ".xml",
])

/**
 * Below this, compression is a loss. The sibling costs an inode and
 * a `statSync` on every request, and the saving is smaller than the
 * TCP segment the response already occupies.
 */
export const DEFAULT_THRESHOLD_BYTES = 1_024

const compressors: Record<
  CompressionAlgorithm,
  (input: Buffer) => Promise<Buffer>
> = {
  // Quality 11 is the slow end, which is the right end for build
  // time: this runs once per deploy and the output is served
  // thousands of times.
  br: (input) =>
    compressBrotli(input, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 11,
        [constants.BROTLI_PARAM_SIZE_HINT]:
          input.byteLength,
      },
    }),
  gz: (input) => compressGzip(input, { level: 9 }),
  zst: (input) => compressZstd(input),
}

export type CompressedArtifact = {
  algorithm: CompressionAlgorithm
  compressedBytes: number
  originalBytes: number
  path: string
}

const listFilesRecursively = async (
  directory: string,
): Promise<string[]> => {
  const entries = await readdir(directory, {
    withFileTypes: true,
  })

  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(directory, entry.name)
      return entry.isDirectory()
        ? await listFilesRecursively(entryPath)
        : [entryPath]
    }),
  )

  return nested.flat()
}

/**
 * Write `.br`/`.gz`/`.zst` siblings next to every compressible file
 * under `directory`.
 *
 * Siblings, not replacements — `serveStatic` falls back to the
 * original when a client sends no `Accept-Encoding` it can satisfy,
 * and a build that emits only compressed bytes breaks that client
 * silently.
 *
 * A sibling that comes out **larger** than its source is discarded:
 * serving it would cost the client bytes *and* a decompress.
 */
export const compressDirectory = async ({
  algorithms = ["br", "gz"],
  directory,
  thresholdBytes = DEFAULT_THRESHOLD_BYTES,
}: {
  algorithms?: readonly CompressionAlgorithm[]
  directory: string
  thresholdBytes?: number
}): Promise<CompressedArtifact[]> => {
  const filePaths = await listFilesRecursively(directory)

  const candidates = filePaths.filter((filePath) =>
    COMPRESSIBLE_EXTENSIONS.has(
      extname(filePath).toLowerCase(),
    ),
  )

  const written = await Promise.all(
    candidates.flatMap((filePath) =>
      algorithms.map(
        async (
          algorithm,
        ): Promise<CompressedArtifact | undefined> => {
          const { size } = await stat(filePath)
          if (size < thresholdBytes) return undefined

          const source = await readFile(filePath)
          const compressed =
            await compressors[algorithm](source)

          if (compressed.byteLength >= source.byteLength) {
            return undefined
          }

          const outputPath = `${filePath}.${algorithm}`
          await writeFile(outputPath, compressed)

          return {
            algorithm,
            compressedBytes: compressed.byteLength,
            originalBytes: source.byteLength,
            path: outputPath,
          }
        },
      ),
    ),
  )

  return written.filter(
    (artifact) => artifact !== undefined,
  )
}
