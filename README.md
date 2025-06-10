# PostMorterm

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![npm version](https://badge.fury.io/js/postmorterm.svg)](https://badge.fury.io/js/postmorterm)

## Convert Postman Collections to Mocha/Supertest Tests

PostMorterm is a powerful and efficient tool designed to streamline API testing by converting Postman collections into Mocha and Supertest test scripts. By automating the transformation process, this tool empowers engineers to create robust, reliable, and reusable test suites for their APIs with minimal effort.

## Features

- **Automated Conversion**: Transform Postman collections into well-structured Mocha test suites
- **Environment Support**: Handle Postman environment variables and integrate with .env files  
- **Test Organization**: Maintains your Postman folder structure in the generated test files
- **Full Assertion Support**: Properly converts Postman test scripts to equivalent Chai assertions
- **Flexible Configuration**: Customize output directory and other options via CLI
- **Comprehensive API Support**: Handles all REST methods, headers, query parameters, and JSON bodies
- **TypeScript Ready**: Well-structured codebase with comprehensive testing
- **Modern Architecture**: Built with ES2022+ features and best practices

## Installation

### Global Installation
```bash
npm install -g postmorterm
```

### Local Installation  
```bash
npm install --save-dev postmorterm
```

## Usage

### Command Line Interface

```bash
postmorterm -c ./my-collection.json -o ./test-output -e ./environment.json
```

### Advanced Usage

```bash
# Generate tests with flat structure (no folders)
postmorterm -c ./collection.json -o ./tests --flat

# Skip creating setup.js file
postmorterm -c ./collection.json -o ./tests --no-setup

# Enable debug logging
postmorterm -c ./collection.json -o ./tests --debug

# Silent mode (only errors)
postmorterm -c ./collection.json -o ./tests --silent
```

### Options

- `-c, --collection <path>` - Path to Postman collection JSON file (required)
- `-o, --output <directory>` - Output directory for generated test files (default: test)
- `-e, --environment <path>` - Path to Postman environment JSON file (optional)
- `-d, --debug` - Enable debug logging
- `--flat` - Generate all test files in output directory (ignore folder structure)
- `--no-setup` - Skip creating setup.js file
- `--silent` - Suppress all output except errors
- `--version` - Display version information
- `--help` - Display help information

### Programmatic Usage

```javascript
const { PostmanConverter } = require('postmorterm');

const converter = new PostmanConverter({
  createSetupFile: true,
  maintainFolderStructure: true
});

const collection = require('./my-collection.json');
const environment = require('./my-environment.json');

const results = await converter.processCollection(
  collection, 
  './test-output', 
  environment
);

console.log(`Generated ${results.testFiles} test files`);
```

### Quick Start with NPM Script

Add to your package.json:
```json
{
  "scripts": {
    "generate-tests": "postmorterm -c ./postman/collection.json -o ./tests"
  }
}
```

Then run:
```bash
npm run generate-tests
```

## How It Works

PostMorterm utilizes the [postman-collection](https://github.com/postmanlabs/postman-collection) SDK to parse Postman collections and transform them into Mocha/Chai/Supertest tests by:

1. **Reading** the Postman collection structure and validating input
2. **Parsing** requests, tests, and folder organization  
3. **Converting** Postman script assertions to equivalent Chai assertions
4. **Generating** properly structured test files that maintain the original collection organization
5. **Creating** a setup file with configuration for easy test execution

## Generated Test Structure

For each request in your Postman collection, PostMorterm generates:

- **Mocha test files** with the request details and proper imports
- **Test assertions** converted from Postman's syntax to Chai
- **Folder structure** matching your Postman organization (optional)
- **Setup file** with environment variables and configuration
- **Relative imports** ensuring tests can find dependencies

## Examples

### Postman Collection Input
```json
{
  "info": { "name": "My API Tests" },
  "item": [
    {
      "name": "Get Users",
      "request": {
        "method": "GET", 
        "url": "https://api.example.com/users"
      },
      "event": [{
        "listen": "test",
        "script": {
          "exec": [
            "pm.test('Status is 200', function () {",
            "    pm.expect(pm.response.code).to.equal(200);",
            "});"
          ]
        }
      }]
    }
  ]
}
```

### Generated Mocha Test
```javascript
const { request, expect } = require('./setup.js');

describe('Get Users', function() {
  it('should respond with correct data', async function() {
    const response = await request.get('/users');
    
    expect(response.status).to.equal(200);
  });
});
```

### Generated Setup File
```javascript
const supertest = require('supertest');
const { expect } = require('chai');
require('dotenv').config();

const BASE_URL = process.env.API_BASE_URL || 'https://api.example.com';
const request = supertest(BASE_URL);

module.exports = { request, expect };
```

## Project Structure

```
postmorterm/
├── collection/             # Example Postman collections
│   └── Platzi_postman_collection.json
├── src/
│   ├── cli.js              # Command-line interface
│   ├── index.js            # Main library entry point
│   ├── postman-converter.js # Core conversion logic
│   ├── converters/         # Conversion utilities
│   │   ├── test-converter.js
│   │   └── test-generator.js
│   └── utils/              # Utility modules
│       ├── logger.js
│       ├── filesystem.js
│       └── validator.js
├── tests/                  # Comprehensive test suite
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   ├── e2e/              # End-to-end tests
│   └── fixtures/         # Test fixtures
└── test-output/           # Generated tests (gitignored)
```

## Testing & Quality

PostMorterm includes a comprehensive test suite ensuring reliability and code quality:

### Test Coverage
- **Unit Tests**: Test individual functions and modules
- **Integration Tests**: Test component interactions  
- **End-to-End Tests**: Test complete workflows
- **CLI Tests**: Test command-line interface
- **Coverage**: >80% code coverage maintained

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test suites
npm run test tests/unit/
npm run test tests/integration/
npm run test tests/e2e/
```

### Code Quality
```bash
# Lint code
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Format code
npm run format
```
