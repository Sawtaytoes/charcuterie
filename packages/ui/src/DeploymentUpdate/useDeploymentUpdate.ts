import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

/** Matches `@charcuterie/server`'s default build-marker URL. */
export const DEFAULT_DEPLOYMENT_PATH =
  "/__charcuterie/deployment"

/** Matches `@charcuterie/server`'s default SSE URL. */
export const DEFAULT_DEPLOYMENT_EVENTS_PATH =
  "/__charcuterie/deployment/events"

export type UseDeploymentUpdateOptions = {
  deploymentPath?: string
  deploymentEventsPath?: string
  /** `0` disables polling. SSE is normally enough. */
  pollIntervalMs?: number
  /** Disable when an app calls `checkForUpdate` after its own SSE reconnects. */
  isEventSourceEnabled?: boolean
}

export type DeploymentUpdate = {
  isUpdateAvailable: boolean
  /** Revalidate the marker now. Safe to call after an app SSE reconnects. */
  checkForUpdate: () => Promise<boolean>
  /** Reload after the user has saved or finished their current work. */
  reload: () => void
}

const getBuildId = (value: unknown): string | undefined => {
  if (
    typeof value === "object" &&
    value !== null &&
    "buildId" in value &&
    typeof value.buildId === "string"
  ) {
    return value.buildId
  }
  return undefined
}

/**
 * Detects a replacement static SPA without taking control away from
 * the app. It never reloads by itself: a tab can contain unsaved
 * form state, so the app shows its own accessible update action and
 * calls `reload` only when the user is ready.
 *
 * `createStaticHandler` supplies both endpoints by default. Existing
 * app SSE can keep its one connection: set `isEventSourceEnabled` to
 * `false`, then call `checkForUpdate` in its post-reconnect callback.
 */
export const useDeploymentUpdate = ({
  deploymentEventsPath = DEFAULT_DEPLOYMENT_EVENTS_PATH,
  deploymentPath = DEFAULT_DEPLOYMENT_PATH,
  isEventSourceEnabled = true,
  pollIntervalMs = 0,
}: UseDeploymentUpdateOptions = {}): DeploymentUpdate => {
  const buildIdRef = useRef<string | undefined>(undefined)
  const [isUpdateAvailable, setIsUpdateAvailable] =
    useState(false)

  const acceptBuildId = useCallback(
    (buildId: string): boolean => {
      if (buildIdRef.current === undefined) {
        buildIdRef.current = buildId
        return false
      }
      if (buildIdRef.current === buildId) {
        return false
      }
      setIsUpdateAvailable(true)
      return true
    },
    [],
  )

  const checkForUpdate =
    useCallback(async (): Promise<boolean> => {
      const response = await globalThis.fetch(
        deploymentPath,
        {
          cache: "no-store",
          headers: { Accept: "application/json" },
        },
      )
      if (!response.ok) {
        return false
      }
      const buildId = getBuildId(await response.json())
      return buildId === undefined
        ? false
        : acceptBuildId(buildId)
    }, [acceptBuildId, deploymentPath])

  useEffect(() => {
    void checkForUpdate().catch(() => undefined)
  }, [checkForUpdate])

  useEffect(() => {
    if (
      !isEventSourceEnabled ||
      typeof EventSource === "undefined"
    ) {
      return
    }
    const source = new EventSource(deploymentEventsPath)
    const onDeployment = (event: MessageEvent<string>) => {
      try {
        const buildId = getBuildId(JSON.parse(event.data))
        if (buildId !== undefined) {
          acceptBuildId(buildId)
        }
      } catch {
        // A malformed marker is not a reason to interrupt the tab.
      }
    }
    source.addEventListener("deployment", onDeployment)
    return () => source.close()
  }, [
    acceptBuildId,
    deploymentEventsPath,
    isEventSourceEnabled,
  ])

  useEffect(() => {
    if (pollIntervalMs <= 0) {
      return
    }
    const interval = globalThis.setInterval(() => {
      void checkForUpdate().catch(() => undefined)
    }, pollIntervalMs)
    return () => globalThis.clearInterval(interval)
  }, [checkForUpdate, pollIntervalMs])

  return {
    checkForUpdate,
    isUpdateAvailable,
    reload: () => globalThis.location.reload(),
  }
}
