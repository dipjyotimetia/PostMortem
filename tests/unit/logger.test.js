const { expect } = require('chai');
const { Logger } = require('../../src/utils/logger');

describe('Logger', function() {
  let logger;
  let consoleOutput;
  let originalLog, originalError;

  beforeEach(function() {
    consoleOutput = [];
    originalLog = console.log;
    originalError = console.error;
    
    console.log = (...args) => consoleOutput.push({ type: 'log', args });
    console.error = (...args) => consoleOutput.push({ type: 'error', args });
    
    logger = new Logger({ timestamps: false });
  });

  afterEach(function() {
    console.log = originalLog;
    console.error = originalError;
  });

  describe('log levels', function() {
    it('should log info messages at info level', function() {
      logger.setLevel('info');
      logger.info('test message');
      
      expect(consoleOutput).to.have.length(1);
      expect(consoleOutput[0].args[0]).to.include('INFO');
      expect(consoleOutput[0].args[0]).to.include('test message');
    });

    it('should not log debug messages at info level', function() {
      logger.setLevel('info');
      logger.debug('debug message');
      
      expect(consoleOutput).to.have.length(0);
    });

    it('should log debug messages at debug level', function() {
      logger.setLevel('debug');
      logger.debug('debug message');
      
      expect(consoleOutput).to.have.length(1);
      expect(consoleOutput[0].args[0]).to.include('DEBUG');
    });

    it('should log error messages at warn level', function() {
      logger.setLevel('warn');
      logger.error('error message');
      
      expect(consoleOutput).to.have.length(1);
      expect(consoleOutput[0].type).to.equal('error');
    });
  });

  describe('silent mode', function() {
    it('should not log anything when silent', function() {
      logger.setSilent(true);
      logger.info('test message');
      logger.error('error message');
      
      expect(consoleOutput).to.have.length(0);
    });
  });

  describe('message types', function() {
    it('should format success messages', function() {
      logger.success('success message');
      expect(consoleOutput[0].args[0]).to.include('success message');
    });

    it('should format warning messages', function() {
      logger.warn('warning message');
      expect(consoleOutput[0].args[0]).to.include('WARN');
      expect(consoleOutput[0].args[0]).to.include('warning message');
    });
  });

  describe('timestamps', function() {
    it('should include timestamps when enabled', function() {
      const loggerWithTimestamps = new Logger({ timestamps: true });
      loggerWithTimestamps.info('test message');
      
      expect(consoleOutput[0].args[0]).to.match(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should not include timestamps when disabled', function() {
      logger.info('test message');
      expect(consoleOutput[0].args[0]).not.to.match(/\[\d{4}-\d{2}-\d{2}T/);
    });
  });
});
