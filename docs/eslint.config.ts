import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import { globalIgnores } from 'eslint/config'

export default defineConfigWithVueTs(
	{ name: 'docs/files-to-lint', files: ['**/*.{ts,mts,vue}'] },
	globalIgnores(['.vitepress/dist/**', '.vitepress/cache/**']),
	pluginVue.configs['flat/essential'],
	vueTsConfigs.recommended,
	skipFormatting,
	{ rules: { 'vue/multi-word-component-names': 'off' } }
) as unknown
