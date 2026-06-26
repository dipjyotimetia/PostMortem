import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { FileSystem } from '../../src/utils/filesystem';
import { makeTmpDir, removeTmpDir } from '../helpers/tmp';

interface CLIResult {
  code: number;
  stdout: string;
  stderr: string;
}

const cliPath = path.join(import.meta.dir, '../../src/cli.ts');
const fixturePath = path.join(import.meta.dir, '../fixtures');

function runCLI(args: string[]): Promise<CLIResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('bun', [cliPath, ...args], { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });
    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });
    child.on('close', (code: number | null) => resolve({ code: code ?? 0, stdout, stderr }));
    child.on('error', reject);
  });
}

describe('CLI Integration Tests', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  afterEach(async () => {
    await removeTmpDir(tmpDir);
  });

  describe('successful conversion', () => {
    it('should convert a collection successfully', async () => {
      const result = await runCLI([
        '-c',
        path.join(fixturePath, 'test-collection.json'),
        '-o',
        tmpDir
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Conversion completed successfully');
      expect(await FileSystem.exists(path.join(tmpDir, 'setup.ts'))).toBe(true);
      expect(await FileSystem.exists(path.join(tmpDir, 'simple-get-request.test.ts'))).toBe(true);
    });

    it('should process a collection with an environment', async () => {
      const result = await runCLI([
        '-c',
        path.join(fixturePath, 'test-collection.json'),
        '-e',
        path.join(fixturePath, 'test-environment.json'),
        '-o',
        tmpDir
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Environment variables: 3');

      const setupContent = await FileSystem.readFile(path.join(tmpDir, 'setup.ts'));
      expect(setupContent).toContain('"baseUrl": "https://api.example.com"');
    });

    it('should work with the debug flag', async () => {
      const result = await runCLI([
        '-c',
        path.join(fixturePath, 'test-collection.json'),
        '-o',
        tmpDir,
        '--debug'
      ]);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Debug mode enabled');
    });

    it('should work with a flat structure', async () => {
      const result = await runCLI([
        '-c',
        path.join(fixturePath, 'test-collection.json'),
        '-o',
        tmpDir,
        '--flat'
      ]);

      expect(result.code).toBe(0);
      expect(await FileSystem.exists(path.join(tmpDir, 'create-user.test.ts'))).toBe(true);
      expect(await FileSystem.exists(path.join(tmpDir, 'api-folder'))).toBe(false);
    });

    it('should work without a setup file', async () => {
      const result = await runCLI([
        '-c',
        path.join(fixturePath, 'test-collection.json'),
        '-o',
        tmpDir,
        '--no-setup'
      ]);
      expect(result.code).toBe(0);
      expect(await FileSystem.exists(path.join(tmpDir, 'setup.ts'))).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should error for a missing collection argument', async () => {
      const result = await runCLI(['-o', tmpDir]);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('required option');
    });

    it('should error for a non-existent collection file', async () => {
      const result = await runCLI(['-c', path.join(fixturePath, 'nonexistent.json'), '-o', tmpDir]);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('File not found');
    });

    it('should error for an invalid collection', async () => {
      const result = await runCLI([
        '-c',
        path.join(fixturePath, 'invalid-collection.json'),
        '-o',
        tmpDir
      ]);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Invalid collection');
    });

    it('should continue with a warning for an invalid environment file', async () => {
      const result = await runCLI([
        '-c',
        path.join(fixturePath, 'test-collection.json'),
        '-e',
        path.join(fixturePath, 'nonexistent-env.json'),
        '-o',
        tmpDir
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Failed to read environment file');
    });
  });

  describe('help and version', () => {
    it('should show the version', async () => {
      const result = await runCLI(['--version']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('2.0.0');
    });

    it('should show help', async () => {
      const result = await runCLI(['--help']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Convert Postman collections into Bun-native tests');
      expect(result.stdout).toContain('--collection');
      expect(result.stdout).toContain('--output');
    });
  });
});
