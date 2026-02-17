import { includeIgnoreFile } from '@eslint/compat'
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import svelte from 'eslint-plugin-svelte'
import globals from 'globals'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript-eslint'

const gitignorePath = fileURLToPath(new URL('../.gitignore', import.meta.url))
const tsconfigRootDir = dirname(fileURLToPath(import.meta.url))

export default [
    includeIgnoreFile(gitignorePath),
    {
        ignores: [
            '**/.DS_Store',
            '**/node_modules',
            '.svelte-kit',
            '**/build',
            '**/.env',
            '**/.env.*',
            '!**/.env.example',
            '**/pnpm-lock.yaml'
        ]
    },
    js.configs.recommended,
    ...ts.configs.recommended,
    ...svelte.configs['flat/recommended'],
    prettier,
    ...svelte.configs['flat/prettier'],
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node
            },
            parserOptions: {
                tsconfigRootDir
            }
        },
        rules: {
            semi: ['warn', 'never'],
            quotes: ['error', 'single'],
            'no-var': ['error'],
            'prefer-const': ['error'],
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    ignoreRestSiblings: true
                }
            ]
        }
    },
    {
        files: ['**/*.svelte'],
        languageOptions: {
            parserOptions: {
                parser: ts.parser
            }
        }
    }
]
