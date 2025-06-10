const PostmanConverter = require('./postman-converter');
const TestConverter = require('./converters/test-converter');
const TestGenerator = require('./converters/test-generator');
const { Logger, logger } = require('./utils/logger');
const FileSystem = require('./utils/filesystem');
const Validator = require('./utils/validator');

/**
 * Main library entry point
 */
module.exports = {
  PostmanConverter,
  TestConverter,
  TestGenerator,
  Logger,
  logger,
  FileSystem,
  Validator,
  
  // Convenience function for one-shot conversion
  async convert(collectionPath, outputDir, environmentPath = null, options = {}) {
    const converter = new PostmanConverter(options);
    
    // Read files
    const collection = await FileSystem.readJsonFile(collectionPath);
    let environment = null;
    
    if (environmentPath) {
      environment = await FileSystem.readJsonFile(environmentPath);
    }
    
    // Process collection
    return converter.processCollection(collection, outputDir, environment);
  }
};
