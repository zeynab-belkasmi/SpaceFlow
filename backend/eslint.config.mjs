// ESLint "flat config": an array of config objects applied in order.
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'jest.config.js'] },

  // Base JS rules, then TypeScript rules that use type information
  // (e.g. they can detect a Promise you forgot to await).
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // `expect(repo.save).toHaveBeenCalled()` passes a Jest mock, not a real method:
  // `unbound-method` is a false positive there, so it is turned off in tests only.
  { files: ['tests/**/*.ts'], rules: { '@typescript-eslint/unbound-method': 'off' } },

  // HTTP tests read `response.body`, which is untyped JSON (`any`) by nature.
  {
    files: ['tests/presentation/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },

  // A leading underscore marks a parameter as intentionally unused, e.g. `_next` in an
  // Express error handler, which needs 4 parameters to be recognised as one.
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // Plain JS files (like this config) are not part of any tsconfig: skip type-aware rules.
  { files: ['**/*.mjs', '**/*.js'], ...tseslint.configs.disableTypeChecked },

  // Must stay last: turns off every style rule that Prettier already handles.
  prettier,
);
