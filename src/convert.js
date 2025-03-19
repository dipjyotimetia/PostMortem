const fs = require('node:fs');
const path = require('node:path');
const _ = require('lodash');

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
 * @param {Object} request - The Postman request object
 * @param {string} parentName - The name of the parent folder
 * @returns {string} - The generated Mocha test code
 */
function generateMochaTestFromRequest(request, parentName) {
  if (!request?.name) return '';

  const testName = `${parentName} - ${request.name}`;
  const method = (request.request?.method || 'GET').toLowerCase();
  const url = request.request?.url?.raw || '';
  const path = url ? '/' + url.split('/').slice(3).join('/') : '/';

  // Extract body if it exists
  let body = null;
  if (request.request?.body?.raw) {
    try {
      body = JSON.parse(request.request.body.raw);
    } catch {
      body = request.request.body.raw;
    }
  }

  // Extract test script using optional chaining
  const testEvent = request.event?.find(e => e.listen === 'test');
  const testScript = testEvent?.script?.exec?.join('\n') || '';
  const mochaAssertions = convertPostmanTestToMocha(testScript);

  // Build request code more cleanly
  const requestCode = method === 'get'
    ? `const response = await request.get('${path}');`
    : `const response = await request.${method}('${path}')${body ? `\n        .send(${JSON.stringify(body, null, 2)})` : ''};`;

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
 * @param {Object} collection - The Postman collection object
 * @returns {string} - The base URL
 */
function extractBaseUrl(collection) {
  if (!collection?.item?.length) {
    return 'https://api.example.com'; // Default base URL
  }

  // Try to find the first URL in the collection using a recursive function
  function findFirstUrl(items) {
    for (const item of items) {
      if (item.request?.url?.raw) {
        const url = item.request.url.raw;
        return url.split('/').slice(0, 3).join('/');
      }
      if (item.item) {
        const url = findFirstUrl(item.item);
        if (url) return url;
      }
    }
    return null;
  }

  return findFirstUrl(collection.item) || 'https://api.example.com';
}

/**
 * Processes Postman collection items recursively
 * @param {Array} items - Collection items array
 * @param {string} outputDir - The output directory
 * @param {string} parentPath - The parent folder path
 */
function processItems(items, outputDir, parentPath = '') {
  if (!Array.isArray(items)) return;

  items.forEach(item => {
    if (item.item && Array.isArray(item.item)) {
      // This is a folder - process recursively
      const folderName = _.kebabCase(item.name);
      const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName;
      
      // Create directory for this folder
      const folderDir = path.join(outputDir, folderPath);
      fs.mkdirSync(folderDir, { recursive: true });

      // Process contained items
      processItems(item.item, outputDir, folderPath);
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
 * @param {Object} collection - The Postman collection object
 * @param {string} outputDir - The directory where test files will be created
 * @param {Object} environment - Optional Postman environment variables
 */
function processCollection(collection, outputDir, environment = null) {
  if (!collection?.item) {
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
  processItems(collection.item, outputDir);
}

/**
 * Extract environment variables from a Postman environment file
 * @param {Object} environment - The Postman environment object
 * @returns {Object} - Key-value pairs of environment variables
 */
function extractEnvironmentVariables(environment) {
  if (!environment?.values?.length) return {};
  
  return environment.values.reduce((acc, item) => {
    if (item.key && item.value) {
      acc[item.key] = item.value;
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