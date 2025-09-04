# postmortem

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![npm version](https://badge.fury.io/js/@dipjyotimetia%2Fpostmortem.svg)](https://badge.fury.io/js/@dipjyotimetia%2Fpostmortem)

Convert Postman collections to complete Mocha/Supertest test frameworks automatically.

## Features

- 🔄 **Complete Project Generation** - Creates a full test framework with proper structure
- 📁 **Folder Structure Preservation** - Maintains your Postman collection organization
- 🧪 **Modern Test Framework** - Generates Mocha tests with Chai assertions and Supertest
- 🔧 **TypeScript Ready** - Includes TypeScript configuration and type definitions
- 🌍 **Environment Support** - Handles Postman environments and generates .env files

## Installation

```bash
npm install -g @dipjyotimetia/postmortem
```

Or install locally:

```bash
npm install @dipjyotimetia/postmortem
```

## Usage

### Global Installation
```bash
postmortem -c ./my-collection.json -o ./test-output
```

### Local Installation
```bash
npx @dipjyotimetia/postmortem -c ./my-collection.json -o ./test-output
```

### Options

- `-c, --collection <path>` - Path to Postman collection JSON file (required)
- `-o, --output <directory>` - Output directory for generated test files (default: test-output)
- `-e, --environment <path>` - Path to Postman environment JSON file (optional)
- `--flat` - Generate all test files in output directory (ignore folder structure)
- `--no-setup` - Skip creating setup.js and package.json files
- `--debug` - Enable debug logging
- `--silent` - Suppress console output

### Programmatic Usage

```javascript
const { PostmanConverter } = require('@dipjyotimetia/postmortem');

const converter = new PostmanConverter({
  outputDir: './my-tests',
  flatOutput: false,
  includeSetup: true,
  logLevel: 'info'
});

const collection = require('./my-collection.json');
const environment = require('./my-environment.json'); // optional

try {
  const results = await converter.processCollection(collection, environment);
  console.log(`Generated ${results.testCount} tests in ${results.outputDir}`);
} catch (error) {
  console.error('Conversion failed:', error.message);
}
```

## Example

### Input: Postman Collection
```json
{
  "info": { "name": "My API Tests" },
  "item": [{
    "name": "Users API",
    "item": [{
      "name": "Get Users",
      "request": {
        "method": "GET", 
        "url": "{{baseUrl}}/users"
      },
      "event": [{
        "listen": "test",
        "script": {
          "exec": ["pm.test('Status is 200', () => pm.response.to.have.status(200));"]
        }
      }]
    }]
  }]
}
```

### Output: Generated Test
```javascript
const { request, expect } = require('../../setup');

describe('Users API', function() {
  describe('Get Users', function() {
    it('Status is 200', async function() {
      const response = await request.get('/users');
      expect(response.status).to.equal(200);
    });
  });
});
```

## Development

This project uses npm workspaces to manage the CLI package and VSCode extension together:

```bash
# Install all dependencies (CLI + extension)
npm install

# Build all packages
npm run build

# Run all tests
npm run test:all

# Lint all packages
npm run lint
```

For more details, see [WORKSPACE.md](WORKSPACE.md).

## Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to get started.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.