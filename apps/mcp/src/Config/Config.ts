import { randomBytes } from 'crypto'
import { parseAllowedRedirectHosts } from '@mcp/OAuth/RedirectUri'

interface Config {
	mysqlUri: string
	port: number
	nodeEnv: string
	logLevel: string
	baseUrl: string
	jwtSecret: string
	allowedRedirectHosts: string[]
}

function required(name: string): string {
	const val = process.env[name]
	if (!val) throw new Error(`Missing required env var: ${name}`)
	return val
}

const nodeEnv = process.env.NODE_ENV ?? 'development'

// MCP_JWT_SECRET is only mandatory in production (HTTP transport). In dev/stdio/test we fall
// back to an ephemeral per-process secret so boot never fails - tokens simply become invalid
// on restart, which is fine outside prod. stdio mode never touches OAuth at all.
function resolveJwtSecret(): string {
	const val = process.env.MCP_JWT_SECRET
	if (val) return val
	if (nodeEnv === 'production') throw new Error('Missing required env var: MCP_JWT_SECRET')
	return randomBytes(32).toString('hex')
}

const config: Config = {
	mysqlUri: required('MYSQL_URI'),
	port: Number(process.env.MCP_PORT ?? 3000),
	nodeEnv,
	logLevel: process.env.LOG_LEVEL ?? 'info',
	baseUrl: process.env.MCP_BASE_URL ?? 'http://localhost:3000',
	jwtSecret: resolveJwtSecret(),
	allowedRedirectHosts: parseAllowedRedirectHosts(process.env.MCP_ALLOWED_REDIRECT_HOSTS)
}

export default config
