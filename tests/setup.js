/**
 * Jest Global Setup
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'postgres';
process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';
process.env.DB_PORT = process.env.TEST_DB_PORT || '5432';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'pattyshack_test';
process.env.DB_USER = process.env.TEST_DB_USER || 'pattyshack_user';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'pattyshack_dev_password';
process.env.SEED_DATABASE = 'false'; // Don't seed in tests

// Suppress console logs during tests unless debugging
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Keep error for important messages
    error: console.error,
  };
}
