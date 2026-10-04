import type { CSSProperties, ReactNode } from "react"
import { createElement } from "react"

import { TextLink } from "../TextLink/TextLink.tsx"
import { toClassName } from "../toClassName.ts"
import { HTML_CONTENT_CLASS } from "./htmlContentStyles.ts"
import type { HtmlContentNode } from "./safeHtml.ts"
import { toHtmlContent } from "./safeHtml.ts"

export type HtmlViewProps = {
  className?: string
  /** The readable document's accessible name. */
  label: string
  value: string
}

const toStyle = (
  value: string | undefined,
): CSSProperties =>
  Object.fromEntries(
    (value ?? "")
      .split(";")
      .filter(Boolean)
      .map((declaration) => {
        const [name, content] = declaration.split(":")
        return [
          name === "text-align" ? "textAlign" : name,
          content,
        ]
      }),
  )

const renderNode = (
  node: HtmlContentNode,
  key: number,
): ReactNode => {
  if ("text" in node) return node.text
  const { style, ...attributes } = node.attributes
  const children = node.children.map(renderNode)
  if (node.tag === "a" && attributes.href !== undefined)
    return (
      <TextLink
        href={attributes.href}
        key={key}
        style={toStyle(style)}
        title={attributes.title}
      >
        {children}
      </TextLink>
    )
  return createElement(
    node.tag,
    { ...attributes, key, style: toStyle(style) },
    children.length ? children : undefined,
  )
}

/** HTML is a distinct stored format. No editor and no innerHTML. */
export const HtmlView = ({
  className,
  label,
  value,
}: HtmlViewProps): ReactNode => (
  <div
    aria-label={label}
    className={toClassName(HTML_CONTENT_CLASS, className)}
    role="document"
  >
    {toHtmlContent(value).map(renderNode)}
  </div>
)
