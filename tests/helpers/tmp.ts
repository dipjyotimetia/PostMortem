import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Create a unique temporary directory for a test. */
export function makeTmpDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'postmortem-'));
}

/** Recursively remove a temporary directory. */
export function removeTmpDir(dir: string): Promise<void> {
  return rm(dir, { recursive: true, force: true });
}
