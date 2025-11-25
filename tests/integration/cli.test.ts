import { expect } from 'chai';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as tmp from 'tmp';

// Read version from package.json
const packageJsonPath = path.join(__dirname, '../../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const expectedVersion = packageJson.version;

interface TmpDir {
  name: string;
  removeCallback: () => void;
}

interface CLIResult {
  code: number;
  stdout: string;
  stderr: string;
}

describe('CLI Integration Tests', () => {
  let tmpDir: TmpDir;
  const cliPath = path.join(__dirname, '../../dist/cli.js');
  const fixturePath = path.join(__dirname, '../fixtures');

  beforeEach(() => {
    tmpDir = tmp.dirSync({ unsafeCleanup: true });
  });

  afterEach(() => {
    if (tmpDir) {
      tmpDir.removeCallback();
    }
  });

  function runCLI(args: string[]): Promise<CLIResult> {
    return new Promise((resolve, reject) => {
      const child: ChildProcess = spawn('node', [cliPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code: number | null) => {
        resolve({ code: code || 0, stdout, stderr });
      });

      child.on('error', reject);
    });
  }

  describe('successful conversion', () => {
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
      const setupExists = await fs.pathExists(path.join(tmpDir.name, 'setup.ts'));
      expect(setupExists).to.be.true;

      const testExists = await fs.pathExists(path.join(tmpDir.name, 'simple-get-request.test.ts'));
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
      const setupContent = await fs.readFile(path.join(tmpDir.name, 'setup.ts'), 'utf8');
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
      const createUserExists = await fs.pathExists(path.join(tmpDir.name, 'create-user.test.ts'));
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

      const setupExists = await fs.pathExists(path.join(tmpDir.name, 'setup.ts'));
      expect(setupExists).to.be.false;
    });
  });

  describe('error handling', () => {
    it('should show error for missing collection argument', async () => {
      const args = ['-o', tmpDir.name];
      const result = await runCLI(args);

      expect(result.code).to.equal(1);
      expect(result.stderr).to.include('required option');
    });

    it('should show error for non-existent collection file', async () => {
      const args = [
        '-c', path.join(fixturePath, 'nonexistent.json'),
        '-o', tmpDir.name
      ];

      const result = await runCLI(args);

      expect(result.code).to.equal(1);
      expect(result.stderr).to.include('File not found');
    });

    it('should show error for invalid collection', async () => {
      const args = [
        '-c', path.join(fixturePath, 'invalid-collection.json'),
        '-o', tmpDir.name
      ];

      const result = await runCLI(args);

      expect(result.code).to.equal(1);
      expect(result.stderr).to.include('Invalid collection');
    });

    it('should continue with warning for invalid environment file', async () => {
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

  describe('help and version', () => {
    it('should show version', async () => {
      const result = await runCLI(['--version']);
      expect(result.code).to.equal(0);
      expect(result.stdout).to.include(expectedVersion);
    });

    it('should show help', async () => {
      const result = await runCLI(['--help']);
      expect(result.code).to.equal(0);
      expect(result.stdout).to.include('Convert Postman collections to Mocha/Supertest tests');
      expect(result.stdout).to.include('--collection');
      expect(result.stdout).to.include('--output');
    });
  });
});
