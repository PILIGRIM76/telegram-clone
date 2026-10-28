import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import prettierPlugin from 'eslint-plugin-prettier';

export default tseslint.config(
  { ignores: ['dist/', 'dist-electron/', 'node_modules/', '.vite/', '*.config.*', '*.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname
      }
    },
    settings: { react: { version: '18' } },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
      prettier: prettierPlugin
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'prettier/prettier': 'error'
    }
  }
);