import { Badge, Button } from "@charcuterie/ui"

export type EmailImageNoticeProps = {
  /** How many remote images are parked. */
  remoteImageCount: number
  /** Load this message's images. The parent decides whether that also trusts the sender. */
  onLoadImages: () => void
}

/**
 * Why the pictures are missing, next to where they are missing from.
 *
 * Only warned mail ever shows this — ordinary mail loads its images with no
 * bar and no press (`shouldLoadRemoteImages`). Render it as a `shrink-0`
 * sibling ABOVE the `EmailViewer`, never inside it: the masthead is laid
 * over the frame and the frame reserves its measured height, so anything
 * else laid over the message would hide its first lines.
 */
export const EmailImageNotice = ({
  remoteImageCount,
  onLoadImages,
}: EmailImageNoticeProps) => (
  <div className="shrink-0 border-b border-border-subtle bg-surface-raised px-4 py-2">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <Badge appearance="soft" intent="warning">
        Images off
      </Badge>
      <span className="text-[0.8125rem]/[1.4] text-content-secondary">
        {remoteImageCount} image
        {remoteImageCount === 1 ? "" : "s"} parked — this
        message has link warnings.
      </span>
      <Button
        appearance="soft"
        intent="accent"
        size="sm"
        className="ms-auto"
        onClick={onLoadImages}
      >
        Load images
      </Button>
    </div>
  </div>
)
