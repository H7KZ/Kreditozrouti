import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createServer } from '@mcp/server'
import { Config } from '@mcp/Config/Config'
import { logger } from '@mcp/Logger/logger'
import { app } from '@mcp/app'

const isStdio = process.argv.includes('--stdio')

async function main() {
  if (isStdio) {
    const server = createServer()
    const transport = new StdioServerTransport()
    await server.connect(transport)
    // stdio — keep alive until stdin closes
    await new Promise<void>(resolve => process.stdin.on('close', resolve))
  } else {
    app.listen(Config.port, () => {
      logger.info({ port: Config.port }, 'MCP server listening')
    })
  }
}

main().catch(err => {
  logger.error(err, 'Fatal error')
  process.exit(1)
})
