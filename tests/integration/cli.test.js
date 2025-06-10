const { expect } = require('chai');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const tmp = require('tmp');

describe('CLI Integration Tests', function() {
  let tmpDir;
  const cliPath = path.join(__dirname, '../../src/cli.js');
  const fixturePath = path.join(__dirname, '../fixtures');

  beforeEach(function() {
    tmpDir = tmp.dirSync({ unsafeCleanup: true });
  });

  afterEach(function() {
    if (tmpDir) {
      tmpDir.removeCallback();
    }
  });

  function runCLI(args) {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [cliPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });

      child.on('error', reject);
    });
  }

  describe('successful conversion', function() {
    it('should convert collection successfully', async function() {
      this.timeout(10000);

      const args = [
        '-c', path.join(fixturePath, 'test-collection.json'),
        '-o', tmpDir.name
      ];

      const result = await runCLI(args);

      expect(result.code).to.equal(0);
      expect(result.stdout).to.include('Conversion completed successfully');

      // Check if files were created
      const setupExists = await fs.pathExists(path.join(tmpDir.name, 'setup.js'));
      expect(setupExists).to.be.true;

      const testExists = await fs.pathExists(path.join(tmpDir.name, 'simple-get-request.test.js'));
      expect(testExists).to.be.true;
    });

    it('should process collection with environment', async function() {
      this.timeout(10000);

      const args = [
        '-c', path.join(fixturePath, 'test-collection.json'),
        '-e', path.join(fixturePath, 'test-environment.json'),
        '-o', tmpDir.name
      ];

      const result = await runCLI(args);

      expect(result.code).to.equal(0);
      expect(result.stdout).to.include('Environment variables: 3');

      // Check setup file contains environment
      const setupContent = await fs.readFile(path.join(tmpDir.name, 'setup.js'), 'utf8');
      expect(setupContent).to.include('"baseUrl": "https://api.example.com"');
    });

    it('should work with debug flag', async function() {
      this.timeout(10000);

      const args = [
        '-c', path.join(fixturePath, 'test-collection.json'),
        '-o', tmpDir.name,
        '--debug'
      ];

      const result = await runCLI(args);

      expect(result.code).to.equal(0);
      expect(result.stdout).to.include('Debug mode enabled');
    });

    it('should work with flat structure', async function() {
      this.timeout(10000);

      const args = [
        '-c', path.join(fixturePath, 'test-collection.json'),
        '-o', tmpDir.name,
        '--flat'
      ];

      const result = await runCLI(args);

      expect(result.code).to.equal(0);

      // Check that folder structure is flattened
      const createUserExists = await fs.pathExists(path.join(tmpDir.name, 'create-user.test.js'));
      expect(createUserExists).to.be.true;

      const apiFolderExists = await fs.pathExists(path.join(tmpDir.name, 'api-folder'));
      expect(apiFolderExists).to.be.false;
    });

    it('should work without setup file', async function() {
      this.timeout(10000);

      const args = [
        '-c', path.join(fixturePath, 'test-collection.json'),
        '-o', tmpDir.name,
        '--no-setup'
      ];

      const result = await runCLI(args);

      expect(result.code).to.equal(0);

      const setupExists = await fs.pathExists(path.join(tmpDir.name, 'setup.js'));
      expect(setupExists).to.be.false;
    });
  });

  describe('error handling', function() {
    it('should show error for missing collection argument', async function() {
      const args = ['-o', tmpDir.name];
      const result = await runCLI(args);

      expect(result.code).to.equal(1);
      expect(result.stderr).to.include('required option');
    });

    it('should show error for non-existent collection file', async function() {
      const args = [
        '-c', path.join(fixturePath, 'nonexistent.json'),
        '-o', tmpDir.name
      ];

      const result = await runCLI(args);

      expect(result.code).to.equal(1);
      expect(result.stdout).to.include('File not found');
    });

    it('should show error for invalid collection', async function() {
      const args = [
        '-c', path.join(fixturePath, 'invalid-collection.json'),
        '-o', tmpDir.name
      ];

      const result = await runCLI(args);

      expect(result.code).to.equal(1);
      expect(result.stdout).to.include('Invalid collection');
    });

    it('should continue with warning for invalid environment file', async function() {
      const args = [
        '-c', path.join(fixturePath, 'test-collection.json'),
        '-e', path.join(fixturePath, 'nonexistent-env.json'),
        '-o', tmpDir.name
      ];

      const result = await runCLI(args);

      expect(result.code).to.equal(0); // Should still succeed
      expect(result.stdout).to.include('Failed to read environment file');
    });
  });

  describe('help and version', function() {
    it('should show version', async function() {
      const result = await runCLI(['--version']);
      expect(result.code).to.equal(0);
      expect(result.stdout).to.include('1.1.0');
    });

    it('should show help', async function() {
      const result = await runCLI(['--help']);
      expect(result.code).to.equal(0);
      expect(result.stdout).to.include('Convert Postman collections to Mocha/Supertest tests');
      expect(result.stdout).to.include('--collection');
      expect(result.stdout).to.include('--output');
    });
  });
});
