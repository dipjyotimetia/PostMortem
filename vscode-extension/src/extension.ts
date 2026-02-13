import * as vscode from 'vscode';
import * as path from 'path';
import { PostmanConverter } from '@dipjyotimetia/postmortem';

/** Output channel for extension logging */
let outputChannel: vscode.OutputChannel;

/** Extension configuration interface */
interface ExtensionConfig {
  maintainFolderStructure: boolean;
  generateFullProject: boolean;
  createSetupFile: boolean;
  outputDirectory: string;
}

/** Result from PostmanConverter.processCollection */
interface ConversionResult {
  testFiles: number;
  folders?: number;
}

/**
 * Logs a message to both console and output channel
 * @param message - Message to log
 * @param level - Log level (info, warn, error)
 */
function log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  outputChannel.appendLine(formattedMessage);

  if (level === 'error') {
    console.error(formattedMessage);
  } else {
    console.log(formattedMessage);
  }
}

/**
 * Activates the PostMortem extension
 * @param context - Extension context provided by VSCode
 */
export function activate(context: vscode.ExtensionContext): void {
  // Create output channel for logging
  outputChannel = vscode.window.createOutputChannel('PostMortem');
  context.subscriptions.push(outputChannel);

  log('PostMortem extension is now active!');

  // Command: Generate tests from collection (select file)
  const generateFromCollectionCommand = vscode.commands.registerCommand(
    'postmortem.generateFromCollection',
    async () => {
      await handleCommand(() => selectAndGenerateTests());
    }
  );

  // Command: Generate tests from specific file (context menu)
  const generateFromFileCommand = vscode.commands.registerCommand(
    'postmortem.generateFromFile',
    async (uri: vscode.Uri) => {
      await handleCommand(() => generateTestsFromUri(uri));
    }
  );

  // Command: Show output channel
  const showOutputCommand = vscode.commands.registerCommand(
    'postmortem.showOutput',
    () => {
      outputChannel.show();
    }
  );

  context.subscriptions.push(
    generateFromCollectionCommand,
    generateFromFileCommand,
    showOutputCommand
  );
}

/**
 * Wraps command execution with error handling
 * @param fn - Command function to execute
 */
async function handleCommand(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    log(`Command failed: ${errorMessage}`, 'error');

    const showLogs = 'Show Logs';
    const choice = await vscode.window.showErrorMessage(
      `Failed to generate tests: ${errorMessage}`,
      showLogs
    );

    if (choice === showLogs) {
      outputChannel.show();
    }
  }
}

/**
 * Reads a file asynchronously using VSCode's workspace.fs API
 * @param uri - URI of the file to read
 * @returns File contents as string
 * @throws Error if file cannot be read
 */
async function readFileAsync(uri: vscode.Uri): Promise<string> {
  const fileData = await vscode.workspace.fs.readFile(uri);
  return Buffer.from(fileData).toString('utf8');
}

/**
 * Validates that a file is a valid Postman collection
 * @param uri - URI of the file to validate
 * @returns Parsed collection object
 * @throws Error if file is not a valid Postman collection
 */
async function validatePostmanCollection(uri: vscode.Uri): Promise<Record<string, unknown>> {
  const content = await readFileAsync(uri);

  let collection: Record<string, unknown>;
  try {
    collection = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error('File is not valid JSON');
  }

  if (!collection.info || !collection.item) {
    throw new Error('File does not appear to be a valid Postman collection (missing info or item properties)');
  }

  return collection;
}

/**
 * Prompts user to select an environment file
 * @param token - Cancellation token
 * @returns URI of selected environment file, or undefined if skipped
 */
async function selectEnvironmentFile(
  token: vscode.CancellationToken
): Promise<vscode.Uri | undefined> {
  if (token.isCancellationRequested) {
    return undefined;
  }

  const useEnvironment = await vscode.window.showQuickPick(
    ['Yes - Select environment file', 'No - Skip environment'],
    {
      title: 'Do you have a Postman environment file?',
      placeHolder: 'Environment files provide variables for better test accuracy'
    }
  );

  if (!useEnvironment || useEnvironment.startsWith('No') || token.isCancellationRequested) {
    return undefined;
  }

  const envFiles = await vscode.window.showOpenDialog({
    canSelectMany: false,
    canSelectFiles: true,
    canSelectFolders: false,
    filters: {
      'Postman Environments': ['json']
    },
    title: 'Select Postman Environment'
  });

  return envFiles?.[0];
}

/**
 * Prompts user to select output directory
 * @param token - Cancellation token
 * @returns Selected output directory path, or undefined if cancelled
 */
async function selectOutputDirectory(
  token: vscode.CancellationToken
): Promise<string | undefined> {
  if (token.isCancellationRequested) {
    return undefined;
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const config = getConfiguration();

  const defaultOutputDir = workspaceFolder
    ? path.join(workspaceFolder.uri.fsPath, config.outputDirectory.replace(/^\.\//, ''))
    : config.outputDirectory;

  const defaultLabel = workspaceFolder
    ? `Use default (${path.relative(workspaceFolder.uri.fsPath, defaultOutputDir) || config.outputDirectory})`
    : `Use default (${config.outputDirectory})`;

  const choice = await vscode.window.showQuickPick(
    [defaultLabel, 'Select custom directory'],
    {
      title: 'Where should the tests be generated?',
      placeHolder: 'Choose output location for generated test files'
    }
  );

  if (!choice || token.isCancellationRequested) {
    return undefined;
  }

  if (choice.startsWith('Use default')) {
    return defaultOutputDir;
  }

  const customDir = await vscode.window.showOpenDialog({
    canSelectMany: false,
    canSelectFiles: false,
    canSelectFolders: true,
    title: 'Select Output Directory'
  });

  return customDir?.[0]?.fsPath;
}

/**
 * Gets extension configuration from VSCode settings
 * @returns Extension configuration object
 */
function getConfiguration(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration('postmortem');

  return {
    maintainFolderStructure: config.get<boolean>('maintainFolderStructure', true),
    generateFullProject: config.get<boolean>('generateFullProject', false),
    createSetupFile: config.get<boolean>('createSetupFile', true),
    outputDirectory: config.get<string>('outputDirectory', './tests')
  };
}

/**
 * Main flow: Select collection file and generate tests
 */
async function selectAndGenerateTests(): Promise<void> {
  const collectionFiles = await vscode.window.showOpenDialog({
    canSelectMany: false,
    canSelectFiles: true,
    canSelectFolders: false,
    filters: {
      'Postman Collections': ['json']
    },
    title: 'Select Postman Collection'
  });

  if (!collectionFiles || collectionFiles.length === 0) {
    log('No collection file selected');
    return;
  }

  const collectionUri = collectionFiles[0];
  log(`Selected collection: ${collectionUri.fsPath}`);

  await generateTestsFromUri(collectionUri);
}

/**
 * Generates tests from a specific URI (context menu entry point)
 * @param uri - URI of the collection file
 */
async function generateTestsFromUri(uri: vscode.Uri): Promise<void> {
  if (!uri) {
    throw new Error('No file selected');
  }

  if (path.extname(uri.fsPath) !== '.json') {
    throw new Error('Please select a JSON file');
  }

  // Validate collection first
  log(`Validating collection: ${uri.fsPath}`);
  const collection = await validatePostmanCollection(uri);
  const collectionInfo = collection.info as Record<string, unknown> | undefined;
  log(`Collection validated: ${collectionInfo?.name || 'Unnamed'}`);

  await runGenerationWorkflow(uri, collection);
}

/**
 * Runs the complete test generation workflow with progress and cancellation support
 * @param collectionUri - URI of the collection file
 * @param collection - Parsed collection object
 */
async function runGenerationWorkflow(
  collectionUri: vscode.Uri,
  collection: Record<string, unknown>
): Promise<void> {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'PostMortem: Generating tests',
      cancellable: true
    },
    async (progress, token) => {
      // Check for cancellation throughout the process
      token.onCancellationRequested(() => {
        log('Generation cancelled by user');
      });

      // Step 1: Select environment file (optional)
      progress.report({ message: 'Waiting for environment selection...', increment: 0 });
      const environmentUri = await selectEnvironmentFile(token);

      if (token.isCancellationRequested) {
        return;
      }

      // Step 2: Select output directory
      progress.report({ message: 'Waiting for output directory selection...', increment: 10 });
      const outputDir = await selectOutputDirectory(token);

      if (!outputDir || token.isCancellationRequested) {
        log('Output directory selection cancelled');
        return;
      }

      log(`Output directory: ${outputDir}`);

      // Step 3: Read environment file if provided
      let environment: Record<string, unknown> | null = null;
      if (environmentUri) {
        progress.report({ message: 'Reading environment file...', increment: 10 });

        if (token.isCancellationRequested) {
          return;
        }

        try {
          const envContent = await readFileAsync(environmentUri);
          environment = JSON.parse(envContent) as Record<string, unknown>;
          log(`Loaded environment: ${environmentUri.fsPath}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          log(`Warning: Failed to parse environment file: ${message}`, 'warn');

          const continueAnyway = await vscode.window.showWarningMessage(
            `Failed to parse environment file: ${message}. Continue without environment?`,
            'Continue',
            'Cancel'
          );

          if (continueAnyway !== 'Continue') {
            return;
          }
        }
      }

      if (token.isCancellationRequested) {
        return;
      }

      // Step 4: Initialize converter
      progress.report({ message: 'Initializing converter...', increment: 10 });
      const config = getConfiguration();

      const converter = new PostmanConverter({
        outputDir,
        maintainFolderStructure: config.maintainFolderStructure,
        generateFullProject: config.generateFullProject,
        createSetupFile: config.createSetupFile
      });

      if (token.isCancellationRequested) {
        return;
      }

      // Step 5: Generate tests
      progress.report({ message: 'Converting collection to tests...', increment: 20 });
      log('Starting conversion...');

      const results: ConversionResult = await converter.processCollection(
        collection,
        outputDir,
        environment
      );

      if (token.isCancellationRequested) {
        return;
      }

      // Step 6: Complete
      progress.report({ message: 'Tests generated successfully!', increment: 50 });

      const folderInfo = results.folders ? ` in ${results.folders} folders` : '';
      const successMessage = `Successfully generated ${results.testFiles} test files${folderInfo}`;
      log(successMessage);

      // Show success notification with action
      const openFolder = 'Open Folder';
      const showOutput = 'Show Output';
      const choice = await vscode.window.showInformationMessage(
        successMessage,
        openFolder,
        showOutput
      );

      if (choice === openFolder) {
        const outputUri = vscode.Uri.file(outputDir);
        await vscode.commands.executeCommand('revealFileInOS', outputUri);
      } else if (choice === showOutput) {
        outputChannel.show();
      }
    }
  );
}

/**
 * Deactivates the extension
 */
export function deactivate(): void {
  log('PostMortem extension deactivated');
}
