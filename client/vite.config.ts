import vueI18n from '@intlify/unplugin-vue-i18n/vite'
import vueTailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import vueIcons from 'unplugin-icons/vite'
import vueRouter from 'unplugin-vue-router/vite'
import { defineConfig, loadEnv } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config
export default ({ mode }: { mode: string }) => {
	process.env = { ...process.env, ...loadEnv(mode, process.cwd()) }

	return defineConfig({
		server: {
			port: parseInt(process.env.VITE_CLIENT_PORT ?? '45173'),
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
