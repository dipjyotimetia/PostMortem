import { expect } from 'chai';
import { Logger } from '../../src/utils/logger';

interface ConsoleOutput {
  type: 'log' | 'error';
  args: unknown[];
}

describe('Logger', () => {
  let logger: Logger;
  let consoleOutput: ConsoleOutput[];
  let originalLog: typeof console.log;
  let originalError: typeof console.error;

  beforeEach(() => {
    consoleOutput = [];
    originalLog = console.log;
    originalError = console.error;

    console.log = (...args: unknown[]) => consoleOutput.push({ type: 'log', args });
    console.error = (...args: unknown[]) => consoleOutput.push({ type: 'error', args });

    logger = new Logger({ timestamps: false });
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
  });

  describe('log levels', () => {
    it('should log info messages at info level', () => {
      logger.setLevel('info');
      logger.info('test message');

      expect(consoleOutput).to.have.length(1);
      expect(consoleOutput[0].args[0]).to.include('INFO');
      expect(consoleOutput[0].args[0]).to.include('test message');
    });

    it('should not log debug messages at info level', () => {
      logger.setLevel('info');
      logger.debug('debug message');

      expect(consoleOutput).to.have.length(0);
    });

    it('should log debug messages at debug level', () => {
      logger.setLevel('debug');
      logger.debug('debug message');

      expect(consoleOutput).to.have.length(1);
      expect(consoleOutput[0].args[0]).to.include('DEBUG');
    });

    it('should log error messages at warn level', () => {
      logger.setLevel('warn');
      logger.error('error message');

      expect(consoleOutput).to.have.length(1);
      expect(consoleOutput[0].type).to.equal('error');
    });
  });

  describe('silent mode', () => {
    it('should not log anything when silent', () => {
      logger.setSilent(true);
      logger.info('test message');
      logger.error('error message');

      expect(consoleOutput).to.have.length(0);
    });
  });

  describe('message types', () => {
    it('should format success messages', () => {
      logger.success('success message');
      expect(consoleOutput[0].args[0]).to.include('success message');
    });

    it('should format warning messages', () => {
      logger.warn('warning message');
      expect(consoleOutput[0].args[0]).to.include('WARN');
      expect(consoleOutput[0].args[0]).to.include('warning message');
    });
  });

  describe('timestamps', () => {
    it('should include timestamps when enabled', () => {
      const loggerWithTimestamps = new Logger({ timestamps: true });
      loggerWithTimestamps.info('test message');

      expect(consoleOutput[0].args[0]).to.match(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should not include timestamps when disabled', () => {
      logger.info('test message');
      expect(consoleOutput[0].args[0]).not.to.match(/\[\d{4}-\d{2}-\d{2}T/);
    });
  });
});
