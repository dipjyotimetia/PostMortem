#!/usr/bin/env node

const fs = require('node:fs/promises');
const { existsSync } = require('node:fs');
const path = require('node:path');
const { Command } = require('commander');
const { processCollection, logger } = require('./convert');

async function readJsonFile(filePath) {
  try {
    const absolutePath = path.resolve(filePath);
    if (!existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }
    const content = await fs.readFile(absolutePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in file: ${filePath}`);
    }
    throw error;
  }
}

async function run() {
  const program = new Command();
  
  program
    .name('postmorterm')
    .description('Convert Postman collections to Mocha/Supertest tests')
    .version('1.0.0')
    .requiredOption('-c, --collection <path>', 'Path to Postman collection JSON file')
    .option('-o, --output <directory>', 'Output directory for the generated test files', './test')
    .option('-e, --environment <path>', 'Path to Postman environment JSON file (optional)')
    .option('-d, --debug', 'Enable debug logging', false);
    
  program.parse();
  const options = program.opts();
  
  // Set debug flag if specified
  if (options.debug) {
    process.env.DEBUG = 'true';
    logger.info('Debug mode enabled');
  }
  
  try {
    // Read collection file
    logger.info(`Reading collection file: ${options.collection}`);
    const collectionJson = await readJsonFile(options.collection);
    
    // Read environment file if provided
    let environmentJson = null;
    if (options.environment) {
      try {
        logger.info(`Reading environment file: ${options.environment}`);
        environmentJson = await readJsonFile(options.environment);
      } catch (error) {
        logger.warn(`${error.message}`);
      }
    }
    
    // Process the collection
    const fileCount = processCollection(collectionJson, options.output, environmentJson);
    logger.success(`Successfully generated ${fileCount} tests in ${options.output}`);
    
  } catch (error) {
    logger.error(`${error.message}`);
    process.exit(1);
  }
}

run().catch(error => {
  logger.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});