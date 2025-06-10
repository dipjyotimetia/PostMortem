#!/usr/bin/env node

const path = require('path');
const { Command } = require('commander');
const { logger } = require('./utils/logger');
const FileSystem = require('./utils/filesystem');
const Validator = require('./utils/validator');
const PostmanConverter = require('./postman-converter');

/**
 * CLI application for PostMorterm
 */
class CLI {
  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  setupCommands() {
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

  async run() {
    try {
      this.program.parse();
      const options = this.program.opts();
      
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
      
      validation.warnings.forEach(warning => logger.warn(warning));

      // Read collection file
      logger.info(`Reading collection file: ${options.collection}`);
      const collectionJson = await FileSystem.readJsonFile(options.collection);
      
      // Read environment file if provided
      let environmentJson = null;
      if (options.environment) {
        try {
          logger.info(`Reading environment file: ${options.environment}`);
          environmentJson = await FileSystem.readJsonFile(options.environment);
        } catch (error) {
          logger.warn(`Failed to read environment file: ${error.message}`);
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
        options.output, 
        environmentJson
      );
      
      logger.success(`✨ Conversion completed successfully!`);
      logger.info(`📁 Generated ${results.testFiles} test files in ${options.output}`);
      if (results.folders > 0) {
        logger.info(`📂 Created ${results.folders} folders`);
      }
      logger.info(`🌐 Base URL: ${results.baseUrl}`);
      
      if (results.environment && Object.keys(results.environment).length > 0) {
        logger.info(`⚙️  Environment variables: ${Object.keys(results.environment).length}`);
      }
      
    } catch (error) {
      logger.error(`❌ ${error.message}`);
      if (this.program.opts().debug) {
        logger.error(error.stack);
      }
      process.exit(1);
    }
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new CLI();
  cli.run().catch(error => {
    logger.error(`Unhandled error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = CLI;