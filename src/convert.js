const fs = require('node:fs');
const path = require('node:path');
const _ = require('lodash');
const sdk = require('postman-collection');

/**
 * Simple logger with colored output and levels
 */
const logger = {
  info: (message) => console.log(`\x1b[36mℹ️ INFO:\x1b[0m ${message}`),
  success: (message) => console.log(`\x1b[32m✅ SUCCESS:\x1b[0m ${message}`),
  warn: (message) => console.warn(`\x1b[33m⚠️ WARNING:\x1b[0m ${message}`),
  error: (message) => console.error(`\x1b[31m❌ ERROR:\x1b[0m ${message}`),
  debug: (message) => process.env.DEBUG && console.log(`\x1b[90m🔍 DEBUG:\x1b[0m ${message}`),
};

/**
 * Converts a Postman test script to Mocha assertions using Chai and Supertest
 * @param {string} postmanScript - The Postman test script content
 * @returns {string} - Equivalent test assertions in Chai syntax
 */
function convertPostmanTestToMocha(postmanScript) {
  if (!postmanScript) return '';
  
  logger.debug('Converting Postman test script to Mocha/Chai assertions');

  // Use a single regex replacement map for better maintainability
  const replacements = [
    // Replace pm.test with it
    { pattern: /pm\.test\("([^"]+)"/g, replacement: 'it("$1"' },
    
    // Replace pm.expect with expect
    { pattern: /pm\.expect/g, replacement: 'expect' },
    
    // Replace pm.response.to.have.status with response.status
    { pattern: /pm\.response\.to\.have\.status\((\d+)\)/g, replacement: 'expect(response.status).to.equal($1)' },
    
    // Replace pm.response.code with response.status
    { pattern: /pm\.response\.code/g, replacement: 'response.status' },
    
    // Replace pm.response.headers.get with response.headers
    { pattern: /pm\.response\.headers\.get\("([^"]+)"\)/g, replacement: 'response.headers["$1".toLowerCase()]' },
    
    // Replace pm.response.json() with response.body
    { pattern: /pm\.response\.json\(\)/g, replacement: 'response.body' },
    
    // Handle response time assertions
    { pattern: /pm\.response\.responseTime/g, replacement: '/* Response time assertions are not directly supported in Supertest */' }
  ];

  // Apply all replacements in a single pass
  const result = replacements.reduce((script, { pattern, replacement }) => {
    return script.replace(pattern, replacement);
  }, postmanScript);
  
  logger.debug('Test script conversion completed');
  return result;
}

/**
 * Generates a Mocha test file from a Postman request
 * @param {sdk.Item} item - The Postman request item
 * @param {string} parentName - The name of the parent folder
 * @returns {string} - The generated Mocha test code
 */
function generateMochaTestFromRequest(item, parentName) {
  if (!item?.name) {
    logger.warn('Skipping unnamed request item');
    return '';
  }

  const testName = `${parentName} - ${item.name}`;
  logger.info(`Generating test for "${testName}"`);
  
  const request = item.request;
  const method = (request?.method || 'GET').toLowerCase();
  
  // Use SDK's URL parsing capabilities
  let url = '';
  let pathname = '/';
  
  if (request?.url) {
    url = request.url.toString();
    try {
      // Extract path portion without host/protocol
      pathname = new URL(url).pathname || '/';
      logger.debug(`Endpoint path: ${pathname}`);
    } catch (error) {
      logger.warn(`Could not parse URL "${url}". Using default pathname: /`);
    }
  } else {
    logger.warn(`Request "${item.name}" has no URL defined`);
  }

  // Extract body if it exists
  let body = null;
  if (request?.body?.mode === 'raw' && request.body.raw) {
    try {
      body = JSON.parse(request.body.raw);
      logger.debug(`Request body parsed as JSON with ${Object.keys(body).length} properties`);
    } catch (error) {
      body = request.body.raw;
      logger.debug('Request body used as raw string (not valid JSON)');
    }
  }

  // Extract test scripts from event
  const testEvent = item.events?.find(e => e.listen === 'test');
  const testScript = testEvent?.script?.exec?.join('\n') || '';
  if (testScript) {
    logger.debug(`Found test script with ${testScript.split('\n').length} lines`);
  } else {
    logger.debug('No test script found in request');
  }
  
  const mochaAssertions = convertPostmanTestToMocha(testScript);

  // Build request code more cleanly
  const requestCode = method === 'get'
    ? `const response = await request.get('${pathname}');`
    : `const response = await request.${method}('${pathname}')${body ? `\n        .send(${JSON.stringify(body, null, 2)})` : ''};`;

  return `
describe('${testName}', function() {
  it('should respond with correct data', async function() {
    ${requestCode}
    
    ${mochaAssertions || 'expect(response.status).to.be.oneOf([200, 201, 204]);'}
  });
});
`;
}

/**
 * Extracts the base URL from a collection
 * @param {sdk.Collection} collection - The Postman collection object
 * @returns {string} - The base URL
 */
function extractBaseUrl(collection) {
  if (!collection?.items?.members?.length) {
    logger.warn('Collection has no items, using default base URL');
    return 'https://api.example.com'; // Default base URL
  }

  logger.debug('Searching for base URL in collection');
  
  // Find first URL using a recursive function with SDK methods
  function findFirstUrl(itemGroup) {
    for (const item of itemGroup.items.members) {
      if (item.request?.url) {
        const baseUrl = item.request.url.protocol + '://' + item.request.url.host.join('.');
        logger.debug(`Found base URL: ${baseUrl}`);
        return baseUrl;
      }
      
      if (item.items) {
        const url = findFirstUrl(item);
        if (url) return url;
      }
    }
    return null;
  }

  const baseUrl = findFirstUrl(collection) || 'https://api.example.com';
  if (baseUrl === 'https://api.example.com') {
    logger.warn('Could not find a valid base URL in collection, using default');
  }
  
  return baseUrl;
}

/**
 * Processes Postman collection items recursively
 * @param {sdk.ItemGroup} itemGroup - Collection item group
 * @param {string} outputDir - The output directory
 * @param {string} parentPath - The parent folder path
 * @param {number} level - Recursion level for logging indentation
 * @returns {number} - Number of processed items
 */
function processItems(itemGroup, outputDir, parentPath = '', level = 0) {
  if (!itemGroup?.items?.members) {
    logger.warn(`${' '.repeat(level * 2)}No items found in group`);
    return 0;
  }

  const indent = ' '.repeat(level * 2);
  let processedCount = 0;

  itemGroup.items.members.forEach(item => {
    if (item.items && item.items.members.length > 0) {
      // This is a folder - process recursively
      const folderName = _.kebabCase(item.name);
      const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName;
      
      logger.info(`${indent}Processing folder: ${item.name}`);
      
      // Create directory for this folder
      const folderDir = path.join(outputDir, folderPath);
      try {
        fs.mkdirSync(folderDir, { recursive: true });
        logger.debug(`${indent}Created directory: ${folderDir}`);
      } catch (error) {
        logger.error(`${indent}Failed to create directory: ${folderDir} - ${error.message}`);
      }

      // Process contained items
      const processed = processItems(item, outputDir, folderPath, level + 1);
      processedCount += processed;
      logger.debug(`${indent}Processed ${processed} items in folder: ${item.name}`);
    } else if (item.request) {
      // This is a request - generate test file
      const fileName = `${_.kebabCase(item.name)}.test.js`;
      const filePath = parentPath
        ? path.join(outputDir, parentPath, fileName)
        : path.join(outputDir, fileName);

      logger.info(`${indent}Generating test file: ${fileName}`);
      
      // Calculate relative path to setup file
      const relativePath = path.relative(path.dirname(filePath), path.join(outputDir, 'setup.js'))
        .replace(/\\/g, '/');
      
      // Generate test file content
      const parentName = parentPath.split('/').pop() || '';
      const fileContent = `
const { request, expect } = require('${relativePath}');

${generateMochaTestFromRequest(item, parentName)}
`;

      try {
        fs.writeFileSync(filePath, fileContent);
        logger.success(`${indent}Created test file: ${filePath}`);
        processedCount++;
      } catch (error) {
        logger.error(`${indent}Failed to write file: ${filePath} - ${error.message}`);
      }
    }
  });
  
  return processedCount;
}

/**
 * Processes a Postman collection and generates Mocha test files
 * @param {Object} rawCollection - The raw Postman collection object
 * @param {string} outputDir - The directory where test files will be created
 * @param {Object} rawEnvironment - Optional raw Postman environment variables
 * @returns {number} - Number of generated test files
 */
function processCollection(rawCollection, outputDir, rawEnvironment = null) {
  logger.info(`Processing collection: "${rawCollection.info?.name || 'Unnamed Collection'}"`);
  
  // Convert raw JSON to SDK objects
  const collection = new sdk.Collection(rawCollection);
  const environment = rawEnvironment ? new sdk.VariableScope(rawEnvironment) : null;
  
  if (environment) {
    logger.info(`Found environment with ${environment.values?.members?.length || 0} variables`);
  }
  
  if (!collection?.items) {
    logger.error('Invalid collection format');
    return 0;
  }

  logger.info(`Output directory: ${outputDir}`);
  
  // Make sure output directory exists
  try {
    fs.mkdirSync(outputDir, { recursive: true });
    logger.debug(`Created output directory: ${outputDir}`);
  } catch (error) {
    logger.error(`Failed to create output directory: ${error.message}`);
    return 0;
  }

  // Generate setup file with environment variables support
  const baseUrl = extractBaseUrl(collection);
  logger.info(`Using base URL: ${baseUrl}`);
  
  const setupFileContent = `
const supertest = require('supertest');
const { expect } = require('chai');
require('dotenv').config();

// Extract base URL from the first item in the collection
const BASE_URL = process.env.API_BASE_URL || '${baseUrl}';
const request = supertest(BASE_URL);

${environment ? '// Environment variables from Postman\nconst env = ' + JSON.stringify(extractEnvironmentVariables(environment), null, 2) + ';\n' : ''}

module.exports = { 
  request, 
  expect${environment ? ',\n  env' : ''} 
};
`;

  try {
    fs.writeFileSync(path.join(outputDir, 'setup.js'), setupFileContent);
    logger.success(`Created setup file: ${path.join(outputDir, 'setup.js')}`);
  } catch (error) {
    logger.error(`Failed to write setup file: ${error.message}`);
  }

  // Process each item in the collection
  logger.info('Processing collection items...');
  const processedCount = processItems(collection, outputDir);
  
  logger.success(`Successfully generated ${processedCount} test files in ${outputDir}`);
  return processedCount;
}

/**
 * Extract environment variables from a Postman environment object
 * @param {sdk.VariableScope} environment - The Postman environment SDK object
 * @returns {Object} - Key-value pairs of environment variables
 */
function extractEnvironmentVariables(environment) {
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

module.exports = {
  processCollection,
  generateMochaTestFromRequest,
  convertPostmanTestToMocha,
  extractBaseUrl,
  logger
};