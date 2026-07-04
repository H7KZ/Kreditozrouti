import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'kreditozrouti-mcp',
    version: '1.0.0'
  })
  // Tools registered by registerTools() — called after construction
  return server
}
