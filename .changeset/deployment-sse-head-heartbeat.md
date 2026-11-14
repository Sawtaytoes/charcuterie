---
"@charcuterie/server": patch
---

A HEAD request to the deployment SSE endpoint now gets the stream's headers and no body, and starts no heartbeat. Before, Hono ran the GET handler for HEAD and discarded the stream unread, so each HEAD request left a 15-second timer running for the life of the process. The heartbeat also stops if the stream closes without a cancel.
