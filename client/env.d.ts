/// <reference types="vite/client" />
/// <reference types="unplugin-vue-i18n/messages" />
/// <reference types="unplugin-icons/types/vue" />

declare const APP_VERSION: string

interface ImportMetaEnv {
	readonly VITE_UMAMI_WEBSITE_ID?: string
	readonly VITE_UMAMI_SRC?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
