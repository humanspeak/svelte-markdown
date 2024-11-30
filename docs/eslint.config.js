import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import globals from 'globals'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import parser from 'svelte-eslint-parser'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
})

export default [
    {
        ignores: [
            '**/.DS_Store',
            '**/node_modules',
            'postcss.config.cjs',
            '**/build',
            '.svelte-kit',
            'package',
            '**/.env',
            '**/.env.*',
            '!**/.env.example',
            '**/pnpm-lock.yaml',
            '**/package-lock.json',
            '**/yarn.lock',
            'src/routes/poc',
            '**/dist',
            'vite.config.ts.*'
        ]
    },
    ...compat.extends(
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:svelte/recommended',
        'prettier'
    ),
    {
        plugins: {
            '@typescript-eslint': typescriptEslint
        },

        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node
            },

            parser: tsParser,
            ecmaVersion: 2020,
            sourceType: 'module',
            parserOptions: {
                extraFileExtensions: ['.svelte']
            }
        },

        rules: {
            semi: ['warn', 'never'],
            quotes: ['error', 'single'],
            'dot-location': ['warn', 'property'],
            'guard-for-in': ['warn'],
            'no-multi-spaces': ['warn'],
            yoda: ['warn', 'never'],
            camelcase: ['error'],
            'comma-style': ['warn'],
            'comma-dangle': ['off', 'always-multiline'],
            'block-spacing': ['warn'],
            'keyword-spacing': ['warn'],
            'no-trailing-spaces': ['warn'],
            'no-unneeded-ternary': ['warn'],
            'no-whitespace-before-property': ['warn'],
            'object-curly-spacing': ['warn', 'always'],
            'space-before-blocks': ['warn'],
            'space-in-parens': ['warn'],
            'arrow-spacing': ['warn'],
            'no-duplicate-imports': ['error'],
            'no-var': ['error'],
            'prefer-const': ['error'],

            'no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    ignoreRestSiblings: true
                }
            ],
            '@typescript-eslint/no-unused-expressions': [
                'error',
                {
                    allowShortCircuit: true,
                    allowTernary: true,
                    allowTaggedTemplates: true
                }
            ]
        }
    },
    {
        files: ['**/*.svelte'],

        languageOptions: {
            parser: parser,
            ecmaVersion: 5,
            sourceType: 'script',

            parserOptions: {
                parser: '@typescript-eslint/parser'
            }
        }
    },
    {
        /* location of your components where you would like to apply these rules  */
        files: ['**/shadcn/components/ui/**/*.svelte', '**/shadcn/components/ui/**/*.ts'],
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^\\$\\$(Props|Events|Slots|Generic)$'
                }
            ],
            'prefer-const': ['off'],
            'no-unused-vars': ['off']
        }
    }
]
