/**
 * Type definitions for Postman SDK internal structures
 * These types provide better type safety when working with the postman-collection SDK
 */

import type * as sdk from 'postman-collection';

/**
 * Represents an item group (folder) in the collection
 */
export interface TypedItemGroup {
  name: string;
  items?: ItemsContainer;
  request?: sdk.Request;
}

/**
 * Container for items with members array
 */
export interface ItemsContainer {
  members?: Array<TypedItemGroup | sdk.Item>;
  all?: () => Array<TypedItemGroup | sdk.Item>;
}

/**
 * Container for environment variables
 */
export interface ValuesContainer {
  members?: VariableMember[];
  all?: () => VariableMember[];
}

/**
 * Extended Collection type with typed items property
 */
export interface TypedCollection {
  items?: ItemsContainer;
  name?: string;
}

/**
 * Extended VariableScope type with typed values property
 */
export interface TypedVariableScope {
  values?: ValuesContainer;
  name?: string;
}

/**
 * Represents a variable in the environment
 */
export interface VariableMember {
  key: string;
  value: string;
  type?: string;
  enabled?: boolean;
}

/**
 * Type guard to check if an item is an item group (folder)
 * @param item - The item to check
 * @returns True if the item is an item group (has items property with content)
 */
export function isItemGroup(item: unknown): item is TypedItemGroup {
  if (item === null || typeof item !== 'object') {
    return false;
  }

  const obj = item as Record<string, unknown>;
  if (!('items' in obj) || obj.items === undefined) {
    return false;
  }

  // Check if it has members or an all function
  const items = obj.items as ItemsContainer;
  const hasMembers = Array.isArray(items?.members) && items.members.length > 0;
  const hasAll = typeof items?.all === 'function';

  return hasMembers || hasAll;
}

/**
 * Type guard to check if an item is a request item
 * @param item - The item to check
 * @returns True if the item is a request item (has request property)
 */
export function isRequestItem(item: unknown): item is sdk.Item {
  if (item === null || typeof item !== 'object') {
    return false;
  }

  const obj = item as Record<string, unknown>;
  return 'request' in obj && obj.request !== undefined;
}

/**
 * Safely extracts members from a property list
 * @param itemsContainer - The items container to extract from
 * @returns Array of items
 */
export function extractMembers<T>(itemsContainer: ItemsContainer | undefined): T[] {
  if (!itemsContainer) {
    return [];
  }

  // Try to get members directly
  if (Array.isArray(itemsContainer.members)) {
    return itemsContainer.members as T[];
  }

  // Try to get members via all() function
  if (typeof itemsContainer.all === 'function') {
    try {
      const result = itemsContainer.all();
      if (Array.isArray(result)) {
        return result as T[];
      }
    } catch {
      // Ignore errors from all()
    }
  }

  return [];
}

/**
 * Safely extracts environment variables from a VariableScope
 * @param environment - The VariableScope to extract from (cast to unknown first)
 * @returns Record of key-value pairs
 */
export function extractEnvironmentVariables(
  environment: sdk.VariableScope | null
): Record<string, string> {
  if (!environment) {
    return {};
  }

  // Access the internal values property
  const typedEnv = environment as unknown as TypedVariableScope;
  const valuesContainer = typedEnv.values;

  if (!valuesContainer) {
    return {};
  }

  const members = extractMembers<VariableMember>(valuesContainer as unknown as ItemsContainer);

  return members.reduce<Record<string, string>>((acc, variable) => {
    if (variable && variable.key && variable.value) {
      acc[variable.key] = variable.value;
    }
    return acc;
  }, {});
}

/**
 * Gets the count of environment variables
 * @param environment - The VariableScope to count
 * @returns Number of variables
 */
export function getEnvironmentVariableCount(environment: sdk.VariableScope | null): number {
  if (!environment) {
    return 0;
  }

  const typedEnv = environment as unknown as TypedVariableScope;
  const valuesContainer = typedEnv.values;

  if (!valuesContainer) {
    return 0;
  }

  return extractMembers<VariableMember>(valuesContainer as unknown as ItemsContainer).length;
}
