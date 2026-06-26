import { describe, expect, it } from 'bun:test';
import { type PostmanItem, TestGenerator } from '../../src/converters/test-generator';

describe('TestGenerator', () => {
  describe('generateTestFromRequest', () => {
    it('should generate a test for a simple GET request', () => {
      const item: PostmanItem = {
        name: 'Get Users',
        request: { method: 'GET', url: 'https://api.example.com/users' },
        events: [
          {
            listen: 'test',
            script: {
              exec: [
                'pm.test("Status is 200", function() { pm.expect(pm.response.code).to.equal(200); });'
              ]
            }
          }
        ]
      };

      const result = TestGenerator.generateTestFromRequest(item);

      expect(result).toContain("describe('Get Users'");
      expect(result).toContain("const response = await request.get('/users');");
      expect(result).toContain('expect(response.status).toBe(200)');
    });

    it('should generate a test for a POST request with body', () => {
      const item: PostmanItem = {
        name: 'Create User',
        request: {
          method: 'POST',
          url: 'https://api.example.com/users',
          body: { mode: 'raw', raw: '{"name": "John Doe", "email": "john@example.com"}' }
        }
      };

      const result = TestGenerator.generateTestFromRequest(item);

      expect(result).toContain("describe('Create User'");
      expect(result).toContain("const response = await request.post('/users'");
      expect(result).toContain('"name": "John Doe"');
    });

    it('should pass headers to the fetch client', () => {
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

      const result = TestGenerator.generateTestFromRequest(item);

      expect(result).toContain("request.get('/protected'");
      expect(result).toContain('"Authorization":"Bearer token123"');
      expect(result).toContain('"Content-Type":"application/json"');
    });

    it('should handle an item with a parent name', () => {
      const item: PostmanItem = {
        name: 'Get User',
        request: { method: 'GET', url: 'https://api.example.com/users/1' }
      };

      const result = TestGenerator.generateTestFromRequest(item, 'Users API');
      expect(result).toContain("describe('Users API - Get User'");
    });

    it('should throw for an item without a name', () => {
      const item = {
        request: { method: 'GET', url: 'https://api.example.com/test' }
      } as PostmanItem;
      expect(() => TestGenerator.generateTestFromRequest(item)).toThrow(
        'Request item must have a name'
      );
    });

    it('should throw for an item without a request', () => {
      const item: PostmanItem = { name: 'Test Item' };
      expect(() => TestGenerator.generateTestFromRequest(item)).toThrow('has no request object');
    });

    it('should use the default assertion when no test script is provided', () => {
      const item: PostmanItem = {
        name: 'Simple Request',
        request: { method: 'GET', url: 'https://api.example.com/test' }
      };

      const result = TestGenerator.generateTestFromRequest(item);
      expect(result).toContain('expect(response.status).toBe(200);');
    });
  });

  describe('generateSetupFile', () => {
    it('should generate a Bun-native setup file', () => {
      const result = TestGenerator.generateSetupFile('https://api.example.com');

      expect(result).toContain("import { expect } from 'bun:test';");
      expect(result).toContain('https://api.example.com');
      expect(result).toContain('export const request');
      expect(result).not.toContain('supertest');
      expect(result).not.toContain('chai');
    });

    it('should include environment variables when provided', () => {
      const environment = { apiKey: 'test-key', timeout: '5000' };
      const result = TestGenerator.generateSetupFile('https://api.example.com', environment);

      expect(result).toContain('"apiKey": "test-key"');
      expect(result).toContain('"timeout": "5000"');
      expect(result).toContain('export const env');
    });

    it('should handle a null environment', () => {
      const result = TestGenerator.generateSetupFile('https://api.example.com', null);
      expect(result).toContain('export const env');
      expect(result).toContain('= null;');
    });
  });
});
