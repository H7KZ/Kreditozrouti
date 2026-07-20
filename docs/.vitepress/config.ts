import { defineConfig } from 'vitepress'

export default defineConfig({
	title: 'Kreditožrouti docs',
	base: '/docs/',

	srcExclude: [
		// dev docs contain raw HTML/Vue snippets that break the VitePress parser
		'dev/**',
		// superpowers are gitignored planning docs, never built
		'superpowers/**'
	],

	themeConfig: {
		search: {
			provider: 'local'
		},
		socialLinks: [{ icon: 'github', link: 'https://github.com/H7KZ/Kreditozrouti' }],
		sidebar: {
			'/dev/': [
				{ text: '← App docs', link: 'https://kreditozrouti.cz/docs/en/getting-started' },
				{ text: 'Overview', link: '/dev/' },
				{
					text: 'Architecture',
					collapsed: false,
					items: [
						{ text: 'Overview', link: '/dev/architecture/' },
						{ text: 'Monorepo', link: '/dev/architecture/MONOREPO' },
						{ text: 'Services', link: '/dev/architecture/SERVICES' },
						{ text: 'Data Flow', link: '/dev/architecture/DATA_FLOW' },
						{ text: 'Containers', link: '/dev/architecture/CONTAINERS' }
					]
				},
				{ text: 'API', link: '/dev/api/' },
				{ text: 'Client', link: '/dev/client/' },
				{ text: 'Scraper', link: '/dev/scraper/' },
				{ text: 'MCP Server', link: '/dev/mcp/' },
				{ text: 'Deployment', link: '/dev/deployment/' },
				{ text: 'Engineering', link: '/dev/engineering/' },
				{ text: 'Shared types', link: '/dev/shared/' }
			]
		}
	}
})
