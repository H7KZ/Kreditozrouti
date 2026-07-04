import express from 'express'
import { rateLimit } from 'express-rate-limit'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createServer } from '@mcp/server.js'
import { logger } from '@mcp/Logger/logger.js'

const app = express()
app.use(express.json())

// General rate limit: 100 req/min
const generalLimiter = rateLimit({ windowMs: 60_000, max: 100, standardHeaders: true, legacyHeaders: false })

// Optimizer rate limit: 10 req/min (applied before general for optimizer calls)
const optimizerLimiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false })

app.post('/mcp', generalLimiter, async (req, res) => {
  // Apply optimizer limiter if this is an optimize call
  const toolName = (req.body as { params?: { name?: string } }).params?.name
  if (toolName === 'vse_optimize_timetable') {
    // Run optimizer limiter manually
    await new Promise<void>((resolve, reject) => {
      optimizerLimiter(req, res, (err?: unknown) => (err ? reject(err) : resolve()))
    })
    if (res.headersSent) return  // rate limit already responded
  }

  const server = createServer()
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined  // stateless — no session IDs
  })
  await server.connect(transport)
  await transport.handleRequest(req, res, req.body)
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

export { app }
