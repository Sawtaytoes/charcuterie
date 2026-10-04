export const HTML_DOCUMENT = `<p><strong>Workshop fixture</strong> &amp; setup notes.</p><p>Keep the <em>revision</em> and <u>material</u> together.</p><ul><li>Inspect the mounting holes.</li><li>Store the source file.</li></ul><ol start="3"><li>Build a fresh output.</li><li>Record the result.</li></ol><p style="text-align:center"><a href="https://example.invalid/recipe">Read the recipe</a></p><blockquote><p>Keep a traceable print recipe.</p></blockquote>`

export const ORIGINAL_HTML = `<DIV data-old-format='retained'><p class='legacy'>Original &amp; untouched</p></DIV>`

export const HOSTILE_HTML = `<p onclick="alert(1)">Visible notes</p><script>alert(1)</script><style>body{display:none}</style><iframe src="https://example.invalid/embed"></iframe><a href="java&#x73;cript:alert(1)">Unsafe link</a><img src="data:text/html,attack" onerror="alert(1)"><span style="color:currentcolor;background:url(https://example.invalid/tracker);position:fixed">Only safe text styling</span><svg><a href="javascript:alert(1)">Foreign content</a></svg>`

export const DOCUMENT_IMAGE = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80"><rect width="240" height="80" rx="8" fill="steelblue"/><circle cx="120" cy="40" r="24" fill="white"/></svg>')}`
