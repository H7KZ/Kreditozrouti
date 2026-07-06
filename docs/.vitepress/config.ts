import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Kreditožrouti',
  base: '/docs/',

  srcExclude: [
    // Existing developer markdown files — not yet wired into VitePress
    'API.md',
    'ARCHITECTURE.md',
    'CLIENT.md',
    'DEPLOYMENT.md',
    'DOMAIN.md',
    'ENGINEERING.md',
    'MARKETING.md',
    'PROJECT_CONTEXT.md',
    'SCRAPER.md',
    'SCRIPTS.md',
    'SHARED.md',
    'api/**',
    'architecture/**',
    'client/**',
    'deployment/**',
    'engineering/**',
    'mcp/**',
    'scraper/**',
    'scripts/**',
    'shared/**',
    'superpowers/**',
    'user/**',
  ],

  locales: {
    cs: {
      label: 'Čeština',
      lang: 'cs-CZ',
      link: '/cs/',
      title: 'Kreditožrouti – Nápověda',
      description: 'Průvodce a dokumentace pro studenty VŠE Praha.',
      themeConfig: {
        nav: [
          { text: 'Začít', link: '/cs/getting-started' },
          {
            text: 'Funkce',
            items: [
              { text: 'Filtry', link: '/cs/features/filters' },
              { text: 'Rozvrh', link: '/cs/features/timetable' },
              { text: 'Optimalizátor', link: '/cs/features/optimizer' },
              { text: 'Tipy a triky', link: '/cs/features/tips-and-tricks' },
            ],
          },
          { text: 'MCP', link: '/cs/mcp' },
          { text: 'FAQ', link: '/cs/faq' },
          { text: '← Spustit aplikaci', link: 'https://kreditozrouti.cz' },
        ],
        sidebar: {
          '/cs/': [
            { text: 'Začínáme', link: '/cs/getting-started' },
            {
              text: 'Funkce',
              collapsed: false,
              items: [
                { text: 'Filtry', link: '/cs/features/filters' },
                { text: 'Rozvrh', link: '/cs/features/timetable' },
                { text: 'Optimalizátor', link: '/cs/features/optimizer' },
                { text: 'Tipy a triky', link: '/cs/features/tips-and-tricks' },
              ],
            },
            { text: 'MCP integrace', link: '/cs/mcp' },
            { text: 'FAQ', link: '/cs/faq' },
            {
              text: 'Právní informace',
              collapsed: true,
              items: [
                { text: 'Ochrana soukromí', link: '/cs/legal/privacy' },
                { text: 'Podmínky použití', link: '/cs/legal/terms' },
              ],
            },
          ],
        },
      },
    },

    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: 'Kreditožrouti – Help',
      description: 'User guide and documentation for VŠE Prague students.',
      themeConfig: {
        nav: [
          { text: 'Getting Started', link: '/en/getting-started' },
          {
            text: 'Features',
            items: [
              { text: 'Filters', link: '/en/features/filters' },
              { text: 'Timetable', link: '/en/features/timetable' },
              { text: 'Optimizer', link: '/en/features/optimizer' },
              { text: 'Tips & Tricks', link: '/en/features/tips-and-tricks' },
            ],
          },
          { text: 'MCP', link: '/en/mcp' },
          { text: 'FAQ', link: '/en/faq' },
          { text: '← Open app', link: 'https://kreditozrouti.cz' },
        ],
        sidebar: {
          '/en/': [
            { text: 'Getting Started', link: '/en/getting-started' },
            {
              text: 'Features',
              collapsed: false,
              items: [
                { text: 'Filters', link: '/en/features/filters' },
                { text: 'Timetable', link: '/en/features/timetable' },
                { text: 'Optimizer', link: '/en/features/optimizer' },
                { text: 'Tips & Tricks', link: '/en/features/tips-and-tricks' },
              ],
            },
            { text: 'MCP Integration', link: '/en/mcp' },
            { text: 'FAQ', link: '/en/faq' },
            {
              text: 'Legal',
              collapsed: true,
              items: [
                { text: 'Privacy Policy', link: '/en/legal/privacy' },
                { text: 'Terms of Use', link: '/en/legal/terms' },
              ],
            },
          ],
          // Dev docs are English-only by design — engineers reading source docs don't need Czech
          '/dev/': [
            { text: '← User docs', link: '/en/' },
            { text: 'Overview', link: '/dev/' },
            {
              text: 'Architecture',
              collapsed: false,
              items: [
                { text: 'Overview', link: '/dev/architecture/' },
                { text: 'Monorepo', link: '/dev/architecture/MONOREPO' },
                { text: 'Services', link: '/dev/architecture/SERVICES' },
                { text: 'Data Flow', link: '/dev/architecture/DATA_FLOW' },
                { text: 'Containers', link: '/dev/architecture/CONTAINERS' },
              ],
            },
            { text: 'API', link: '/dev/api/' },
            { text: 'Client', link: '/dev/client/' },
            { text: 'Scraper', link: '/dev/scraper/' },
            { text: 'MCP Server', link: '/dev/mcp/' },
            { text: 'Deployment', link: '/dev/deployment/' },
            { text: 'Engineering', link: '/dev/engineering/' },
            { text: 'Shared types', link: '/dev/shared/' },
          ],
        },
      },
    },
  },

  themeConfig: {
    search: {
      provider: 'local',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/H7KZ/Kreditozrouti' },
    ],
  },
})
