interface Config {
	mysqlUri: string
	port: number
	nodeEnv: string
	logLevel: string
	baseUrl: string
	jwtSecret: string
}

function required(name: string): string {
	const val = process.env[name]
	if (!val) throw new Error(`Missing required env var: ${name}`)
	return val
}

const config: Config = {
	mysqlUri: required('MYSQL_URI'),
	port: Number(process.env.MCP_PORT ?? 3000),
	nodeEnv: process.env.NODE_ENV ?? 'development',
	logLevel: process.env.LOG_LEVEL ?? 'info',
	baseUrl: process.env.MCP_BASE_URL ?? 'http://localhost:3000',
	jwtSecret: process.env.MCP_JWT_SECRET ?? ''
}

export default config
