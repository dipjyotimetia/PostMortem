// Global test setup
const chai = require('chai');

// Set up global test configurations
process.env.NODE_ENV = 'test';

// Configure chai
chai.config.includeStack = true;
chai.config.showDiff = true;

// Increase timeout for integration tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Export for tests that need it
module.exports = {
  setupTest: function() {
    // Reset any environment variables that might affect tests
    delete process.env.DEBUG;
    delete process.env.LOG_LEVEL;
    delete process.env.API_BASE_URL;
    delete process.env.TEST_TIMEOUT;
  }
};
