import { expect } from 'chai';
import { TestGenerator, PostmanItem } from '../../src/converters/test-generator';

describe('TestGenerator', () => {
  describe('generateMochaTestFromRequest', () => {
    it('should generate test for simple GET request', () => {
      const item: PostmanItem = {
        name: 'Get Users',
        request: {
          method: 'GET',
          url: 'https://api.example.com/users'
        },
        events: [
          {
            listen: 'test',
            script: {
              exec: ['pm.test("Status is 200", function() { pm.expect(pm.response.code).to.equal(200); });']
            }
          }
        ]
      };

      const result = TestGenerator.generateMochaTestFromRequest(item);

      expect(result).to.include('describe(\'Get Users\'');
      expect(result).to.include('const response = await request.get(\'/users\')');
      expect(result).to.include('expect(response.status).to.equal(200)');
    });

    it('should generate test for POST request with body', () => {
      const item: PostmanItem = {
        name: 'Create User',
        request: {
          method: 'POST',
          url: 'https://api.example.com/users',
          body: {
            mode: 'raw',
            raw: '{"name": "John Doe", "email": "john@example.com"}'
          }
        }
      };

      const result = TestGenerator.generateMochaTestFromRequest(item);

      expect(result).to.include('describe(\'Create User\'');
      expect(result).to.include('const response = await request.post(\'/users\')');
      expect(result).to.include('.send({');
      expect(result).to.include('"name": "John Doe"');
    });

    it('should handle request with headers', () => {
      const item: PostmanItem = {
        name: 'Authenticated Request',
        request: {
          method: 'GET',
          url: 'https://api.example.com/protected',
          header: [
            { key: 'Authorization', value: 'Bearer token123' },
            { key: 'Content-Type', value: 'application/json' }
          ]
        }
      };

      const result = TestGenerator.generateMochaTestFromRequest(item);

      expect(result).to.include('.set(\'Authorization\', \'Bearer token123\')');
      expect(result).to.include('.set(\'Content-Type\', \'application/json\')');
    });

    it('should handle item with parent name', () => {
      const item: PostmanItem = {
        name: 'Get User',
        request: {
          method: 'GET',
          url: 'https://api.example.com/users/1'
        }
      };

      const result = TestGenerator.generateMochaTestFromRequest(item, 'Users API');
      expect(result).to.include('describe(\'Users API - Get User\'');
    });

    it('should throw error for item without name', () => {
      const item = {
        request: { method: 'GET', url: 'https://api.example.com/test' }
      } as PostmanItem;

      expect(() => TestGenerator.generateMochaTestFromRequest(item))
        .to.throw('Request item must have a name');
    });

    it('should throw error for item without request', () => {
      const item: PostmanItem = { name: 'Test Item' };

      expect(() => TestGenerator.generateMochaTestFromRequest(item))
        .to.throw('Request "Test Item" has no request object');
    });

    it('should use default assertion when no test script provided', () => {
      const item: PostmanItem = {
        name: 'Simple Request',
        request: {
          method: 'GET',
          url: 'https://api.example.com/test'
        }
      };

      const result = TestGenerator.generateMochaTestFromRequest(item);
      expect(result).to.include('expect(response.status).to.equal(200)');
    });
  });

  describe('generateSetupFile', () => {
    it('should generate setup file with base URL', () => {
      const result = TestGenerator.generateSetupFile('https://api.example.com');

      expect(result).to.include('import supertest from \'supertest\';');
      expect(result).to.include('import { expect } from \'chai\';');
      expect(result).to.include('https://api.example.com');
      expect(result).to.include('export const request');
    });

    it('should include environment variables when provided', () => {
      const environment = { apiKey: 'test-key', timeout: '5000' };
      const result = TestGenerator.generateSetupFile('https://api.example.com', environment);

      expect(result).to.include('"apiKey": "test-key"');
      expect(result).to.include('"timeout": "5000"');
      expect(result).to.include('export const env');
    });

    it('should handle null environment', () => {
      const result = TestGenerator.generateSetupFile('https://api.example.com', null);
      expect(result).to.include('export const env = null;');
    });
  });
});
