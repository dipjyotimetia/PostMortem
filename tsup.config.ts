import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm', 'cjs'],
  target: 'node24',
  platform: 'node',
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  shims: false,
  // commander / postman-collection stay external (declared runtime deps)
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' };
  }
});
