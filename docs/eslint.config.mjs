import { includeIgnoreFile } from '@eslint/compat'
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import svelte from 'eslint-plugin-svelte'
import globals from 'globals'
import { fileURLToPath } from 'node:url'
import ts from 'typescript-eslint'
const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url))

export default [
    includeIgnoreFile(gitignorePath),
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
            parserOptions: {
                parser: ts.parser
            }
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
