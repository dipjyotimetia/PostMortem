/**
 * String utilities (native replacements for lodash helpers).
 */

/**
 * Convert an arbitrary string into kebab-case.
 *
 * Splits on word boundaries (spaces, punctuation, camelCase/PascalCase and
 * acronym transitions), lowercases each token and joins them with hyphens.
 *
 * @example
 * kebabCase('Get All Users')   // 'get-all-users'
 * kebabCase('Users API')       // 'users-api'
 * kebabCase('createUser')      // 'create-user'
 */
export function kebabCase(input: string): string {
  const matches = input.match(/[A-Z]{2,}(?=[A-Z][a-z]+|\b)|[A-Z]?[a-z]+|[A-Z]|\d+/g);
  if (!matches) {
    return '';
  }
  return matches.map(part => part.toLowerCase()).join('-');
}
