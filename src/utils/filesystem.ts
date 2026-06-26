import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

/**
 * File system utilities with better error handling.
 *
 * Backed by `node:fs/promises` (no third-party dependencies) and works
 * identically under Node.js and Bun.
 */
export class FileSystem {
  /**
   * Read and parse a JSON file safely.
   * @param filePath - Path to JSON file
   * @returns Parsed JSON object
   */
  static async readJsonFile(filePath: string): Promise<unknown> {
    const absolutePath = path.resolve(filePath);

    if (!(await FileSystem.exists(absolutePath))) {
      throw new Error(`File not found: ${absolutePath}`);
    }

    const content = await readFile(absolutePath, 'utf8');
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid JSON in file: ${filePath} - ${(error as Error).message}`);
    }
  }

  /**
   * Write content to a file safely, creating parent directories as needed.
   * @param filePath - Path to write to
   * @param content - Content to write
   */
  static async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, content, 'utf8');
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * Ensure a directory exists (recursively).
   * @param dirPath - Directory path
   */
  static async ensureDir(dirPath: string): Promise<void> {
    try {
      await mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${(error as Error).message}`);
    }
  }

  /**
   * Check if a path exists.
   * @param filePath - File path to check
   */
  static async exists(filePath: string): Promise<boolean> {
    try {
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read file content as a string.
   * @param filePath - Path to read from
   * @returns File content as string
   */
  static async readFile(filePath: string): Promise<string> {
    const absolutePath = path.resolve(filePath);

    if (!(await FileSystem.exists(absolutePath))) {
      throw new Error(`File not found: ${absolutePath}`);
    }

    try {
      return await readFile(absolutePath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * Get the relative path between two paths (using forward slashes).
   * @param from - From path
   * @param to - To path
   * @returns Relative path
   */
  static getRelativePath(from: string, to: string): string {
    return path.relative(from, to).replace(/\\/g, '/');
  }
}

export default FileSystem;
