import { expect } from 'chai';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as tmp from 'tmp';
import { FileSystem } from '../../src/utils/filesystem';

interface TmpDir {
  name: string;
  removeCallback: () => void;
}

describe('FileSystem', () => {
  let tmpDir: TmpDir;

  beforeEach(() => {
    tmpDir = tmp.dirSync({ unsafeCleanup: true });
  });

  afterEach(() => {
    if (tmpDir) {
      tmpDir.removeCallback();
    }
  });

  describe('readJsonFile', () => {
    it('should read and parse valid JSON file', async () => {
      const testData = { name: 'test', value: 123 };
      const filePath = path.join(tmpDir.name, 'test.json');
      await fs.writeFile(filePath, JSON.stringify(testData));

      const result = await FileSystem.readJsonFile(filePath);
      expect(result).to.deep.equal(testData);
    });

    it('should throw error for non-existent file', async () => {
      const filePath = path.join(tmpDir.name, 'nonexistent.json');

      try {
        await FileSystem.readJsonFile(filePath);
        expect.fail('Should have thrown error');
      } catch (error: unknown) {
        expect((error as Error).message).to.include('File not found');
      }
    });

    it('should throw error for invalid JSON', async () => {
      const filePath = path.join(tmpDir.name, 'invalid.json');
      await fs.writeFile(filePath, '{ invalid json }');

      try {
        await FileSystem.readJsonFile(filePath);
        expect.fail('Should have thrown error');
      } catch (error: unknown) {
        expect((error as Error).message).to.include('Invalid JSON');
      }
    });
  });

  describe('writeFile', () => {
    it('should write file successfully', async () => {
      const filePath = path.join(tmpDir.name, 'output.txt');
      const content = 'test content';

      await FileSystem.writeFile(filePath, content);

      const result = await fs.readFile(filePath, 'utf8');
      expect(result).to.equal(content);
    });

    it('should create directories if they don\'t exist', async () => {
      const filePath = path.join(tmpDir.name, 'nested', 'dir', 'file.txt');
      const content = 'test content';

      await FileSystem.writeFile(filePath, content);

      const result = await fs.readFile(filePath, 'utf8');
      expect(result).to.equal(content);
    });
  });

  describe('ensureDir', () => {
    it('should create directory if it doesn\'t exist', async () => {
      const dirPath = path.join(tmpDir.name, 'new-directory');

      await FileSystem.ensureDir(dirPath);

      const exists = await fs.pathExists(dirPath);
      expect(exists).to.be.true;
    });

    it('should not fail if directory already exists', async () => {
      const dirPath = path.join(tmpDir.name, 'existing-dir');
      await fs.ensureDir(dirPath);

      // Should not throw
      await FileSystem.ensureDir(dirPath);

      const exists = await fs.pathExists(dirPath);
      expect(exists).to.be.true;
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(tmpDir.name, 'exists.txt');
      await fs.writeFile(filePath, 'content');

      const exists = await FileSystem.exists(filePath);
      expect(exists).to.be.true;
    });

    it('should return false for non-existing file', async () => {
      const filePath = path.join(tmpDir.name, 'nonexistent.txt');

      const exists = await FileSystem.exists(filePath);
      expect(exists).to.be.false;
    });
  });

  describe('getRelativePath', () => {
    it('should return correct relative path', () => {
      const from = '/Users/test/project/src';
      const to = '/Users/test/project/lib/utils.js';

      const result = FileSystem.getRelativePath(from, to);
      expect(result).to.equal('../lib/utils.js');
    });

    it('should normalize path separators', () => {
      const from = 'C:\\Users\\test\\project\\src';
      const to = 'C:\\Users\\test\\project\\lib\\utils.js';

      const result = FileSystem.getRelativePath(from, to);
      expect(result).to.include('/'); // Should use forward slashes
    });
  });
});
