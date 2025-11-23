import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: [
      'src/**/*.ts',
      'scripts/**/*.ts',
      'test/**/*.ts',
      '**/*.test.ts',
      '**/*.spec.ts',
    ],
  })),
  ...tseslint.configs.stylisticTypeChecked.map((config) => ({
    ...config,
    files: [
      'src/**/*.ts',
      'scripts/**/*.ts',
      'test/**/*.ts',
      '**/*.test.ts',
      '**/*.spec.ts',
    ],
  })),
  {
    files: [
      'src/**/*.ts',
      'scripts/**/*.ts',
      'test/**/*.ts',
      '**/*.test.ts',
      '**/*.spec.ts',
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-deprecated': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['*.config.ts', '*.config.js', 'eslint.config.js'],
  })),
  {
    files: ['*.config.ts', '*.config.js', 'eslint.config.js'],
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  prettierConfig,
];
