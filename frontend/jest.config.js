/** @type {import('jest').Config} */
export default {
  // jsdom: a fake browser (document, window) so React components can render in Node.
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', tsx: true },
          transform: { react: { runtime: 'automatic' } },
        },
        module: { type: 'commonjs' },
      },
    ],
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/main.tsx'],
};
