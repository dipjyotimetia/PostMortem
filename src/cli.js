#!/usr/bin/env node

const fs = require('node:fs/promises');
const { existsSync } = require('node:fs');
const path = require('node:path');
const { Command } = require('commander');
const { processCollection } = require('./convert');

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
    .name('postman-to-mocha')
    .description('Convert Postman collections to Mocha/Supertest tests')
    .version('1.0.0')
    .requiredOption('-c, --collection <path>', 'Path to Postman collection JSON file')
    .option('-o, --output <directory>', 'Output directory for the generated test files', './test')
    .option('-e, --environment <path>', 'Path to Postman environment JSON file (optional)');
    
  program.parse();
  const options = program.opts();
  
  try {
    // Read collection file
    const collectionJson = await readJsonFile(options.collection);
    
    // Read environment file if provided
    let environmentJson = null;
    if (options.environment) {
      try {
        environmentJson = await readJsonFile(options.environment);
      } catch (error) {
        console.warn(`Warning: ${error.message}`);
      }
    }
    
    // Process the collection
    processCollection(collectionJson, options.output, environmentJson);
    console.log(`✅ Successfully generated tests in ${options.output}`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

run().catch(error => {
  console.error(`❌ Unhandled error: ${error.message}`);
  process.exit(1);
});