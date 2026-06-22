import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['src/Tests/**/*.test.ts']
	},
	resolve: {
		alias: {
			'@scraper': path.resolve(__dirname, './src'),
			'@shared': path.resolve(__dirname, '../shared')
		}
	}
})
