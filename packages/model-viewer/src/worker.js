import { staticServer } from "./server.js"

const server = await staticServer(
  process.argv[2],
  Number(process.argv[3]),
)
process.send?.({ port: server.address().port })
process.on("disconnect", () => {
  server.closeAllConnections()
  server.close()
  process.exit(0)
})
