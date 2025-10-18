import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  // Ignore build outputs and dependencies
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '*.js.map',
      'web-ext-artifacts/**',
      // Browser-specific scripts are compiled separately by Vite
      'src/chrome/scripts/**',
      'src/firefox/scripts/**',
    ],
  },

  // Base JavaScript recommended rules
  js.configs.recommended,

  // TypeScript recommended rules
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Project-specific configuration
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.js', '*.mjs'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },

    rules: {
      // Align with project's strict TypeScript config
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Allow explicit any when needed (browser extension APIs sometimes require it)
      '@typescript-eslint/no-explicit-any': 'warn',

      // Allow non-null assertions for DOM elements we know exist
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Prefer const over let
      'prefer-const': 'error',

      // No console.log in production (except console.error/warn)
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],

      // Enforce consistent return
      'consistent-return': 'off', // TypeScript handles this

      // Browser extension specific
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: {
            attributes: false, // Allow promises in event handlers
          },
        },
      ],
    },
  },

  // Prettier integration (must be last)
  prettier
);
