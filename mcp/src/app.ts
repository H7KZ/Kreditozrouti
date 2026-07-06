import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import { createServer } from '@mcp/server'

const app = express()
app.use(express.json())

// Stricter limit for the CPU-intensive optimizer tool
const optimizerLimiter = rateLimit({
	windowMs: 60_000,
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	skip: (req) => (req.body as { params?: { name?: string } } | undefined)?.params?.name !== 'vse_optimize_timetable',
})

// General rate limit: 100 req/min
const generalLimiter = rateLimit({ windowMs: 60_000, max: 100, standardHeaders: true, legacyHeaders: false })

app.post('/mcp', optimizerLimiter, generalLimiter, async (req, res) => {
	const server = createServer()
	const transport = new StreamableHTTPServerTransport({
		sessionIdGenerator: undefined, // stateless — no session IDs
	})
	await server.connect(transport)
	await transport.handleRequest(req, res, req.body)
})

app.get('/health', (_req, res) => {
	res.json({ status: 'ok' })
})

export { app }
