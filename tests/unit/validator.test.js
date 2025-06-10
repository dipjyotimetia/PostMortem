const { expect } = require('chai');
const Validator = require('../../src/utils/validator');

describe('Validator', function() {
  describe('validateCollection', function() {
    it('should validate correct collection', function() {
      const collection = {
        info: {
          name: 'Test Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Test Request',
            request: { method: 'GET', url: 'https://api.example.com/test' }
          }
        ]
      };

      const result = Validator.validateCollection(collection);
      expect(result.isValid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should return error for null collection', function() {
      const result = Validator.validateCollection(null);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Collection is required');
    });

    it('should return error for collection without info', function() {
      const collection = { item: [] };
      const result = Validator.validateCollection(collection);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Collection must have an info object');
    });

    it('should return error for collection without items', function() {
      const collection = { info: { name: 'Test' } };
      const result = Validator.validateCollection(collection);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Collection must have an items array');
    });

    it('should return warning for collection without name', function() {
      const collection = {
        info: {},
        item: []
      };
      const result = Validator.validateCollection(collection);
      expect(result.isValid).to.be.true;
      expect(result.warnings).to.include('Collection name is missing');
    });

    it('should return warning for empty collection', function() {
      const collection = {
        info: { name: 'Test' },
        item: []
      };
      const result = Validator.validateCollection(collection);
      expect(result.isValid).to.be.true;
      expect(result.warnings).to.include('Collection has no items');
    });
  });

  describe('validateEnvironment', function() {
    it('should validate correct environment', function() {
      const environment = {
        name: 'Test Environment',
        values: [
          { key: 'baseUrl', value: 'https://api.example.com' },
          { key: 'apiKey', value: 'test-key' }
        ]
      };

      const result = Validator.validateEnvironment(environment);
      expect(result.isValid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should allow null environment', function() {
      const result = Validator.validateEnvironment(null);
      expect(result.isValid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should return error for environment without values array', function() {
      const environment = { name: 'Test' };
      const result = Validator.validateEnvironment(environment);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Environment must have a values array');
    });

    it('should return warning for environment without name', function() {
      const environment = { values: [] };
      const result = Validator.validateEnvironment(environment);
      expect(result.isValid).to.be.true;
      expect(result.warnings).to.include('Environment name is missing');
    });

    it('should return warning for empty environment', function() {
      const environment = {
        name: 'Test',
        values: []
      };
      const result = Validator.validateEnvironment(environment);
      expect(result.isValid).to.be.true;
      expect(result.warnings).to.include('Environment has no variables');
    });

    it('should return warning for variables without keys', function() {
      const environment = {
        name: 'Test',
        values: [
          { value: 'test-value' },
          { key: 'validKey', value: 'validValue' }
        ]
      };
      const result = Validator.validateEnvironment(environment);
      expect(result.isValid).to.be.true;
      expect(result.warnings).to.include('Environment variable at index 0 is missing a key');
    });
  });

  describe('validateOptions', function() {
    it('should validate correct options', function() {
      const options = {
        collection: './test-collection.json',
        output: './output'
      };

      const result = Validator.validateOptions(options);
      expect(result.isValid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should return error for missing collection', function() {
      const options = { output: './output' };
      const result = Validator.validateOptions(options);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Collection path is required');
    });

    it('should return warning for missing output', function() {
      const options = { collection: './test.json' };
      const result = Validator.validateOptions(options);
      expect(result.isValid).to.be.true;
      expect(result.warnings).to.include('Output directory not specified, using default');
    });
  });
});
