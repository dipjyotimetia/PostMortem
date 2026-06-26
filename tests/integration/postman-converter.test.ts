import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { PostmanConverter } from '../../src/postman-converter';
import { FileSystem } from '../../src/utils/filesystem';
import type { PostmanCollection, PostmanEnvironment } from '../../src/utils/validator';
import { makeTmpDir, removeTmpDir } from '../helpers/tmp';

describe('PostmanConverter Integration Tests', () => {
  let tmpDir: string;
  let converter: PostmanConverter;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
    converter = new PostmanConverter();
  });

  afterEach(async () => {
    await removeTmpDir(tmpDir);
  });

  describe('processCollection', () => {
    it('should process a valid collection and generate test files', async () => {
      const collection: PostmanCollection = {
        info: {
          name: 'Test Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Simple GET Request',
            request: { method: 'GET', url: 'https://api.example.com/users' }
          } as unknown as Record<string, unknown>
        ]
      };

      const results = await converter.processCollection(collection, tmpDir);

      expect(results.testFiles).toBe(1);
      expect(results.baseUrl).toBe('https://api.example.com');

      expect(await FileSystem.exists(path.join(tmpDir, 'setup.ts'))).toBe(true);
      expect(await FileSystem.exists(path.join(tmpDir, 'simple-get-request.test.ts'))).toBe(true);

      const testContent = await readFile(path.join(tmpDir, 'simple-get-request.test.ts'), 'utf8');
      expect(testContent).toContain("describe('Simple GET Request'");
      expect(testContent).toContain("import { describe, it, expect } from 'bun:test';");
      expect(testContent).toContain('expect(response.status).toBe(200)');
    });

    it('should handle collections with folders', async () => {
      const collection: PostmanCollection = {
        info: {
          name: 'Test Collection with Folders',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Users API',
            item: [
              {
                name: 'Get All Users',
                request: { method: 'GET', url: 'https://api.example.com/users' }
              },
              {
                name: 'Create User',
                request: {
                  method: 'POST',
                  url: 'https://api.example.com/users',
                  body: { mode: 'raw', raw: '{"name": "John Doe"}' }
                }
              }
            ]
          } as unknown as Record<string, unknown>
        ]
      };

      const results = await converter.processCollection(collection, tmpDir);

      expect(results.testFiles).toBe(2);
      expect(results.folders).toBe(1);

      expect(await FileSystem.exists(path.join(tmpDir, 'users-api'))).toBe(true);
      expect(await FileSystem.exists(path.join(tmpDir, 'users-api', 'get-all-users.test.ts'))).toBe(
        true
      );
      expect(await FileSystem.exists(path.join(tmpDir, 'users-api', 'create-user.test.ts'))).toBe(
        true
      );

      const createUserContent = await readFile(
        path.join(tmpDir, 'users-api', 'create-user.test.ts'),
        'utf8'
      );
      expect(createUserContent).toContain("request.post('/users'");
      expect(createUserContent).toContain('"name": "John Doe"');
    });

    it('should process environment variables', async () => {
      const collection: PostmanCollection = {
        info: { name: 'Test Collection' },
        item: [
          {
            name: 'Test Request',
            request: { method: 'GET', url: 'https://api.example.com/test' }
          } as unknown as Record<string, unknown>
        ]
      };

      const environment: PostmanEnvironment = {
        name: 'Test Environment',
        values: [
          { key: 'baseUrl', value: 'https://api.example.com' },
          { key: 'apiKey', value: 'test-key-123' }
        ]
      };

      const results = await converter.processCollection(collection, tmpDir, environment);

      expect(results.environment).toEqual({
        baseUrl: 'https://api.example.com',
        apiKey: 'test-key-123'
      });

      const setupContent = await readFile(path.join(tmpDir, 'setup.ts'), 'utf8');
      expect(setupContent).toContain('"baseUrl": "https://api.example.com"');
      expect(setupContent).toContain('"apiKey": "test-key-123"');
    });

    it('should handle the flat structure option', async () => {
      const flatConverter = new PostmanConverter({ maintainFolderStructure: false });
      const collection: PostmanCollection = {
        info: { name: 'Test Collection' },
        item: [
          {
            name: 'API Folder',
            item: [
              {
                name: 'Test Request',
                request: { method: 'GET', url: 'https://api.example.com/test' }
              }
            ]
          } as unknown as Record<string, unknown>
        ]
      };

      await flatConverter.processCollection(collection, tmpDir);

      expect(await FileSystem.exists(path.join(tmpDir, 'test-request.test.ts'))).toBe(true);
      expect(await FileSystem.exists(path.join(tmpDir, 'api-folder'))).toBe(false);
    });

    it('should skip the setup file when disabled', async () => {
      const noSetupConverter = new PostmanConverter({ createSetupFile: false });
      const collection: PostmanCollection = {
        info: { name: 'Test Collection' },
        item: [
          {
            name: 'Test Request',
            request: { method: 'GET', url: 'https://api.example.com/test' }
          } as unknown as Record<string, unknown>
        ]
      };

      await noSetupConverter.processCollection(collection, tmpDir);
      expect(await FileSystem.exists(path.join(tmpDir, 'setup.ts'))).toBe(false);
    });

    it('should throw for an invalid collection', async () => {
      const invalidCollection = { info: { name: 'Invalid Collection' } } as PostmanCollection;
      await expect(converter.processCollection(invalidCollection, tmpDir)).rejects.toThrow(
        'Invalid collection'
      );
    });
  });
});
