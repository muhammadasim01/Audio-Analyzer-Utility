'use strict';

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  // Load .env before each test suite so process.env is populated
  setupFiles: ['<rootDir>/tests/setup.js'],
};
