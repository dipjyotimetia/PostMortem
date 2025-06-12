import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerOptions {
  level?: LogLevel;
  timestamps?: boolean;
  silent?: boolean;
}

/**
 * Enhanced logger with colored output, levels, and timestamps
 */
export class Logger {
  private level: LogLevel;
  private timestamps: boolean;
  private silent: boolean;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level || 'info';
    this.timestamps = options.timestamps !== false;
    this.silent = options.silent || false;
  }

  private _getTimestamp(): string {
    return this.timestamps ? `[${new Date().toISOString()}] ` : '';
  }

  private _shouldLog(level: LogLevel): boolean {
    if (this.silent) return false;

    const levels: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.level];
  }

  private _log(level: LogLevel, message: string, color: 'gray' | 'cyan' | 'green' | 'yellow' | 'red'): void {
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

  debug(message: string): void {
    this._log('debug', message, 'gray');
  }

  info(message: string): void {
    this._log('info', message, 'cyan');
  }

  success(message: string): void {
    this._log('info', message, 'green');
  }

  warn(message: string): void {
    this._log('warn', message, 'yellow');
  }

  error(message: string): void {
    this._log('error', message, 'red');
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setSilent(silent: boolean): void {
    this.silent = silent;
  }
}

// Create default logger instance
export const logger = new Logger({
  level: (process.env.LOG_LEVEL as LogLevel) || (process.env.DEBUG ? 'debug' : 'info')
});
