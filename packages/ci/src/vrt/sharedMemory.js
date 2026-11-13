/**
 * Where Chromium keeps its shared memory during a capture.
 *
 * Playwright launches Chromium with `--disable-dev-shm-usage` by default,
 * because Docker gives a container a 64 MiB `/dev/shm` and a busy browser
 * crashes when that fills. With the flag, Chromium creates its shared memory
 * as deleted files in the temp directory (`/tmp/.org.chromium.Chromium.*`)
 * instead. Every rendered frame, tile, and resource buffer then moves through
 * those files.
 *
 * On the fleet's runners `/tmp` is the container's overlay on a ZFS pool.
 * Measured on 2026-11-13, mux-magic's 922-shot capture dirtied 14.7 GB of
 * pool pages in a 25-minute job; 160 of its shots dirtied 2.2 GB this way and
 * 3 MB with shared memory in `/dev/shm`. Shared memory never needs
 * to reach a disk. When the runner provides a `/dev/shm` with room, the
 * capture drops the flag and Chromium keeps it in RAM. The pixels do not
 * change: shared memory carries the same buffers either way.
 */

import { statfs } from "node:fs/promises"

export const SHARED_MEMORY_PATH = "/dev/shm"

/** 512 MiB. Docker's 64 MiB default is the case the Playwright flag exists for. */
export const MINIMUM_SHARED_MEMORY_BYTES = 512 * 1024 * 1024

const DISABLE_DEV_SHM_USAGE = "--disable-dev-shm-usage"

/**
 * @param {number | null} availableBytes free bytes in `/dev/shm`, or null
 *   when it could not be read
 * @returns {{ ignoreDefaultArgs: string[], isInMemory: boolean, message: string }}
 */
export const chooseSharedMemory = (availableBytes) => {
  const mebibytes =
    availableBytes == null
      ? null
      : Math.floor(availableBytes / (1024 * 1024))

  if (
    availableBytes != null &&
    availableBytes >= MINIMUM_SHARED_MEMORY_BYTES
  ) {
    return {
      ignoreDefaultArgs: [DISABLE_DEV_SHM_USAGE],
      isInMemory: true,
      message: `[vrt] Chromium shared memory: ${SHARED_MEMORY_PATH} (${mebibytes} MiB free).`,
    }
  }

  return {
    ignoreDefaultArgs: [],
    isInMemory: false,
    message:
      `[vrt] Chromium shared memory: temp files, because ${SHARED_MEMORY_PATH} ` +
      (mebibytes == null
        ? "could not be read."
        : `has only ${mebibytes} MiB free.`) +
      ` Give the runner a /dev/shm of at least ${MINIMUM_SHARED_MEMORY_BYTES / (1024 * 1024)} MiB so the capture does not write its frames to disk.`,
  }
}

/**
 * @param {string} [path]
 * @returns {Promise<number | null>}
 */
export const readAvailableSharedMemory = async (
  path = SHARED_MEMORY_PATH,
) => {
  try {
    const stats = await statfs(path)

    return stats.bavail * stats.bsize
  } catch {
    return null
  }
}
