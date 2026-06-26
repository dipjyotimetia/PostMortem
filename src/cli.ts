#!/usr/bin/env node

import * as path from 'node:path';
import { Command } from 'commander';
import { PostmanConverter } from './postman-converter';
import { FileSystem } from './utils/filesystem';
import { logger } from './utils/logger';
import {
  type CLIOptions,
  type PostmanCollection,
  type PostmanEnvironment,
  Validator
} from './utils/validator';

const VERSION = '2.0.0';

/**
 * CLI application for postmortem
 */
class CLI {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name('postmortem')
      .description('Convert Postman collections into Bun-native tests (bun:test + fetch)')
      .version(VERSION)
      .requiredOption('-c, --collection <path>', 'Path to Postman collection JSON file')
      .option('-o, --output <directory>', 'Output directory for the generated test files', './test')
      .option('-e, --environment <path>', 'Path to Postman environment JSON file (optional)')
      .option('-d, --debug', 'Enable debug logging', false)
      .option('--no-setup', 'Skip creating setup.ts file')
      .option(
        '--flat',
        'Generate all test files in output directory (ignore folder structure)',
        false
      )
      .option(
        '--full-project',
        'Generate a complete API test framework project with all configuration files',
        false
      )
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
        for (const error of validation.errors) {
          logger.error(error);
        }
        process.exit(1);
      }

      for (const warning of validation.warnings) {
        logger.warn(warning);
      }

      // Resolve paths
      const collectionPath = path.resolve(options.collection ?? '');
      const outputPath = path.resolve(options.output || './test');
      const environmentPath = options.environment ? path.resolve(options.environment) : null;

      logger.info(`Collection: ${collectionPath}`);
      logger.info(`Output: ${outputPath}`);
      if (environmentPath) {
        logger.info(`Environment: ${environmentPath}`);
      }

      // Read collection
      let collectionJson: unknown;
      try {
        collectionJson = await FileSystem.readJsonFile(collectionPath);
        logger.debug('Collection file read successfully');
      } catch (error) {
        const message = `File not found: ${(error as Error).message}`;
        logger.error(message);
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

      // Validate collection before processing
      const collectionValidation = Validator.validateCollection(
        collectionJson as PostmanCollection
      );
      if (!collectionValidation.isValid) {
        logger.error(`Invalid collection: ${collectionValidation.errors.join(', ')}`);
        process.exit(1);
      }

      // Create converter with options
      const converter = new PostmanConverter({
        outputDir: options.output,
        createSetupFile: options.setup !== false,
        maintainFolderStructure: !options.flat,
        generateFullProject: options.fullProject
      });

      // Process the collection
      const results = await converter.processCollection(
        collectionJson as PostmanCollection,
        options.output || './test',
        environmentJson as PostmanEnvironment | null
      );

      logger.success('✨ Conversion completed successfully!');
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

export { CLI };
export default CLI;

// This module is the CLI entry point (bin script / `bun run src/cli.ts`).
const cli = new CLI();
cli.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
