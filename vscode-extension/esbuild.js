#!/usr/bin/env node
/* Bundles the VS Code extension with all runtime dependencies to avoid missing modules when using npm workspaces. */
const esbuild = require('esbuild');
const path = require('path');

async function build() {
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src', 'extension.ts')],
    outfile: path.join(__dirname, 'dist', 'extension.js'),
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    sourcemap: true,
    external: [
      // Leave vscode as external per VS Code extension requirements
      'vscode'
    ],
    logLevel: 'info'
  });
  console.log('✅ Bundled extension with esbuild');
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
