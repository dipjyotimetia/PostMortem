import * as assert from 'assert';
import * as vscode from 'vscode';

declare const suite: (name: string, fn: () => void) => void;
declare const test: (name: string, fn: () => void | Promise<void>) => void;
suite('Extension Test Suite', () => {
  test('Extension should be present', () => {
    const extension = vscode.extensions.getExtension('dipjyotimetia.postmortem');
    assert.ok(extension, 'Extension should be found');
  });

  test('Commands should be registered', async () => {
    const commands = await vscode.commands.getCommands(true);

    assert.ok(commands.includes('postmortem.generateFromCollection'),
      'generateFromCollection command should be registered');
    assert.ok(commands.includes('postmortem.generateFromFile'),
      'generateFromFile command should be registered');
  });

  test('Configuration should have default values', () => {
    const config = vscode.workspace.getConfiguration('postmortem');

    assert.strictEqual(config.get('outputDirectory'), './tests');
    assert.strictEqual(config.get('maintainFolderStructure'), true);
    assert.strictEqual(config.get('generateFullProject'), false);
    assert.strictEqual(config.get('createSetupFile'), true);
  });
});
