# Workspace Configuration

This project now uses npm workspaces to simplify dependency management between the CLI package and the VSCode extension.

## Benefits

1. **Simplified Dependencies**: The VSCode extension can reference the main CLI package using `"@dipjyotimetia/postmortem": "*"` instead of complex file references
2. **Unified Build Process**: Single commands from root can build both packages
3. **Shared Dependencies**: Common devDependencies are hoisted to the root, reducing duplication
4. **Easier Development**: No need to manually link packages during development

## Structure

```
PostMorterm/
├── package.json (workspace root + CLI package)
├── vscode-extension/ (VSCode extension workspace)
│   └── package.json
└── other files...
```

## Available Scripts

From the root directory:

- `npm run build` - Builds both CLI and extension
- `npm run build:cli` - Builds only the CLI package
- `npm run build:extension` - Builds only the VSCode extension
- `npm run test:all` - Runs tests for both packages
- `npm run lint` - Lints both packages

## Dependencies

- The root package.json contains all CLI dependencies and shared devDependencies
- The VSCode extension references the CLI using workspace resolution: `"@dipjyotimetia/postmortem": "*"`
- Extension-specific dependencies (like VSCode types) remain in the extension's package.json

## Installation

Simply run `npm install` from the root directory. This will:

1. Install CLI dependencies in the root
2. Install extension-specific dependencies
3. Set up workspace links between packages