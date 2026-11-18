import {
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { scaleToFit } from "./srcDoc.ts"
import type { EmailDocument } from "./types.ts"
import { useElementWidth } from "./useElementWidth.ts"
import {
  buildViewerSrcDoc,
  type EmailBodyView,
  type EmailViewerThread,
  effectiveEmailView,
  isConversationFrame,
  viewerFrameSandbox,
} from "./viewerDocument.ts"

/** What a parent can ask of the viewer. */
export type EmailViewerHandle = {
  /** Scroll the conversation to one turn, by its index. */
  scrollToTurn: (index: number) => void
}

export type EmailViewerProps = {
  /**
   * The message, or `null` while it loads or when it failed. Its IDENTITY
   * is part of the scroll memory: a rebuilt document for the same object
   * keeps the reader's place, and a different object starts at its top.
   */
  message: EmailDocument | null
  /**
   * The conversation around the message, or `null` to show it alone. Pass
   * a memoized value: like `message`, its identity is part of the scroll
   * memory.
   */
  thread?: EmailViewerThread | null
  /** Which part was asked for. Defaults to HTML. */
  view?: EmailBodyView
  /**
   * Whether this message's remote images load. The viewer never decides
   * this; `shouldLoadRemoteImages` is the policy, and the parent owns the
   * decision and any "Load images" press.
   */
  hasLoadedImages: boolean
  isDarkened?: boolean
  /** Shrink a message that declares a width the frame cannot give it. */
  isScaledToFit?: boolean
  /**
   * The app's page colour, for the canvas around a message that paints
   * itself, and for the cover shown until the frame paints.
   */
  pageBackground?: string
  /** The app's body face as a `data:font/woff2;base64,` URL, or nothing. */
  fontDataUrl?: string
  /** The frame's accessible name. */
  title: string
  /**
   * App chrome laid over the top of the message — a subject and a sender
   * row. It stays in the app's document, out of reach of email CSS; the
   * frame reserves its measured height and slides it away as the message
   * scrolls, so the two move as one surface.
   */
  masthead?: ReactNode
  /**
   * Shown under the masthead when there is no document: loading, an error,
   * or a message with no readable body.
   */
  placeholder?: ReactNode
  /** Told the width the frame has, as it changes. */
  onFrameWidthChange?: (width: number) => void
  /** Told which conversation turn crosses the reading line. */
  onActiveTurnChange?: (index: number) => void
  ref?: Ref<EmailViewerHandle>
}

/**
 * One email, rendered the way Mail Sifter renders it: a sandboxed frame
 * with no `allow-same-origin` and a `default-src 'none'` policy, inside a
 * box that takes every pixel its container gives it.
 *
 * It fits its CONTAINER, not the window. The frame measures its own width
 * (a docked drawer or a focus panel takes width without the window
 * resizing), and scale-to-fit, the masthead reserve, and the single-column
 * measure inside the document all follow that width.
 *
 * It owns no data and makes no request. The parent fetches the message,
 * decides whether images load, and owns every control around it.
 */
export const EmailViewer = ({
  message,
  thread = null,
  view = "html",
  hasLoadedImages,
  isDarkened = false,
  isScaledToFit = false,
  pageBackground,
  fontDataUrl,
  title,
  masthead,
  placeholder,
  onFrameWidthChange,
  onActiveTurnChange,
  ref,
}: EmailViewerProps) => {
  /**
   * Has the frame painted what it was given? An `srcDoc` of 70kB with a
   * dozen remote images does not appear in the frame it is assigned; the
   * frame's own `load` is what ends the gap.
   */
  const [isFramePainted, setIsFramePainted] =
    useState(false)
  const messageFrame = useRef<HTMLIFrameElement>(null)

  /**
   * Where the reader was — the fraction of the document above the view —
   * and the fraction a rebuilt document still owes them. The document is
   * rebuilt whenever its width or the masthead's height changes, because
   * both are baked into it. A fraction rather than pixels, because a new
   * width can rescale a fixed-width message and re-wrap a fluid one.
   */
  const lastScrollRatio = useRef(0)
  /**
   * Which letters of a conversation are expanded, by turn index. A rebuilt
   * transcript renders every `<details>` in its default state, so the
   * fraction alone cannot put the reader back. `null` until the frame has
   * said.
   */
  const lastOpenTurns = useRef<number[] | null>(null)
  const pendingRestore = useRef<{
    open: number[] | null
    ratio: number
  } | null>(null)
  const shownContent = useRef<readonly unknown[] | null>(
    null,
  )
  const identityHeader = useRef<HTMLElement | null>(null)
  const headerObserver = useRef<ResizeObserver | null>(null)
  const [identityHeaderHeight, setIdentityHeaderHeight] =
    useState(0)

  /*
   * Measure the masthead with a CALLBACK ref, not an effect over a
   * `useRef`: inside a modal the panel renders through a portal whose node
   * an effect creates, so a mount-only effect can run before the header
   * exists and never run again — and a zero reserve puts the top of every
   * message underneath the masthead.
   *
   * The LAYOUT height, never `getBoundingClientRect()`: an entering modal
   * scales its panel, and a bounding rect measured during the scale reads
   * short while a scale change never fires the observer again.
   * `borderBoxSize` and `offsetHeight` both ignore transforms.
   */
  const measureIdentityHeader = useCallback(
    (header: HTMLElement | null) => {
      headerObserver.current?.disconnect()
      headerObserver.current = null
      identityHeader.current = header
      if (!header) return
      const measure = (height: number) => {
        const next = Math.ceil(height)
        setIdentityHeaderHeight((current) =>
          current === next ? current : next,
        )
      }
      // `offsetHeight` is whole pixels, so this first guess can be up to half
      // a pixel short. The observer's first callback, before the next paint,
      // replaces it with the exact border box.
      measure(header.offsetHeight)
      if (typeof ResizeObserver === "undefined") return
      headerObserver.current = new ResizeObserver(
        ([entry]) => {
          measure(
            entry?.borderBoxSize?.[0]?.blockSize ??
              header.offsetHeight,
          )
        },
      )
      headerObserver.current.observe(header)
    },
    [],
  )

  useEffect(
    () => () => headerObserver.current?.disconnect(),
    [],
  )

  // A new message puts the masthead back where it starts.
  // biome-ignore lint/correctness/useExhaustiveDependencies: message is the trigger
  useEffect(() => {
    if (identityHeader.current) {
      identityHeader.current.style.transform =
        "translateY(0)"
    }
  }, [message])

  const [measureFrame, frameWidth] =
    useElementWidth<HTMLDivElement>()

  useEffect(() => {
    onFrameWidthChange?.(frameWidth)
  }, [frameWidth, onFrameWidthChange])

  const effectiveView = effectiveEmailView(message, view)
  const isConversation = isConversationFrame(
    message,
    thread,
    view,
  )
  const turnCount = thread?.messages.length ?? 0

  /*
   * The frame talks back through `postMessage`, from an opaque origin, so
   * every message is checked for its source window and its shape before it
   * is believed.
   */
  useEffect(() => {
    const receiveFrameMessage = (event: MessageEvent) => {
      if (
        event.source !== messageFrame.current?.contentWindow
      )
        return
      const data = event.data as {
        type?: unknown
        index?: unknown
        open?: unknown
        ratio?: unknown
        top?: unknown
      } | null
      if (
        data?.type === "mail-sifter-frame-scroll" &&
        typeof data.top === "number" &&
        Number.isFinite(data.top) &&
        data.top >= 0
      ) {
        // While a rebuilt document still owes a restore, its reports are
        // the top of a fresh load, not where the reader was.
        if (pendingRestore.current === null) {
          if (
            typeof data.ratio === "number" &&
            data.ratio >= 0 &&
            data.ratio <= 1
          ) {
            lastScrollRatio.current = data.ratio
          }
          if (
            Array.isArray(data.open) &&
            data.open.every(
              (index) =>
                Number.isInteger(index) && index >= 0,
            )
          ) {
            lastOpenTurns.current = data.open as number[]
          }
        }
        const headerHeight = Math.ceil(
          identityHeader.current?.getBoundingClientRect()
            .height ?? 0,
        )
        const offset = Math.min(data.top, headerHeight)
        if (identityHeader.current) {
          identityHeader.current.style.transform = `translateY(-${offset}px)`
        }
        return
      }
      if (
        !isConversation ||
        !data ||
        data.type !== "mail-sifter-thread-active" ||
        !Number.isInteger(data.index) ||
        (data.index as number) < 0 ||
        (data.index as number) >= turnCount
      ) {
        return
      }
      onActiveTurnChange?.(data.index as number)
    }
    window.addEventListener("message", receiveFrameMessage)
    return () =>
      window.removeEventListener(
        "message",
        receiveFrameMessage,
      )
  }, [isConversation, turnCount, onActiveTurnChange])

  useImperativeHandle(
    ref,
    () => ({
      scrollToTurn: (index: number) => {
        messageFrame.current?.contentWindow?.postMessage(
          { type: "mail-sifter-thread-scroll", index },
          "*",
        )
      },
    }),
    [],
  )

  const srcDoc = useMemo(
    () =>
      buildViewerSrcDoc({
        message,
        thread,
        view,
        hasLoadedImages,
        isDarkened,
        isScaledToFit,
        frameWidth,
        fontDataUrl,
        pageBackground,
        readerHeaderInset: identityHeaderHeight,
      }),
    [
      message,
      thread,
      view,
      hasLoadedImages,
      isDarkened,
      isScaledToFit,
      frameWidth,
      fontDataUrl,
      pageBackground,
      identityHeaderHeight,
    ],
  )

  /*
   * A new document means a new paint. An effect rather than a key on the
   * iframe: remounting the frame would throw away the scroll position every
   * time the reader switched Dark or Plain text.
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: srcDoc is the trigger
  useEffect(() => {
    setIsFramePainted(false)
  }, [srcDoc])

  /*
   * Decide whether the new document owes the reader their place. Only when
   * it shows the same content — the same message, conversation and part —
   * so the rebuild came from width, masthead height, colour or images. A
   * layout effect, so the decision is taken before the new document can
   * report its own top-of-load position. A second rebuild before the first
   * loads keeps the first one's debt.
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: srcDoc is the trigger; the content is compared, not watched
  useLayoutEffect(() => {
    const content = [
      message,
      thread,
      effectiveView,
      isConversation,
    ]
    const previous = shownContent.current
    shownContent.current = content
    const isSameContent =
      previous?.every(
        (value, index) => value === content[index],
      ) ?? false
    if (!isSameContent) {
      pendingRestore.current = null
      lastScrollRatio.current = 0
      lastOpenTurns.current = null
      return
    }
    if (
      pendingRestore.current === null &&
      (lastScrollRatio.current > 0 ||
        lastOpenTurns.current !== null)
    ) {
      pendingRestore.current = {
        open: lastOpenTurns.current,
        ratio: lastScrollRatio.current,
      }
    }
  }, [srcDoc])

  const onFrameLoad = () => {
    setIsFramePainted(true)
    const restore = pendingRestore.current
    if (restore === null) return
    pendingRestore.current = null
    lastScrollRatio.current = restore.ratio
    lastOpenTurns.current = restore.open
    messageFrame.current?.contentWindow?.postMessage(
      {
        type: "mail-sifter-frame-restore",
        ratio: restore.ratio,
        ...(restore.open ? { open: restore.open } : {}),
      },
      "*",
    )
  }

  return (
    <div
      ref={measureFrame}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      {masthead === undefined ? null : (
        <header
          ref={measureIdentityHeader}
          // Named so a test can say which header it means; the spacer inside
          // the frame carries `data-ms-reader-header-spacer` for the same
          // reason.
          data-ms-reader-masthead
          className={`border-b border-border-subtle bg-surface-raised ${
            srcDoc
              ? "absolute inset-x-0 top-0 z-10 will-change-transform"
              : "shrink-0"
          }`}
        >
          {masthead}
        </header>
      )}

      {srcDoc ? null : placeholder}

      {srcDoc ? (
        /*
         * Full bleed: every pixel the container has, no card. A newsletter
         * is 600px wide because its sender said so, and a reply wraps to
         * whatever it is given; a box here would only add a scrollbar.
         */
        <iframe
          sandbox={viewerFrameSandbox(isConversation)}
          ref={messageFrame}
          onLoad={onFrameLoad}
          referrerPolicy="no-referrer"
          title={title}
          srcDoc={srcDoc}
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : null}

      {/*
       * The gap between "the message arrived" and "the message is on
       * screen". Over the frame rather than instead of it, so nothing
       * remounts when it goes, in the colour the message is about to be.
       */}
      {srcDoc && !isFramePainted ? (
        <div
          className="absolute inset-0 flex items-center justify-center gap-4"
          style={{ background: pageBackground }}
        >
          <div
            aria-hidden
            className="h-1 w-56 overflow-hidden rounded-full bg-surface-raised"
          >
            <div className="charcuterie-email-indeterminate h-full w-1/3 rounded-full bg-intent-accent-solid" />
          </div>
          <span className="sr-only" role="status">
            Rendering the message
          </span>
        </div>
      ) : null}
    </div>
  )
}

/**
 * The message declares a width the frame cannot give it. Drives a "Fit to
 * width" control; the document decides the scale itself, from the same two
 * numbers.
 */
export const isEmailOverflowing = (
  message: Pick<EmailDocument, "fixedLayoutWidth"> | null,
  frameWidth: number,
): boolean =>
  scaleToFit({
    fixedLayoutWidth: message?.fixedLayoutWidth ?? 0,
    frameWidth,
  }) < 1
