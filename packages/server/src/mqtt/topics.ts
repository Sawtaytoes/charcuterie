/**
 * House topic shape: `<base>/cmd/<action>` in, `<base>/resp/<action>`
 * out, `<base>/status` for liveness. Command and response are never
 * retained — a broker replay must not re-run a nightly.
 */

export function commandTopic(
  base: string,
  action: string,
): string {
  return `${base}/cmd/${action}`
}

export function responseTopic(
  base: string,
  action: string,
): string {
  return `${base}/resp/${action}`
}

export function statusTopic(base: string): string {
  return `${base}/status`
}

export function commandWildcard(base: string): string {
  return `${base}/cmd/+`
}

/**
 * Pull the `<action>` segment out of `<base>/cmd/<action>`.
 * Returns `undefined` when the topic is not a command under `base`
 * or the action is empty / multi-segment.
 */
export function actionFromCommandTopic({
  base,
  topic,
}: {
  base: string
  topic: string
}): string | undefined {
  const prefix = `${base}/cmd/`
  if (!topic.startsWith(prefix)) {
    return undefined
  }
  const action = topic.slice(prefix.length)
  if (action.length === 0 || action.includes("/")) {
    return undefined
  }
  return action
}
