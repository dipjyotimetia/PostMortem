# Contributing to postmortem

Thank you for your interest in contributing! This guide will help you get started quickly.

## Quick Start

1. **Fork and clone**
   ```bash
   git clone https://github.com/yourusername/postmortem.git
   cd postmortem
   npm install
   ```

2. **Test your setup**
   ```bash
   npm test
   npm run convert    # Test with example collection
   ```

## Development Workflow

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and test**
   ```bash
   npm run lint:fix   # Fix code style
   npm test           # Run all tests
   npm run test:coverage  # Check coverage
   ```

3. **Submit a PR**
   - Keep PRs focused (one feature/fix per PR)
   - Include tests for new functionality
   - Update documentation if needed

## Project Structure

- `src/postman-converter.ts` - Main converter class
- `src/converters/` - Test generation logic
- `src/utils/` - Utilities (logger, filesystem, validator)
- `tests/` - Unit, integration, and e2e tests

## Testing

```bash
npm test              # All tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

Write tests for new features following the existing patterns in [`tests/`](tests/).

## Code Guidelines

- Use TypeScript with proper types
- Add JSDoc comments for public APIs
- Follow existing code style (ESLint + Prettier)
- Handle errors gracefully with proper logging

## Bug Reports

Include:
- Node.js and postmortem versions
- Steps to reproduce
- Sample Postman collection (if relevant)

## Feature Requests

Before implementing:
1. Check existing issues
2. Create an issue to discuss the feature
3. Wait for maintainer approval

## Questions?

Open an issue or start a discussion. We're happy to help! 🚀