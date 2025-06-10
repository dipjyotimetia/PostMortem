const { expect } = require('chai');
const TestGenerator = require('../../src/converters/test-generator');

describe('TestGenerator', function() {
  describe('generateMochaTestFromRequest', function() {
    it('should generate test for simple GET request', function() {
      const item = {
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

    it('should generate test for POST request with body', function() {
      const item = {
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

    it('should handle request with headers', function() {
      const item = {
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

    it('should handle item with parent name', function() {
      const item = {
        name: 'Get User',
        request: {
          method: 'GET',
          url: 'https://api.example.com/users/1'
        }
      };

      const result = TestGenerator.generateMochaTestFromRequest(item, 'Users API');
      expect(result).to.include('describe(\'Users API - Get User\'');
    });

    it('should throw error for item without name', function() {
      const item = {
        request: { method: 'GET', url: 'https://api.example.com/test' }
      };

      expect(() => TestGenerator.generateMochaTestFromRequest(item))
        .to.throw('Request item must have a name');
    });

    it('should throw error for item without request', function() {
      const item = { name: 'Test Item' };

      expect(() => TestGenerator.generateMochaTestFromRequest(item))
        .to.throw('Request "Test Item" has no request object');
    });

    it('should use default assertion when no test script provided', function() {
      const item = {
        name: 'Simple Request',
        request: {
          method: 'GET',
          url: 'https://api.example.com/test'
        }
      };

      const result = TestGenerator.generateMochaTestFromRequest(item);
      expect(result).to.include('expect(response.status).to.be.oneOf([200, 201, 204])');
    });
  });

  describe('generateSetupFile', function() {
    it('should generate setup file with base URL', function() {
      const result = TestGenerator.generateSetupFile('https://api.example.com');
      
      expect(result).to.include('const supertest = require(\'supertest\')');
      expect(result).to.include('const { expect } = require(\'chai\')');
      expect(result).to.include('https://api.example.com');
      expect(result).to.include('module.exports = {');
    });

    it('should include environment variables when provided', function() {
      const environment = { apiKey: 'test-key', timeout: '5000' };
      const result = TestGenerator.generateSetupFile('https://api.example.com', environment);
      
      expect(result).to.include('"apiKey": "test-key"');
      expect(result).to.include('"timeout": "5000"');
      expect(result).to.include('env,');
    });

    it('should handle null environment', function() {
      const result = TestGenerator.generateSetupFile('https://api.example.com', null);
      expect(result).to.include('const env = null;');
    });
  });
});
