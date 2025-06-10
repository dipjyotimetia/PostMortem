/**
 * Validation utilities for Postman collections and environments
 */
class Validator {
  /**
   * Validate Postman collection structure
   * @param {Object} collection - Raw collection object
   * @returns {Object} - Validation result
   */
  static validateCollection(collection) {
    const errors = [];
    const warnings = [];

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
   * @param {Object} environment - Raw environment object
   * @returns {Object} - Validation result
   */
  static validateEnvironment(environment) {
    const errors = [];
    const warnings = [];

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
   * @param {Object} options - CLI options
   * @returns {Object} - Validation result
   */
  static validateOptions(options) {
    const errors = [];
    const warnings = [];

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

module.exports = Validator;
