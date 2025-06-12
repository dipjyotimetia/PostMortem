import { PostmanConverter, PostmanConverterOptions, ProcessingResults } from './postman-converter';
import { TestConverter } from './converters/test-converter';
import { TestGenerator, EnvironmentVariables } from './converters/test-generator';
import { Logger, logger, LogLevel, LoggerOptions } from './utils/logger';
import { FileSystem } from './utils/filesystem';
import { Validator, ValidationResult, PostmanCollection, PostmanEnvironment, CLIOptions } from './utils/validator';

/**
 * Main library entry point
 */
export {
  PostmanConverter,
  TestConverter,
  TestGenerator,
  Logger,
  logger,
  FileSystem,
  Validator,
  // Types
  PostmanConverterOptions,
  ProcessingResults,
  EnvironmentVariables,
  LogLevel,
  LoggerOptions,
  ValidationResult,
  PostmanCollection,
  PostmanEnvironment,
  CLIOptions
};

/**
 * Convenience function for one-shot conversion
 * @param collectionPath - Path to the Postman collection file
 * @param outputDir - Output directory for test files
 * @param environmentPath - Optional path to environment file
 * @param options - Converter options
 * @returns Processing results
 */
export async function convert(
  collectionPath: string,
  outputDir: string,
  environmentPath: string | null = null,
  options: PostmanConverterOptions = {}
): Promise<ProcessingResults> {
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
