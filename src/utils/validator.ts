export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PostmanCollection {
  info?: {
    name?: string;
    schema?: string;
  };
  item?: any[];
}

export interface PostmanEnvironment {
  name?: string;
  values?: Array<{
    key?: string;
    value?: string;
  }>;
}

export interface CLIOptions {
  collection?: string;
  output?: string;
  environment?: string;
  debug?: boolean;
  setup?: boolean;
  flat?: boolean;
  silent?: boolean;
}

/**
 * Validation utilities for Postman collections and environments
 */
export class Validator {
  /**
   * Validate Postman collection structure
   * @param collection - Raw collection object
   * @returns Validation result
   */
  static validateCollection(collection: PostmanCollection): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!collection) {
      errors.push('Collection is required');
      return { isValid: false, errors, warnings };
    }

    if (!collection.info) {
      errors.push('Collection must have an info object');
    } else {
      if (!collection.info.name) {
        warnings.push('Collection name is missing');
      }
      if (!collection.info.schema) {
        warnings.push('Collection schema is missing');
      }
    }

    if (!collection.item || !Array.isArray(collection.item)) {
      errors.push('Collection must have an items array');
    } else if (collection.item.length === 0) {
      warnings.push('Collection has no items');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate Postman environment structure
   * @param environment - Raw environment object
   * @returns Validation result
   */
  static validateEnvironment(environment: PostmanEnvironment | null): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!environment) {
      return { isValid: true, errors, warnings }; // Environment is optional
    }

    if (!environment.name) {
      warnings.push('Environment name is missing');
    }

    if (!environment.values || !Array.isArray(environment.values)) {
      errors.push('Environment must have a values array');
    } else if (environment.values.length === 0) {
      warnings.push('Environment has no variables');
    } else {
      environment.values.forEach((variable, index) => {
        if (!variable.key) {
          warnings.push(`Environment variable at index ${index} is missing a key`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate CLI options
   * @param options - CLI options
   * @returns Validation result
   */
  static validateOptions(options: CLIOptions): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!options.collection) {
      errors.push('Collection path is required');
    }

    if (!options.output) {
      warnings.push('Output directory not specified, using default');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export default Validator;
