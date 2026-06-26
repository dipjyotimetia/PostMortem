import * as path from 'node:path';
import * as sdk from 'postman-collection';
import { ProjectGenerator } from './converters/project-generator';
import {
  type EnvironmentVariables,
  type PostmanItem,
  TestGenerator
} from './converters/test-generator';
import { FileSystem } from './utils/filesystem';
import { logger } from './utils/logger';
import { kebabCase } from './utils/strings';
import { type PostmanCollection, type PostmanEnvironment, Validator } from './utils/validator';

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

/**
 * Minimal structural types describing the parts of the `postman-collection`
 * SDK objects this converter actually reads. The SDK ships without bundled
 * type declarations, so these keep the SDK boundary explicit instead of `any`.
 */
interface SdkList<T> {
  members?: T[];
  all?: () => T[];
}

interface SdkItem {
  name: string;
  request?: { url?: unknown; method?: string };
  items?: SdkList<SdkItem>;
}

interface SdkItemGroup {
  items?: SdkList<SdkItem>;
}

interface SdkVariable {
  key?: string;
  value?: string;
}

interface SdkVariableScope {
  values?: SdkList<SdkVariable>;
}

/** Read the members of an SDK list regardless of representation. */
function listMembers<T>(list?: SdkList<T>): T[] {
  return list?.members ?? list?.all?.() ?? [];
}

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

    for (const warning of collectionValidation.warnings) {
      logger.warn(warning);
    }

    if (rawEnvironment) {
      const envValidation = Validator.validateEnvironment(rawEnvironment);
      if (!envValidation.isValid) {
        throw new Error(`Invalid environment: ${envValidation.errors.join(', ')}`);
      }
      for (const warning of envValidation.warnings) {
        logger.warn(warning);
      }
    }

    // Convert to SDK objects
    const collection = new sdk.Collection(rawCollection) as SdkItemGroup;
    const environment = rawEnvironment
      ? (new sdk.VariableScope(rawEnvironment) as SdkVariableScope)
      : null;

    if (environment) {
      logger.info(`Found environment with ${listMembers(environment.values).length} variables`);
    }

    // Ensure output directory exists
    await FileSystem.ensureDir(outputDir);
    logger.debug(`Created output directory: ${outputDir}`);

    // Generate setup file
    const baseUrl = this._extractBaseUrl(collection);
    const environmentVars = environment ? this._extractEnvironmentVariables(environment) : null;

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
      const results = await this._processItems(collection, testsDir);

      // Generate enhanced setup file for full project
      const setupContent = this._generateEnhancedSetup(baseUrl, environmentVars);
      await FileSystem.writeFile(path.join(outputDir, 'src/setup.ts'), setupContent);
      logger.success(`Created enhanced setup file: ${path.join(outputDir, 'src/setup.ts')}`);

      logger.success(`Successfully generated complete API test framework in ${outputDir}`);
      logger.info(`📦 Project: ${collectionName}`);
      logger.info(`📁 Test files: ${results.testFiles}`);
      logger.info(`📂 Folders: ${results.folders}`);
      logger.info(`🌐 Base URL: ${baseUrl}`);

      if (environmentVars && Object.keys(environmentVars).length > 0) {
        logger.info(`🌍 Environment variables: ${Object.keys(environmentVars).length}`);
      }

      logger.info('');
      logger.info('🚀 Quick start:');
      logger.info(`   cd ${path.basename(outputDir)}`);
      logger.info('   bun install');
      logger.info('   bun test');

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
    const results = await this._processItems(collection, outputDir);

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
   * @private
   */
  private _extractBaseUrl(collection: SdkItemGroup): string {
    if (listMembers(collection.items).length === 0) {
      logger.warn('Collection has no items, using default base URL');
      return 'https://api.example.com';
    }

    const findFirstUrl = (itemGroup: SdkItemGroup): string | null => {
      for (const item of listMembers(itemGroup.items)) {
        if (item.request?.url) {
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

        if (item.items) {
          const url = findFirstUrl(item);
          if (url) {
            return url;
          }
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
   * Extract environment variables from Postman environment
   * @private
   */
  private _extractEnvironmentVariables(environment: SdkVariableScope): EnvironmentVariables {
    const members = listMembers(environment.values);
    if (members.length === 0) {
      logger.debug('No environment variables found');
      return {};
    }

    const variables: EnvironmentVariables = {};
    for (const variable of members) {
      if (variable.key && variable.value) {
        variables[variable.key] = variable.value;
      }
    }

    logger.debug(`Extracted ${Object.keys(variables).length} environment variables`);
    return variables;
  }

  /**
   * Process collection items recursively
   * @private
   */
  private async _processItems(
    itemGroup: SdkItemGroup,
    outputDir: string,
    parentPath: string = '',
    level: number = 0
  ): Promise<InternalProcessingResults> {
    const items = listMembers(itemGroup.items);
    if (items.length === 0) {
      logger.warn(`${' '.repeat(level * 2)}No items found in group`);
      return { testFiles: 0, folders: 0 };
    }

    const indent = ' '.repeat(level * 2);
    let testFiles = 0;
    let folders = 0;

    for (const item of items) {
      const itemItems = listMembers(item.items);
      if (item.items && itemItems.length > 0) {
        // This is a folder
        const folderName = kebabCase(item.name);
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
      } else if (item.request) {
        // This is a request - generate test file
        await this._generateTestFile(item, outputDir, parentPath, indent);
        testFiles++;
      }
    }

    return { testFiles, folders };
  }

  /**
   * Generate a single test file
   * @private
   */
  private async _generateTestFile(
    item: SdkItem,
    outputDir: string,
    parentPath: string,
    indent: string
  ): Promise<void> {
    const fileName = `${kebabCase(item.name)}.test.ts`;
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

      // Use enhanced generation for full projects
      const options = this.options.generateFullProject ? { enhanced: true } : {};
      const testContent = TestGenerator.generateTestFromRequest(
        item as unknown as PostmanItem,
        parentName || '',
        options
      );

      // Use different imports for full projects
      const imports = this.options.generateFullProject
        ? `import { describe, it, expect } from 'bun:test';\nimport { api, expectSuccess, expectResponseTime, DEFAULT_TIMEOUT } from '${setupPath}';`
        : `import { describe, it, expect } from 'bun:test';\nimport { request } from '${setupPath}';`;

      const fileContent = `${imports}

${testContent}`;

      await FileSystem.writeFile(filePath, fileContent);
      logger.success(`${indent}Created test file: ${filePath}`);
    } catch (error) {
      logger.error(
        `${indent}Failed to generate test file for "${item.name}": ${(error as Error).message}`
      );
      throw error;
    }
  }

  /**
   * Generate enhanced setup file for full project
   * @private
   */
  private _generateEnhancedSetup(
    baseUrl: string,
    environment: EnvironmentVariables | null = null
  ): string {
    const envVarsComment = environment
      ? `// Environment variables from Postman collection\n${Object.entries(environment)
          .map(([key, value]) => `// ${key}=${value}`)
          .join('\n')}`
      : '// No environment variables from Postman collection';

    return `import { expect } from 'bun:test';
import { ApiClient } from './helpers/api-client';
import * as testHelpers from './helpers/test-helpers';

// Configuration (Bun auto-loads .env)
const BASE_URL = process.env.API_BASE_URL ?? '${baseUrl}';
const API_TIMEOUT = Number(process.env.API_TIMEOUT ?? 30000);
export const DEFAULT_TIMEOUT = Number(process.env.TEST_TIMEOUT ?? 30000);

// Initialize API client
export const api = new ApiClient({
  baseURL: BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'User-Agent': 'postmortem-api-tests/2.0.0'
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

// Re-export expect for convenience
export { expect };

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
`;
  }
}

export default PostmanConverter;
