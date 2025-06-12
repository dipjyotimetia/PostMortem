import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * File system utilities with better error handling
 */
export class FileSystem {
  /**
   * Read and parse JSON file safely
   * @param filePath - Path to JSON file
   * @returns Parsed JSON object
   */
  static async readJsonFile(filePath: string): Promise<any> {
    try {
      const absolutePath = path.resolve(filePath);
      const exists = await fs.pathExists(absolutePath);

      if (!exists) {
        throw new Error(`File not found: ${absolutePath}`);
      }

      const content = await fs.readFile(absolutePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in file: ${filePath} - ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Write content to file safely
   * @param filePath - Path to write to
   * @param content - Content to write
   */
  static async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf8');
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * Ensure directory exists
   * @param dirPath - Directory path
   */
  static async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.ensureDir(dirPath);
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${(error as Error).message}`);
    }
  }

  /**
   * Check if file exists
   * @param filePath - File path to check
   */
  static async exists(filePath: string): Promise<boolean> {
    return fs.pathExists(filePath);
  }

  /**
   * Read file content
   * @param filePath - Path to read from
   * @returns File content as string
   */
  static async readFile(filePath: string): Promise<string> {
    try {
      const absolutePath = path.resolve(filePath);
      const exists = await fs.pathExists(absolutePath);

      if (!exists) {
        throw new Error(`File not found: ${absolutePath}`);
      }

      return await fs.readFile(absolutePath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * Get relative path between two paths
   * @param from - From path
   * @param to - To path
   * @returns Relative path
   */
  static getRelativePath(from: string, to: string): string {
    return path.relative(from, to).replace(/\\/g, '/');
  }
}

export default FileSystem;
