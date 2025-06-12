import { expect } from 'chai';
import { Validator, PostmanCollection, PostmanEnvironment } from '../../src/utils/validator';

describe('Validator', () => {
  describe('validateCollection', () => {
    it('should validate correct collection', () => {
      const collection: PostmanCollection = {
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

    it('should return error for null collection', () => {
      const result = Validator.validateCollection(null as any);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Collection is required');
    });

    it('should return error for collection without info', () => {
      const collection = { item: [] } as PostmanCollection;
      const result = Validator.validateCollection(collection);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Collection must have an info object');
    });

    it('should return error for collection without items', () => {
      const collection = { info: { name: 'Test' } } as PostmanCollection;
      const result = Validator.validateCollection(collection);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Collection must have an items array');
    });

    it('should return warning for collection without name', () => {
      const collection: PostmanCollection = {
        info: {},
        item: []
      };
      const result = Validator.validateCollection(collection);
      expect(result.isValid).to.be.true;
      expect(result.warnings).to.include('Collection name is missing');
    });

    it('should return warning for empty collection', () => {
      const collection: PostmanCollection = {
        info: { name: 'Test' },
        item: []
      };
      const result = Validator.validateCollection(collection);
      expect(result.isValid).to.be.true;
      expect(result.warnings).to.include('Collection has no items');
    });
  });

  describe('validateEnvironment', () => {
    it('should validate correct environment', () => {
      const environment: PostmanEnvironment = {
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

    it('should allow null environment', () => {
      const result = Validator.validateEnvironment(null);
      expect(result.isValid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should return error for environment without values array', () => {
      const environment = { name: 'Test' } as PostmanEnvironment;
      const result = Validator.validateEnvironment(environment);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Environment must have a values array');
    });

    it('should return warning for environment without name', () => {
      const environment: PostmanEnvironment = { values: [] };
      const result = Validator.validateEnvironment(environment);
      expect(result.isValid).to.be.true;
      expect(result.warnings).to.include('Environment name is missing');
    });

    it('should return warning for empty environment', () => {
      const environment: PostmanEnvironment = {
        name: 'Test',
        values: []
      };
      const result = Validator.validateEnvironment(environment);
      expect(result.isValid).to.be.true;
      expect(result.warnings).to.include('Environment has no variables');
    });

    it('should return warning for variables without keys', () => {
      const environment: PostmanEnvironment = {
        name: 'Test',
        values: [
          { value: 'test-value' } as any,
          { key: 'validKey', value: 'validValue' }
        ]
      };
      const result = Validator.validateEnvironment(environment);
      expect(result.isValid).to.be.true;
      expect(result.warnings).to.include('Environment variable at index 0 is missing a key');
    });
  });

  describe('validateOptions', () => {
    it('should validate correct options', () => {
      const options = {
        collection: './test-collection.json',
        output: './output'
      };

      const result = Validator.validateOptions(options);
      expect(result.isValid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should return error for missing collection', () => {
      const options = { output: './output' };
      const result = Validator.validateOptions(options);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Collection path is required');
    });

    it('should return warning for missing output', () => {
      const options = { collection: './test.json' };
      const result = Validator.validateOptions(options);
      expect(result.isValid).to.be.true;
      expect(result.warnings).to.include('Output directory not specified, using default');
    });
  });
});
