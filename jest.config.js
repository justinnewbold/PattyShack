module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server/index.js', // Exclude server startup file
    '!src/database/migrations/**', // Exclude migrations
    '!src/database/seeds.js' // Exclude seeds
  ],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/*.test.js',
    '**/*.spec.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
