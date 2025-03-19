# PostMorterm

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)

## Convert Postman Collections to Mocha/Supertest Tests

PostMorterm is a powerful and efficient tool designed to streamline API testing by converting Postman collections into Mocha and Supertest test scripts. By automating the transformation process, this tool empowers engineers to create robust, reliable, and reusable test suites for their APIs with minimal effort.

## Features

- **Automated Conversion**: Transform Postman collections into well-structured Mocha test suites
- **Environment Support**: Handle Postman environment variables and integrate with .env files
- **Test Organization**: Maintains your Postman folder structure in the generated test files
- **Full Assertion Support**: Properly converts Postman test scripts to equivalent Chai assertions
- **Flexible Configuration**: Customize output directory and other options via CLI
- **Comprehensive API Support**: Handles all REST methods, headers, query parameters, and JSON bodies

## Usage

### Command Line Interface

```bash
postmorterm -c ./my-collection.json -o ./test-output -e ./environment.json
```

### Options

- `-c, --collection <path>` - Path to Postman collection JSON file (required)
- `-o, --output <directory>` - Output directory for generated test files (default: test)
- `-e, --environment <path>` - Path to Postman environment JSON file (optional)
- `--version` - Display version information
- `--help` - Display help information

### Quick Start with NPM Script

```bash
npm run convert
```

This will convert the example Platzi API collection included in the repo.

## Project Structure

```
postmorterm/
├── collection/             # Example Postman collections
│   └── Platzi_postman_collection.json
├── src/
│   ├── cli.js              # Command-line interface
│   └── convert.js          # Core conversion logic
├── test/                   # Generated tests will be stored here
└── package.json            # Project dependencies and scripts
```

## How It Works

PostMorterm utilizes the [postman-collection](https://github.com/postmanlabs/postman-collection) SDK to parse Postman collections and transform them into Mocha/Chai/Supertest tests by:

1. Reading the Postman collection structure
2. Extracting requests, tests, and folder organization
3. Converting Postman script assertions to equivalent Chai assertions
4. Generating properly structured test files that maintain the original collection organization
5. Creating a setup file with configuration for easy test execution

## Generated Test Structure

For each request in your Postman collection, PostMorterm generates:

- A Mocha test file with the request details
- Test assertions converted from Postman's syntax to Chai
- Proper folder structure matching your Postman organization
- A centralized setup file with environment variables and configuration

## Example

**Postman Test:**
```javascript
pm.test("Response status code is 200", function () {
    pm.response.to.have.status(200);
});
```

**Generated Mocha/Chai Test:**
```javascript
it("Response status code is 200", function () {
    expect(response.status).to.equal(200);
});
```