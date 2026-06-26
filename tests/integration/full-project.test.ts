import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { readdir, readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { PostmanConverter } from '../../src/postman-converter';
import { FileSystem } from '../../src/utils/filesystem';
import type { PostmanCollection } from '../../src/utils/validator';
import { makeTmpDir, removeTmpDir } from '../helpers/tmp';

describe('Full project generation', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  afterEach(async () => {
    await removeTmpDir(tmpDir);
  });

  const collection: PostmanCollection = {
    info: {
      name: 'Sample API',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: [
      { name: 'Get User', request: { method: 'GET', url: 'https://api.example.com/users/1' } },
      {
        name: 'Create User',
        request: {
          method: 'POST',
          url: 'https://api.example.com/users',
          body: { mode: 'raw', raw: '{"name": "Jane"}' }
        }
      }
    ] as unknown as Record<string, unknown>[]
  };

  it('should scaffold a Bun-native project with helpers and config', async () => {
    const converter = new PostmanConverter({ generateFullProject: true });
    const results = await converter.processCollection(collection, tmpDir, {
      name: 'env',
      values: [{ key: 'API_KEY', value: 'secret' }]
    });

    expect(results.testFiles).toBe(2);

    // Config / scaffolding files.
    for (const file of [
      'package.json',
      'tsconfig.json',
      'bunfig.toml',
      '.env',
      'README.md',
      '.gitignore'
    ]) {
      expect(await FileSystem.exists(path.join(tmpDir, file))).toBe(true);
    }

    const pkg = JSON.parse(await readFile(path.join(tmpDir, 'package.json'), 'utf8'));
    expect(pkg.scripts.test).toBe('bun test');
    expect(pkg.type).toBe('module');
    expect(pkg.devDependencies).toHaveProperty('@types/bun');
    expect(pkg.dependencies).toBeUndefined();

    // Helpers are fetch + bun:test based (no axios/chai/supertest).
    const apiClient = await readFile(path.join(tmpDir, 'src/helpers/api-client.ts'), 'utf8');
    expect(apiClient).toContain('fetch(');
    expect(apiClient).toContain('class ApiError');
    expect(apiClient).not.toContain('axios');

    const helpers = await readFile(path.join(tmpDir, 'src/helpers/test-helpers.ts'), 'utf8');
    expect(helpers).toContain("from 'bun:test'");
    expect(helpers).toContain('Object.hasOwn');
    expect(helpers).not.toContain('chai');

    const setup = await readFile(path.join(tmpDir, 'src/setup.ts'), 'utf8');
    expect(setup).toContain("from 'bun:test'");
    expect(setup).toContain('new ApiClient');
    expect(setup).not.toContain('dotenv');
  });

  it('should generate enhanced bun:test files using the API client', async () => {
    const converter = new PostmanConverter({ generateFullProject: true });
    await converter.processCollection(collection, tmpDir);

    const testsDir = path.join(tmpDir, 'src/tests');
    const files = (await readdir(testsDir)) as string[];
    expect(files.length).toBe(2);

    const getUser = await readFile(path.join(testsDir, 'get-user.test.ts'), 'utf8');
    expect(getUser).toContain("import { describe, it, expect } from 'bun:test';");
    expect(getUser).toContain('expectSuccess(response)');
    expect(getUser).toContain('api.get(');
    expect(getUser).toContain('smoke test');
    expect(getUser).not.toContain('supertest');
  });
});
