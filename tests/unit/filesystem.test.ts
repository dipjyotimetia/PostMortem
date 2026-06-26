import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { FileSystem } from '../../src/utils/filesystem';
import { makeTmpDir, removeTmpDir } from '../helpers/tmp';

const exists = async (target: string): Promise<boolean> => {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
};

describe('FileSystem', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  afterEach(async () => {
    await removeTmpDir(tmpDir);
  });

  describe('readJsonFile', () => {
    it('should read and parse a valid JSON file', async () => {
      const testData = { name: 'test', value: 123 };
      const filePath = path.join(tmpDir, 'test.json');
      await writeFile(filePath, JSON.stringify(testData));

      expect(await FileSystem.readJsonFile(filePath)).toEqual(testData);
    });

    it('should throw for a non-existent file', async () => {
      const filePath = path.join(tmpDir, 'nonexistent.json');
      await expect(FileSystem.readJsonFile(filePath)).rejects.toThrow('File not found');
    });

    it('should throw for invalid JSON', async () => {
      const filePath = path.join(tmpDir, 'invalid.json');
      await writeFile(filePath, '{ invalid json }');
      await expect(FileSystem.readJsonFile(filePath)).rejects.toThrow('Invalid JSON');
    });
  });

  describe('writeFile', () => {
    it('should write a file successfully', async () => {
      const filePath = path.join(tmpDir, 'output.txt');
      await FileSystem.writeFile(filePath, 'test content');
      expect(await readFile(filePath, 'utf8')).toBe('test content');
    });

    it('should create parent directories if they do not exist', async () => {
      const filePath = path.join(tmpDir, 'nested', 'dir', 'file.txt');
      await FileSystem.writeFile(filePath, 'test content');
      expect(await readFile(filePath, 'utf8')).toBe('test content');
    });
  });

  describe('ensureDir', () => {
    it('should create a directory if it does not exist', async () => {
      const dirPath = path.join(tmpDir, 'new-directory');
      await FileSystem.ensureDir(dirPath);
      expect(await exists(dirPath)).toBe(true);
    });

    it('should not fail if the directory already exists', async () => {
      const dirPath = path.join(tmpDir, 'existing-dir');
      await mkdir(dirPath, { recursive: true });
      await FileSystem.ensureDir(dirPath);
      expect(await exists(dirPath)).toBe(true);
    });
  });

  describe('exists', () => {
    it('should return true for an existing file', async () => {
      const filePath = path.join(tmpDir, 'exists.txt');
      await writeFile(filePath, 'content');
      expect(await FileSystem.exists(filePath)).toBe(true);
    });

    it('should return false for a non-existing file', async () => {
      expect(await FileSystem.exists(path.join(tmpDir, 'nonexistent.txt'))).toBe(false);
    });
  });

  describe('getRelativePath', () => {
    it('should return the correct relative path', () => {
      const result = FileSystem.getRelativePath(
        '/Users/test/project/src',
        '/Users/test/project/lib/utils.js'
      );
      expect(result).toBe('../lib/utils.js');
    });

    it('should normalize path separators', () => {
      const result = FileSystem.getRelativePath(
        'C:\\Users\\test\\project\\src',
        'C:\\Users\\test\\project\\lib\\utils.js'
      );
      expect(result).toContain('/');
    });
  });
});
