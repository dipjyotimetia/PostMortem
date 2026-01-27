import { TestConverter } from './test-converter';

export interface PostmanRequest {
  method?: string;
  url?: unknown;
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
  [key: string]: unknown;
}

export interface UrlInfo {
  url: string;
  pathname: string;
}

export interface EnvironmentVariables {
  [key: string]: string;
}

/**
 * Escapes special characters in strings for safe use in generated JavaScript/TypeScript code
 * @param str - The string to escape
 * @returns The escaped string safe for use in single-quoted strings
 */
function escapeForJs(str: string): string {
  return str
    .replace(/\\/g, '\\\\')     // Escape backslashes first
    .replace(/'/g, "\\'")        // Escape single quotes
    .replace(/"/g, '\\"')        // Escape double quotes
    .replace(/\n/g, '\\n')       // Escape newlines
    .replace(/\r/g, '\\r')       // Escape carriage returns
    .replace(/\t/g, '\\t')       // Escape tabs
    .replace(/\$/g, '\\$')       // Escape dollar signs (template literals)
    .replace(/`/g, '\\`');       // Escape backticks
}

/**
 * Sanitizes a test name for safe use in describe/it blocks
 * @param name - The test name to sanitize
 * @returns Sanitized test name
 */
function sanitizeTestName(name: string): string {
  // Remove or replace characters that could break string literals
  return escapeForJs(name.trim());
}

/**
 * Sanitizes a URL path for safe use in generated code
 * @param pathname - The pathname to sanitize
 * @returns Sanitized pathname
 */
function sanitizePath(pathname: string): string {
  // Escape quotes and backslashes in the path
  return escapeForJs(pathname);
}

/**
 * Extracts error message from unknown error type
 * @param error - The caught error
 * @returns Error message string
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
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

    const rawTestName = parentName ? `${parentName} - ${item.name}` : item.name;
    const testName = sanitizeTestName(rawTestName);
    const request = item.request;

    if (!request) {
      throw new Error(`Request "${item.name}" has no request object`);
    }

    const method = (request.method || 'GET').toLowerCase();
    const { pathname: rawPathname } = this._extractUrl(request.url, item.name);
    const pathname = sanitizePath(rawPathname);
    const body = this._extractRequestBody(request.body);
    const headers = this._extractHeaders(request.header);
    const testScript = this._extractTestScript(item.events);

    const mochaAssertions = TestConverter.convertPostmanTestToMocha(testScript);

    // Determine if this is for full project (enhanced) mode
    const isEnhanced = !!(options && options.enhanced);


    if (isEnhanced) {
      // Generate enhanced test with API client
      const bodyParam = body ? `, ${JSON.stringify(body, null, 6)}` : '';

      return `
describe('${testName}', function() {
  it('should respond with correct data', async function() {
    const startTime = Date.now();

    try {
      const response = await api.${method}('${pathname}'${bodyParam});

      // Basic validation
      expectSuccess(response);
      expectResponseTime(startTime, DEFAULT_TIMEOUT);

      ${mochaAssertions || '// Add custom assertions here'}

      console.log('Test passed: ' + this.test?.title + ' - Status: ' + response.status + ', Time: ' + (Date.now() - startTime) + 'ms');

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Test failed: ' + this.test?.title + ' - ' + message);
      throw error;
    }
  });
});
`;
    } else {
      // Generate regular test with supertest
      const requestCode = this._generateRequestCode(method, pathname, body, headers);
      const defaultAssertion = 'expect(response.status).to.equal(200);';

      return `
describe('${testName}', function() {
  it('should respond with correct data', async function() {
    ${requestCode}

    ${mochaAssertions || defaultAssertion}
  });
});
`;
    }
  }

  /**
   * Generate enhanced Mocha test file for full project setup
   * @param item - The Postman request item
   * @param parentName - The name of the parent folder
   * @param options - Generation options
   * @returns The generated enhanced Mocha test code
   */
  static generateEnhancedMochaTest(
    item: PostmanItem,
    parentName: string = '',
    _options: GenerationOptions = {}
  ): string {
    if (!item?.name) {
      throw new Error('Request item must have a name');
    }

    const rawTestName = parentName ? `${parentName} - ${item.name}` : item.name;
    const testName = sanitizeTestName(rawTestName);
    const request = item.request;

    if (!request) {
      throw new Error(`Request "${item.name}" has no request object`);
    }

    const method = (request.method || 'GET').toLowerCase();
    const { pathname: rawPathname } = this._extractUrl(request.url, item.name);
    const pathname = sanitizePath(rawPathname);
    const body = this._extractRequestBody(request.body);
    const testScript = this._extractTestScript(item.events);

    const mochaAssertions = TestConverter.convertPostmanTestToMocha(testScript);
    const hasCustomAssertions = mochaAssertions.trim().length > 0;

    // Generate enhanced test with API client and helpers
    const bodyParam = body ? `, ${JSON.stringify(body, null, 6)}` : '';
    const assertions = hasCustomAssertions
      ? `// Custom assertions from Postman\n      ${mochaAssertions}`
      : '// Default validation\n      expect(response.data).to.exist;';

    // Create the test content using string concatenation to avoid template literal issues
    let testContent = `describe('${testName}', function() {\n`;
    testContent += '  it(\'should respond with correct data\', async function() {\n';
    testContent += '    const startTime = Date.now();\n';
    testContent += '    \n';
    testContent += '    try {\n';
    testContent += '      // Make API request using enhanced client\n';
    testContent += `      const response = await api.${method}('${pathname}'${bodyParam});\n`;
    testContent += '      \n';
    testContent += '      // Basic success validation\n';
    testContent += '      expectSuccess(response);\n';
    testContent += '      \n';
    testContent += '      // Response time validation\n';
    testContent += '      expectResponseTime(startTime, DEFAULT_TIMEOUT);\n';
    testContent += '      \n';
    testContent += `      ${assertions}\n`;
    testContent += '      \n';
    testContent += '      // Log response for debugging\n';
    testContent += '      console.log(\'Test passed: \' + this.test?.title + \' - Status: \' + response.status + \', Time: \' + (Date.now() - startTime) + \'ms\');\n';
    testContent += '      \n';
    testContent += '    } catch (error) {\n';
    testContent += '      const message = error instanceof Error ? error.message : String(error);\n';
    testContent += '      console.error(\'Test failed: \' + this.test?.title + \' - \' + message);\n';
    testContent += '      throw error;\n';
    testContent += '    }\n';
    testContent += '  });\n';
    testContent += '  \n';
    testContent += this._generateAdditionalTests(method, pathname, body);
    testContent += '\n});';

    return testContent;
  }

  /**
   * Generate additional test cases based on the request type
   * @private
   */
  private static _generateAdditionalTests(method: string, pathname: string, body: unknown): string {
    const tests: string[] = [];

    // Add smoke test for all endpoints
    const smokeBodyParam = body ? `, ${JSON.stringify(body, null, 6)}` : '';
    tests.push(`it('should be accessible (smoke test)', async function() {
    const response = await api.${method}('${pathname}'${smokeBodyParam});
    expect(response.status).to.be.lessThan(500);
  });`);

    // Add specific tests based on method
    switch (method.toUpperCase()) {
    case 'GET':
      if (pathname.includes('/:id') || pathname.match(/\/\d+/)) {
        const invalidPath = sanitizePath(pathname.replace(/\/:\w+|\/\d+/, '/99999'));
        tests.push(`it('should handle invalid ID gracefully', async function() {
    try {
      const response = await api.get('${invalidPath}');
      expect(response.status).to.be.oneOf([404, 400]);
    } catch (error) {
      // Expected for invalid IDs
      const err = error as { status?: number };
      expect(err.status).to.be.oneOf([404, 400]);
    }
  });`);
      }
      break;

    case 'POST':
      tests.push(`it('should validate required fields', async function() {
    try {
      const response = await api.post('${pathname}', {});
      // Either succeeds with defaults or fails validation
      expect(response.status).to.be.oneOf([201, 400, 422]);
    } catch (error) {
      const err = error as { status?: number };
      expect(err.status).to.be.oneOf([400, 422]);
    }
  });`);
      break;

    case 'PUT':
    case 'PATCH':
      tests.push(`it('should handle partial updates', async function() {
    const partialData = { name: 'Updated Name' };
    const response = await api.${method}('${pathname}', partialData);
    expectSuccess(response, [200, 204]);
  });`);
      break;

    case 'DELETE':
      if (pathname.includes('/:id') || pathname.match(/\/\d+/)) {
        const invalidPath = sanitizePath(pathname.replace(/\/:\w+|\/\d+/, '/99999'));
        tests.push(`it('should handle non-existent resource deletion', async function() {
    try {
      const response = await api.delete('${invalidPath}');
      expect(response.status).to.be.oneOf([404, 204]);
    } catch (error) {
      const err = error as { status?: number };
      expect(err.status).to.equal(404);
    }
  });`);
      }
      break;
    }

    return tests.join('\n\n  ');
  }

  /**
   * Extract URL information from request
   * @private
   */
  private static _extractUrl(requestUrl: unknown, _itemName: string): UrlInfo {
    let url = '';
    let pathname = '/';

    if (requestUrl) {
      try {
        url = requestUrl.toString();
        pathname = new globalThis.URL(url).pathname || '/';
      } catch {
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
  private static _extractRequestBody(requestBody?: PostmanRequest['body']): unknown {
    if (!requestBody || requestBody.mode !== 'raw' || !requestBody.raw) {
      return null;
    }

    try {
      return JSON.parse(requestBody.raw);
    } catch {
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
        // Sanitize header values to prevent injection
        acc[escapeForJs(header.key)] = escapeForJs(header.value);
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
    body: unknown,
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
        // Escape string body content
        const escapedBody = escapeForJs(String(body));
        code += `\n        .send('${escapedBody}')`;
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
    // Sanitize the base URL
    const sanitizedBaseUrl = escapeForJs(baseUrl);
    const envVars = environment ? JSON.stringify(environment, null, 2) : 'null';

    return `import supertest from 'supertest';
import { expect } from 'chai';
import 'dotenv/config';

// Base URL configuration
const BASE_URL = process.env.API_BASE_URL || '${sanitizedBaseUrl}';
export const request = supertest(BASE_URL);

// Environment variables from Postman
export const env = ${envVars};

// Request timeout configuration
export const DEFAULT_TIMEOUT = parseInt(process.env.TEST_TIMEOUT || '10000', 10);

// Re-export expect for convenience
export { expect };
`;
  }
}

export default TestGenerator;
