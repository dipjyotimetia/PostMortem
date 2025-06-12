import * as _ from 'lodash';
import { TestConverter } from './test-converter';

export interface PostmanRequest {
  method?: string;
  url?: any;
  body?: {
    mode?: string;
    raw?: string;
  };
  header?: Array<{
    key?: string;
    value?: string;
    disabled?: boolean;
  }>;
}

export interface PostmanEvent {
  listen?: string;
  script?: {
    exec?: string[];
  };
}

export interface PostmanItem {
  name: string;
  request?: PostmanRequest;
  events?: PostmanEvent[];
}

export interface GenerationOptions {
  [key: string]: any;
}

export interface UrlInfo {
  url: string;
  pathname: string;
}

export interface EnvironmentVariables {
  [key: string]: string;
}

/**
 * Generates Mocha test files from Postman requests
 */
export class TestGenerator {
  /**
   * Generate a Mocha test file from a Postman request
   * @param item - The Postman request item
   * @param parentName - The name of the parent folder
   * @param options - Generation options
   * @returns The generated Mocha test code
   */
  static generateMochaTestFromRequest(
    item: PostmanItem, 
    parentName: string = '', 
    options: GenerationOptions = {}
  ): string {
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
  private static _extractUrl(requestUrl: any, itemName: string): UrlInfo {
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
  private static _extractRequestBody(requestBody?: PostmanRequest['body']): any {
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
  private static _extractHeaders(requestHeaders?: PostmanRequest['header']): Record<string, string> {
    if (!requestHeaders || !Array.isArray(requestHeaders)) {
      return {};
    }

    return requestHeaders.reduce((acc, header) => {
      if (header.key && header.value && !header.disabled) {
        acc[header.key] = header.value;
      }
      return acc;
    }, {} as Record<string, string>);
  }

  /**
   * Extract test script from events
   * @private
   */
  private static _extractTestScript(events?: PostmanEvent[]): string {
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
  private static _generateRequestCode(
    method: string, 
    pathname: string, 
    body: any, 
    headers: Record<string, string>
  ): string {
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
   * @param baseUrl - Base URL for the API
   * @param environment - Environment variables
   * @returns Setup file content
   */
  static generateSetupFile(baseUrl: string, environment: EnvironmentVariables | null = null): string {
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

export default TestGenerator;
