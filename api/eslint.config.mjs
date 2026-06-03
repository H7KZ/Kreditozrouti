// @ts-check

import eslint from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import importPlugin from 'eslint-plugin-import'
import pluginPromise from 'eslint-plugin-promise'
import pluginRegexp from 'eslint-plugin-regexp'
import pluginUnicorn from 'eslint-plugin-unicorn'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
	{
		ignores: ['node_modules', 'dist', 'build', '.wrangler']
	},

	eslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	pluginRegexp.configs['flat/recommended'],
	pluginPromise.configs['flat/recommended'],

	{
		plugins: {
			import: importPlugin,
			unicorn: pluginUnicorn
		},
		settings: {
			'import/resolver': {
				typescript: true,
				node: true
			}
		},
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				...globals.node,
				...globals.es2021
			},
			parserOptions: {
				project: true,
				tsconfigRootDir: import.meta.dirname
			}
		},
		rules: {
			// typescript-eslint — turn off rules that don't fit this codebase
			'@typescript-eslint/naming-convention': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/restrict-template-expressions': 'off',
			'@typescript-eslint/restrict-plus-operands': 'off',
			'@typescript-eslint/strict-boolean-expressions': 'off',
			'@typescript-eslint/no-misused-promises': 'off',
			'@typescript-eslint/consistent-type-assertions': 'off',
			'@typescript-eslint/no-floating-promises': 'off',
			'@typescript-eslint/no-extraneous-class': 'off',
			'@typescript-eslint/no-confusing-void-expression': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-enum-comparison': 'off',
			'@typescript-eslint/no-redundant-type-constituents': 'off',
			'no-useless-catch': 'off',

			// import
			'import/no-unresolved': 'off',

			// promise
			'promise/always-return': 'off',
			'promise/catch-or-return': 'off',

			// unicorn — high-signal only
			'unicorn/filename-case': [
				'error',
				{ cases: { kebabCase: true, camelCase: true, pascalCase: true }, ignore: [/InSIS/u, /HTML/u, /HTTP/u, /SQL/u, /API/u, /_/u] }
			],
			'unicorn/no-array-for-each': 'error',
			'unicorn/no-useless-undefined': 'error',
			'unicorn/prefer-array-find': 'error',
			'unicorn/prefer-includes': 'error',
			'unicorn/prefer-string-slice': 'error',
			'unicorn/throw-new-error': 'error',
			'unicorn/prevent-abbreviations': 'off',
			'unicorn/no-null': 'off',
			'unicorn/no-array-reduce': 'off',
			'unicorn/prefer-ternary': 'off',
			'unicorn/prefer-module': 'off',
			'unicorn/no-negated-condition': 'off',
			'unicorn/prefer-top-level-await': 'off',
			'unicorn/consistent-function-scoping': 'off',
			'unicorn/no-anonymous-default-export': 'off',
			'unicorn/no-process-exit': 'off'
		}
	},

	// Must be last — disables rules that conflict with Prettier
	prettierConfig
)
