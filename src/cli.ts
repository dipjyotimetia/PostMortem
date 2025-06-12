#!/usr/bin/env node

import * as path from 'path';
import { Command } from 'commander';
import { logger } from './utils/logger';
import { FileSystem } from './utils/filesystem';
import { Validator, CLIOptions } from './utils/validator';
import { PostmanConverter } from './postman-converter';

/**
 * CLI application for PostMorterm
 */
class CLI {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name('postmorterm')
      .description('Convert Postman collections to Mocha/Supertest tests')
      .version('1.1.0')
      .requiredOption('-c, --collection <path>', 'Path to Postman collection JSON file')
      .option('-o, --output <directory>', 'Output directory for the generated test files', './test')
      .option('-e, --environment <path>', 'Path to Postman environment JSON file (optional)')
      .option('-d, --debug', 'Enable debug logging', false)
      .option('--no-setup', 'Skip creating setup.js file', false)
      .option('--flat', 'Generate all test files in output directory (ignore folder structure)', false)
      .option('--silent', 'Suppress all output except errors', false);
  }

  async run(): Promise<void> {
    try {
      this.program.parse();
      const options = this.program.opts() as CLIOptions & { setup: boolean };
      
      // Configure logger
      if (options.debug) {
        logger.setLevel('debug');
        logger.info('Debug mode enabled');
      }
      
      if (options.silent) {
        logger.setSilent(true);
      }

      // Validate options
      const validation = Validator.validateOptions(options);
      if (!validation.isValid) {
        validation.errors.forEach(error => logger.error(error));
        process.exit(1);
      }

      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => logger.warn(warning));
      }

      // Resolve paths
      const collectionPath = path.resolve(options.collection!);
      const outputPath = path.resolve(options.output || './test');
      const environmentPath = options.environment ? path.resolve(options.environment) : null;

      logger.info(`Collection: ${collectionPath}`);
      logger.info(`Output: ${outputPath}`);
      if (environmentPath) {
        logger.info(`Environment: ${environmentPath}`);
      }

      // Read collection
      let collectionJson;
      try {
        collectionJson = await FileSystem.readJsonFile(collectionPath);
        logger.debug('Collection file read successfully');
      } catch (error) {
        logger.error(`Failed to read collection file: ${(error as Error).message}`);
        process.exit(1);
      }

      // Read environment if provided
      let environmentJson = null;
      if (environmentPath) {
        try {
          environmentJson = await FileSystem.readJsonFile(environmentPath);
          logger.debug('Environment file read successfully');
        } catch (error) {
          logger.warn(`Failed to read environment file: ${(error as Error).message}`);
        }
      }
      
      // Create converter with options
      const converter = new PostmanConverter({
        outputDir: options.output,
        createSetupFile: options.setup !== false,
        maintainFolderStructure: !options.flat
      });
      
      // Process the collection
      const results = await converter.processCollection(
        collectionJson, 
        options.output || './test', 
        environmentJson
      );
      
      logger.success(`✨ Conversion completed successfully!`);
      logger.info(`📁 Generated ${results.testFiles} test files in ${options.output}`);
      if (results.folders > 0) {
        logger.info(`📂 Created ${results.folders} folders`);
      }
      logger.info(`🌐 Base URL: ${results.baseUrl}`);
      
      if (results.environment && Object.keys(results.environment).length > 0) {
        logger.info(`🌍 Environment variables: ${Object.keys(results.environment).length}`);
      }
      
    } catch (error) {
      logger.error(`Conversion failed: ${(error as Error).message}`);
      if (process.env.DEBUG) {
        console.error((error as Error).stack);
      }
      process.exit(1);
    }
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new CLI();
  cli.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { CLI };
export default CLI;
