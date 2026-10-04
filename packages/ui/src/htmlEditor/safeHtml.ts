import type { DefaultTreeAdapterMap } from "parse5"
import { parseFragment } from "parse5"

import {
  toSafeImageUrl,
  toSafeLinkUrl,
} from "../safeUrls.ts"

export type HtmlContentNode =
  | { text: string }
  | {
      attributes: Record<string, string>
      children: HtmlContentNode[]
      tag: string
    }

// One format policy for rendering, initial editor content, paste,
// and serialized edits. Parsing HTML5 before filtering also decodes
// character references in URLs; an encoded scheme cannot evade the
// shared URL guard. Nothing from the source becomes a React prop.
const TAGS = new Set([
  "p",
  "div",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "span",
  "a",
  "img",
  "ul",
  "ol",
  "li",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "pre",
  "code",
  "hr",
])
const DROP_CONTENT = new Set([
  "script",
  "style",
  "template",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
  "noscript",
])
const VOID_TAGS = new Set(["br", "hr", "img"])

export const toSafeHtmlColour = (
  value: string,
): string | undefined => {
  const colour = value.trim().toLowerCase()
  return /^(#[\da-f]{3}|#[\da-f]{4}|#[\da-f]{6}|#[\da-f]{8}|[a-z]+|(?:rgb|rgba|hsl|hsla)\([\d.,%\s+-]+\))$/.test(
    colour,
  )
    ? colour
    : undefined
}

const toSafeStyle = (value: string): string =>
  value
    .split(";")
    .flatMap((declaration) => {
      const [rawName, ...parts] = declaration.split(":")
      const name = rawName?.trim().toLowerCase()
      const content = parts.join(":").trim().toLowerCase()

      if (
        name === "text-align" &&
        /^(start|end|left|right|center|justify)$/.test(
          content,
        )
      ) {
        return [`text-align:${content}`]
      }
      if (
        name === "color" &&
        toSafeHtmlColour(content) !== undefined
      ) {
        return [`color:${content}`]
      }
      return []
    })
    .join(";")

const toSafeAttributes = (
  tag: string,
  attributes: DefaultTreeAdapterMap["element"]["attrs"],
): Record<string, string> => {
  const source = Object.fromEntries(
    attributes
      .filter((attribute) => !attribute.namespace)
      .map(({ name, value }) => [name, value]),
  )
  const result: Record<string, string> = {}
  const style = toSafeStyle(source.style ?? "")
  if (style !== "") result.style = style

  if (tag === "a") {
    const href = toSafeLinkUrl(source.href ?? "")
    if (source.href !== undefined && href !== undefined)
      result.href = href
    if (source.title) result.title = source.title
    // Source target/rel attributes never reach the page.
    result.rel = "noopener noreferrer"
  }
  if (tag === "img") {
    const src = toSafeImageUrl(source.src ?? "")
    if (src) result.src = src
    result.alt = source.alt ?? ""
    if (source.title) result.title = source.title
  }
  if (tag === "ol" && /^\d{1,6}$/.test(source.start ?? ""))
    result.start = source.start ?? "1"
  return result
}

const toSafeNodes = (
  nodes: DefaultTreeAdapterMap["childNode"][],
): HtmlContentNode[] =>
  nodes.flatMap((node): HtmlContentNode[] => {
    if (node.nodeName === "#text" && "value" in node)
      return [{ text: node.value }]
    if (!("tagName" in node)) return []
    if (
      DROP_CONTENT.has(node.tagName) ||
      node.namespaceURI !== "http://www.w3.org/1999/xhtml"
    )
      return []
    const children = toSafeNodes(node.childNodes)
    if (!TAGS.has(node.tagName)) return children
    const attributes = toSafeAttributes(
      node.tagName,
      node.attrs,
    )
    // A rejected image is absent, rather than a broken image or an
    // empty src that makes another request for the document itself.
    if (node.tagName === "img" && !attributes.src) return []
    return [{ attributes, children, tag: node.tagName }]
  })

export const toHtmlContent = (
  value: string,
): HtmlContentNode[] =>
  toSafeNodes(parseFragment(value).childNodes)

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
      })[character] ?? character,
  )

const serialize = (node: HtmlContentNode): string => {
  if ("text" in node) return escapeHtml(node.text)
  const attributes = Object.entries(node.attributes)
    .map(
      ([name, value]) => ` ${name}="${escapeHtml(value)}"`,
    )
    .join("")
  const start = `<${node.tag}${attributes}>`
  return VOID_TAGS.has(node.tag)
    ? start
    : `${start}${node.children.map(serialize).join("")}</${node.tag}>`
}

/** A display/edit projection, never an instruction to rewrite stored HTML. */
export const toSafeHtml = (value: string): string =>
  toHtmlContent(value).map(serialize).join("")
