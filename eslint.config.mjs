import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['off', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/triple-slash-reference': ['error', { path: 'always', types: 'always', lib: 'always' }],
      'no-console': 'error',
      'no-useless-catch': 'off',
      'no-dupe-else-if': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '**/*.js', '**/*.d.ts'],
  }
);