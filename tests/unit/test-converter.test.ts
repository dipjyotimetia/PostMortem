import { expect } from 'chai';
import { TestConverter } from '../../src/converters/test-converter';

describe('TestConverter', () => {
  describe('convertPostmanTestToMocha', () => {
    it('should convert basic pm.test to it', () => {
      const input = 'pm.test("Response status code is 200", function () {';
      const expected = 'it("Response status code is 200", function () {';
      const result = TestConverter.convertPostmanTestToMocha(input);
      expect(result).to.include(expected);
    });

    it('should convert pm.expect to expect', () => {
      const input = 'pm.expect(pm.response.code).to.equal(200);';
      const expected = 'expect(response.status).to.equal(200);';
      const result = TestConverter.convertPostmanTestToMocha(input);
      expect(result).to.include(expected);
    });

    it('should convert pm.response.json() to response.body', () => {
      const input = 'const responseData = pm.response.json();';
      const expected = 'const responseData = response.body;';
      const result = TestConverter.convertPostmanTestToMocha(input);
      expect(result).to.include(expected);
    });

    it('should handle pm.response.to.have.status', () => {
      const input = 'pm.response.to.have.status(200);';
      const expected = 'expect(response.status).to.equal(200);';
      const result = TestConverter.convertPostmanTestToMocha(input);
      expect(result).to.include(expected);
    });

    it('should handle empty or null input', () => {
      expect(TestConverter.convertPostmanTestToMocha('')).to.equal('');
      expect(TestConverter.convertPostmanTestToMocha(null)).to.equal('');
      expect(TestConverter.convertPostmanTestToMocha(undefined)).to.equal('');
    });

    it('should convert complex test script', () => {
      const input = `pm.test("Response status code is 200", function () {
    pm.expect(pm.response.code).to.equal(200);
});

pm.test("Response has user data", function () {
    const responseData = pm.response.json();
    pm.expect(responseData).to.have.property('id');
});`;

      const result = TestConverter.convertPostmanTestToMocha(input);

      expect(result).to.include('it("Response status code is 200"');
      expect(result).to.include('expect(response.status).to.equal(200)');
      expect(result).to.include('it("Response has user data"');
      expect(result).to.include('const responseData = response.body;');
    });
  });

  describe('extractTestNames', () => {
    it('should extract test names from script', () => {
      const script = `pm.test("First test", function () {});
pm.test("Second test", function () {});`;

      const names = TestConverter.extractTestNames(script);
      expect(names).to.deep.equal(['First test', 'Second test']);
    });

    it('should return empty array for no tests', () => {
      const names = TestConverter.extractTestNames('console.log("no tests");');
      expect(names).to.deep.equal([]);
    });

    it('should handle empty input', () => {
      expect(TestConverter.extractTestNames('')).to.deep.equal([]);
      expect(TestConverter.extractTestNames(null)).to.deep.equal([]);
    });
  });

  describe('hasAssertions', () => {
    it('should detect pm.test assertions', () => {
      const script = 'pm.test("test", function() {});';
      expect(TestConverter.hasAssertions(script)).to.be.true;
    });

    it('should detect pm.expect assertions', () => {
      const script = 'pm.expect(data).to.be.ok;';
      expect(TestConverter.hasAssertions(script)).to.be.true;
    });

    it('should detect pm.response assertions', () => {
      const script = 'pm.response.to.have.status(200);';
      expect(TestConverter.hasAssertions(script)).to.be.true;
    });

    it('should return false for no assertions', () => {
      expect(TestConverter.hasAssertions('console.log("hello");')).to.be.false;
      expect(TestConverter.hasAssertions('')).to.be.false;
      expect(TestConverter.hasAssertions(null)).to.be.false;
    });
  });
});
