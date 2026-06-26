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
  enhanced?: boolean;
  [key: string]: unknown;
}

export interface UrlInfo {
  url: string;
  pathname: string;
}

export interface EnvironmentVariables {
  [key: string]: string;
}

const METHODS_WITH_BODY = new Set(['post', 'put', 'patch']);

/**
 * Generates `bun:test` test files (native `fetch`) from Postman requests.
 */
export class TestGenerator {
  /**
   * Generate a `bun:test` test file body from a Postman request.
   * @param item - The Postman request item
   * @param parentName - The name of the parent folder
   * @param options - Generation options (`enhanced` for full-project output)
   * @returns The generated test code (without import header)
   */
  static generateTestFromRequest(
    item: PostmanItem,
    parentName = '',
    options: GenerationOptions = {}
  ): string {
    const { testName, request } = TestGenerator._describe(item, parentName);

    if (options.enhanced) {
      return TestGenerator.generateEnhancedTest(item, parentName, options);
    }

    const method = (request.method || 'GET').toLowerCase();
    const { pathname } = TestGenerator._extractUrl(request.url);
    const body = TestGenerator._extractRequestBody(request.body);
    const headers = TestGenerator._extractHeaders(request.header);
    const testScript = TestGenerator._extractTestScript(item.events);

    const assertions = TestConverter.convertPostmanTest(testScript);
    const requestCode = TestGenerator._generateRequestCode(method, pathname, body, headers);
    const defaultAssertion = 'expect(response.status).toBe(200);';

    return `describe('${testName}', () => {
  it('should respond with correct data', async () => {
    ${requestCode}

    ${assertions || defaultAssertion}
  });
});
`;
  }

  /**
   * Generate an enhanced (full-project) `bun:test` file backed by the
   * shared API client and assertion helpers.
   */
  static generateEnhancedTest(
    item: PostmanItem,
    parentName = '',
    _options: GenerationOptions = {}
  ): string {
    const { testName, request } = TestGenerator._describe(item, parentName);

    const method = (request.method || 'GET').toLowerCase();
    const { pathname } = TestGenerator._extractUrl(request.url);
    const body = TestGenerator._extractRequestBody(request.body);
    const testScript = TestGenerator._extractTestScript(item.events);

    const converted = TestConverter.convertPostmanTest(testScript).trim();
    const assertions = converted
      ? `// Custom assertions from Postman\n      ${converted}`
      : '// Default validation\n      expect(response.data).toBeDefined();';

    const bodyParam = body ? `, ${JSON.stringify(body, null, 6)}` : '';
    const additionalTests = TestGenerator._generateAdditionalTests(method, pathname, body);

    return `describe('${testName}', () => {
  it('should respond with correct data', async () => {
    const start = Date.now();
    const response = await api.${method}('${pathname}'${bodyParam});

    expectSuccess(response);
    expectResponseTime(start, DEFAULT_TIMEOUT);

    ${assertions}
  });

  ${additionalTests}
});
`;
  }

  /**
   * Resolve the describe title and validate the request item.
   * @private
   */
  private static _describe(
    item: PostmanItem,
    parentName: string
  ): { testName: string; request: PostmanRequest } {
    if (!item?.name) {
      throw new Error('Request item must have a name');
    }
    if (!item.request) {
      throw new Error(`Request "${item.name}" has no request object`);
    }
    const testName = parentName ? `${parentName} - ${item.name}` : item.name;
    return { testName, request: item.request };
  }

  /**
   * Generate additional test cases based on the request method.
   * @private
   */
  private static _generateAdditionalTests(method: string, pathname: string, body: unknown): string {
    const tests: string[] = [];
    const smokeBody = body ? `, ${JSON.stringify(body, null, 6)}` : '';

    tests.push(`it('should be accessible (smoke test)', async () => {
    const response = await api.${method}('${pathname}'${smokeBody});
    expect(response.status).toBeLessThan(500);
  });`);

    switch (method.toUpperCase()) {
      case 'GET':
        if (pathname.includes('/:id') || /\/\d+/.test(pathname)) {
          const invalidPath = pathname.replace(/\/:\w+|\/\d+/, '/99999');
          tests.push(`it('should handle invalid ID gracefully', async () => {
    try {
      const response = await api.get('${invalidPath}');
      expect([404, 400]).toContain(response.status);
    } catch (error) {
      expect([404, 400]).toContain((error as { status: number }).status);
    }
  });`);
        }
        break;

      case 'POST':
        tests.push(`it('should validate required fields', async () => {
    try {
      const response = await api.post('${pathname}', {});
      expect([201, 400, 422]).toContain(response.status);
    } catch (error) {
      expect([400, 422]).toContain((error as { status: number }).status);
    }
  });`);
        break;

      case 'PUT':
      case 'PATCH':
        tests.push(`it('should handle partial updates', async () => {
    const partialData = { name: 'Updated Name' };
    const response = await api.${method}('${pathname}', partialData);
    expectSuccess(response, [200, 204]);
  });`);
        break;

      case 'DELETE':
        if (pathname.includes('/:id') || /\/\d+/.test(pathname)) {
          const invalidPath = pathname.replace(/\/:\w+|\/\d+/, '/99999');
          tests.push(`it('should handle non-existent resource deletion', async () => {
    try {
      const response = await api.delete('${invalidPath}');
      expect([404, 204]).toContain(response.status);
    } catch (error) {
      expect((error as { status: number }).status).toBe(404);
    }
  });`);
        }
        break;
    }

    return tests.join('\n\n  ');
  }

  /**
   * Extract URL information from a request.
   * @private
   */
  private static _extractUrl(requestUrl: unknown): UrlInfo {
    let url = '';
    let pathname = '/';

    if (requestUrl) {
      try {
        url = requestUrl.toString();
        pathname = new globalThis.URL(url).pathname || '/';
      } catch {
        if (typeof requestUrl === 'string') {
          const pathMatch = requestUrl.match(/\/[^?#]*/);
          pathname = pathMatch ? (pathMatch[0] as string) : '/';
        }
      }
    }

    return { url, pathname };
  }

  /**
   * Extract a parsed request body.
   * @private
   */
  private static _extractRequestBody(requestBody?: PostmanRequest['body']): unknown {
    if (requestBody?.mode !== 'raw' || !requestBody.raw) {
      return null;
    }

    try {
      return JSON.parse(requestBody.raw);
    } catch {
      return requestBody.raw;
    }
  }

  /**
   * Extract enabled headers as a record.
   * @private
   */
  private static _extractHeaders(
    requestHeaders?: PostmanRequest['header']
  ): Record<string, string> {
    if (!Array.isArray(requestHeaders)) {
      return {};
    }

    return requestHeaders.reduce(
      (acc, header) => {
        if (header.key && header.value && !header.disabled) {
          acc[header.key] = header.value;
        }
        return acc;
      },
      {} as Record<string, string>
    );
  }

  /**
   * Extract the `test` event script from an item's events.
   * @private
   */
  private static _extractTestScript(events?: PostmanEvent[]): string {
    if (!Array.isArray(events)) {
      return '';
    }
    const testEvent = events.find(e => e.listen === 'test');
    return testEvent?.script?.exec?.join('\n') || '';
  }

  /**
   * Generate the `fetch`-client request line for a request.
   * @private
   */
  private static _generateRequestCode(
    method: string,
    pathname: string,
    body: unknown,
    headers: Record<string, string>
  ): string {
    const hasHeaders = Object.keys(headers).length > 0;
    const headerArg = hasHeaders ? `, ${JSON.stringify(headers)}` : '';

    if (METHODS_WITH_BODY.has(method)) {
      const bodyArg = body ? `, ${JSON.stringify(body, null, 2)}` : hasHeaders ? ', undefined' : '';
      return `const response = await request.${method}('${pathname}'${bodyArg}${headerArg});`;
    }

    return `const response = await request.${method}('${pathname}'${headerArg});`;
  }

  /**
   * Generate the `setup.ts` content for regular (non full-project) output.
   * @param baseUrl - Base URL for the API
   * @param environment - Environment variables
   * @returns Setup file content
   */
  static generateSetupFile(
    baseUrl: string,
    environment: EnvironmentVariables | null = null
  ): string {
    const envVars = environment ? JSON.stringify(environment, null, 2) : 'null';

    return `import { expect } from 'bun:test';

// Base URL configuration (Bun auto-loads .env)
const BASE_URL = process.env.API_BASE_URL ?? '${baseUrl}';

// Environment variables from Postman
export const env: Record<string, string> | null = ${envVars};

// Request timeout configuration
export const DEFAULT_TIMEOUT = Number(process.env.TEST_TIMEOUT ?? 10000);

export interface ApiResponse<T = unknown> {
  status: number;
  statusText: string;
  headers: Headers;
  body: T;
}

async function send(
  method: string,
  pathname: string,
  body?: unknown,
  headers: Record<string, string> = {}
): Promise<ApiResponse> {
  const url = pathname.startsWith('http') ? pathname : \`\${BASE_URL}\${pathname}\`;
  const init: RequestInit = { method, headers: { 'Content-Type': 'application/json', ...headers } };

  if (body !== undefined && body !== null) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(url, init);
  const text = await response.text();

  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  return { status: response.status, statusText: response.statusText, headers: response.headers, body: parsed };
}

// Lightweight fetch-based client (Supertest-like ergonomics)
export const request = {
  get: (path: string, headers?: Record<string, string>) => send('GET', path, undefined, headers),
  post: (path: string, body?: unknown, headers?: Record<string, string>) => send('POST', path, body, headers),
  put: (path: string, body?: unknown, headers?: Record<string, string>) => send('PUT', path, body, headers),
  patch: (path: string, body?: unknown, headers?: Record<string, string>) => send('PATCH', path, body, headers),
  delete: (path: string, headers?: Record<string, string>) => send('DELETE', path, undefined, headers)
};

export { expect };
`;
  }
}

export default TestGenerator;
