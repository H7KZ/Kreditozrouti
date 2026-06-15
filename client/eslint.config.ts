import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginPromise from 'eslint-plugin-promise'
import pluginRegexp from 'eslint-plugin-regexp'
import pluginUnicorn from 'eslint-plugin-unicorn'
import pluginVue from 'eslint-plugin-vue'
import pluginVueScopedCss from 'eslint-plugin-vue-scoped-css'
import { globalIgnores } from 'eslint/config'

export default defineConfigWithVueTs(
	{
		name: 'app/files-to-lint',
		files: ['**/*.{ts,mts,tsx,vue}'],
	},

	globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

	pluginVue.configs['flat/essential'],
	vueTsConfigs.recommended,
	pluginVueScopedCss.configs['flat/recommended'],
	pluginRegexp.configs['flat/recommended'],
	pluginPromise.configs['flat/recommended'],
	skipFormatting,

	{
		plugins: { unicorn: pluginUnicorn },
		rules: {
			'vue/multi-word-component-names': 'off',

			// Unicorn — keep only high-signal rules, disable opinionated style ones
			'unicorn/filename-case': ['error', { cases: { kebabCase: true, camelCase: true, pascalCase: true } }],

			'unicorn/no-useless-undefined': 'error',
			'unicorn/prefer-array-find': 'error',
			'unicorn/prefer-includes': 'error',
			'unicorn/prefer-string-slice': 'error',
			'unicorn/throw-new-error': 'error',
			// Disable unicorn rules that conflict with the project style
			'unicorn/prevent-abbreviations': 'off',
			'unicorn/no-null': 'off',
			'unicorn/no-array-reduce': 'off',
			'unicorn/prefer-ternary': 'off',
			'unicorn/prefer-module': 'off',
			'unicorn/no-negated-condition': 'off',
			'unicorn/prefer-top-level-await': 'off',
			'unicorn/consistent-function-scoping': 'off',
			'unicorn/no-anonymous-default-export': 'off',

			// Promise hygiene
			'promise/always-return': 'off',
			'promise/catch-or-return': 'off',
		},
	},

	{
		settings: {
			'import/core-modules': ['vue-router/auto-routes'],
		},
	},
) as unknown
