import * as _ from 'lodash';

/**
 * Converts Postman test scripts to Mocha/Chai assertions
 */
export class TestConverter {
  /**
   * Convert Postman test script to Mocha assertions
   * @param postmanScript - The Postman test script content
   * @returns Equivalent test assertions in Chai syntax
   */
  static convertPostmanTestToMocha(postmanScript: string | null | undefined): string {
    if (!postmanScript || typeof postmanScript !== 'string') {
      return '';
    }

    // Define conversion patterns
    const conversions = [
      // Basic test structure
      {
        pattern: /pm\.test\s*\(\s*["']([^"']+)["']/g,
        replacement: 'it("$1"'
      },
      
      // Response status checks
      {
        pattern: /pm\.expect\s*\(\s*pm\.response\.code\s*\)\.to\.equal\s*\(\s*(\d+)\s*\)/g,
        replacement: 'expect(response.status).to.equal($1)'
      },
      {
        pattern: /pm\.response\.to\.have\.status\s*\(\s*(\d+)\s*\)/g,
        replacement: 'expect(response.status).to.equal($1)'
      },
      
      // Response body checks
      {
        pattern: /pm\.response\.json\(\)/g,
        replacement: 'response.body'
      },
      {
        pattern: /pm\.expect\s*\(\s*responseData\s*\)/g,
        replacement: 'expect(response.body)'
      },
      
      // Headers
      {
        pattern: /pm\.response\.headers\.get\s*\(\s*["']([^"']+)["']\s*\)/g,
        replacement: 'response.headers["$1".toLowerCase()]'
      },
      
      // General pm.expect replacements
      {
        pattern: /pm\.expect/g,
        replacement: 'expect'
      },
      
      // Response time (not directly supported in supertest)
      {
        pattern: /pm\.response\.responseTime/g,
        replacement: '/* Response time not directly supported in Supertest */'
      },
      
      // Variable declarations
      {
        pattern: /const\s+responseData\s*=\s*pm\.response\.json\(\);/g,
        replacement: 'const responseData = response.body;'
      }
    ];

    // Apply all conversions
    let result = postmanScript;
    conversions.forEach(({ pattern, replacement }) => {
      result = result.replace(pattern, replacement);
    });

    return result;
  }

  /**
   * Extract test name from Postman test script
   * @param postmanScript - The Postman test script
   * @returns Array of test names
   */
  static extractTestNames(postmanScript: string | null | undefined): string[] {
    if (!postmanScript) return [];
    
    const testNamePattern = /pm\.test\s*\(\s*["']([^"']+)["']/g;
    const matches: string[] = [];
    let match;
    
    while ((match = testNamePattern.exec(postmanScript)) !== null) {
      matches.push(match[1]);
    }
    
    return matches;
  }

  /**
   * Check if script contains any assertions
   * @param postmanScript - The Postman test script
   * @returns True if script has assertions
   */
  static hasAssertions(postmanScript: string | null | undefined): boolean {
    if (!postmanScript) return false;
    
    const assertionPatterns = [
      /pm\.test\s*\(/,
      /pm\.expect\s*\(/,
      /pm\.response\.to\.have/
    ];
    
    return assertionPatterns.some(pattern => pattern.test(postmanScript));
  }
}

export default TestConverter;
