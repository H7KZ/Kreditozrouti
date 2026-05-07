import vueI18n from '@intlify/unplugin-vue-i18n/vite'
import vueTailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import vueIcons from 'unplugin-icons/vite'
import vueRouter from 'unplugin-vue-router/vite'
import { defineConfig, loadEnv } from 'vite'
import prerender from 'vite-plugin-prerender'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config
export default ({ mode }: { mode: string }) => {
	process.env = { ...process.env, ...loadEnv(mode, process.cwd()) }

	return defineConfig({
		server: {
			port: parseInt(process.env.VITE_CLIENT_PORT ?? '45173'),
		},
		define: {
			APP_VERSION: JSON.stringify(process.env.npm_package_version),
		},
		plugins: [
			vueRouter(), // vueRouter must be before vue !!!
			vue(),
			vueDevTools(),
			vueTailwindcss(),
			vueI18n({
				include: [fileURLToPath(new URL('./src/locales/**', import.meta.url))],
			}),
			vueIcons({
				autoInstall: true,
			}),
			prerender({
				// Required - The path to the vite-outputted static site to prerender.
				staticDir: path.join(__dirname, 'dist'),
				// Required - Routes to render.
				routes: ['/', '/courses'],
			}),
		],
		resolve: {
			alias: {
				'@client': fileURLToPath(new URL('./src', import.meta.url)),
				'@api': fileURLToPath(new URL('../api/src', import.meta.url)),
				'@scraper': fileURLToPath(new URL('../scraper/src', import.meta.url)),
				'@shared': fileURLToPath(new URL('../shared', import.meta.url)),
			},
		},
	})
}
