module.exports = {
  testEnvironment: 'jsdom',
  rootDir: '..',
  collectCoverageFrom: ['src/js/app-exports.js', '!**/node_modules/**'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/config/jest.setup.js'],
  testMatch: ['<rootDir>/tests/unit/__tests__/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
};
