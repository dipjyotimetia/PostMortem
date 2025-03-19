const fs = require('node:fs');
const path = require('node:path');
const _ = require('lodash');
const sdk = require('postman-collection');

/**
 * Converts a Postman test script to Mocha assertions using Chai and Supertest
 * @param {string} postmanScript - The Postman test script content
 * @returns {string} - Equivalent test assertions in Chai syntax
 */
function convertPostmanTestToMocha(postmanScript) {
  if (!postmanScript) return '';

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
  return replacements.reduce((script, { pattern, replacement }) => {
    return script.replace(pattern, replacement);
  }, postmanScript);
}

/**
 * Generates a Mocha test file from a Postman request
 * @param {sdk.Item} item - The Postman request item
 * @param {string} parentName - The name of the parent folder
 * @returns {string} - The generated Mocha test code
 */
function generateMochaTestFromRequest(item, parentName) {
  if (!item?.name) return '';

  const testName = `${parentName} - ${item.name}`;
  const request = item.request;
  const method = (request?.method || 'GET').toLowerCase();
  
  // Use SDK's URL parsing capabilities
  let url = '';
  let pathname = '/';
  
  if (request?.url) {
    url = request.url.toString();
    // Extract path portion without host/protocol
    pathname = new URL(url).pathname || '/';
  }

  // Extract body if it exists
  let body = null;
  if (request?.body?.mode === 'raw' && request.body.raw) {
    try {
      body = JSON.parse(request.body.raw);
    } catch {
      body = request.body.raw;
    }
  }

  // Extract test scripts from event
  const testEvent = item.events?.find(e => e.listen === 'test');
  const testScript = testEvent?.script?.exec?.join('\n') || '';
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
    return 'https://api.example.com'; // Default base URL
  }

  // Find first URL using a recursive function with SDK methods
  function findFirstUrl(itemGroup) {
    for (const item of itemGroup.items.members) {
      if (item.request?.url) {
        return item.request.url.protocol + '://' + item.request.url.host.join('.');
      }
      
      if (item.items) {
        const url = findFirstUrl(item);
        if (url) return url;
      }
    }
    return null;
  }

  return findFirstUrl(collection) || 'https://api.example.com';
}

/**
 * Processes Postman collection items recursively
 * @param {sdk.ItemGroup} itemGroup - Collection item group
 * @param {string} outputDir - The output directory
 * @param {string} parentPath - The parent folder path
 */
function processItems(itemGroup, outputDir, parentPath = '') {
  if (!itemGroup?.items?.members) return;

  itemGroup.items.members.forEach(item => {
    if (item.items && item.items.members.length > 0) {
      // This is a folder - process recursively
      const folderName = _.kebabCase(item.name);
      const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName;
      
      // Create directory for this folder
      const folderDir = path.join(outputDir, folderPath);
      fs.mkdirSync(folderDir, { recursive: true });

      // Process contained items
      processItems(item, outputDir, folderPath);
    } else if (item.request) {
      // This is a request - generate test file
      const fileName = `${_.kebabCase(item.name)}.test.js`;
      const filePath = parentPath
        ? path.join(outputDir, parentPath, fileName)
        : path.join(outputDir, fileName);

      // Calculate relative path to setup file
      const relativePath = path.relative(path.dirname(filePath), path.join(outputDir, 'setup.js'))
        .replace(/\\/g, '/');
      
      // Generate test file content
      const parentName = parentPath.split('/').pop() || '';
      const fileContent = `
const { request, expect } = require('${relativePath}');

${generateMochaTestFromRequest(item, parentName)}
`;

      fs.writeFileSync(filePath, fileContent);
    }
  });
}

/**
 * Processes a Postman collection and generates Mocha test files
 * @param {Object} rawCollection - The raw Postman collection object
 * @param {string} outputDir - The directory where test files will be created
 * @param {Object} rawEnvironment - Optional raw Postman environment variables
 */
function processCollection(rawCollection, outputDir, rawEnvironment = null) {
  // Convert raw JSON to SDK objects
  const collection = new sdk.Collection(rawCollection);
  const environment = rawEnvironment ? new sdk.VariableScope(rawEnvironment) : null;
  
  if (!collection?.items) {
    console.error('Invalid collection format');
    return;
  }

  // Make sure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  // Generate setup file with environment variables support
  const baseUrl = extractBaseUrl(collection);
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

  fs.writeFileSync(path.join(outputDir, 'setup.js'), setupFileContent);

  // Process each item in the collection
  processItems(collection, outputDir);
}

/**
 * Extract environment variables from a Postman environment object
 * @param {sdk.VariableScope} environment - The Postman environment SDK object
 * @returns {Object} - Key-value pairs of environment variables
 */
function extractEnvironmentVariables(environment) {
  if (!environment?.values?.members?.length) return {};
  
  return environment.values.members.reduce((acc, variable) => {
    if (variable.key && variable.value) {
      acc[variable.key] = variable.value;
    }
    return acc;
  }, {});
}

module.exports = {
  processCollection,
  generateMochaTestFromRequest,
  convertPostmanTestToMocha,
  extractBaseUrl
};