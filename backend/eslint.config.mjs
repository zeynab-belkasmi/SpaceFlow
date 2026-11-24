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

  // Plain JS files (like this config) are not part of any tsconfig: skip type-aware rules.
  { files: ['**/*.mjs', '**/*.js'], ...tseslint.configs.disableTypeChecked },

  // Must stay last: turns off every style rule that Prettier already handles.
  prettier,
);
