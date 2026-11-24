// Same base as the backend, plus the rules of hooks for React.
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },

  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { project: './tsconfig.json', tsconfigRootDir: import.meta.dirname },
    },
  },

  // Hooks must be called in the same order on every render, and effects must list
  // their dependencies: these rules catch the classic React bugs.
  reactHooks.configs.flat['recommended-latest'],

  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // `onClick={async () => ...}` is a normal React pattern.
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },

  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/unbound-method': 'off' },
  },

  { files: ['**/*.js'], ...tseslint.configs.disableTypeChecked },

  prettier,
);
