import * as path from 'path';
import { EnvironmentVariables } from './test-generator';
import { FileSystem } from '../utils/filesystem';
import { logger } from '../utils/logger';

export interface ProjectOptions {
  projectName: string;
  baseUrl: string;
  environment: EnvironmentVariables | null;
  outputDir: string;
}

/**
 * Generates a complete API test framework project
 */
export class ProjectGenerator {
  /**
   * Generate a complete test project with all configuration files
   * @param options - Project generation options
   */
  static async generateProject(options: ProjectOptions): Promise<void> {
    const { projectName, baseUrl, environment, outputDir } = options;

    logger.info(`Generating complete API test framework project: ${projectName}`);

    // Create project structure
    await this._createProjectStructure(outputDir);

    // Generate configuration files
    await this._generatePackageJson(outputDir, projectName, baseUrl);
    await this._generateTsConfig(outputDir);
    await this._generateMochaConfig(outputDir);
    await this._generateEnvironmentFiles(outputDir, environment);
    await this._generateReadme(outputDir, projectName);
    await this._generateGitIgnore(outputDir);

    // Generate helper files
    await this._generateHelperFiles(outputDir, baseUrl, environment);

    logger.success(`Complete API test project generated in: ${outputDir}`);
  }

  /**
   * Create the basic project directory structure
   * @private
   */
  private static async _createProjectStructure(outputDir: string): Promise<void> {
    const dirs = [
      'src',
      'src/tests',
      'src/helpers',
      'src/utils',
      'src/config',
      'reports'
    ];

    for (const dir of dirs) {
      await FileSystem.ensureDir(path.join(outputDir, dir));
    }

    logger.debug('Created project directory structure');
  }

  /**
   * Generate package.json with all necessary dependencies
   * @private
   */
  private static async _generatePackageJson(
    outputDir: string,
    projectName: string,
    baseUrl: string
  ): Promise<void> {
    const packageJson = {
      name: projectName.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      description: `API test framework for ${projectName}`,
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: {
        'build': 'tsc',
        'build:watch': 'tsc --watch',
        'clean': 'rm -rf dist reports/*',
        'prebuild': 'npm run clean',
        'test': 'npm run build && mocha dist/tests/**/*.test.js --require dist/setup.js',
        'test:watch': 'npm run build && mocha dist/tests/**/*.test.js --require dist/setup.js --watch',
        'test:report': 'npm run build && mocha dist/tests/**/*.test.js --require dist/setup.js --reporter mochawesome --reporter-options reportDir=reports',
        'lint': 'eslint src --ext .ts',
        'lint:fix': 'eslint src --ext .ts --fix',
        'start': 'npm test'
      },
      dependencies: {
        'supertest': '^7.0.0',
        'chai': '^5.2.0',
        'dotenv': '^16.4.7',
        'axios': '^1.7.0',
        'lodash': '^4.17.21'
      },
      devDependencies: {
        '@types/chai': '^5.2.2',
        '@types/mocha': '^10.0.10',
        '@types/node': '^24.0.1',
        '@types/supertest': '^6.0.3',
        '@types/lodash': '^4.17.17',
        'typescript': '^5.8.3',
        'mocha': '^11.1.0',
        'mochawesome': '^7.1.3',
        'eslint': '^9.17.0'
      },
      engines: {
        node: '>=18.0.0'
      }
    };

    await FileSystem.writeFile(
      path.join(outputDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    logger.debug('Generated package.json');
  }

  /**
   * Generate TypeScript configuration
   * @private
   */
  private static async _generateTsConfig(outputDir: string): Promise<void> {
    const tsConfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'CommonJS',
        lib: ['ES2022'],
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        moduleResolution: 'node',
        resolveJsonModule: true,
        declaration: true,
        sourceMap: true
      },
      include: [
        'src/**/*'
      ],
      exclude: [
        'node_modules',
        'dist',
        'reports'
      ]
    };

    await FileSystem.writeFile(
      path.join(outputDir, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    );

    logger.debug('Generated tsconfig.json');
  }

  /**
   * Generate Mocha configuration
   * @private
   */
  private static async _generateMochaConfig(outputDir: string): Promise<void> {
    const mochaConfig = {
      reporter: 'spec',
      timeout: 30000,
      recursive: true,
      exit: true
    };

    await FileSystem.writeFile(
      path.join(outputDir, '.mocharc.json'),
      JSON.stringify(mochaConfig, null, 2)
    );

    logger.debug('Generated .mocharc.json');
  }

  /**
   * Generate environment configuration files
   * @private
   */
  private static async _generateEnvironmentFiles(
    outputDir: string,
    environment: EnvironmentVariables | null
  ): Promise<void> {
    // Generate .env.example
    const envExample = '# API Configuration\nAPI_BASE_URL=https://api.example.com\nAPI_TIMEOUT=30000\n\n# Test Configuration\nTEST_TIMEOUT=30000\n\n# Environment\nNODE_ENV=test\n';

    await FileSystem.writeFile(path.join(outputDir, '.env.example'), envExample);

    // Generate actual .env file
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
   * Generate project README
   * @private
   */
  private static async _generateReadme(outputDir: string, projectName: string): Promise<void> {
    const readme = `# ${projectName} - API Test Framework\n\n` +
      'This is an automatically generated API test framework created with postmortem.\n\n' +
      '## Quick Start\n\n' +
      '1. Install dependencies:\n```bash\nnpm install\n```\n\n' +
      '2. Update .env with your API configuration\n\n' +
      '3. Run tests:\n```bash\nnpm test\n```\n\n' +
      '## Scripts\n\n' +
      '- `npm test` - Run all tests\n' +
      '- `npm run test:watch` - Run tests in watch mode\n' +
      '- `npm run test:report` - Generate HTML test report\n' +
      '- `npm run build` - Build TypeScript\n' +
      '- `npm run lint` - Lint code\n\n' +
      '## Generated Files\n\n' +
      'This project was generated from a Postman collection. Test files in `src/tests/` correspond to your Postman requests.\n';

    await FileSystem.writeFile(path.join(outputDir, 'README.md'), readme);
    logger.debug('Generated README.md');
  }

  /**
   * Generate .gitignore file
   * @private
   */
  private static async _generateGitIgnore(outputDir: string): Promise<void> {
    const gitignore = '# Dependencies\nnode_modules/\n\n# Build outputs\ndist/\n\n# Test reports\nreports/\n\n# Environment files\n.env\n\n# IDE files\n.vscode/\n.idea/\n\n# OS files\n.DS_Store\n\n# Logs\n*.log\n';

    await FileSystem.writeFile(path.join(outputDir, '.gitignore'), gitignore);
    logger.debug('Generated .gitignore');
  }

  /**
   * Generate all helper files for the project
   * @private
   */
  private static async _generateHelperFiles(
    outputDir: string,
    baseUrl: string,
    environment: EnvironmentVariables | null
  ): Promise<void> {
    await this._generateSimpleHelpers(outputDir);
    await this._generateEnhancedSetup(outputDir, baseUrl, environment);

    logger.debug('Generated helper files');
  }

  /**
   * Generate simplified helper files as fallback
   * @private
   */
  private static async _generateSimpleHelpers(outputDir: string): Promise<void> {
    const apiClientContent = `import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
}

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export class ApiClient {
  private client: AxiosInstance;

  constructor(config: ApiClientConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      }
    });
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<T>(url, config);
    return this.transformResponse(response);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post<T>(url, data, config);
    return this.transformResponse(response);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put<T>(url, data, config);
    return this.transformResponse(response);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.patch<T>(url, data, config);
    return this.transformResponse(response);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<T>(url, config);
    return this.transformResponse(response);
  }

  setAuthToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = \`Bearer \${token}\`;
  }

  clearAuthToken(): void {
    delete this.client.defaults.headers.common['Authorization'];
  }

  setBaseURL(baseURL: string): void {
    this.client.defaults.baseURL = baseURL;
  }

  private transformResponse<T>(response: AxiosResponse<T>): ApiResponse<T> {
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    };
  }
}

export default ApiClient;`;

    const testHelpersContent = `import { expect } from 'chai';
import { ApiResponse } from './api-client';

export const DEFAULT_TIMEOUT = 30000;

/**
 * Validates that a response indicates success
 */
export function expectSuccess(response: ApiResponse, validStatuses: number[] = [200, 201, 204]): void {
  expect(response.status, \`Expected success status, got \${response.status}\`).to.be.oneOf(validStatuses);
  expect(response.data, 'Response should have data').to.exist;
}

/**
 * Validates response time is within acceptable limits
 */
export function expectResponseTime(startTime: number, maxTime: number = DEFAULT_TIMEOUT): void {
  const responseTime = Date.now() - startTime;
  expect(responseTime, \`Response time \${responseTime}ms exceeded maximum \${maxTime}ms\`).to.be.below(maxTime);
}

/**
 * Validates that response has required fields
 */
export function expectRequiredFields(data: any, fields: string[]): void {
  expect(data, 'Response data should exist').to.exist;
  
  for (const field of fields) {
    expect(data, \`Response should have field: \${field}\`).to.have.property(field);
    expect(data[field], \`Field \${field} should not be null or undefined\`).to.not.be.oneOf([null, undefined]);
  }
}

/**
 * Validates that response data is an array
 */
export function expectArray(data: any, minLength: number = 0): void {
  expect(data, 'Response data should be an array').to.be.an('array');
  expect(data.length, \`Array should have at least \${minLength} items\`).to.be.at.least(minLength);
}

/**
 * Validates that response data is an object
 */
export function expectObject(data: any): void {
  expect(data, 'Response data should be an object').to.be.an('object');
  expect(data, 'Response data should not be null').to.not.be.null;
}

/**
 * Validates that response contains pagination metadata
 */
export function expectPagination(data: any): void {
  expectObject(data);
  
  const paginationFields = ['page', 'limit', 'total'];
  const hasAnyPaginationField = paginationFields.some(field => 
    data.hasOwnProperty(field) || 
    (data.meta && data.meta.hasOwnProperty(field)) ||
    (data.pagination && data.pagination.hasOwnProperty(field))
  );
  
  expect(hasAnyPaginationField, 'Response should contain pagination metadata').to.be.true;
}

/**
 * Validates that response contains error information
 */
export function expectError(response: ApiResponse, expectedStatus: number[] = [400, 401, 403, 404, 422, 500]): void {
  expect(response.status, \`Expected error status, got \${response.status}\`).to.be.oneOf(expectedStatus);
  
  if (response.data) {
    const hasErrorInfo = 
      response.data.error || 
      response.data.message || 
      response.data.errors ||
      typeof response.data === 'string';
    
    expect(hasErrorInfo, 'Error response should contain error information').to.be.true;
  }
}

/**
 * Validates that response data matches a schema pattern
 */
export function expectSchema(data: any, schema: Record<string, string>): void {
  expectObject(data);
  
  for (const [field, expectedType] of Object.entries(schema)) {
    expect(data, \`Response should have field: \${field}\`).to.have.property(field);
    
    const actualValue = data[field];
    switch (expectedType) {
      case 'string':
        expect(actualValue, \`Field \${field} should be a string\`).to.be.a('string');
        break;
      case 'number':
        expect(actualValue, \`Field \${field} should be a number\`).to.be.a('number');
        break;
      case 'boolean':
        expect(actualValue, \`Field \${field} should be a boolean\`).to.be.a('boolean');
        break;
      case 'array':
        expect(actualValue, \`Field \${field} should be an array\`).to.be.an('array');
        break;
      case 'object':
        expect(actualValue, \`Field \${field} should be an object\`).to.be.an('object');
        break;
      case 'date':
        expect(actualValue, \`Field \${field} should be a valid date\`).to.satisfy((val: any) => {
          return !isNaN(Date.parse(val));
        });
        break;
      default:
        throw new Error(\`Unknown schema type: \${expectedType}\`);
    }
  }
}

/**
 * Validates that an ID field is valid
 */
export function expectValidId(id: any, fieldName: string = 'id'): void {
  expect(id, \`\${fieldName} should exist\`).to.exist;
  
  // Check if it's a valid numeric ID or UUID
  const isNumericId = typeof id === 'number' && id > 0;
  const isStringId = typeof id === 'string' && id.length > 0;
  
  expect(isNumericId || isStringId, \`\${fieldName} should be a valid identifier\`).to.be.true;
}

/**
 * Validates that response contains authentication token
 */
export function expectAuthToken(data: any): void {
  expectObject(data);
  
  const tokenFields = ['token', 'access_token', 'accessToken', 'jwt'];
  const hasToken = tokenFields.some(field => data.hasOwnProperty(field));
  
  expect(hasToken, 'Response should contain authentication token').to.be.true;
  
  const tokenField = tokenFields.find(field => data.hasOwnProperty(field));
  if (tokenField) {
    expect(data[tokenField], 'Token should not be empty').to.be.a('string').and.not.be.empty;
  }
}

/**
 * Validates that response indicates successful creation
 */
export function expectCreated(response: ApiResponse): void {
  expect(response.status, 'Should return 201 Created status').to.equal(201);
  expectObject(response.data);
  
  // Check for common ID fields that indicate resource creation
  const idFields = ['id', '_id', 'uuid'];
  const hasId = idFields.some(field => response.data.hasOwnProperty(field));
  
  if (hasId) {
    const idField = idFields.find(field => response.data.hasOwnProperty(field));
    expectValidId(response.data[idField!], idField);
  }
}

/**
 * Validates that response indicates successful update
 */
export function expectUpdated(response: ApiResponse): void {
  expectSuccess(response, [200, 204]);
  
  if (response.status === 200) {
    expectObject(response.data);
  }
}

/**
 * Validates that response indicates successful deletion
 */
export function expectDeleted(response: ApiResponse): void {
  expectSuccess(response, [200, 204]);
}

export default {
  expectSuccess,
  expectResponseTime,
  expectRequiredFields,
  expectArray,
  expectObject,
  expectPagination,
  expectError,
  expectSchema,
  expectValidId,
  expectAuthToken,
  expectCreated,
  expectUpdated,
  expectDeleted
};`;

    await FileSystem.writeFile(
      path.join(outputDir, 'src', 'helpers', 'api-client.ts'),
      apiClientContent
    );

    await FileSystem.writeFile(
      path.join(outputDir, 'src', 'helpers', 'test-helpers.ts'),
      testHelpersContent
    );
  }

  /**
   * Generate enhanced setup file
   * @private
   */
  private static async _generateEnhancedSetup(
    outputDir: string,
    baseUrl: string,
    environment: EnvironmentVariables | null
  ): Promise<void> {
    const envVarsComment = environment
      ? `// Environment variables from Postman collection\n${Object.entries(environment)
        .map(([key, value]) => `// ${key}=${value}`)
        .join('\n')}`
      : '// No environment variables from Postman collection';

    const setupContent = `import 'dotenv/config';
import { expect } from 'chai';
import { ApiClient } from './helpers/api-client';
import * as testHelpers from './helpers/test-helpers';

// Configuration
const BASE_URL = process.env.API_BASE_URL || '${baseUrl}';
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || '30000');
export const DEFAULT_TIMEOUT = parseInt(process.env.TEST_TIMEOUT || '30000');

// Initialize API client
export const api = new ApiClient({
  baseURL: BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'User-Agent': 'postmortem-API-Tests/1.0.0'
  }
});

// Re-export test helpers for convenience
export const {
  expectSuccess,
  expectResponseTime,
  expectRequiredFields,
  expectArray,
  expectObject,
  expectPagination,
  expectError,
  expectSchema,
  expectValidId,
  expectAuthToken,
  expectCreated,
  expectUpdated,
  expectDeleted
} = testHelpers;

// Re-export expect for compatibility
export { expect };

// Global test setup
before(function() {
  console.log(\`🚀 Starting API tests against: \${BASE_URL}\`);
  console.log(\`⏱️  Default timeout: \${DEFAULT_TIMEOUT}ms\`);
});

after(function() {
  console.log('✅ API tests completed');
});

// Helper functions
export function setAuthToken(token: string): void {
  api.setAuthToken(token);
}

export function clearAuth(): void {
  api.clearAuthToken();
}

export function setBaseURL(url: string): void {
  api.setBaseURL(url);
}

${envVarsComment}
export const env = process.env;

export default {
  api,
  expect,
  setAuthToken,
  clearAuth,
  setBaseURL,
  env,
  expectSuccess,
  expectResponseTime,
  expectRequiredFields,
  expectArray,
  expectObject,
  expectPagination,
  expectError,
  expectSchema,
  expectValidId,
  expectAuthToken,
  expectCreated,
  expectUpdated,
  expectDeleted
};`;

    await FileSystem.writeFile(
      path.join(outputDir, 'src', 'setup.ts'),
      setupContent
    );
  }
}

export default ProjectGenerator;
