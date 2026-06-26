import { describe, expect, it } from 'bun:test';
import { TestConverter } from '../../src/converters/test-converter';

describe('TestConverter', () => {
  describe('convertPostmanTest', () => {
    it('should convert basic pm.test to it', () => {
      const input = 'pm.test("Response status code is 200", function () {';
      const result = TestConverter.convertPostmanTest(input);
      expect(result).toContain('it("Response status code is 200", function () {');
    });

    it('should convert pm.expect status check to bun:test matcher', () => {
      const input = 'pm.expect(pm.response.code).to.equal(200);';
      const result = TestConverter.convertPostmanTest(input);
      expect(result).toContain('expect(response.status).toBe(200);');
    });

    it('should convert pm.response.json() to response.body', () => {
      const input = 'const responseData = pm.response.json();';
      const result = TestConverter.convertPostmanTest(input);
      expect(result).toContain('const responseData = response.body;');
    });

    it('should handle pm.response.to.have.status', () => {
      const input = 'pm.response.to.have.status(200);';
      const result = TestConverter.convertPostmanTest(input);
      expect(result).toContain('expect(response.status).toBe(200);');
    });

    it('should convert Chai property assertions to toHaveProperty', () => {
      const input = "pm.expect(responseData).to.have.property('id');";
      const result = TestConverter.convertPostmanTest(input);
      expect(result).toContain("expect(responseData).toHaveProperty('id');");
    });

    it('should handle empty or null input', () => {
      expect(TestConverter.convertPostmanTest('')).toBe('');
      expect(TestConverter.convertPostmanTest(null)).toBe('');
      expect(TestConverter.convertPostmanTest(undefined)).toBe('');
    });

    it('should convert a complex test script', () => {
      const input = `pm.test("Response status code is 200", function () {
    pm.expect(pm.response.code).to.equal(200);
});

pm.test("Response has user data", function () {
    const responseData = pm.response.json();
    pm.expect(responseData).to.have.property('id');
});`;

      const result = TestConverter.convertPostmanTest(input);

      expect(result).toContain('it("Response status code is 200"');
      expect(result).toContain('expect(response.status).toBe(200)');
      expect(result).toContain('it("Response has user data"');
      expect(result).toContain('const responseData = response.body;');
      expect(result).toContain("expect(responseData).toHaveProperty('id')");
    });
  });

  describe('extractTestNames', () => {
    it('should extract test names from a script', () => {
      const script = `pm.test("First test", function () {});
pm.test("Second test", function () {});`;

      expect(TestConverter.extractTestNames(script)).toEqual(['First test', 'Second test']);
    });

    it('should return an empty array for no tests', () => {
      expect(TestConverter.extractTestNames('console.log("no tests");')).toEqual([]);
    });

    it('should handle empty input', () => {
      expect(TestConverter.extractTestNames('')).toEqual([]);
      expect(TestConverter.extractTestNames(null)).toEqual([]);
    });
  });

  describe('hasAssertions', () => {
    it('should detect pm.test assertions', () => {
      expect(TestConverter.hasAssertions('pm.test("test", function() {});')).toBe(true);
    });

    it('should detect pm.expect assertions', () => {
      expect(TestConverter.hasAssertions('pm.expect(data).to.be.ok;')).toBe(true);
    });

    it('should detect pm.response assertions', () => {
      expect(TestConverter.hasAssertions('pm.response.to.have.status(200);')).toBe(true);
    });

    it('should return false for no assertions', () => {
      expect(TestConverter.hasAssertions('console.log("hello");')).toBe(false);
      expect(TestConverter.hasAssertions('')).toBe(false);
      expect(TestConverter.hasAssertions(null)).toBe(false);
    });
  });
});
