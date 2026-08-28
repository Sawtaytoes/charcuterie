import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import type { MiddlewareHandler } from "hono"

/** The JSON resource a browser polls to identify the deployed SPA. */
export const DEFAULT_DEPLOYMENT_PATH =
  "/__charcuterie/deployment"

/** The SSE resource that publishes the deployed SPA when it connects. */
export const DEFAULT_DEPLOYMENT_EVENTS_PATH =
  "/__charcuterie/deployment/events"

export type DeploymentHandlerOptions = {
  /** The Vite output directory that contains the SPA shell. */
  rootDir: string
  /** The SPA shell, relative to `rootDir`. */
  index?: string
  /** Path for the no-cache JSON build marker. */
  deploymentPath?: string
  /** Path for the SSE build marker. */
  deploymentEventsPath?: string
}

export type DeploymentInfo = {
  /** SHA-256 of the deployed SPA shell. Opaque to consumers. */
  buildId: string
}

const SSE_HEADERS = {
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
  "Content-Type": "text/event-stream; charset=utf-8",
  // nginx otherwise buffers a quiet stream and hides the reconnect
  // that tells an open tab a container was replaced.
  "X-Accel-Buffering": "no",
}

/**
 * Creates the two deployment-marker resources for a static SPA.
 *
 * The marker hashes `index.html`, rather than a package version. A
 * Vite deploy changes that shell whenever it points at a new hashed
 * asset set. The value is therefore an opaque answer to one question:
 * "am I running the same static application as this server?"
 *
 * The SSE stream deliberately sends only on connection and as a
 * heartbeat. A container replacement closes the old stream; native
 * `EventSource` reconnects to the new container and receives its new
 * marker. No service worker owns application state or asset caching.
 */
export const createDeploymentHandler = ({
  deploymentEventsPath = DEFAULT_DEPLOYMENT_EVENTS_PATH,
  deploymentPath = DEFAULT_DEPLOYMENT_PATH,
  index = "index.html",
  rootDir,
}: DeploymentHandlerOptions): MiddlewareHandler => {
  let buildId: string | undefined
  try {
    buildId = createHash("sha256")
      .update(readFileSync(resolve(rootDir, index)))
      .digest("hex")
  } catch (error) {
    // A handler can be constructed before a Vite build has created
    // its output directory. Let static handling fall through in that
    // case, rather than making server construction fail.
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error
    }
  }

  const deploymentInfo = buildId
    ? ({ buildId } satisfies DeploymentInfo)
    : undefined
  const encodedEvent = new TextEncoder().encode(
    `event: deployment\ndata: ${JSON.stringify(deploymentInfo)}\n\n`,
  )
  const encodedHeartbeat = new TextEncoder().encode(
    ": keep-alive\n\n",
  )

  return async (context, next) => {
    if (!deploymentInfo) {
      return next()
    }

    if (context.req.path === deploymentPath) {
      return context.json(deploymentInfo, 200, {
        "Cache-Control": "no-cache",
      })
    }

    if (context.req.path !== deploymentEventsPath) {
      return next()
    }

    let heartbeat:
      | ReturnType<typeof setInterval>
      | undefined
    const stream = new ReadableStream<Uint8Array>({
      cancel: () => {
        if (heartbeat) {
          globalThis.clearInterval(heartbeat)
        }
      },
      start: (controller) => {
        controller.enqueue(encodedEvent)
        heartbeat = globalThis.setInterval(() => {
          controller.enqueue(encodedHeartbeat)
        }, 15_000)
      },
    })

    return context.body(stream, 200, SSE_HEADERS)
  }
}
