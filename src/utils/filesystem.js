const fs = require('fs-extra');
const path = require('path');

/**
 * File system utilities with better error handling
 */
class FileSystem {
  /**
   * Read and parse JSON file safely
   * @param {string} filePath - Path to JSON file
   * @returns {Promise<Object>} - Parsed JSON object
   */
  static async readJsonFile(filePath) {
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
   * @param {string} filePath - Path to write to
   * @param {string} content - Content to write
   * @returns {Promise<void>}
   */
  static async writeFile(filePath, content) {
    try {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf8');
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Ensure directory exists
   * @param {string} dirPath - Directory path
   * @returns {Promise<void>}
   */
  static async ensureDir(dirPath) {
    try {
      await fs.ensureDir(dirPath);
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Check if file exists
   * @param {string} filePath - File path to check
   * @returns {Promise<boolean>}
   */
  static async exists(filePath) {
    return fs.pathExists(filePath);
  }

  /**
   * Get relative path between two paths
   * @param {string} from - From path
   * @param {string} to - To path
   * @returns {string} - Relative path
   */
  static getRelativePath(from, to) {
    return path.relative(from, to).replace(/\\/g, '/');
  }
}

module.exports = FileSystem;
