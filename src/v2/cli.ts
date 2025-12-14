#!/usr/bin/env node

import { Command, CommanderError } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora, { Ora } from 'ora';
import boxen from 'boxen';
import { Listr } from 'listr2';
import { genIndex } from './gen-index.js';
import { genJourneys } from './gen-journeys.js';
import { genStories } from './gen-stories.js';
import { genTests } from './gen-tests.js';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface CLIMessages {
  index: {
    generating: string;
    success: string;
    error: string;
  };
  journeys: {
    generating: string;
    success: string;
    error: string;
  };
  stories: {
    generating: string;
    success: string;
    error: string;
  };
  tests: {
    generating: string;
    success: string;
    error: string;
  };
  pipeline: {
    start: string;
    success: string;
    error: string;
  };
}

interface CLIConfig {
  name: string;
  description: string;
  version: string;
}

interface InteractiveChoice {
  name: string;
  value: CommandAction;
}

type CommandAction = 'index' | 'journeys' | 'stories' | 'tests' | 'all';

type CommandHandler = () => Promise<void>;

// =============================================================================
// CUSTOM ERROR CLASSES
// =============================================================================

class CLIError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'CLIError';
  }
}

class GenerationError extends CLIError {
  constructor(operation: string, originalError?: unknown) {
    super(`Failed to generate ${operation}`, 'GENERATION_FAILED');
    this.cause = originalError;
  }
}

class ValidationError extends CLIError {
  constructor(message: string) {
    super(message, 'VALIDATION_FAILED');
  }
}

// =============================================================================
// LOGGING SYSTEM
// =============================================================================

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SUCCESS = 4
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: unknown;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString().slice(11, 19); // HH:MM:SS format
    const levelStr = LogLevel[level].padEnd(7);

    switch (level) {
      case LogLevel.DEBUG:
        return chalk.gray(`[${timestamp}] ${levelStr} ${message}`);
      case LogLevel.INFO:
        return chalk.blue(`[${timestamp}] ${levelStr} ${message}`);
      case LogLevel.WARN:
        return chalk.yellow(`[${timestamp}] ${levelStr} ${message}`);
      case LogLevel.ERROR:
        return chalk.red(`[${timestamp}] ${levelStr} ${message}`);
      case LogLevel.SUCCESS:
        return chalk.green(`[${timestamp}] ${levelStr} ${message}`);
      default:
        return message;
    }
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      data
    };

    this.logs.push(entry);

    if (this.shouldLog(level)) {
      const formattedMessage = this.formatMessage(level, message);
      console.log(formattedMessage);

      if (data && level === LogLevel.DEBUG) {
        console.log(chalk.gray('  Data:'), data);
      }
    }
  }

  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data);
  }

  success(message: string, data?: unknown): void {
    this.log(LogLevel.SUCCESS, message, data);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CLI_CONFIG: CLIConfig = {
  name: 'journey-gen',
  description: 'Journey Generation CLI v2 - Generate journeys, stories, and tests',
  version: '2.0.0'
};

const MESSAGES: CLIMessages = {
  index: {
    generating: 'Generating journey index...',
    success: 'Journey index generated successfully',
    error: 'Journey index generation failed'
  },
  journeys: {
    generating: 'Generating journey configurations...',
    success: 'Journey configurations generated successfully',
    error: 'Journey configuration generation failed'
  },
  stories: {
    generating: 'Generating user stories and acceptance criteria...',
    success: 'User stories and acceptance criteria generated successfully',
    error: 'Story generation failed'
  },
  tests: {
    generating: 'Generating Playwright test files...',
    success: 'Playwright test files generated successfully',
    error: 'Test generation failed'
  },
  pipeline: {
    start: '🚀 Starting complete generation pipeline...',
    success: '✅ Complete generation pipeline finished successfully!',
    error: '❌ Generation pipeline failed'
  }
};

const INTERACTIVE_CHOICES: InteractiveChoice[] = [
  { name: chalk.green('📋 Index') + ' - Generate journey index', value: 'index' },
  { name: chalk.green('🗺️  Journeys') + ' - Generate journey configurations', value: 'journeys' },
  { name: chalk.green('📖 Stories') + ' - Generate user stories and acceptance criteria', value: 'stories' },
  { name: chalk.green('🧪 Tests') + ' - Generate Playwright test files', value: 'tests' },
  { name: chalk.green('🎯 All') + ' - Run complete generation pipeline', value: 'all' }
];

// =============================================================================
// GLOBAL INSTANCES
// =============================================================================

const logger = Logger.getInstance();
let globalAbortController: AbortController;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Creates a consistent ora spinner with predefined configuration
 */
function createSpinner(text: string): Ora {
  return ora({
    text: chalk.blue(text),
    spinner: 'dots'
  });
}

/**
 * Handles errors consistently across all commands with enhanced error reporting
 */
function handleCommandError(spinner: Ora, operation: string, error: unknown): never {
  const generationError = new GenerationError(operation, error);
  spinner.fail(chalk.red(generationError.message));

  if (error instanceof Error) {
    console.error(chalk.red('Details:'), error.message);

    if (error.message.includes('ENOENT')) {
      console.error(chalk.yellow('💡 Tip: Check if input files exist and paths are correct'));
    } else if (error.message.includes('EACCES')) {
      console.error(chalk.yellow('💡 Tip: Check file permissions'));
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      console.error(chalk.yellow('💡 Tip: Check network connectivity'));
    }
  } else {
    console.error(chalk.red('Unknown error:'), error);
  }

  process.exit(1);
}

/**
 * Validates that required dependencies are available
 */
function validateDependencies(): void {
  // Basic validation - if we reach this point, imports succeeded
  // This is sufficient since any import failures would prevent execution
}

/**
 * Validates command action input
 */
function validateCommandAction(action: string): asserts action is CommandAction {
  const validActions: CommandAction[] = ['index', 'journeys', 'stories', 'tests', 'all'];

  if (!validActions.includes(action as CommandAction)) {
    throw new ValidationError(`Invalid action: '${action}'. Valid actions are: ${validActions.join(', ')}`);
  }
}

/**
 * Sets up graceful shutdown handlers for SIGINT and SIGTERM
 */
function setupGracefulShutdown(): void {
  globalAbortController = new AbortController();

  const shutdown = (signal: string) => {
    logger.warn(`Received ${signal}, initiating graceful shutdown...`);

    globalAbortController.abort();

    // Give operations 3 seconds to clean up
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 3000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

/**
 * Displays the formatted help message using boxen
 */
function displayHelp(): void {
  const helpText = boxen(
    chalk.bold.blue('Journey Generation CLI v2') + '\n\n' +
    chalk.white('Generate journeys, stories, and tests\n\n') +
    chalk.cyan('Commands:') + '\n' +
    chalk.green('  index    ') + chalk.white('Generate the journey index') + '\n' +
    chalk.green('  journeys ') + chalk.white('Generate journey configurations') + '\n' +
    chalk.green('  stories  ') + chalk.white('Generate user stories and acceptance criteria') + '\n' +
    chalk.green('  tests    ') + chalk.white('Generate Playwright test files') + '\n' +
    chalk.green('  all      ') + chalk.white('Run the complete generation pipeline') + '\n\n' +
    chalk.yellow('Run "journey-gen --help" for more information.'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'blue'
    }
  );
  console.log(helpText);
}

// =============================================================================
// COMMAND HANDLERS
// =============================================================================

/**
 * Handles the index generation command
 */
async function handleIndexCommand(): Promise<void> {
  // Clear any existing output and ensure clean state for interactive prompts
  console.clear();

  try {
    await genIndex();
    // Force exit to prevent CLI spinner issues
    process.exit(0);
  } catch (error) {
    console.error(chalk.red('Journey index generation failed:'), error);
    process.exit(1);
  }
}

/**
 * Handles the journeys generation command
 */
async function handleJourneysCommand(): Promise<void> {
  // Journeys generation is interactive, so don't use spinner
  console.clear();

  try {
    await genJourneys();
    // Don't exit here - let genJourneys handle its own completion
  } catch (error) {
    console.error(chalk.red('Journey generation failed:'), error);
    process.exit(1);
  }
}

/**
 * Handles the stories generation command
 */
async function handleStoriesCommand(): Promise<void> {
  const spinner = createSpinner(MESSAGES.stories.generating).start();

  try {
    await genStories();
    spinner.succeed(chalk.green(MESSAGES.stories.success));
    process.exit(0);
  } catch (error) {
    handleCommandError(spinner, 'user stories and acceptance criteria', error);
  }
}

/**
 * Handles the tests generation command
 */
async function handleTestsCommand(): Promise<void> {
  const spinner = createSpinner(MESSAGES.tests.generating).start();

  try {
    await genTests();
    spinner.succeed(chalk.green(MESSAGES.tests.success));
    process.exit(0);
  } catch (error) {
    handleCommandError(spinner, 'Playwright test files', error);
  }
}

/**
 * Handles the complete generation pipeline command
 */
async function handleAllCommand(): Promise<void> {
  console.log(chalk.bold.blue(MESSAGES.pipeline.start + '\n'));

  const tasks = new Listr([
    {
      title: chalk.cyan('📋 Generating journey index (interactive)'),
      task: async (ctx, task) => {
        // Disable spinner for interactive command
        task.output = 'Starting interactive index generation...';
        await genIndex();
        task.title = chalk.green('📋 Journey index generated');
      }
    },
    {
      title: chalk.cyan('🗺️  Generating journey configurations'),
      task: async () => await genJourneys()
    },
    {
      title: chalk.cyan('📖 Generating user stories and acceptance criteria'),
      task: async () => await genStories()
    },
    {
      title: chalk.cyan('🧪 Generating Playwright test files'),
      task: async () => await genTests()
    }
  ], {
    concurrent: false,
    rendererOptions: {
      showSubtasks: true
    }
  });

  try {
    await tasks.run();
    console.log('\n' + boxen(
      chalk.green.bold(MESSAGES.pipeline.success),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green'
      }
    ));
    process.exit(0);
  } catch (error) {
    console.error('\n' + chalk.red.bold(MESSAGES.pipeline.error + ':'), error);
    process.exit(1);
  }
}

// =============================================================================
// CLI SETUP
// =============================================================================

/**
 * Sets up and configures the CLI program with all commands
 */
function setupCLI(): Command {
  const program = new Command();

  program
    .name(CLI_CONFIG.name)
    .description(CLI_CONFIG.description)
    .version(CLI_CONFIG.version)
    .exitOverride();

  program
    .command('index')
    .description('Generate the journey index')
    .action(handleIndexCommand);

  program
    .command('journeys')
    .description('Generate journey configurations')
    .action(handleJourneysCommand);

  program
    .command('stories')
    .description('Generate user stories and acceptance criteria')
    .action(handleStoriesCommand);

  program
    .command('tests')
    .description('Generate Playwright test files')
    .action(handleTestsCommand);

  program
    .command('all')
    .description('Run the complete generation pipeline')
    .action(handleAllCommand);

  return program;
}

// =============================================================================
// MAIN APPLICATION
// =============================================================================

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  // Setup graceful shutdown handling
  setupGracefulShutdown();

  // Validate dependencies before proceeding
  try {
    validateDependencies();
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error(chalk.red('❌ Dependency validation failed:'), error.message);
      process.exit(1);
    }
    throw error;
  }

  logger.info('CLI initialized successfully');

  // Check if no arguments provided - show interactive menu
  if (process.argv.length <= 2) {
    logger.info('No arguments provided, showing interactive menu');

    console.log(chalk.bold.blue('🚀 Journey Generation CLI v2\n'));

    try {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: chalk.cyan('What would you like to generate?'),
          choices: INTERACTIVE_CHOICES
        }
      ]);

      // Validate the selected action
      try {
        validateCommandAction(action);
      } catch (error) {
        if (error instanceof ValidationError) {
          logger.error('Invalid selection:', error.message);
          process.exit(1);
        }
        throw error;
      }

      logger.info(`Selected action: ${action}`);

      // Execute the selected action
      switch (action as CommandAction) {
        case 'index':
          await handleIndexCommand();
          break;
        case 'journeys':
          await handleJourneysCommand();
          break;
        case 'stories':
          await handleStoriesCommand();
          break;
        case 'tests':
          await handleTestsCommand();
          break;
        case 'all':
          await handleAllCommand();
          break;
      }
    } catch (error) {
      if (globalAbortController.signal.aborted) {
        logger.warn('Interactive menu was cancelled');
        process.exit(0);
      }
      throw error;
    }
    return;
  }

  // If arguments provided, parse normally with commander
  const program = setupCLI();
  try {
    program.parse();
  } catch (error) {
    if (error instanceof CommanderError) {
      displayHelp();
      process.exit(0);
    } else {
      throw error;
    }
  }
}

// Handle unhandled promise rejections and start the application
main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
