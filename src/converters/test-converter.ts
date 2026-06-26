interface Conversion {
  pattern: RegExp;
  replacement: string;
}

/**
 * Converts Postman test scripts (`pm.*` + Chai BDD assertions) into
 * `bun:test` / Jest-style assertions.
 *
 * The translation is best-effort: it covers the assertion shapes Postman's
 * snippet library generates plus the most common Chai chains. Anything it
 * cannot translate is passed through unchanged.
 */
export class TestConverter {
  /**
   * Convert a Postman test script into `bun:test` assertions.
   * @param postmanScript - The Postman test script content
   * @returns Equivalent assertions using `bun:test`'s `expect`
   */
  static convertPostmanTest(postmanScript: string | null | undefined): string {
    if (!postmanScript || typeof postmanScript !== 'string') {
      return '';
    }

    const conversions: Conversion[] = [
      // --- Test structure -------------------------------------------------
      { pattern: /pm\.test\s*\(\s*(["'])((?:\\.|(?!\1).)*)\1/g, replacement: 'it($1$2$1' },

      // --- Response accessors --------------------------------------------
      {
        pattern: /pm\.response\.to\.have\.status\s*\(\s*(\d+)\s*\)/g,
        replacement: 'expect(response.status).toBe($1)'
      },
      { pattern: /pm\.response\.code/g, replacement: 'response.status' },
      {
        pattern: /const\s+responseData\s*=\s*pm\.response\.json\(\)\s*;?/g,
        replacement: 'const responseData = response.body;'
      },
      { pattern: /pm\.response\.json\s*\(\s*\)/g, replacement: 'response.body' },
      { pattern: /pm\.response\.text\s*\(\s*\)/g, replacement: 'String(response.body)' },
      { pattern: /pm\.response\.headers\.get\s*\(/g, replacement: 'response.headers.get(' },
      {
        pattern: /pm\.response\.responseTime/g,
        replacement: '0 /* responseTime unavailable with fetch */'
      },

      // --- Environment / variables ---------------------------------------
      {
        pattern:
          /pm\.(?:environment|variables|collectionVariables|globals)\.get\s*\(\s*(["'])((?:\\.|(?!\1).)*)\1\s*\)/g,
        replacement: 'env?.[$1$2$1]'
      },

      // --- pm.expect -> expect (before Chai chain rewrites) --------------
      { pattern: /pm\.expect/g, replacement: 'expect' },

      // --- Negated Chai chains -------------------------------------------
      { pattern: /\.to\.not\.(?:deep\.equal|eql)\s*\(/g, replacement: '.not.toEqual(' },
      { pattern: /\.to\.not\.(?:equal|eq)\s*\(/g, replacement: '.not.toBe(' },
      { pattern: /\.to\.not\.(?:include|contain)\s*\(/g, replacement: '.not.toContain(' },
      { pattern: /\.to\.not\.have\.property\s*\(/g, replacement: '.not.toHaveProperty(' },
      { pattern: /\.to\.not\.be\.null\b/g, replacement: '.not.toBeNull()' },
      { pattern: /\.to\.not\.be\.undefined\b/g, replacement: '.toBeDefined()' },
      { pattern: /\.to\.not\.exist\b/g, replacement: '.toBeUndefined()' },

      // --- Positive Chai chains ------------------------------------------
      { pattern: /\.to\.deep\.equal\s*\(/g, replacement: '.toEqual(' },
      { pattern: /\.to\.eql\s*\(/g, replacement: '.toEqual(' },
      { pattern: /\.to\.(?:equal|eq)\s*\(/g, replacement: '.toBe(' },
      { pattern: /\.to\.have\.(?:own\.)?property\s*\(/g, replacement: '.toHaveProperty(' },
      { pattern: /\.to\.have\.(?:lengthOf|length)\s*\(/g, replacement: '.toHaveLength(' },
      { pattern: /\.to\.(?:include|contain)\s*\(/g, replacement: '.toContain(' },
      { pattern: /\.to\.match\s*\(/g, replacement: '.toMatch(' },
      { pattern: /\.to\.be\.(?:above|greaterThan)\s*\(/g, replacement: '.toBeGreaterThan(' },
      { pattern: /\.to\.be\.(?:below|lessThan)\s*\(/g, replacement: '.toBeLessThan(' },
      { pattern: /\.to\.be\.at\.least\s*\(/g, replacement: '.toBeGreaterThanOrEqual(' },
      { pattern: /\.to\.be\.at\.most\s*\(/g, replacement: '.toBeLessThanOrEqual(' },
      { pattern: /\.to\.be\.an?\s*\(/g, replacement: '.toBeTypeOf(' },
      { pattern: /\.to\.be\.true\b/g, replacement: '.toBe(true)' },
      { pattern: /\.to\.be\.false\b/g, replacement: '.toBe(false)' },
      { pattern: /\.to\.be\.null\b/g, replacement: '.toBeNull()' },
      { pattern: /\.to\.be\.undefined\b/g, replacement: '.toBeUndefined()' },
      { pattern: /\.to\.be\.ok\b/g, replacement: '.toBeTruthy()' },
      { pattern: /\.to\.exist\b/g, replacement: '.toBeDefined()' }
    ];

    return conversions.reduce(
      (result, { pattern, replacement }) => result.replace(pattern, replacement),
      postmanScript
    );
  }

  /**
   * Extract test names from a Postman test script.
   * @param postmanScript - The Postman test script
   * @returns Array of test names
   */
  static extractTestNames(postmanScript: string | null | undefined): string[] {
    if (!postmanScript) {
      return [];
    }

    const testNamePattern = /pm\.test\s*\(\s*["']([^"']+)["']/g;
    const matches: string[] = [];
    let match: RegExpExecArray | null = testNamePattern.exec(postmanScript);

    while (match !== null) {
      matches.push(match[1] as string);
      match = testNamePattern.exec(postmanScript);
    }

    return matches;
  }

  /**
   * Check whether a script contains any Postman assertions.
   * @param postmanScript - The Postman test script
   * @returns True if the script has assertions
   */
  static hasAssertions(postmanScript: string | null | undefined): boolean {
    if (!postmanScript) {
      return false;
    }

    const assertionPatterns = [/pm\.test\s*\(/, /pm\.expect\s*\(/, /pm\.response\.to\.have/];
    return assertionPatterns.some(pattern => pattern.test(postmanScript));
  }
}

export default TestConverter;
