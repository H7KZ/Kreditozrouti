/**
 * Enforce the cross-package import boundaries documented in AGENTS.md.
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
	forbidden: [
		{
			name: 'core-no-runtime-boundaries',
			comment: 'Core domain and services must not depend on API, queue, HTTP, or logger runtimes.',
			severity: 'error',
			from: { path: '^packages/core/src' },
			to: {
				path: [
					'^(apps/api|apps/scraper|apps/mcp)/',
					'@kreditozrouti/logger(/|$)',
					'^(node:)?(http|https|http2|net|tls|dgram)(/|$)',
					'(^|node_modules/)(express|bullmq|ioredis|axios|node-fetch|undici)(/|$)'
				]
			}
		},
		{
			name: 'web-no-server-runtime',
			comment: 'The browser app must not import API runtime, server-only core exports, or the node-only logger.',
			severity: 'error',
			from: { path: '^apps/web/src' },
			to: {
				path: [
					'^(apps/api|apps/scraper)/',
					'^@(?:api|scraper)(/|$)',
					'^@kreditozrouti/core/(?:db|services)(/|$)',
					'^@kreditozrouti/logger(/|$)'
				]
			}
		},
		{
			name: 'mcp-no-app-internals',
			comment: 'MCP shares public packages; it must not import internals from another deployable app.',
			severity: 'error',
			from: { path: '^apps/mcp/src' },
			to: {
				path: [
					'^(apps/(api|scraper|web))/',
					'^@(api|scraper|web)(/|$)'
				]
			}
		},
	],
	options: {
		tsPreCompilationDeps: true,
		exclude: { path: '(\\.test\\.(ts|tsx|js|jsx)$|/dist/|/node_modules/)' },
		enhancedResolveOptions: {
			exportsFields: ['exports'],
			conditionNames: ['import', 'require', 'node', 'default', 'types']
		}
	}
}
