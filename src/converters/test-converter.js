const _ = require('lodash');

/**
 * Converts Postman test scripts to Mocha/Chai assertions
 */
class TestConverter {
  /**
   * Convert Postman test script to Mocha assertions
   * @param {string} postmanScript - The Postman test script content
   * @returns {string} - Equivalent test assertions in Chai syntax
   */
  static convertPostmanTestToMocha(postmanScript) {
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
   * @param {string} postmanScript - The Postman test script
   * @returns {string[]} - Array of test names
   */
  static extractTestNames(postmanScript) {
    if (!postmanScript) return [];
    
    const testNamePattern = /pm\.test\s*\(\s*["']([^"']+)["']/g;
    const matches = [];
    let match;
    
    while ((match = testNamePattern.exec(postmanScript)) !== null) {
      matches.push(match[1]);
    }
    
    return matches;
  }

  /**
   * Check if script contains any assertions
   * @param {string} postmanScript - The Postman test script
   * @returns {boolean} - True if script has assertions
   */
  static hasAssertions(postmanScript) {
    if (!postmanScript) return false;
    
    const assertionPatterns = [
      /pm\.test\s*\(/,
      /pm\.expect\s*\(/,
      /pm\.response\.to\.have/
    ];
    
    return assertionPatterns.some(pattern => pattern.test(postmanScript));
  }
}

module.exports = TestConverter;
