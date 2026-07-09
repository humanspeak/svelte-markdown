import { includeIgnoreFile } from '@eslint/compat'
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import svelte from 'eslint-plugin-svelte'
import globals from 'globals'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript-eslint'
import svelteConfig from './svelte.config.js'
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
            '**/dist'
        ]
    },
    js.configs.recommended,
    ...ts.configs.recommendedTypeChecked,
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
                projectService: true,
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
            ],

            '@typescript-eslint/await-thenable': ['error'],
            '@typescript-eslint/no-floating-promises': ['error'],
            '@typescript-eslint/no-misused-promises': ['error'],
            '@typescript-eslint/no-unnecessary-type-assertion': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/require-await': 'off'
        }
    },
    {
        files: ['**/*.{js,mjs,cjs}'],
        ...ts.configs.disableTypeChecked
    },
    {
        files: ['*.ts'],
        ...ts.configs.disableTypeChecked
    },
    {
        files: ['**/*.svelte', '**/*.svelte.ts'],
        languageOptions: {
            parserOptions: {
                extraFileExtensions: ['.svelte'],
                parser: ts.parser,
                svelteConfig
            }
        },
        rules: {
            'prefer-const': ['off'],
            'svelte/no-navigation-without-resolve': ['off'] // Allow external links
        }
    },
    {
        files: ['**/*.test.ts'],
        rules: {
            camelcase: 'off',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off'
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
