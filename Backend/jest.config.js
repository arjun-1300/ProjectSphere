/**
 * Jest configuration for an ESM + TypeScript (NodeNext) project.
 *
 * ESM requires: ts-jest's ESM preset, treating .ts as ESM, and a moduleNameMapper
 * that strips the `.js` extension our source uses on relative imports (NodeNext
 * requires the extension in source, but Jest resolves the .ts file).
 *
 * Run with: `npm test` (which invokes node with --experimental-vm-modules).
 */
/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true, tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
  setupFiles: ['<rootDir>/tests/setup.ts'],
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
};
