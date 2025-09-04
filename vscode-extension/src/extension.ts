import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PostmanConverter } from '@dipjyotimetia/postmortem';

export function activate(context: vscode.ExtensionContext) {
  console.log('PostMortem extension is now active!');

  // Command: Generate tests from collection (select file)
  const generateFromCollectionCommand = vscode.commands.registerCommand(
    'postmortem.generateFromCollection',
    async () => {
      try {
        await generateTestsFromCollectionFile();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        vscode.window.showErrorMessage(`❌ Failed to generate tests: ${errorMessage}`);
      }
    }
  );

  // Command: Generate tests from specific file (context menu)
  const generateFromFileCommand = vscode.commands.registerCommand(
    'postmortem.generateFromFile',
    async (uri: vscode.Uri) => {
      try {
        await generateTestsFromSpecificFile(uri);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        vscode.window.showErrorMessage(`❌ Failed to generate tests: ${errorMessage}`);
      }
    }
  );

  context.subscriptions.push(generateFromCollectionCommand, generateFromFileCommand);
}

async function generateTestsFromCollectionFile(): Promise<void> {
  // Show file picker for Postman collection
  const collectionFiles = await vscode.window.showOpenDialog({
    canSelectMany: false,
    canSelectFiles: true,
    canSelectFolders: false,
    filters: {
      'Postman Collections': ['json']
    },
    title: '📋 Select Postman Collection'
  });

  if (!collectionFiles || collectionFiles.length === 0) {
    return;
  }

  const collectionPath = collectionFiles[0].fsPath;

  // Ask for environment file (optional)
  const useEnvironment = await vscode.window.showQuickPick(
    ['✅ Yes', '❌ No'],
    {
      title: '🌍 Do you have a Postman environment file?',
      placeHolder: 'Select Yes to include environment variables for better test accuracy'
    }
  );

  let environmentPath: string | undefined;
  if (useEnvironment === '✅ Yes') {
    const envFiles = await vscode.window.showOpenDialog({
      canSelectMany: false,
      canSelectFiles: true,
      canSelectFolders: false,
      filters: {
        'Postman Environments': ['json']
      },
      title: '🌍 Select Postman Environment'
    });

    if (envFiles && envFiles.length > 0) {
      environmentPath = envFiles[0].fsPath;
    }
  }

  // Get output directory
  const outputDir = await selectOutputDirectory();
  if (!outputDir) {
    return;
  }

  // Get configuration
  const config = getConfiguration();

  // Generate tests
  await generateTests(collectionPath, environmentPath, outputDir, config);
}

async function generateTestsFromSpecificFile(uri: vscode.Uri): Promise<void> {
  if (!uri || path.extname(uri.fsPath) !== '.json') {
    vscode.window.showErrorMessage('⚠️ Please select a JSON file');
    return;
  }

  // Validate it's a Postman collection
  try {
    const content = fs.readFileSync(uri.fsPath, 'utf8');
    const collection = JSON.parse(content);

    if (!collection.info || !collection.item) {
      vscode.window.showErrorMessage('⚠️ Selected file does not appear to be a valid Postman collection');
      return;
    }
  } catch {
    vscode.window.showErrorMessage('❌ Failed to parse JSON file');
    return;
  }

  const collectionPath = uri.fsPath;

  // Ask for environment file (optional)
  const useEnvironment = await vscode.window.showQuickPick(
    ['✅ Yes', '❌ No'],
    {
      title: '🌍 Do you have a Postman environment file?',
      placeHolder: 'Select Yes to include environment variables for better test accuracy'
    }
  );

  let environmentPath: string | undefined;
  if (useEnvironment === '✅ Yes') {
    const envFiles = await vscode.window.showOpenDialog({
      canSelectMany: false,
      canSelectFiles: true,
      canSelectFolders: false,
      filters: {
        'Postman Environments': ['json']
      },
      title: '🌍 Select Postman Environment'
    });

    if (envFiles && envFiles.length > 0) {
      environmentPath = envFiles[0].fsPath;
    }
  }

  // Get output directory
  const outputDir = await selectOutputDirectory();
  if (!outputDir) {
    return;
  }

  // Get configuration
  const config = getConfiguration();

  // Generate tests
  await generateTests(collectionPath, environmentPath, outputDir, config);
}

async function selectOutputDirectory(): Promise<string | undefined> {
  // Get workspace folder as default
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const defaultOutputDir = workspaceFolder
    ? path.join(workspaceFolder.uri.fsPath, 'tests')
    : undefined;

  const options = ['Use default location', 'Select custom directory'];
  if (defaultOutputDir) {
    options[0] = `Use default location (${path.relative(workspaceFolder!.uri.fsPath, defaultOutputDir)})`;
  }

  const choice = await vscode.window.showQuickPick(options, {
    title: '📁 Where should the tests be generated?',
    placeHolder: 'Choose your preferred output location'
  });

  if (!choice) {
    return undefined;
  }

  if (choice.startsWith('Use default')) {
    return defaultOutputDir || './tests';
  }

  // Let user select custom directory
  const customDir = await vscode.window.showOpenDialog({
    canSelectMany: false,
    canSelectFiles: false,
    canSelectFolders: true,
    title: '📁 Select Output Directory'
  });

  if (!customDir || customDir.length === 0) {
    return undefined;
  }

  return customDir[0].fsPath;
}

function getConfiguration() {
  const config = vscode.workspace.getConfiguration('postmortem');

  return {
    maintainFolderStructure: config.get<boolean>('maintainFolderStructure', true),
    generateFullProject: config.get<boolean>('generateFullProject', false),
    createSetupFile: config.get<boolean>('createSetupFile', true)
  };
}

async function generateTests(
  collectionPath: string,
  environmentPath: string | undefined,
  outputDir: string,
  config: {
    maintainFolderStructure: boolean;
    generateFullProject: boolean;
    createSetupFile: boolean;
  }
): Promise<void> {
  return vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: '🚀 Generating tests from Postman collection...',
    cancellable: false
  }, async (progress: vscode.Progress<{message?: string; increment?: number}>) => {
    try {
      // Read collection file
      progress.report({ message: '📖 Reading collection file...', increment: 20 });
      const collectionContent = fs.readFileSync(collectionPath, 'utf8');
      const collection = JSON.parse(collectionContent);

      // Read environment file if provided
      let environment = null;
      if (environmentPath) {
        progress.report({ message: '🌍 Reading environment file...', increment: 10 });
        const environmentContent = fs.readFileSync(environmentPath, 'utf8');
        environment = JSON.parse(environmentContent);
      }

      // Initialize converter
      progress.report({ message: '⚙️ Initializing converter...', increment: 10 });
      const converter = new PostmanConverter({
        outputDir,
        maintainFolderStructure: config.maintainFolderStructure,
        generateFullProject: config.generateFullProject,
        createSetupFile: config.createSetupFile
      });

      // Generate tests
      progress.report({ message: '🔄 Converting collection to tests...', increment: 40 });
      const results = await converter.processCollection(collection, outputDir, environment);

      // Show success message
      progress.report({ message: '✅ Tests generated successfully!', increment: 20 });

      const successMessage = `🎉 Successfully generated ${results.testFiles} test files${results.folders ? ` in ${results.folders} folders` : ''}`;

      const openFolder = '📂 Open Test Folder';
      const choice = await vscode.window.showInformationMessage(
        successMessage,
        openFolder
      );

      if (choice === openFolder) {
        // Open the generated tests folder in explorer
        const outputUri = vscode.Uri.file(outputDir);
        await vscode.commands.executeCommand('revealFileInOS', outputUri);
      }

    } catch (error) {
      console.error('Test generation failed:', error);
      throw error;
    }
  });
}

export function deactivate() {
  console.log('PostMortem extension deactivated');
}
