import * as fs from 'fs-extra';
import * as path from 'path';

/** Default retry options */
const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 2000
};

/** Error codes that are retryable */
const RETRYABLE_ERROR_CODES = [
  'EBUSY',      // Resource busy (common on Windows)
  'EACCES',     // Permission denied (may be temporary)
  'EPERM',      // Operation not permitted (may be temporary)
  'EMFILE',     // Too many open files
  'ENFILE',     // File table overflow
  'EAGAIN',     // Resource temporarily unavailable
  'ENOTEMPTY'   // Directory not empty (during cleanup)
];

/**
 * Retry options for file operations
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Base delay in milliseconds (will be multiplied by attempt number) */
  baseDelayMs?: number;
  /** Maximum delay between retries in milliseconds */
  maxDelayMs?: number;
}

/**
 * Sleep for the specified duration
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable
 * @param error - The error to check
 * @returns True if the error can be retried
 */
function isRetryableError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    return RETRYABLE_ERROR_CODES.includes(code);
  }
  return false;
}

/**
 * Execute an operation with retry logic
 * @param operation - The async operation to execute
 * @param options - Retry options
 * @returns Result of the operation
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs } = { ...DEFAULT_RETRY_OPTIONS, ...options };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if it's not a retryable error or we've exhausted retries
      if (!isRetryableError(error) || attempt === maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Operation failed after retries');
}

/**
 * File system utilities with better error handling and retry logic
 */
export class FileSystem {
  /**
   * Read and parse JSON file safely with retry logic
   * @param filePath - Path to JSON file
   * @param retryOptions - Optional retry configuration
   * @returns Parsed JSON object
   */
  static async readJsonFile(
    filePath: string,
    retryOptions?: RetryOptions
  ): Promise<unknown> {
    return withRetry(async () => {
      const absolutePath = path.resolve(filePath);
      const exists = await fs.pathExists(absolutePath);

      if (!exists) {
        throw new Error(`File not found: ${absolutePath}`);
      }

      try {
        const content = await fs.readFile(absolutePath, 'utf8');
        return JSON.parse(content);
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error(`Invalid JSON in file: ${filePath} - ${error.message}`);
        }
        throw error;
      }
    }, retryOptions);
  }

  /**
   * Write content to file safely with retry logic
   * @param filePath - Path to write to
   * @param content - Content to write
   * @param retryOptions - Optional retry configuration
   */
  static async writeFile(
    filePath: string,
    content: string,
    retryOptions?: RetryOptions
  ): Promise<void> {
    return withRetry(async () => {
      try {
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, content, 'utf8');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to write file ${filePath}: ${message}`);
      }
    }, retryOptions);
  }

  /**
   * Ensure directory exists with retry logic
   * @param dirPath - Directory path
   * @param retryOptions - Optional retry configuration
   */
  static async ensureDir(
    dirPath: string,
    retryOptions?: RetryOptions
  ): Promise<void> {
    return withRetry(async () => {
      try {
        await fs.ensureDir(dirPath);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to create directory ${dirPath}: ${message}`);
      }
    }, retryOptions);
  }

  /**
   * Check if file exists
   * @param filePath - File path to check
   * @returns True if file exists
   */
  static async exists(filePath: string): Promise<boolean> {
    return fs.pathExists(filePath);
  }

  /**
   * Read file content with retry logic
   * @param filePath - Path to read from
   * @param retryOptions - Optional retry configuration
   * @returns File content as string
   */
  static async readFile(
    filePath: string,
    retryOptions?: RetryOptions
  ): Promise<string> {
    return withRetry(async () => {
      const absolutePath = path.resolve(filePath);
      const exists = await fs.pathExists(absolutePath);

      if (!exists) {
        throw new Error(`File not found: ${absolutePath}`);
      }

      try {
        return await fs.readFile(absolutePath, 'utf8');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to read file ${filePath}: ${message}`);
      }
    }, retryOptions);
  }

  /**
   * Copy file with retry logic
   * @param src - Source file path
   * @param dest - Destination file path
   * @param retryOptions - Optional retry configuration
   */
  static async copyFile(
    src: string,
    dest: string,
    retryOptions?: RetryOptions
  ): Promise<void> {
    return withRetry(async () => {
      try {
        await fs.ensureDir(path.dirname(dest));
        await fs.copyFile(src, dest);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to copy file from ${src} to ${dest}: ${message}`);
      }
    }, retryOptions);
  }

  /**
   * Remove file or directory with retry logic
   * @param targetPath - Path to remove
   * @param retryOptions - Optional retry configuration
   */
  static async remove(
    targetPath: string,
    retryOptions?: RetryOptions
  ): Promise<void> {
    return withRetry(async () => {
      try {
        await fs.remove(targetPath);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to remove ${targetPath}: ${message}`);
      }
    }, retryOptions);
  }

  /**
   * Get relative path between two paths
   * @param from - From path
   * @param to - To path
   * @returns Relative path (with forward slashes)
   */
  static getRelativePath(from: string, to: string): string {
    return path.relative(from, to).replace(/\\/g, '/');
  }

  /**
   * Join paths safely
   * @param paths - Path segments to join
   * @returns Joined path
   */
  static joinPath(...paths: string[]): string {
    return path.join(...paths);
  }

  /**
   * Get the directory name of a path
   * @param filePath - The file path
   * @returns Directory name
   */
  static dirname(filePath: string): string {
    return path.dirname(filePath);
  }

  /**
   * Get the base name of a path
   * @param filePath - The file path
   * @param ext - Optional extension to remove
   * @returns Base name
   */
  static basename(filePath: string, ext?: string): string {
    return path.basename(filePath, ext);
  }

  /**
   * Resolve to an absolute path
   * @param paths - Path segments to resolve
   * @returns Absolute path
   */
  static resolve(...paths: string[]): string {
    return path.resolve(...paths);
  }
}

export default FileSystem;
