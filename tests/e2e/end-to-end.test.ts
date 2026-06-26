import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { readdir, readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { PostmanConverter } from '../../src/postman-converter';
import { FileSystem } from '../../src/utils/filesystem';
import type { PostmanCollection } from '../../src/utils/validator';
import { makeTmpDir, removeTmpDir } from '../helpers/tmp';

describe('End-to-End Tests', () => {
  let tmpDir: string;
  let converter: PostmanConverter;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
    converter = new PostmanConverter();
  });

  afterEach(async () => {
    await removeTmpDir(tmpDir);
  });

  it('should convert the Platzi collection example', async () => {
    const collectionPath = path.join(
      import.meta.dir,
      '../../collection/Platzi_postman_collection.json'
    );
    const collection = (await FileSystem.readJsonFile(collectionPath)) as PostmanCollection;

    const results = await converter.processCollection(collection, tmpDir);

    expect(results.testFiles).toBeGreaterThan(0);
    expect(results.baseUrl).toContain('escuelajs');
    expect(await FileSystem.exists(path.join(tmpDir, 'setup.ts'))).toBe(true);

    const files = (await readdir(tmpDir, { recursive: true })) as string[];
    const testFiles = files.filter(file => file.endsWith('.test.ts'));
    expect(testFiles.length).toBeGreaterThan(0);

    const content = await readFile(path.join(tmpDir, testFiles[0] as string), 'utf8');
    expect(content).toContain('describe(');
    expect(content).toContain('it(');
    expect(content).toContain('const response = await request.');
    expect(content).toContain('expect(');
  });

  it('should generate a Bun-native, runnable structure', async () => {
    const collection: PostmanCollection = {
      info: {
        name: 'Simple API Tests',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Health Check',
          request: { method: 'GET', url: 'https://httpbin.org/status/200' }
        } as unknown as Record<string, unknown>
      ]
    };

    await converter.processCollection(collection, tmpDir);

    const setupContent = await readFile(path.join(tmpDir, 'setup.ts'), 'utf8');
    expect(setupContent).toContain('bun:test');
    expect(setupContent).toContain('fetch');
    expect(setupContent).toContain('export');
    expect(setupContent).not.toContain('supertest');
    expect(setupContent).not.toContain('chai');

    const testContent = await readFile(path.join(tmpDir, 'health-check.test.ts'), 'utf8');
    expect(testContent).toContain("import { describe, it, expect } from 'bun:test';");
    expect(testContent).toContain("describe('Health Check'");
  });
});
