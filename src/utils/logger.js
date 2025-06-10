const chalk = require('chalk');

/**
 * Enhanced logger with colored output, levels, and timestamps
 */
class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.timestamps = options.timestamps !== false;
    this.silent = options.silent || false;
  }

  _getTimestamp() {
    return this.timestamps ? `[${new Date().toISOString()}] ` : '';
  }

  _shouldLog(level) {
    if (this.silent) return false;
    
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.level];
  }

  _log(level, message, color) {
    if (!this._shouldLog(level)) return;
    
    const timestamp = this._getTimestamp();
    const levelStr = level.toUpperCase().padEnd(5);
    const output = `${timestamp}${chalk[color](`${levelStr}: ${message}`)}`;
    
    if (level === 'error') {
      console.error(output);
    } else {
      console.log(output);
    }
  }

  debug(message) {
    this._log('debug', message, 'gray');
  }

  info(message) {
    this._log('info', message, 'cyan');
  }

  success(message) {
    this._log('info', message, 'green');
  }

  warn(message) {
    this._log('warn', message, 'yellow');
  }

  error(message) {
    this._log('error', message, 'red');
  }

  setLevel(level) {
    this.level = level;
  }

  setSilent(silent) {
    this.silent = silent;
  }
}

// Create default logger instance
const logger = new Logger({
  level: process.env.LOG_LEVEL || (process.env.DEBUG ? 'debug' : 'info')
});

module.exports = { Logger, logger };
