import { TestConverter } from './converters/test-converter';
import type { EnvironmentVariables } from './converters/test-generator';
import { TestGenerator } from './converters/test-generator';
import type { PostmanConverterOptions, ProcessingResults } from './postman-converter';
import { PostmanConverter } from './postman-converter';
import { FileSystem } from './utils/filesystem';
import type { LoggerOptions, LogLevel } from './utils/logger';
import { Logger, logger } from './utils/logger';
import type {
  CLIOptions,
  PostmanCollection,
  PostmanEnvironment,
  ValidationResult
} from './utils/validator';
import { Validator } from './utils/validator';

export type {
  CLIOptions,
  EnvironmentVariables,
  LoggerOptions,
  LogLevel,
  PostmanCollection,
  PostmanConverterOptions,
  PostmanEnvironment,
  ProcessingResults,
  ValidationResult
};
/**
 * Main library entry point.
 */
export { FileSystem, Logger, logger, PostmanConverter, TestConverter, TestGenerator, Validator };

/**
 * Convenience function for one-shot conversion.
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

  const collection = await FileSystem.readJsonFile(collectionPath);
  let environment: unknown = null;

  if (environmentPath) {
    environment = await FileSystem.readJsonFile(environmentPath);
  }

  return converter.processCollection(
    collection as PostmanCollection,
    outputDir,
    environment as PostmanEnvironment | null
  );
}
