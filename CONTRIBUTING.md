# Contributing to postmortem

Thank you for your interest in contributing to postmortem! This document provides guidelines and information for contributors.

## Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/yourusername/postmortem.git
   cd postmortem
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run tests to ensure everything works**
   ```bash
   npm test
   ```

## Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write your code
   - Add tests for new functionality
   - Update documentation if needed

3. **Run the development checks**
   ```bash
   npm run lint        # Check code style
   npm run lint:fix    # Fix auto-fixable issues
   npm test           # Run all tests
   npm run test:coverage  # Check test coverage
   ```

4. **Test your changes with a real collection**
   ```bash
   npm run convert    # Test with example collection
   ```

## Testing

### Test Structure
- `tests/unit/` - Unit tests for individual functions
- `tests/integration/` - Integration tests for components working together
- `tests/e2e/` - End-to-end tests for the complete workflow
- `tests/fixtures/` - Test data and mock collections

### Running Tests
```bash
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
```

### Writing Tests
- Use descriptive test names
- Follow the AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Aim for high test coverage (>80%)

## Code Style

This project uses ESLint and Prettier for code formatting:

```bash
npm run lint           # Check code style
npm run lint:fix       # Fix auto-fixable issues
npm run format         # Format code with Prettier
```

### Code Guidelines
- Use modern JavaScript (ES2022+)
- Write clear, descriptive variable and function names
- Add JSDoc comments for public APIs
- Handle errors gracefully
- Use async/await over Promises when possible

## Project Architecture

### Core Components
- `src/postman-converter.js` - Main converter class
- `src/converters/` - Conversion utilities
- `src/utils/` - Utility modules (logger, filesystem, validator)
- `src/cli.js` - Command-line interface

### Key Principles
- Separation of concerns
- Comprehensive error handling
- Extensive logging for debugging
- Modular, testable code

## Adding New Features

### Before Starting
1. Check existing issues and PRs
2. Create an issue to discuss the feature
3. Wait for maintainer approval

### Implementation
1. Write tests first (TDD approach)
2. Implement the feature
3. Update documentation
4. Add examples if applicable

### Feature Ideas
- Support for additional test frameworks
- GraphQL collection support
- Custom assertion templates
- Test data generation
- Performance testing capabilities

## Bug Reports

When reporting bugs, please include:
- Node.js version
- postmortem version
- Steps to reproduce
- Expected vs actual behavior
- Sample Postman collection (if possible)

## Pull Request Guidelines

1. **Include tests** for any new functionality
2. **Update documentation** if you change APIs
3. **Follow the code style** guidelines
4. **Write clear commit messages**
5. **Keep PRs focused** - one feature/fix per PR

### PR Template
```
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added tests for new functionality
- [ ] Manual testing completed

## Documentation
- [ ] Updated README if needed
- [ ] Added/updated JSDoc comments
- [ ] Updated examples if needed
```

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Create release tag
4. Publish to npm (maintainers only)

## Questions?

Feel free to:
- Open an issue for bugs or feature requests
- Start a discussion for questions
- Contact maintainers directly

Thank you for contributing! 🚀
