// @ts-check

import eslint from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import importPlugin from 'eslint-plugin-import'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    // Global ignores
    {
        ignores: ['node_modules', 'dist', 'build', '.wrangler']
    },

    // Base recommended configurations
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,

    // Configuration for import plugin to resolve TypeScript paths
    {
        plugins: {
            import: importPlugin
        },
        settings: {
            'import/resolver': {
                typescript: true,
                node: true
            }
        },
        rules: {
            'import/no-unresolved': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-enum-comparison': 'off',
            '@typescript-eslint/no-redundant-type-constituents': 'off'
        }
    },

    // Main configuration for your TypeScript files
    {
        files: ['**/*.{js,mjs,cjs,ts,tsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            // This replaces the old `env` block
            globals: {
                ...globals.browser,
                ...globals.es2021
            },
            // This tells typescript-eslint where to find your tsconfig.json
            parserOptions: {
                project: true,
                tsconfigRootDir: import.meta.dirname
            }
        },
        // Your custom rule overrides
        rules: {
            // All the rules you turned off in your original config
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
            'no-useless-catch': 'off'
        }
    },

    // Prettier configuration must be last
    // This turns off any ESLint rules that might conflict with Prettier's formatting.
    prettierConfig
)
