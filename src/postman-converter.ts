import * as sdk from 'postman-collection';
import * as path from 'path';
import * as _ from 'lodash';
import { logger } from './utils/logger';
import { FileSystem } from './utils/filesystem';
import { Validator, PostmanCollection, PostmanEnvironment } from './utils/validator';
import { TestGenerator, EnvironmentVariables } from './converters/test-generator';

export interface PostmanConverterOptions {
  outputDir?: string;
  createSetupFile?: boolean;
  maintainFolderStructure?: boolean;
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
 * Main converter class for processing Postman collections
 */
export class PostmanConverter {
  private options: Required<PostmanConverterOptions>;

  constructor(options: PostmanConverterOptions = {}) {
    this.options = {
      outputDir: './test',
      createSetupFile: true,
      maintainFolderStructure: true,
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

    // Convert to SDK objects
    const collection = new sdk.Collection(rawCollection);
    const environment = rawEnvironment ? new sdk.VariableScope(rawEnvironment) : null;
    
    if (environment) {
      const envValues = environment.values as any;
      logger.info(`Found environment with ${envValues?.members?.length || 0} variables`);
    }

    // Ensure output directory exists
    await FileSystem.ensureDir(outputDir);
    logger.debug(`Created output directory: ${outputDir}`);

    // Generate setup file
    const baseUrl = this._extractBaseUrl(collection);
    const environmentVars = environment ? this._extractEnvironmentVariables(environment) : null;
    
    if (this.options.createSetupFile) {
      const setupContent = TestGenerator.generateSetupFile(baseUrl, environmentVars);
      await FileSystem.writeFile(path.join(outputDir, 'setup.js'), setupContent);
      logger.success(`Created setup file: ${path.join(outputDir, 'setup.js')}`);
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
  private _extractBaseUrl(collection: sdk.Collection): string {
    const items = collection.items as any;
    if (!items?.members?.length) {
      logger.warn('Collection has no items, using default base URL');
      return 'https://api.example.com';
    }

    const findFirstUrl = (itemGroup: any): string | null => {
      const members = itemGroup.items?.members || itemGroup.items?.all?.() || [];
      for (const item of members) {
        if (item.request?.url) {
          try {
            const url = item.request.url.toString();
            const urlObj = new URL(url);
            const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
            logger.debug(`Found base URL: ${baseUrl}`);
            return baseUrl;
          } catch (error) {
            logger.debug(`Could not parse URL: ${item.request.url}`);
          }
        }
        
        if (item.items) {
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
   * Extract environment variables from Postman environment
   * @private
   */
  private _extractEnvironmentVariables(environment: sdk.VariableScope): EnvironmentVariables {
    const envValues = environment.values as any;
    if (!envValues?.members?.length) {
      logger.debug('No environment variables found');
      return {};
    }
    
    const variables = envValues.members.reduce((acc: EnvironmentVariables, variable: any) => {
      if (variable.key && variable.value) {
        acc[variable.key] = variable.value;
      }
      return acc;
    }, {} as EnvironmentVariables);
    
    logger.debug(`Extracted ${Object.keys(variables).length} environment variables`);
    return variables;
  }

  /**
   * Process collection items recursively
   * @private
   */
  private async _processItems(
    itemGroup: any, 
    outputDir: string, 
    parentPath: string = '', 
    level: number = 0
  ): Promise<InternalProcessingResults> {
    const items = itemGroup?.items?.members || itemGroup?.items?.all?.() || [];
    if (!items || items.length === 0) {
      logger.warn(`${' '.repeat(level * 2)}No items found in group`);
      return { testFiles: 0, folders: 0 };
    }

    const indent = ' '.repeat(level * 2);
    let testFiles = 0;
    let folders = 0;

    for (const item of items) {
      const itemItems = item.items?.members || item.items?.all?.() || [];
      if (item.items && itemItems.length > 0) {
        // This is a folder
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
    item: sdk.Item, 
    outputDir: string, 
    parentPath: string, 
    indent: string
  ): Promise<void> {
    const fileName = `${_.kebabCase(item.name)}.test.js`;
    const filePath = parentPath
      ? path.join(outputDir, parentPath, fileName)
      : path.join(outputDir, fileName);

    logger.info(`${indent}Generating test file: ${fileName}`);
    
    try {
      // Calculate relative path to setup file
      let setupPath = './setup.js';
      if (parentPath) {
        // Count directory levels to calculate relative path
        const levels = parentPath.split('/').length;
        setupPath = '../'.repeat(levels) + 'setup.js';
      }
      
      // Generate test content
      const parentName = parentPath ? parentPath.split('/').pop() : '';
      const testContent = TestGenerator.generateMochaTestFromRequest(item as any, parentName || '');

      const fileContent = `const { request, expect } = require('${setupPath}');

${testContent}`;

      await FileSystem.writeFile(filePath, fileContent);
      logger.success(`${indent}Created test file: ${filePath}`);
      
    } catch (error) {
      logger.error(`${indent}Failed to generate test file for "${item.name}": ${(error as Error).message}`);
      throw error;
    }
  }
}

export default PostmanConverter;
