# PostMortem VSCode Extension

Generate Mocha/Supertest tests from Postman collections directly in VSCode.

## Features

- 🔄 **Convert Postman Collections** - Transform your Postman collections into automated Mocha tests
- 📁 **Maintain Structure** - Preserve your Postman folder organization in generated tests
- 🧪 **Modern Testing** - Generate tests with Mocha, Chai, and Supertest
- 🌍 **Environment Support** - Handle Postman environment variables
- ⚙️ **Configurable Output** - Choose between simple tests or full project generation
- 🎯 **Context Menu Integration** - Right-click JSON files to generate tests
- 🚀 **Progress Tracking** - Visual progress indicators during generation

## Installation

1. Install from VSCode Marketplace (coming soon)
2. Or install from VSIX file

## Usage

### Method 1: Command Palette
1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run `PostMortem: Generate Tests from Postman Collection`
3. Select your Postman collection JSON file
4. Optionally select environment file
5. Choose output directory
6. Tests will be generated!

### Method 2: Context Menu
1. Right-click any `.json` file in Explorer
2. Select `Generate Tests from Collection File`
3. Follow the prompts

## Configuration

Configure the extension behavior in VSCode settings:

```json
{
  "postmortem.outputDirectory": "./tests",
  "postmortem.maintainFolderStructure": true,
  "postmortem.generateFullProject": false,
  "postmortem.createSetupFile": true
}
```

### Settings

- **`postmortem.outputDirectory`** - Default output directory for generated tests
- **`postmortem.maintainFolderStructure`** - Preserve Postman collection folder structure
- **`postmortem.generateFullProject`** - Generate complete test framework with enhanced features
- **`postmortem.createSetupFile`** - Create setup.ts file for test configuration

## Example

### Input: Postman Collection
```json
{
  "info": { "name": "My API Tests" },
  "item": [{
    "name": "Users",
    "item": [{
      "name": "Get User",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/users/1"
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
```typescript
import { request, expect } from './setup';

describe('Users - Get User', function() {
  it('should respond with correct data', async function() {
    const response = await request.get('/users/1');
    
    expect(response.status).to.equal(200);
  });
});
```

## Features by Mode

### Simple Mode (Default)
- Generates individual test files
- Basic setup.ts file
- Uses Supertest for HTTP requests
- Minimal project structure

### Full Project Mode
- Complete test framework
- Enhanced API client with helpers
- TypeScript configuration
- Package.json with dependencies
- Comprehensive test utilities
- Better error handling and logging

## Requirements

- VSCode 1.85.0 or higher
- Node.js 18+ (for running generated tests)

## Commands

| Command | Description |
|---------|-------------|
| `postmortem.generateFromCollection` | Generate tests from selected Postman collection |
| `postmortem.generateFromFile` | Generate tests from specific JSON file (context menu) |

## Contributing

1. Clone the repository
2. Run `npm install`
3. Open in VSCode
4. Press `F5` to start debugging

## License

MIT

## Credits

Built on top of the [PostMortem](https://github.com/dipjyotimetia/PostMortem) CLI tool.