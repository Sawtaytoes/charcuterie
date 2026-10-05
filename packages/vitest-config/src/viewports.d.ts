export type ViewportName =
  | "narrow"
  | "tall"
  | "wide"
  | "ultrawide"

export type Viewport = {
  readonly deviceScaleFactor: number
  readonly height: number
  readonly isMobile: boolean
  readonly width: number
}

/** The four windows every browser test in the fleet runs in. */
export declare const viewports: Readonly<
  Record<ViewportName, Viewport>
>

/** Every viewport name, in list order. */
export declare const viewportNames: readonly ViewportName[]

declare module "vitest" {
  interface ProvidedContext {
    /**
     * Which of the four windows this browser instance runs in. Read it
     * with `inject("viewport")` from `vitest`.
     */
    viewport: ViewportName
  }
}
