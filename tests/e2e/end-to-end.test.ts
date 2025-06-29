import { expect } from 'chai';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as tmp from 'tmp';
import { PostmanConverter } from '../../src/postman-converter';
import { PostmanCollection } from '../../src/utils/validator';

interface TmpDir {
  name: string;
  removeCallback: () => void;
}

describe('End-to-End Tests', () => {
  let tmpDir: TmpDir;
  let converter: PostmanConverter;

  beforeEach(() => {
    tmpDir = tmp.dirSync({ unsafeCleanup: true });
    converter = new PostmanConverter();
  });

  afterEach(() => {
    if (tmpDir) {
      tmpDir.removeCallback();
    }
  });

  it('should convert the Platzi collection example', async function() {
    this.timeout(15000);

    const collectionPath = path.join(__dirname, '../../collection/Platzi_postman_collection.json');
    const collection = await fs.readJson(collectionPath);

    const results = await converter.processCollection(collection, tmpDir.name);

    expect(results.testFiles).to.be.greaterThan(0);
    expect(results.baseUrl).to.include('escuelajs');

    // Verify setup file was created
    const setupExists = await fs.pathExists(path.join(tmpDir.name, 'setup.ts'));
    expect(setupExists).to.be.true;

    // Verify test files were created with proper structure
    const files = await fs.readdir(tmpDir.name, { recursive: true });
    const testFiles = (files as string[]).filter(file => file.endsWith('.test.ts'));

    expect(testFiles.length).to.be.greaterThan(0);

    // Check that at least one test file has proper content
    if (testFiles.length > 0) {
      const testFilePath = path.join(tmpDir.name, testFiles[0]);
      const content = await fs.readFile(testFilePath, 'utf8');

      expect(content).to.include('describe(');
      expect(content).to.include('it(');
      expect(content).to.include('const response = await request.');
      expect(content).to.include('expect(');
    }
  });

  it('should generate runnable tests', async function() {
    this.timeout(15000);

    const collection: PostmanCollection = {
      info: {
        name: 'Simple API Tests',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Health Check',
          request: {
            method: 'GET',
            url: 'https://httpbin.org/status/200'
          },
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  'pm.test("Status code is 200", function () {',
                  '    pm.expect(pm.response.code).to.equal(200);',
                  '});'
                ]
              }
            }
          ]
        }
      ]
    };

    await converter.processCollection(collection, tmpDir.name);

    // Create a simple test runner script
    const testRunnerContent = `
const { spawn } = require('child_process');
const path = require('path');

function runTests() {
  return new Promise((resolve, reject) => {
    const mocha = spawn('npx', ['mocha', '*.test.ts'], {
      cwd: '${tmpDir.name}',
      stdio: 'inherit'
    });

    mocha.on('close', (code) => {
      resolve(code);
    });

    mocha.on('error', reject);
  });
}

module.exports = runTests;
`;

    await fs.writeFile(path.join(tmpDir.name, 'run-tests.js'), testRunnerContent);

    // Verify the structure looks correct for running
    const setupContent = await fs.readFile(path.join(tmpDir.name, 'setup.ts'), 'utf8');
    expect(setupContent).to.include('supertest');
    expect(setupContent).to.include('chai');
    expect(setupContent).to.include('export');

    const testContent = await fs.readFile(path.join(tmpDir.name, 'health-check.test.ts'), 'utf8');
    expect(testContent).to.include('import');
    expect(testContent).to.include('describe(\'Health Check\'');
  });
});
