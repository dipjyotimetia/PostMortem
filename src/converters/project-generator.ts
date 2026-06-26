import * as path from 'node:path';
import { FileSystem } from '../utils/filesystem';
import { logger } from '../utils/logger';
import type { EnvironmentVariables } from './test-generator';

export interface ProjectOptions {
  projectName: string;
  baseUrl: string;
  environment: EnvironmentVariables | null;
  outputDir: string;
}

/**
 * Generates a complete Bun-native API test framework project.
 */
export class ProjectGenerator {
  /**
   * Generate a complete test project with all configuration files.
   * @param options - Project generation options
   */
  static async generateProject(options: ProjectOptions): Promise<void> {
    const { projectName, environment, outputDir } = options;

    logger.info(`Generating complete API test framework project: ${projectName}`);

    await ProjectGenerator._createProjectStructure(outputDir);
    await ProjectGenerator._generatePackageJson(outputDir, projectName);
    await ProjectGenerator._generateTsConfig(outputDir);
    await ProjectGenerator._generateBunfig(outputDir);
    await ProjectGenerator._generateEnvironmentFiles(outputDir, environment);
    await ProjectGenerator._generateReadme(outputDir, projectName);
    await ProjectGenerator._generateGitIgnore(outputDir);
    await ProjectGenerator._generateHelperFiles(outputDir);

    logger.success(`Complete API test project generated in: ${outputDir}`);
  }

  /**
   * Create the basic project directory structure.
   * @private
   */
  private static async _createProjectStructure(outputDir: string): Promise<void> {
    const dirs = ['src', 'src/tests', 'src/helpers'];
    for (const dir of dirs) {
      await FileSystem.ensureDir(path.join(outputDir, dir));
    }
    logger.debug('Created project directory structure');
  }

  /**
   * Generate package.json for a Bun test project.
   * @private
   */
  private static async _generatePackageJson(outputDir: string, projectName: string): Promise<void> {
    const packageJson = {
      name: projectName.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      description: `API test framework for ${projectName}`,
      type: 'module',
      private: true,
      scripts: {
        test: 'bun test',
        'test:watch': 'bun test --watch',
        'test:coverage': 'bun test --coverage',
        typecheck: 'tsc --noEmit'
      },
      devDependencies: {
        '@types/bun': '^1.3.0',
        typescript: '^5.7.0'
      },
      engines: {
        bun: '>=1.2.0'
      }
    };

    await FileSystem.writeFile(
      path.join(outputDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    logger.debug('Generated package.json');
  }

  /**
   * Generate TypeScript configuration (Bun preset).
   * @private
   */
  private static async _generateTsConfig(outputDir: string): Promise<void> {
    const tsConfig = {
      compilerOptions: {
        target: 'ESNext',
        module: 'Preserve',
        moduleResolution: 'bundler',
        lib: ['ESNext'],
        types: ['bun'],
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        resolveJsonModule: true,
        noEmit: true
      },
      include: ['src']
    };

    await FileSystem.writeFile(
      path.join(outputDir, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    );
    logger.debug('Generated tsconfig.json');
  }

  /**
   * Generate bunfig.toml.
   * @private
   */
  private static async _generateBunfig(outputDir: string): Promise<void> {
    const bunfig = `[test]
coverageReporter = ["text"]
`;
    await FileSystem.writeFile(path.join(outputDir, 'bunfig.toml'), bunfig);
    logger.debug('Generated bunfig.toml');
  }

  /**
   * Generate environment configuration files.
   * @private
   */
  private static async _generateEnvironmentFiles(
    outputDir: string,
    environment: EnvironmentVariables | null
  ): Promise<void> {
    const envExample =
      '# API Configuration\nAPI_BASE_URL=https://api.example.com\nAPI_TIMEOUT=30000\n\n# Test Configuration\nTEST_TIMEOUT=30000\n\n# Environment\nNODE_ENV=test\n';

    await FileSystem.writeFile(path.join(outputDir, '.env.example'), envExample);

    let envContent = envExample;
    if (environment) {
      const envVars = Object.entries(environment)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      envContent = `# Generated from Postman environment\n${envVars}\n\n${envExample}`;
    }

    await FileSystem.writeFile(path.join(outputDir, '.env'), envContent);
    logger.debug('Generated environment files');
  }

  /**
   * Generate the project README.
   * @private
   */
  private static async _generateReadme(outputDir: string, projectName: string): Promise<void> {
    const readme = `# ${projectName} - API Test Framework

This is an automatically generated, Bun-native API test framework created with postmortem.

## Quick Start

1. Install dependencies:
\`\`\`bash
bun install
\`\`\`

2. Update \`.env\` with your API configuration (Bun loads it automatically).

3. Run tests:
\`\`\`bash
bun test
\`\`\`

## Scripts

- \`bun test\` - Run all tests
- \`bun test --watch\` - Run tests in watch mode
- \`bun test --coverage\` - Run tests with coverage
- \`bun run typecheck\` - Type-check the project

## Generated Files

This project was generated from a Postman collection. Test files in \`src/tests/\`
correspond to your Postman requests and use \`bun:test\` with the native \`fetch\` API.
`;

    await FileSystem.writeFile(path.join(outputDir, 'README.md'), readme);
    logger.debug('Generated README.md');
  }

  /**
   * Generate the .gitignore file.
   * @private
   */
  private static async _generateGitIgnore(outputDir: string): Promise<void> {
    const gitignore =
      '# Dependencies\nnode_modules/\n\n# Coverage\ncoverage/\n\n# Environment files\n.env\n\n# IDE files\n.vscode/\n.idea/\n\n# OS files\n.DS_Store\n\n# Logs\n*.log\n';
    await FileSystem.writeFile(path.join(outputDir, '.gitignore'), gitignore);
    logger.debug('Generated .gitignore');
  }

  /**
   * Generate the API client and assertion helpers.
   * @private
   */
  private static async _generateHelperFiles(outputDir: string): Promise<void> {
    await FileSystem.writeFile(
      path.join(outputDir, 'src', 'helpers', 'api-client.ts'),
      ProjectGenerator._apiClientSource()
    );
    await FileSystem.writeFile(
      path.join(outputDir, 'src', 'helpers', 'test-helpers.ts'),
      ProjectGenerator._testHelpersSource()
    );
    logger.debug('Generated helper files');
  }

  /**
   * Source for the generated fetch-based API client.
   * @private
   */
  private static _apiClientSource(): string {
    return `export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
}

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * Error thrown for non-2xx responses (so tests can assert on \`error.status\`).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Minimal, dependency-free HTTP client built on the native \`fetch\` API.
 */
export class ApiClient {
  private baseURL: string;
  private readonly timeout: number;
  private readonly headers: Record<string, string>;

  constructor(config: ApiClientConfig) {
    this.baseURL = config.baseURL;
    this.timeout = config.timeout ?? 30000;
    this.headers = { 'Content-Type': 'application/json', ...config.headers };
  }

  private async send<T>(method: string, url: string, data?: unknown): Promise<ApiResponse<T>> {
    const target = url.startsWith('http') ? url : \`\${this.baseURL}\${url}\`;
    const init: RequestInit = {
      method,
      headers: this.headers,
      signal: AbortSignal.timeout(this.timeout)
    };

    if (data !== undefined && data !== null) {
      init.body = typeof data === 'string' ? data : JSON.stringify(data);
    }

    const response = await fetch(target, init);
    const text = await response.text();

    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    if (!response.ok) {
      throw new ApiError(\`Request failed with status \${response.status}\`, response.status, body);
    }

    return {
      data: body as T,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    };
  }

  get<T = unknown>(url: string): Promise<ApiResponse<T>> {
    return this.send<T>('GET', url);
  }

  post<T = unknown>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.send<T>('POST', url, data);
  }

  put<T = unknown>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.send<T>('PUT', url, data);
  }

  patch<T = unknown>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.send<T>('PATCH', url, data);
  }

  delete<T = unknown>(url: string): Promise<ApiResponse<T>> {
    return this.send<T>('DELETE', url);
  }

  setAuthToken(token: string): void {
    this.headers.Authorization = \`Bearer \${token}\`;
  }

  clearAuthToken(): void {
    delete this.headers.Authorization;
  }

  setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
  }

  setHeaders(headers: Record<string, string>): void {
    Object.assign(this.headers, headers);
  }
}

export default ApiClient;
`;
  }

  /**
   * Source for the generated assertion helpers (backed by bun:test).
   * @private
   */
  private static _testHelpersSource(): string {
    return `import { expect } from 'bun:test';
import type { ApiResponse } from './api-client';

export const DEFAULT_TIMEOUT = Number(process.env.TEST_TIMEOUT ?? 30000);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Validate that a response indicates success. */
export function expectSuccess(response: ApiResponse, validStatuses: number[] = [200, 201, 204]): void {
  expect(validStatuses).toContain(response.status);
  expect(response.data).toBeDefined();
}

/** Validate that the response time is within acceptable limits. */
export function expectResponseTime(startTime: number, maxTime: number = DEFAULT_TIMEOUT): void {
  expect(Date.now() - startTime).toBeLessThan(maxTime);
}

/** Validate that a response has the required fields. */
export function expectRequiredFields(data: unknown, fields: string[]): void {
  expect(data).toBeDefined();
  for (const field of fields) {
    expect(data).toHaveProperty(field);
  }
}

/** Validate that response data is an array. */
export function expectArray(data: unknown, minLength = 0): void {
  expect(Array.isArray(data)).toBe(true);
  expect((data as unknown[]).length).toBeGreaterThanOrEqual(minLength);
}

/** Validate that response data is a non-null object. */
export function expectObject(data: unknown): void {
  expect(isRecord(data)).toBe(true);
}

/** Validate that a response contains pagination metadata. */
export function expectPagination(data: unknown): void {
  expectObject(data);
  const fields = ['page', 'limit', 'total'];
  const record = data as Record<string, unknown>;
  const meta = isRecord(record.meta) ? record.meta : {};
  const pagination = isRecord(record.pagination) ? record.pagination : {};
  const hasField = fields.some(
    field => Object.hasOwn(record, field) || Object.hasOwn(meta, field) || Object.hasOwn(pagination, field)
  );
  expect(hasField).toBe(true);
}

/** Validate that a response contains error information. */
export function expectError(response: ApiResponse, expectedStatus: number[] = [400, 401, 403, 404, 422, 500]): void {
  expect(expectedStatus).toContain(response.status);
  if (isRecord(response.data)) {
    const { error, message, errors } = response.data;
    expect(Boolean(error || message || errors)).toBe(true);
  }
}

/** Validate that response data matches a simple type schema. */
export function expectSchema(data: unknown, schema: Record<string, string>): void {
  expectObject(data);
  const record = data as Record<string, unknown>;
  for (const [field, expectedType] of Object.entries(schema)) {
    expect(record).toHaveProperty(field);
    const value = record[field];
    if (expectedType === 'array') {
      expect(Array.isArray(value)).toBe(true);
    } else if (expectedType === 'date') {
      expect(Number.isNaN(Date.parse(String(value)))).toBe(false);
    } else {
      expect(value).toBeTypeOf(expectedType as 'string' | 'number' | 'boolean' | 'object');
    }
  }
}

/** Validate that an identifier is a non-empty string or positive number. */
export function expectValidId(id: unknown, fieldName = 'id'): void {
  const valid = (typeof id === 'number' && id > 0) || (typeof id === 'string' && id.length > 0);
  expect(valid, \`\${fieldName} should be a valid identifier\`).toBe(true);
}

/** Validate that a response contains an authentication token. */
export function expectAuthToken(data: unknown): void {
  expectObject(data);
  const record = data as Record<string, unknown>;
  const tokenField = ['token', 'access_token', 'accessToken', 'jwt'].find(field => Object.hasOwn(record, field));
  expect(tokenField).toBeDefined();
  if (tokenField) {
    expect(record[tokenField]).toBeTypeOf('string');
  }
}

/** Validate that a response indicates successful creation. */
export function expectCreated(response: ApiResponse): void {
  expect(response.status).toBe(201);
  expectObject(response.data);
  const record = response.data as Record<string, unknown>;
  const idField = ['id', '_id', 'uuid'].find(field => Object.hasOwn(record, field));
  if (idField) {
    expectValidId(record[idField], idField);
  }
}

/** Validate that a response indicates a successful update. */
export function expectUpdated(response: ApiResponse): void {
  expectSuccess(response, [200, 204]);
  if (response.status === 200) {
    expectObject(response.data);
  }
}

/** Validate that a response indicates successful deletion. */
export function expectDeleted(response: ApiResponse): void {
  expectSuccess(response, [200, 204]);
}
`;
  }
}

export default ProjectGenerator;
