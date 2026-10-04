import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { HtmlView } from "./HtmlView.tsx"

import {
  toHtmlContent,
  toSafeHtml,
  toSafeHtmlColour,
} from "./safeHtml.ts"

test("the reader renders safe HTML on the server without a DOM or editor runtime", () => {
  expect(typeof window).toBe("undefined")
  const html = renderToStaticMarkup(
    createElement(HtmlView, {
      label: "Server notes",
      value:
        '<p onclick="attack()">Stored &amp; safe</p><script>attack()</script><a href="javascript:attack()">Read</a>',
    }),
  )
  expect(html).toContain("Stored &amp; safe")
  expect(html).toContain('role="document"')
  expect(html).not.toMatch(
    /onclick|<script|href="javascript/,
  )
})

test("keeps readable formatting while removing executable HTML and arbitrary source props", () => {
  expect(
    toSafeHtml(
      '<div id="clobber" class="overlay"><p onclick="attack()"><strong>Keep</strong> &amp; read.</p><script>attack()</script><style>body{display:none}</style><iframe src="/embed">hidden</iframe><svg><text>hidden</text></svg><math><mtext>hidden</mtext></math></div>',
    ),
  ).toBe(
    "<div><p><strong>Keep</strong> &amp; read.</p></div>",
  )
})

test.each([
  "javascript:attack()",
  "java&#x73;cript:attack()",
  "JaVa&#x09;Script:attack()",
  "data:text/html,attack",
  "file:///private",
  "vbscript:attack()",
])(
  "decodes and rejects an unsafe link scheme: %s",
  (href) => {
    expect(
      toSafeHtml(
        `<a href="${href}" target="_blank" onclick="attack()">Read</a>`,
      ),
    ).toBe('<a rel="noopener noreferrer">Read</a>')
  },
)

test.each([
  "https://example.invalid/notes",
  "/notes",
  "./notes",
  "#section",
  "mailto:help@example.invalid",
  "tel:1234",
])("keeps a permitted link: %s", (href) => {
  expect(toSafeHtml(`<a href="${href}">Read</a>`)).toBe(
    `<a href="${href}" rel="noopener noreferrer">Read</a>`,
  )
})

test("image attributes are closed and rejected image sources disappear", () => {
  expect(
    toSafeHtml(
      '<img src="/photo.png" alt="A &amp; B" onerror="attack()" srcset="/tracker 2x" width="999999"><img src="javascript:attack()"><img src="data:text/html,attack"><img src="">',
    ),
  ).toBe('<img src="/photo.png" alt="A &amp; B">')
})

test("retains only document colour and alignment; CSS cannot load resources or escape the surface", () => {
  expect(
    toSafeHtml(
      '<p style="position:fixed;inset:0;background:url(/tracker);color:rgb(20, 30, 40);text-align:center;font-size:9999px">Notes</p>',
    ),
  ).toBe(
    '<p style="color:rgb(20, 30, 40);text-align:center">Notes</p>',
  )
  expect(
    toSafeHtml(
      '<span style="color:expression(attack());background-image:url(/tracker)">Notes</span>',
    ),
  ).toBe("<span>Notes</span>")
  expect(
    toSafeHtmlColour("red;position:fixed"),
  ).toBeUndefined()
  expect(toSafeHtmlColour("url(/tracker)")).toBeUndefined()
})

test("an HTML5 parse, rather than regex replacement, contains malformed foreign content", () => {
  const safe = toSafeHtml(
    '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=attack()>">',
  )
  expect(safe).not.toMatch(/onerror|<math|<style|<mglyph/)
  expect(toSafeHtml(safe)).toBe(safe)
})

test("text entities and repeated sanitization retain visible meaning without writing back to the input", () => {
  const original =
    "<P class='old'>5 &lt; 6 &amp; \"quoted\"</P>"
  const safe = toSafeHtml(original)
  expect(safe).toBe(
    "<p>5 &lt; 6 &amp; &quot;quoted&quot;</p>",
  )
  expect(toSafeHtml(safe)).toBe(safe)
  expect(toHtmlContent(original)).toEqual([
    {
      tag: "p",
      attributes: {},
      children: [{ text: '5 < 6 & "quoted"' }],
    },
  ])
  expect(original).toBe(
    "<P class='old'>5 &lt; 6 &amp; \"quoted\"</P>",
  )
})
