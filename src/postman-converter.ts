import * as sdk from 'postman-collection';
import * as path from 'path';
import * as _ from 'lodash';
import { logger } from './utils/logger';
import { FileSystem } from './utils/filesystem';
import { Validator, PostmanCollection, PostmanEnvironment } from './utils/validator';
import { TestGenerator, EnvironmentVariables, PostmanItem } from './converters/test-generator';
import { ProjectGenerator } from './converters/project-generator';
import {
  TypedCollection,
  TypedItemGroup,
  extractMembers,
  extractEnvironmentVariables,
  getEnvironmentVariableCount,
  isItemGroup,
  isRequestItem
} from './types/postman-sdk';

export interface PostmanConverterOptions {
  outputDir?: string;
  createSetupFile?: boolean;
  maintainFolderStructure?: boolean;
  generateFullProject?: boolean;
}

export interface ProcessingResults {
  testFiles: number;
  folders: number;
  baseUrl: string;
  environment: EnvironmentVariables | null;
}

export interface InternalProcessingResults {
  testFiles: number;
  folders: number;
}

/** Union type for collection items */
type CollectionItem = TypedItemGroup | sdk.Item;

/**
 * Main converter class for processing Postman collections
 */
export class PostmanConverter {
  private options: Required<PostmanConverterOptions>;

  constructor(options: PostmanConverterOptions = {}) {
    this.options = {
      outputDir: './test',
      createSetupFile: true,
      maintainFolderStructure: true,
      generateFullProject: false,
      ...options
    };
  }

  /**
   * Process a Postman collection and generate Mocha test files
   * @param rawCollection - The raw Postman collection object
   * @param outputDir - The directory where test files will be created
   * @param rawEnvironment - Optional raw Postman environment variables
   * @returns Processing results
   */
  async processCollection(
    rawCollection: PostmanCollection,
    outputDir: string,
    rawEnvironment: PostmanEnvironment | null = null
  ): Promise<ProcessingResults> {
    logger.info(`Processing collection: "${rawCollection.info?.name || 'Unnamed Collection'}"`);

    // Validate inputs
    const collectionValidation = Validator.validateCollection(rawCollection);
    if (!collectionValidation.isValid) {
      throw new Error(`Invalid collection: ${collectionValidation.errors.join(', ')}`);
    }

    if (collectionValidation.warnings.length > 0) {
      collectionValidation.warnings.forEach(warning => logger.warn(warning));
    }

    if (rawEnvironment) {
      const envValidation = Validator.validateEnvironment(rawEnvironment);
      if (!envValidation.isValid) {
        throw new Error(`Invalid environment: ${envValidation.errors.join(', ')}`);
      }
      if (envValidation.warnings.length > 0) {
        envValidation.warnings.forEach(warning => logger.warn(warning));
      }
    }

    // Convert to SDK objects - The SDK constructor accepts the raw collection definition
    const collection = new sdk.Collection(rawCollection as sdk.CollectionDefinition);
    const environment = rawEnvironment
      ? new sdk.VariableScope(rawEnvironment as sdk.VariableScopeDefinition)
      : null;

    if (environment) {
      const varCount = getEnvironmentVariableCount(environment);
      logger.info(`Found environment with ${varCount} variables`);
    }

    // Ensure output directory exists
    await FileSystem.ensureDir(outputDir);
    logger.debug(`Created output directory: ${outputDir}`);

    // Generate setup file
    const baseUrl = this._extractBaseUrl(collection as unknown as TypedCollection);
    const environmentVars = environment ? extractEnvironmentVariables(environment) : null;

    // Generate full project if requested
    if (this.options.generateFullProject) {
      const collectionName = rawCollection.info?.name || 'API Test Project';
      await ProjectGenerator.generateProject({
        projectName: collectionName,
        baseUrl,
        environment: environmentVars,
        outputDir
      });

      // For full project, adjust paths for test files
      const testsDir = path.join(outputDir, 'src', 'tests');
      await FileSystem.ensureDir(testsDir);

      // Process collection items into the tests directory
      const results = await this._processItems(collection as unknown as TypedCollection, testsDir);

      // Generate enhanced setup file for full project
      const setupContent = this._generateEnhancedSetup(baseUrl, environmentVars);
      await FileSystem.writeFile(path.join(outputDir, 'src/setup.ts'), setupContent);
      logger.success(`Created enhanced setup file: ${path.join(outputDir, 'src/setup.ts')}`);

      logger.success(`Successfully generated complete API test framework in ${outputDir}`);
      logger.info(`Project: ${collectionName}`);
      logger.info(`Test files: ${results.testFiles}`);
      logger.info(`Folders: ${results.folders}`);
      logger.info(`Base URL: ${baseUrl}`);

      if (environmentVars && Object.keys(environmentVars).length > 0) {
        logger.info(`Environment variables: ${Object.keys(environmentVars).length}`);
      }

      logger.info('');
      logger.info('Quick start:');
      logger.info(`   cd ${path.basename(outputDir)}`);
      logger.info('   npm install');
      logger.info('   npm test');

      return {
        testFiles: results.testFiles,
        folders: results.folders,
        baseUrl,
        environment: environmentVars
      };
    }

    if (this.options.createSetupFile) {
      const setupContent = TestGenerator.generateSetupFile(baseUrl, environmentVars);
      await FileSystem.writeFile(path.join(outputDir, 'setup.ts'), setupContent);
      logger.success(`Created setup file: ${path.join(outputDir, 'setup.ts')}`);
    }

    // Process collection items
    const results = await this._processItems(collection as unknown as TypedCollection, outputDir);

    logger.success(`Successfully generated ${results.testFiles} test files in ${outputDir}`);
    return {
      testFiles: results.testFiles,
      folders: results.folders,
      baseUrl,
      environment: environmentVars
    };
  }

  /**
   * Extract base URL from collection
   * @param collection - The typed collection
   * @returns The extracted base URL or a default
   */
  private _extractBaseUrl(collection: TypedCollection): string {
    const items = extractMembers(collection.items);
    if (items.length === 0) {
      logger.warn('Collection has no items, using default base URL');
      return 'https://api.example.com';
    }

    const findFirstUrl = (itemGroup: TypedCollection | TypedItemGroup): string | null => {
      const members = extractMembers(itemGroup.items);

      for (const item of members) {
        // Check if this is a request item
        if (isRequestItem(item) && item.request?.url) {
          try {
            const url = item.request.url.toString();
            const urlObj = new globalThis.URL(url);
            const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
            logger.debug(`Found base URL: ${baseUrl}`);
            return baseUrl;
          } catch {
            logger.debug(`Could not parse URL: ${item.request.url}`);
          }
        }

        // Check if this is an item group (folder)
        if (isItemGroup(item)) {
          const url = findFirstUrl(item);
          if (url) return url;
        }
      }
      return null;
    };

    const baseUrl = findFirstUrl(collection) || 'https://api.example.com';
    if (baseUrl === 'https://api.example.com') {
      logger.warn('Could not find a valid base URL in collection, using default');
    }

    return baseUrl;
  }

  /**
   * Process collection items recursively
   * @param itemGroup - The item group to process
   * @param outputDir - Output directory
   * @param parentPath - Parent path for nested folders
   * @param level - Nesting level for logging
   * @returns Processing results
   */
  private async _processItems(
    itemGroup: TypedCollection | TypedItemGroup,
    outputDir: string,
    parentPath: string = '',
    level: number = 0
  ): Promise<InternalProcessingResults> {
    const items = extractMembers(itemGroup.items);

    if (items.length === 0) {
      logger.warn(`${' '.repeat(level * 2)}No items found in group`);
      return { testFiles: 0, folders: 0 };
    }

    const indent = ' '.repeat(level * 2);
    let testFiles = 0;
    let folders = 0;

    for (const item of items) {
      if (isItemGroup(item)) {
        // This is a folder - check if it has items
        const subItems = extractMembers(item.items);
        if (subItems.length > 0) {
          const folderName = _.kebabCase(item.name);
          const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName;

          logger.info(`${indent}Processing folder: ${item.name}`);

          if (this.options.maintainFolderStructure) {
            const folderDir = path.join(outputDir, folderPath);
            await FileSystem.ensureDir(folderDir);
            logger.debug(`${indent}Created directory: ${folderDir}`);
          }

          const results = await this._processItems(
            item,
            outputDir,
            this.options.maintainFolderStructure ? folderPath : parentPath,
            level + 1
          );

          testFiles += results.testFiles;
          folders += results.folders + 1;
        }
      } else if (isRequestItem(item)) {
        // This is a request - generate test file
        await this._generateTestFile(item, outputDir, parentPath, indent);
        testFiles++;
      }
    }

    return { testFiles, folders };
  }

  /**
   * Generate a single test file
   * @param item - The request item
   * @param outputDir - Output directory
   * @param parentPath - Parent path for nested folders
   * @param indent - Indentation for logging
   */
  private async _generateTestFile(
    item: sdk.Item,
    outputDir: string,
    parentPath: string,
    indent: string
  ): Promise<void> {
    const fileName = `${_.kebabCase(item.name)}.test.ts`;
    const filePath = parentPath
      ? path.join(outputDir, parentPath, fileName)
      : path.join(outputDir, fileName);

    logger.info(`${indent}Generating test file: ${fileName}`);

    try {
      // Calculate relative path to setup file
      let setupPath = './setup';
      if (this.options.generateFullProject) {
        // For full projects, setup is at src/setup.ts and tests are in src/tests/
        setupPath = '../setup';
        if (parentPath) {
          // Count additional directory levels in test folder structure
          const levels = parentPath.split('/').length;
          setupPath = `${'../'.repeat(levels + 1)}setup`;
        }
      } else if (parentPath) {
        // For regular projects, count directory levels to calculate relative path
        const levels = parentPath.split('/').length;
        setupPath = `${'../'.repeat(levels)}setup`;
      }

      // Generate test content
      const parentName = parentPath ? parentPath.split('/').pop() : '';

      // Convert sdk.Item to PostmanItem for the generator
      const postmanItem: PostmanItem = {
        name: item.name,
        request: item.request ? {
          method: item.request.method,
          url: item.request.url,
          body: item.request.body ? {
            mode: item.request.body.mode,
            raw: item.request.body.raw
          } : undefined,
          header: item.request.headers?.all?.().map(h => ({
            key: h.key,
            value: h.value,
            disabled: h.disabled
          }))
        } : undefined,
        events: item.events?.all?.().map(e => ({
          listen: e.listen,
          script: e.script ? {
            exec: Array.isArray(e.script.exec) ? e.script.exec : undefined
          } : undefined
        }))
      };

      // Use enhanced generation for full projects
      const options = this.options.generateFullProject ? { enhanced: true } : {};
      const testContent = TestGenerator.generateMochaTestFromRequest(postmanItem, parentName || '', options);

      // Use different imports for full projects
      const imports = this.options.generateFullProject
        ? `import { api, expect, expectSuccess, expectResponseTime, DEFAULT_TIMEOUT } from '${setupPath}';`
        : `import { request, expect } from '${setupPath}';`;

      const fileContent = `${imports}

${testContent}`;

      await FileSystem.writeFile(filePath, fileContent);
      logger.success(`${indent}Created test file: ${filePath}`);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`${indent}Failed to generate test file for "${item.name}": ${message}`);
      throw error;
    }
  }

  /**
   * Generate enhanced setup file for full project
   * @param baseUrl - The base URL for the API
   * @param environment - Environment variables
   * @returns The setup file content
   */
  private _generateEnhancedSetup(baseUrl: string, environment: EnvironmentVariables | null = null): string {
    const envVarsComment = environment
      ? `// Environment variables from Postman collection\n${Object.entries(environment)
        .map(([key, value]) => `// ${key}=${value}`)
        .join('\n')}`
      : '// No environment variables from Postman collection';

    return `import 'dotenv/config';
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
  console.log(\`Starting API tests against: \${BASE_URL}\`);
  console.log(\`Default timeout: \${DEFAULT_TIMEOUT}ms\`);
});

after(function() {
  console.log('API tests completed');
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
  ...testHelpers
};
`;
  }
}

export default PostmanConverter;
