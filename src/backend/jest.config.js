/**
 * Jest Configuration for Backend Testing
 * Optimized for real database operations and API integration testing
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'app.js',
    'server.js',
    'models/**/*.js',
    'controllers/**/*.js',
    'routes/**/*.js',
    'middleware/**/*.js',
    'services/**/*.js',
    'config/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/coverage/**'
  ],

  // Coverage thresholds for quality assurance (adjusted for initial testing)
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30
    }
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],

  // Test timeout for database operations
  testTimeout: 30000,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output for debugging
  verbose: true,

  // Module file extensions
  moduleFileExtensions: ['js', 'json'],

  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Global variables
  globals: {
    'process.env': {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-jwt-secret-key-for-testing-purposes-only',
      BCRYPT_SALT_ROUNDS: '10',
      API_VERSION: '1.0.0-test',
      LOG_LEVEL: 'error'
    }
  },

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles (useful for debugging hanging tests)
  detectOpenHandles: true,

  // Custom matchers for API testing
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/customMatchers.js'],

  // Performance monitoring
  maxWorkers: '50%' // Use half of available CPU cores
};