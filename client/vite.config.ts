import vueI18n from '@intlify/unplugin-vue-i18n/vite'
import vueTailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { FileSystemIconLoader } from 'unplugin-icons/loaders'
import vueIcons from 'unplugin-icons/vite'
import vueRouter from 'unplugin-vue-router/vite'
import { defineConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		vueRouter(), // vueRouter must be before vue !!!
		vue(),
		vueDevTools(),
		vueTailwindcss(),
		vueI18n({
			include: [fileURLToPath(new URL('./src/locales/**', import.meta.url))],
		}),
		vueIcons({
			customCollections: {
				'kz-icons': FileSystemIconLoader('./src/assets/icons'),
			},
		}),
	],
	resolve: {
		alias: {
			'@client': fileURLToPath(new URL('./src', import.meta.url)),
			'@api': fileURLToPath(new URL('../api/src', import.meta.url)),
			'@scraper': fileURLToPath(new URL('../scraper/src', import.meta.url)),
		},
	},
})
