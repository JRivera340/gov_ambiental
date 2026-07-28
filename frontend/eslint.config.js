import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import tailwindcss from 'eslint-plugin-tailwindcss';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      tailwindcss,
    },
    rules: {
      // Set clasico y estable (rules-of-hooks/exhaustive-deps), no el
      // "recommended" completo de v7: ese trae reglas experimentales
      // orientadas a React Compiler (set-state-in-effect, immutability,
      // static-components, purity) que exigirian reescribir logica de
      // efectos en varios archivos — fuera de alcance de esta tarea.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      // TS ya detecta variables/tipos indefinidos reales; no-undef da falsos
      // positivos con tipos globales de React (React.FC, React.ChangeEvent)
      // referenciados sin import de valor bajo el nuevo JSX transform.
      'no-undef': 'off',
      // callees sin 'cva': sus objetos de variantes son mutuamente
      // excluyentes en runtime (nunca se aplican dos variantes a la vez),
      // pero el plugin las lee como una sola classList y marca falsos
      // "conflictos" entre variantes que nunca conviven.
      'tailwindcss/no-contradicting-classname': ['error', { callees: ['classnames', 'clsx', 'ctl', 'tv'] }],
      'tailwindcss/no-arbitrary-value': 'warn',
      'tailwindcss/classnames-order': 'warn',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '*.test.tsx', '*.test.ts'],
  },
];
