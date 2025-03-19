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
