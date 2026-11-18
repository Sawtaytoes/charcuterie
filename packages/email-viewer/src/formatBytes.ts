/**
 * A file size a person can read at a glance: bytes stay bytes, whole
 * kilobytes under a megabyte, one decimal place above. Binary units,
 * the same rendering Mail Sifter's reader has always used.
 */
export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
