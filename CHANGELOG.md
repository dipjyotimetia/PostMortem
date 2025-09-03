## [1.2.0] - 2025-09-03

### Changed
- Version bump to 1.2.0

## [1.1.0] - 2025-09-03

### Changed
- Version bump to 1.1.0

## [1.0.1] - 2025-09-03

### Changed
- Version bump to 1.0.1

## [1.0.0] - 2025-09-03

### Changed
- Version bump to 1.0.0

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-06-11

### Added
- Complete rewrite with modern architecture
- Comprehensive test suite (unit, integration, e2e)
- Enhanced CLI with more options (`--flat`, `--no-setup`, `--debug`, `--silent`)
- TypeScript-ready codebase structure
- Environment variable support in generated tests
- Proper error handling and validation
- Colored logging with different log levels
- File system utilities with better error handling
- Test converter with improved Postman script parsing
- Programmatic API for library usage
- Extensive documentation and contributing guidelines
- CI/CD workflow with GitHub Actions
- Code quality tools (ESLint, Prettier, NYC coverage)

### Changed
- Migrated from synchronous to asynchronous file operations
- Improved CLI interface with Commander.js
- Better folder structure maintenance
- Enhanced test generation with proper require paths
- More robust URL parsing and base URL extraction
- Improved assertion conversion from Postman to Chai

### Fixed
- Proper relative path calculation for require statements
- Better handling of complex Postman collections
- Fixed URL parsing edge cases
- Improved error messages and debugging information

### Technical
- Added comprehensive test coverage (>80%)
- Implemented proper separation of concerns
- Added input validation for all components
- Improved logging throughout the application
- Added support for different output formats

## [1.0.0] - 2024-XX-XX

### Added
- Initial release
- Basic Postman collection to Mocha/Supertest conversion
- Simple CLI interface
- Basic folder structure support
- Environment variable handling

### Features
- Convert GET/POST/PUT/DELETE requests
- Basic assertion conversion
- Simple test file generation
