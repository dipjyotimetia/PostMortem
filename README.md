# postmortem

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen.svg)](https://nodejs.org/)
[![Bun](https://img.shields.io/badge/bun-%3E%3D1.2-black.svg)](https://bun.sh/)
[![npm version](https://badge.fury.io/js/@dipjyotimetia%2Fpostmortem.svg)](https://badge.fury.io/js/@dipjyotimetia%2Fpostmortem)

Convert Postman collections into **Bun-native** API test suites — `bun:test` + the native
`fetch` API, with zero runtime test dependencies.

> **v2.0** is a ground-up rewrite. Generated tests now target Bun's built-in test runner
> instead of Mocha/Supertest/Chai. The toolchain itself runs on **Bun + tsup + Biome**, and
> the package ships as **dual ESM + CommonJS**.

## Features

- 🧪 **Bun-native output** — generates `bun:test` files that use the native `fetch` API (no axios/supertest/chai)
- 🔄 **Complete project generation** — scaffold a full Bun test project (`--full-project`)
- 📁 **Folder structure preservation** — mirrors your Postman collection layout
- 🔁 **Assertion translation** — converts Postman `pm.*` + Chai BDD scripts into `bun:test` matchers
- 🌍 **Environment support** — extracts Postman environment variables (Bun auto-loads `.env`)
- 🔧 **Fully typed** — strict TypeScript, dual ESM/CJS, with `.d.ts` declarations

## Requirements

- [Bun](https://bun.sh) ≥ 1.2 to run the generated tests
- Node.js ≥ 24 (LTS) is supported for the CLI/library when consumed from a Node project

## Installation

```bash
bun add -g @dipjyotimetia/postmortem
# or, without installing:
bunx @dipjyotimetia/postmortem -c ./my-collection.json -o ./tests
```

## Usage

```bash
postmortem -c ./my-collection.json -o ./tests -e ./my-environment.json
```

### Options

- `-c, --collection <path>` — Path to the Postman collection JSON file (required)
- `-o, --output <directory>` — Output directory for generated tests (default: `./test`)
- `-e, --environment <path>` — Path to a Postman environment JSON file (optional)
- `--flat` — Generate all test files in the output directory (ignore folder structure)
- `--full-project` — Scaffold a complete Bun test project (config, helpers, API client)
- `--no-setup` — Skip creating the `setup.ts` file
- `--debug` — Enable debug logging
- `--silent` — Suppress all output except errors

After generating, run the suite with Bun:

```bash
cd tests
bun install   # only needed for --full-project output
bun test
```

### Programmatic Usage

The package ships as dual ESM + CommonJS.

```ts
// ESM
import { convert, PostmanConverter } from '@dipjyotimetia/postmortem';

const results = await convert('./my-collection.json', './tests', './my-environment.json');
console.log(`Generated ${results.testFiles} test files`);
```

```js
// CommonJS still works
const { convert } = require('@dipjyotimetia/postmortem');
```

## Example

### Input: Postman Collection

```json
{
  "info": { "name": "My API Tests" },
  "item": [{
    "name": "Get Users",
    "request": { "method": "GET", "url": "{{baseUrl}}/users" },
    "event": [{
      "listen": "test",
      "script": { "exec": ["pm.test('Status is 200', () => pm.response.to.have.status(200));"] }
    }]
  }]
}
```

### Output: Generated `bun:test` File

```ts
import { describe, it, expect } from 'bun:test';
import { request } from './setup';

describe('Get Users', () => {
  it('should respond with correct data', async () => {
    const response = await request.get('/users');

    it('Status is 200', () => expect(response.status).toBe(200));
  });
});
```

## Development

This repo is a Bun workspace containing the CLI/library and the VSCode extension.

```bash
bun install        # install all dependencies
bun run build      # build dual ESM+CJS bundles + .d.ts (tsup)
bun run build:all  # also bundle the VSCode extension
bun test           # run the test suite (bun:test)
bun run typecheck  # tsc --noEmit
bun run lint       # Biome (lint + format check)
bun run lint:fix   # Biome autofix
```

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT — see [LICENSE](LICENSE).
