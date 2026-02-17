import { includeIgnoreFile } from '@eslint/compat'
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import svelte from 'eslint-plugin-svelte'
import globals from 'globals'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript-eslint'
const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url))
const tsconfigRootDir = dirname(fileURLToPath(import.meta.url))

export default [
    includeIgnoreFile(gitignorePath),
    {
        ignores: [
            '**/.DS_Store',
            '**/node_modules',
            'postcss.config.cjs',
            'coverage',
            '**/build',
            '.svelte-kit',
            'package',
            '**/.env',
            '**/.env.*',
            '!**/.env.example',
            '**/pnpm-lock.yaml',
            '**/package-lock.json',
            '**/yarn.lock',
            '**/dist',
            '**/*.test.ts'
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
            'dot-location': ['warn', 'property'],
            'guard-for-in': ['warn'],
            camelcase: ['error'],
            'no-unneeded-ternary': ['warn'],
            'no-whitespace-before-property': ['warn'],
            'no-duplicate-imports': ['error'],
            'no-var': ['error'],
            'prefer-const': ['error'],
            semi: 'off',
            'object-curly-spacing': 'off',
            'space-in-parens': 'off',
            'arrow-spacing': 'off',
            'keyword-spacing': 'off',
            'block-spacing': 'off',
            'comma-style': 'off',
            'no-trailing-spaces': 'off',
            'no-multi-spaces': 'off',
            'space-before-blocks': 'off',
            yoda: 'off',
            'comma-dangle': 'off',
            '@typescript-eslint/no-unused-expressions': [
                'error',
                {
                    allowShortCircuit: true,
                    allowTernary: true,
                    allowTaggedTemplates: true
                }
            ],

            'no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    ignoreRestSiblings: true
                }
            ],

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
        files: ['**/*.svelte', '**/*.svelte.ts'],
        languageOptions: {
            parserOptions: {
                parser: ts.parser
            }
        },
        rules: {
            'prefer-const': ['off'],
            'svelte/no-navigation-without-resolve': ['off'] // Allow external links
        }
    },
    {
        /* location of your components where you would like to apply these rules  */
        files: ['**/shadcn/components/ui/**/*.svelte', '**/shadcn/components/ui/**/*.ts'],
        languageOptions: {
            parserOptions: {
                parser: ts.parser
            }
        },
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
