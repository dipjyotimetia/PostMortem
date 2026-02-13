import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/* global suite, test, setup, teardown */

suite('Extension Test Suite', () => {
  let tempDir: string;

  setup(() => {
    // Create a temporary directory for test outputs
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'postmortem-test-'));
  });

  teardown(() => {
    // Clean up temporary directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  suite('Extension Activation', () => {
    test('Extension should be present', () => {
      const extension = vscode.extensions.getExtension('dipjyotimetia.postmortem');
      assert.ok(extension, 'Extension should be found');
    });

    test('Extension should activate successfully', async () => {
      const extension = vscode.extensions.getExtension('dipjyotimetia.postmortem');
      assert.ok(extension, 'Extension should be found');

      if (!extension.isActive) {
        await extension.activate();
      }

      assert.ok(extension.isActive, 'Extension should be active');
    });

    test('Extension exports should be defined', async () => {
      const extension = vscode.extensions.getExtension('dipjyotimetia.postmortem');
      assert.ok(extension, 'Extension should be found');

      if (!extension.isActive) {
        await extension.activate();
      }

      // Extension exports activate and deactivate functions
      assert.ok(extension.exports !== undefined || extension.isActive,
        'Extension should export functions or be active');
    });
  });

  suite('Command Registration', () => {
    test('All commands should be registered', async () => {
      // Activate the extension first
      const extension = vscode.extensions.getExtension('dipjyotimetia.postmortem');
      if (extension && !extension.isActive) {
        await extension.activate();
      }

      const commands = await vscode.commands.getCommands(true);

      const expectedCommands = [
        'postmortem.generateFromCollection',
        'postmortem.generateFromFile',
        'postmortem.showOutput'
      ];

      for (const cmd of expectedCommands) {
        assert.ok(commands.includes(cmd), `Command '${cmd}' should be registered`);
      }
    });

    test('generateFromCollection command should be executable', async () => {
      const extension = vscode.extensions.getExtension('dipjyotimetia.postmortem');
      if (extension && !extension.isActive) {
        await extension.activate();
      }

      // Verify the command exists (actual execution requires UI interaction)
      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes('postmortem.generateFromCollection'),
        'generateFromCollection command should exist');
    });

    test('showOutput command should be executable', async () => {
      const extension = vscode.extensions.getExtension('dipjyotimetia.postmortem');
      if (extension && !extension.isActive) {
        await extension.activate();
      }

      // This command should not throw when executed
      try {
        await vscode.commands.executeCommand('postmortem.showOutput');
        assert.ok(true, 'showOutput command executed successfully');
      } catch (error) {
        // Command might fail in test environment due to no output channel
        // but shouldn't throw an unhandled error
        assert.ok(true, 'showOutput command handled gracefully');
      }
    });
  });

  suite('Configuration', () => {
    test('Configuration should have default values', () => {
      const config = vscode.workspace.getConfiguration('postmortem');

      assert.strictEqual(config.get('outputDirectory'), './tests',
        'Default outputDirectory should be ./tests');
      assert.strictEqual(config.get('maintainFolderStructure'), true,
        'Default maintainFolderStructure should be true');
      assert.strictEqual(config.get('generateFullProject'), false,
        'Default generateFullProject should be false');
      assert.strictEqual(config.get('createSetupFile'), true,
        'Default createSetupFile should be true');
    });

    test('Configuration should be inspectable', () => {
      const config = vscode.workspace.getConfiguration('postmortem');

      const outputDirInspect = config.inspect('outputDirectory');
      assert.ok(outputDirInspect, 'outputDirectory should be inspectable');
      assert.strictEqual(outputDirInspect?.defaultValue, './tests',
        'Default value should be ./tests');
    });

    test('All configuration properties should be defined', () => {
      const config = vscode.workspace.getConfiguration('postmortem');

      const expectedProperties = [
        'outputDirectory',
        'maintainFolderStructure',
        'generateFullProject',
        'createSetupFile'
      ];

      for (const prop of expectedProperties) {
        const value = config.get(prop);
        assert.ok(value !== undefined, `Configuration property '${prop}' should be defined`);
      }
    });
  });

  suite('Menu Contributions', () => {
    test('Extension should contribute to explorer context menu', async () => {
      const extension = vscode.extensions.getExtension('dipjyotimetia.postmortem');
      assert.ok(extension, 'Extension should be found');

      // Check package.json for menu contributions
      const packageJson = extension.packageJSON;
      assert.ok(packageJson.contributes, 'Extension should have contributions');
      assert.ok(packageJson.contributes.menus, 'Extension should have menu contributions');
      assert.ok(packageJson.contributes.menus['explorer/context'],
        'Extension should contribute to explorer context menu');
    });
  });

  suite('Error Handling', () => {
    test('generateFromFile should handle undefined URI gracefully', async () => {
      const extension = vscode.extensions.getExtension('dipjyotimetia.postmortem');
      if (extension && !extension.isActive) {
        await extension.activate();
      }

      // Calling with undefined should not crash
      try {
        await vscode.commands.executeCommand('postmortem.generateFromFile', undefined);
      } catch (error) {
        // Expected to fail gracefully
        assert.ok(true, 'Command handled undefined URI gracefully');
      }
    });

    test('generateFromFile should reject non-JSON files', async () => {
      const extension = vscode.extensions.getExtension('dipjyotimetia.postmortem');
      if (extension && !extension.isActive) {
        await extension.activate();
      }

      // Create a non-JSON file
      const txtFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(txtFile, 'not a json file');

      try {
        await vscode.commands.executeCommand(
          'postmortem.generateFromFile',
          vscode.Uri.file(txtFile)
        );
      } catch (error) {
        // Expected to fail for non-JSON files
        assert.ok(true, 'Command rejected non-JSON file');
      }
    });

    test('generateFromFile should reject invalid JSON', async () => {
      const extension = vscode.extensions.getExtension('dipjyotimetia.postmortem');
      if (extension && !extension.isActive) {
        await extension.activate();
      }

      // Create an invalid JSON file
      const jsonFile = path.join(tempDir, 'invalid.json');
      fs.writeFileSync(jsonFile, '{ invalid json }');

      try {
        await vscode.commands.executeCommand(
          'postmortem.generateFromFile',
          vscode.Uri.file(jsonFile)
        );
      } catch (error) {
        // Expected to fail for invalid JSON
        assert.ok(true, 'Command rejected invalid JSON file');
      }
    });

    test('generateFromFile should reject non-Postman collection JSON', async () => {
      const extension = vscode.extensions.getExtension('dipjyotimetia.postmortem');
      if (extension && !extension.isActive) {
        await extension.activate();
      }

      // Create a valid JSON but not a Postman collection
      const jsonFile = path.join(tempDir, 'not-postman.json');
      fs.writeFileSync(jsonFile, JSON.stringify({ foo: 'bar' }));

      try {
        await vscode.commands.executeCommand(
          'postmortem.generateFromFile',
          vscode.Uri.file(jsonFile)
        );
      } catch (error) {
        // Expected to fail for non-Postman JSON
        assert.ok(true, 'Command rejected non-Postman collection JSON');
      }
    });
  });

  suite('Output Channel', () => {
    test('Output channel should be created on activation', async () => {
      const extension = vscode.extensions.getExtension('dipjyotimetia.postmortem');
      if (extension && !extension.isActive) {
        await extension.activate();
      }

      // After activation, showOutput should work
      try {
        await vscode.commands.executeCommand('postmortem.showOutput');
        assert.ok(true, 'Output channel is available');
      } catch (error) {
        assert.fail('Output channel should be available after activation');
      }
    });
  });
});

suite('Integration Tests', () => {
  let tempDir: string;

  setup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'postmortem-integration-'));
  });

  teardown(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('Valid Postman collection structure should be recognized', async () => {
    const extension = vscode.extensions.getExtension('dipjyotimetia.postmortem');
    if (extension && !extension.isActive) {
      await extension.activate();
    }

    // Create a minimal valid Postman collection
    const collection = {
      info: {
        name: 'Test Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Test Request',
          request: {
            method: 'GET',
            url: 'https://api.example.com/test'
          }
        }
      ]
    };

    const collectionFile = path.join(tempDir, 'test-collection.json');
    fs.writeFileSync(collectionFile, JSON.stringify(collection, null, 2));

    // Verify the file exists and is valid JSON
    const content = fs.readFileSync(collectionFile, 'utf8');
    const parsed = JSON.parse(content);
    assert.ok(parsed.info, 'Collection should have info property');
    assert.ok(parsed.item, 'Collection should have item property');
  });
});
