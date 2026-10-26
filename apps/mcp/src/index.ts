import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { app } from '@mcp/app'
import Config from '@mcp/Config/Config'
import { logger } from '@mcp/Logger/logger'
import { createServer } from '@mcp/server'

const isStdio = process.argv.includes('--stdio')

async function main() {
	if (isStdio) {
		const server = createServer()
		const transport = new StdioServerTransport()
		await server.connect(transport)
		// stdio — keep alive until stdin closes
		await new Promise<void>(resolve => process.stdin.on('close', resolve))
	} else {
		const server = app.listen(Config.port, () => {
			logger.info({ port: Config.port }, 'MCP server listening')
		})
		// Docker stops with SIGTERM: stop accepting, close open streams after 10 s, then exit.
		const shutdown = (): void => {
			logger.info('mcp.shutdown')
			setTimeout(() => server.closeAllConnections(), 10_000).unref()
			server.close(() => process.exit(0))
		}
		process.on('SIGTERM', shutdown)
		process.on('SIGINT', shutdown)
	}
}

main().catch(err => {
	logger.error(err, 'Fatal error')
	process.exit(1)
})
