import { describe, expect, it } from 'bun:test';
import {
  type PostmanCollection,
  type PostmanEnvironment,
  Validator
} from '../../src/utils/validator';

describe('Validator', () => {
  describe('validateCollection', () => {
    it('should validate a correct collection', () => {
      const collection: PostmanCollection = {
        info: {
          name: 'Test Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [{ name: 'Test Request' } as unknown as Record<string, unknown>]
      };

      const result = Validator.validateCollection(collection);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return an error for a null collection', () => {
      const result = Validator.validateCollection(null as unknown as PostmanCollection);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Collection is required');
    });

    it('should return an error for a collection without info', () => {
      const result = Validator.validateCollection({ item: [] } as PostmanCollection);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Collection must have an info object');
    });

    it('should return an error for a collection without items', () => {
      const result = Validator.validateCollection({ info: { name: 'Test' } } as PostmanCollection);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Collection must have an items array');
    });

    it('should warn for a collection without a name', () => {
      const result = Validator.validateCollection({ info: {}, item: [] });
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Collection name is missing');
    });

    it('should warn for an empty collection', () => {
      const result = Validator.validateCollection({ info: { name: 'Test' }, item: [] });
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Collection has no items');
    });
  });

  describe('validateEnvironment', () => {
    it('should validate a correct environment', () => {
      const environment: PostmanEnvironment = {
        name: 'Test Environment',
        values: [
          { key: 'baseUrl', value: 'https://api.example.com' },
          { key: 'apiKey', value: 'test-key' }
        ]
      };

      const result = Validator.validateEnvironment(environment);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow a null environment', () => {
      const result = Validator.validateEnvironment(null);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return an error for an environment without a values array', () => {
      const result = Validator.validateEnvironment({ name: 'Test' } as PostmanEnvironment);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Environment must have a values array');
    });

    it('should warn for an environment without a name', () => {
      const result = Validator.validateEnvironment({ values: [] });
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Environment name is missing');
    });

    it('should warn for an empty environment', () => {
      const result = Validator.validateEnvironment({ name: 'Test', values: [] });
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Environment has no variables');
    });

    it('should warn for variables without keys', () => {
      const environment: PostmanEnvironment = {
        name: 'Test',
        values: [
          { value: 'test-value' } as { key?: string; value?: string },
          { key: 'validKey', value: 'validValue' }
        ]
      };
      const result = Validator.validateEnvironment(environment);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Environment variable at index 0 is missing a key');
    });
  });

  describe('validateOptions', () => {
    it('should validate correct options', () => {
      const result = Validator.validateOptions({
        collection: './test-collection.json',
        output: './output'
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return an error for a missing collection', () => {
      const result = Validator.validateOptions({ output: './output' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Collection path is required');
    });

    it('should warn for a missing output', () => {
      const result = Validator.validateOptions({ collection: './test.json' });
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Output directory not specified, using default');
    });
  });
});
