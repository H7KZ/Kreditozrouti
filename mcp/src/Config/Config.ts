function required(name: string): string {
	const val = process.env[name]
	if (!val) throw new Error(`Missing required env var: ${name}`)
	return val
}

export const Config = {
	mysqlUri: required('MYSQL_URI'),
	port: Number(process.env['MCP_PORT'] ?? 3000),
	nodeEnv: process.env['NODE_ENV'] ?? 'development',
	logLevel: process.env['LOG_LEVEL'] ?? 'info'
} as const
