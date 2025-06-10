const _ = require('lodash');
const TestConverter = require('./test-converter');

/**
 * Generates Mocha test files from Postman requests
 */
class TestGenerator {
  /**
   * Generate a Mocha test file from a Postman request
   * @param {Object} item - The Postman request item
   * @param {string} parentName - The name of the parent folder
   * @param {Object} options - Generation options
   * @returns {string} - The generated Mocha test code
   */
  static generateMochaTestFromRequest(item, parentName = '', options = {}) {
    if (!item?.name) {
      throw new Error('Request item must have a name');
    }

    const testName = parentName ? `${parentName} - ${item.name}` : item.name;
    const request = item.request;
    
    if (!request) {
      throw new Error(`Request "${item.name}" has no request object`);
    }

    const method = (request.method || 'GET').toLowerCase();
    const { url, pathname } = this._extractUrl(request.url, item.name);
    const body = this._extractRequestBody(request.body);
    const headers = this._extractHeaders(request.header);
    const testScript = this._extractTestScript(item.events);
    
    const mochaAssertions = TestConverter.convertPostmanTestToMocha(testScript);
    const requestCode = this._generateRequestCode(method, pathname, body, headers);
    const defaultAssertion = 'expect(response.status).to.be.oneOf([200, 201, 204]);';

    return `
describe('${testName}', function() {
  it('should respond with correct data', async function() {
    ${requestCode}
    
    ${mochaAssertions || defaultAssertion}
  });
});
`;
  }

  /**
   * Extract URL information from request
   * @private
   */
  static _extractUrl(requestUrl, itemName) {
    let url = '';
    let pathname = '/';
    
    if (requestUrl) {
      try {
        url = requestUrl.toString();
        pathname = new URL(url).pathname || '/';
      } catch (error) {
        // If URL parsing fails, try to extract path from raw URL
        if (typeof requestUrl === 'string') {
          const pathMatch = requestUrl.match(/\/[^?#]*/);
          pathname = pathMatch ? pathMatch[0] : '/';
        }
      }
    }
    
    return { url, pathname };
  }

  /**
   * Extract request body
   * @private
   */
  static _extractRequestBody(requestBody) {
    if (!requestBody || requestBody.mode !== 'raw' || !requestBody.raw) {
      return null;
    }

    try {
      return JSON.parse(requestBody.raw);
    } catch (error) {
      return requestBody.raw;
    }
  }

  /**
   * Extract headers
   * @private
   */
  static _extractHeaders(requestHeaders) {
    if (!requestHeaders || !Array.isArray(requestHeaders)) {
      return {};
    }

    return requestHeaders.reduce((acc, header) => {
      if (header.key && header.value && !header.disabled) {
        acc[header.key] = header.value;
      }
      return acc;
    }, {});
  }

  /**
   * Extract test script from events
   * @private
   */
  static _extractTestScript(events) {
    if (!events || !Array.isArray(events)) {
      return '';
    }

    const testEvent = events.find(e => e.listen === 'test');
    return testEvent?.script?.exec?.join('\n') || '';
  }

  /**
   * Generate request code based on method and parameters
   * @private
   */
  static _generateRequestCode(method, pathname, body, headers) {
    let code = `const response = await request.${method}('${pathname}')`;
    
    // Add headers if any
    if (Object.keys(headers).length > 0) {
      Object.entries(headers).forEach(([key, value]) => {
        code += `\n        .set('${key}', '${value}')`;
      });
    }
    
    // Add body if present
    if (body) {
      if (typeof body === 'object') {
        code += `\n        .send(${JSON.stringify(body, null, 2)})`;
      } else {
        code += `\n        .send('${body}')`;
      }
    }
    
    code += ';';
    return code;
  }

  /**
   * Generate setup file content
   * @param {string} baseUrl - Base URL for the API
   * @param {Object} environment - Environment variables
   * @returns {string} - Setup file content
   */
  static generateSetupFile(baseUrl, environment = null) {
    const envVars = environment ? JSON.stringify(environment, null, 2) : 'null';
    
    return `const supertest = require('supertest');
const { expect } = require('chai');
require('dotenv').config();

// Base URL configuration
const BASE_URL = process.env.API_BASE_URL || '${baseUrl}';
const request = supertest(BASE_URL);

// Environment variables from Postman
const env = ${envVars};

// Request timeout configuration
const DEFAULT_TIMEOUT = process.env.TEST_TIMEOUT || 10000;

module.exports = { 
  request, 
  expect,
  env,
  DEFAULT_TIMEOUT
};
`;
  }
}

module.exports = TestGenerator;
