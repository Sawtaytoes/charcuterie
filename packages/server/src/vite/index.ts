/**
 * `@charcuterie/server/vite` — the build-time half of the
 * precompression contract.
 *
 * **A subpath export with no Vite dependency.** The base package
 * runs in a Node server and must not drag Vite into it. The plugin
 * types its own shape instead of importing Vite's `Plugin`, so the
 * package names no `vite` dependency, peer, or optional peer, and a
 * production install of an app's server never installs Vite. Apps
 * that only build assets never resolve `hono`.
 */

export {
  type CompressedArtifact,
  type CompressionAlgorithm,
  compressDirectory,
  DEFAULT_THRESHOLD_BYTES,
} from "./compressDirectory.ts"
export {
  type PrecompressAssetsPlugin,
  precompressAssets,
} from "./precompressAssets.ts"
