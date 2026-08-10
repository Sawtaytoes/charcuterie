/**
 * `@charcuterie/server/vite` — the build-time half of the
 * precompression contract.
 *
 * **A subpath export with an optional peer dependency.** The base
 * package runs in a Node server and must not drag Vite into it;
 * apps that only serve assets never resolve `vite`, and apps that
 * only build them never resolve `hono`.
 */

export {
  type CompressedArtifact,
  type CompressionAlgorithm,
  compressDirectory,
  DEFAULT_THRESHOLD_BYTES,
} from "./compressDirectory.ts"
export { precompressAssets } from "./precompressAssets.ts"
