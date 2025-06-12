# postmortem

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![npm version](https://badge.fury.io/js/postmortem.svg)](https://badge.fury.io/js/postmortem)

Convert Postman collections to Mocha/Supertest tests automatically.

## Features

- Convert Postman collections to Mocha test suites
- Support for environment variables and .env files
- Maintains folder structure from Postman
- Converts test assertions to Chai
- TypeScript support included

## Installation

```bash
npm install -g postmortem
```

## Usage

```bash
postmortem -c ./my-collection.json -o ./test-output
```

### Options

- `-c, --collection <path>` - Path to Postman collection JSON file (required)
- `-o, --output <directory>` - Output directory for generated test files (default: test)
- `-e, --environment <path>` - Path to Postman environment JSON file (optional)
- `--flat` - Generate all test files in output directory (ignore folder structure)
- `--no-setup` - Skip creating setup.js file

### Programmatic Usage

```javascript
const { PostmanConverter } = require('postmortem');

const converter = new PostmanConverter();
const collection = require('./my-collection.json');
const results = await converter.processCollection(collection, './test-output');
```

## Example

### Input: Postman Collection
```json
{
  "info": { "name": "My API Tests" },
  "item": [{
    "name": "Get Users",
    "request": {
      "method": "GET", 
      "url": "https://api.example.com/users"
    }
  }]
}
```

### Output: Generated Test
```javascript
const { request, expect } = require('./setup.js');

describe('Get Users', function() {
  it('should respond with correct data', async function() {
    const response = await request.get('/users');
    expect(response.status).to.equal(200);
  });
});
```
