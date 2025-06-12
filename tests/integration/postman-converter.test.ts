import { expect } from 'chai';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as tmp from 'tmp';
import { PostmanConverter } from '../../src/postman-converter';
import { PostmanCollection, PostmanEnvironment } from '../../src/utils/validator';

interface TmpDir {
  name: string;
  removeCallback: () => void;
}

describe('PostmanConverter Integration Tests', () => {
  let tmpDir: TmpDir;
  let converter: PostmanConverter;

  beforeEach(() => {
    tmpDir = tmp.dirSync({ unsafeCleanup: true });
    converter = new PostmanConverter();
  });

  afterEach(() => {
    if (tmpDir) {
      tmpDir.removeCallback();
    }
  });

  describe('processCollection', () => {
    it('should process valid collection and generate test files', async () => {
      const collection: PostmanCollection = {
        info: {
          name: 'Test Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Simple GET Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/users'
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Response status code is 200", function () {',
                    '    pm.expect(pm.response.code).to.equal(200);',
                    '});'
                  ]
                }
              }
            ]
          }
        ]
      };

      const results = await converter.processCollection(collection, tmpDir.name);

      expect(results.testFiles).to.equal(1);
      expect(results.baseUrl).to.equal('https://api.example.com');

      // Check if setup file was created
      const setupExists = await fs.pathExists(path.join(tmpDir.name, 'setup.ts'));
      expect(setupExists).to.be.true;

      // Check if test file was created
      const testExists = await fs.pathExists(path.join(tmpDir.name, 'simple-get-request.test.ts'));
      expect(testExists).to.be.true;

      // Verify test file content
      const testContent = await fs.readFile(path.join(tmpDir.name, 'simple-get-request.test.ts'), 'utf8');
      expect(testContent).to.include('describe(\'Simple GET Request\'');
      expect(testContent).to.include('expect(response.status).to.equal(200)');
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
                request: {
                  method: 'GET',
                  url: 'https://api.example.com/users'
                }
              },
              {
                name: 'Create User',
                request: {
                  method: 'POST',
                  url: 'https://api.example.com/users',
                  body: {
                    mode: 'raw',
                    raw: '{"name": "John Doe"}'
                  }
                }
              }
            ]
          }
        ]
      };

      const results = await converter.processCollection(collection, tmpDir.name);

      expect(results.testFiles).to.equal(2);
      expect(results.folders).to.equal(1);

      // Check if folder structure was created
      const folderExists = await fs.pathExists(path.join(tmpDir.name, 'users-api'));
      expect(folderExists).to.be.true;

      // Check if test files exist in folder
      const getUsersExists = await fs.pathExists(path.join(tmpDir.name, 'users-api', 'get-all-users.test.ts'));
      const createUserExists = await fs.pathExists(path.join(tmpDir.name, 'users-api', 'create-user.test.ts'));

      expect(getUsersExists).to.be.true;
      expect(createUserExists).to.be.true;

      // Verify POST request content
      const createUserContent = await fs.readFile(path.join(tmpDir.name, 'users-api', 'create-user.test.ts'), 'utf8');
      expect(createUserContent).to.include('request.post(\'/users\')');
      expect(createUserContent).to.include('"name": "John Doe"');
    });

    it('should process environment variables', async () => {
      const collection: PostmanCollection = {
        info: { name: 'Test Collection' },
        item: [
          {
            name: 'Test Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/test'
            }
          }
        ]
      };

      const environment: PostmanEnvironment = {
        name: 'Test Environment',
        values: [
          { key: 'baseUrl', value: 'https://api.example.com' },
          { key: 'apiKey', value: 'test-key-123' }
        ]
      };

      const results = await converter.processCollection(collection, tmpDir.name, environment);

      expect(results.environment).to.deep.equal({
        baseUrl: 'https://api.example.com',
        apiKey: 'test-key-123'
      });

      // Check setup file contains environment variables
      const setupContent = await fs.readFile(path.join(tmpDir.name, 'setup.ts'), 'utf8');
      expect(setupContent).to.include('"baseUrl": "https://api.example.com"');
      expect(setupContent).to.include('"apiKey": "test-key-123"');
    });

    it('should handle flat structure option', async () => {
      const converter = new PostmanConverter({ maintainFolderStructure: false });
      const collection: PostmanCollection = {
        info: { name: 'Test Collection' },
        item: [
          {
            name: 'API Folder',
            item: [
              {
                name: 'Test Request',
                request: {
                  method: 'GET',
                  url: 'https://api.example.com/test'
                }
              }
            ]
          }
        ]
      };

      await converter.processCollection(collection, tmpDir.name);

      // Test file should be in root directory, not in folder
      const testExists = await fs.pathExists(path.join(tmpDir.name, 'test-request.test.ts'));
      expect(testExists).to.be.true;

      const folderExists = await fs.pathExists(path.join(tmpDir.name, 'api-folder'));
      expect(folderExists).to.be.false;
    });

    it('should skip setup file when option is disabled', async () => {
      const converter = new PostmanConverter({ createSetupFile: false });
      const collection: PostmanCollection = {
        info: { name: 'Test Collection' },
        item: [
          {
            name: 'Test Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/test'
            }
          }
        ]
      };

      await converter.processCollection(collection, tmpDir.name);

      const setupExists = await fs.pathExists(path.join(tmpDir.name, 'setup.ts'));
      expect(setupExists).to.be.false;
    });

    it('should throw error for invalid collection', async () => {
      const invalidCollection = {
        info: { name: 'Invalid Collection' }
        // Missing 'item' array
      } as PostmanCollection;

      try {
        await converter.processCollection(invalidCollection, tmpDir.name);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        expect((error as Error).message).to.include('Invalid collection');
      }
    });
  });
});
