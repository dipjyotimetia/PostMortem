const sdk = require('postman-collection');
const path = require('path');
const _ = require('lodash');
const { logger } = require('./utils/logger');
const FileSystem = require('./utils/filesystem');
const Validator = require('./utils/validator');
const TestGenerator = require('./converters/test-generator');

/**
 * Main converter class for processing Postman collections
 */
class PostmanConverter {
  constructor(options = {}) {
    this.options = {
      outputDir: './test',
      createSetupFile: true,
      maintainFolderStructure: true,
      ...options
    };
  }

  /**
   * Process a Postman collection and generate Mocha test files
   * @param {Object} rawCollection - The raw Postman collection object
   * @param {string} outputDir - The directory where test files will be created
   * @param {Object} rawEnvironment - Optional raw Postman environment variables
   * @returns {Promise<Object>} - Processing results
   */
  async processCollection(rawCollection, outputDir, rawEnvironment = null) {
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
      logger.info(`Found environment with ${environment.values?.members?.length || 0} variables`);
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
  _extractBaseUrl(collection) {
    if (!collection?.items?.members?.length) {
      logger.warn('Collection has no items, using default base URL');
      return 'https://api.example.com';
    }

    const findFirstUrl = (itemGroup) => {
      for (const item of itemGroup.items.members) {
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
  _extractEnvironmentVariables(environment) {
    if (!environment?.values?.members?.length) {
      logger.debug('No environment variables found');
      return {};
    }
    
    const variables = environment.values.members.reduce((acc, variable) => {
      if (variable.key && variable.value) {
        acc[variable.key] = variable.value;
      }
      return acc;
    }, {});
    
    logger.debug(`Extracted ${Object.keys(variables).length} environment variables`);
    return variables;
  }

  /**
   * Process collection items recursively
   * @private
   */
  async _processItems(itemGroup, outputDir, parentPath = '', level = 0) {
    if (!itemGroup?.items?.members) {
      logger.warn(`${' '.repeat(level * 2)}No items found in group`);
      return { testFiles: 0, folders: 0 };
    }

    const indent = ' '.repeat(level * 2);
    let testFiles = 0;
    let folders = 0;

    for (const item of itemGroup.items.members) {
      if (item.items && item.items.members.length > 0) {
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
  async _generateTestFile(item, outputDir, parentPath, indent) {
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
      const testContent = TestGenerator.generateMochaTestFromRequest(item, parentName);
      
      const fileContent = `const { request, expect } = require('${setupPath}');

${testContent}`;

      await FileSystem.writeFile(filePath, fileContent);
      logger.success(`${indent}Created test file: ${filePath}`);
      
    } catch (error) {
      logger.error(`${indent}Failed to generate test file for "${item.name}": ${error.message}`);
      throw error;
    }
  }
}

module.exports = PostmanConverter;
