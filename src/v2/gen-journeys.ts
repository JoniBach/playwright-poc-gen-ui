// The purpose of this file is to take an index record and generate the full journey file

import { z } from 'zod';
import { openaiUtil } from './openai-util.js';
import { Logger } from './logger.js';
import { fileManager } from './file-manager.js';
import inquirer from 'inquirer';
import boxen from 'boxen';
import chalk from 'chalk';

// Get logger instance
const logger = Logger.getInstance();

// Configuration constants
const CONFIG = {
    INDEX_FILE_PATH: '../playwright-poc-ui/static/journeys/index.json',
    JOURNEYS_DIR_PATH: '../playwright-poc-ui/static/journeys/',
} as const;

// Error classes for better error handling
class JourneyGenerationError extends Error {
    constructor(message: string, public readonly code: string) {
        super(message);
        this.name = 'JourneyGenerationError';
    }
}

class ValidationError extends JourneyGenerationError {
    constructor(message: string) {
        super(message, 'VALIDATION_ERROR');
    }
}

class FileOperationError extends JourneyGenerationError {
    constructor(message: string) {
        super(message, 'FILE_OPERATION_ERROR');
    }
}

// Journey schema for AI generation (simplified version based on existing journeys)
const JourneySchema = z.object({
    id: z.string(),
    name: z.string(),
    landingPage: z.object({
        title: z.string(),
        lead: z.string(),
        sections: z.array(z.object({
            type: z.enum(['heading', 'paragraph', 'list', 'inset-text', 'warning-text']),
            content: z.string().optional(),
            level: z.enum(['l', 'm', 's']).optional(),
            listType: z.enum(['bullet', 'number']).optional(),
        }))
    }),
    pages: z.array(z.object({
        id: z.string(),
        title: z.string(),
        components: z.array(z.object({
            type: z.enum(['heading', 'paragraph', 'textInput', 'radios', 'button', 'details', 'summary-list']),
            id: z.string(),
            props: z.record(z.any()),
            validation: z.record(z.any()).optional(),
        })),
        nextPage: z.string().optional(),
    })),
    checkYourAnswersPage: z.string(),
    completionPage: z.string(),
    startPage: z.string(),
});

// Function to read index file and get available entries
async function readIndexFile(): Promise<any[]> {
    try {
        const readResult = await fileManager.readFile(CONFIG.INDEX_FILE_PATH);
        if (!readResult.success) {
            throw new FileOperationError(`Could not read index file: ${readResult.error}`);
        }

        const indexData = JSON.parse(readResult.data as string);
        return indexData.journeys || [];
    } catch (error) {
        if (error instanceof FileOperationError) {
            throw error;
        }
        throw new FileOperationError(`Error reading index file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Function to let user select an index entry
async function selectIndexEntry(indexEntries: any[]): Promise<any> {
    if (indexEntries.length === 0) {
        throw new ValidationError('No index entries found. Please run index generation first.');
    }

    const choices = indexEntries.map(entry => ({
        name: `${entry.name} (${entry.department}) - ${entry.id}`,
        value: entry,
        short: entry.id
    }));

    const { selectedEntry } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedEntry',
            message: 'Select an index entry to generate the journey for:',
            choices
        }
    ]);

    return selectedEntry;
}

// AI-powered journey generation from index entry
async function generateJourneyWithAI(indexEntry: any): Promise<z.infer<typeof JourneySchema> | null> {
    logger.info(`🤖 Generating full journey for: ${indexEntry.name}`);

    const prompt = `Create a complete UK government service journey for "${indexEntry.name}".

Service Details:
- ID: ${indexEntry.id}
- Name: ${indexEntry.name}
- Description: ${indexEntry.description}
- Department: ${indexEntry.department}
- Service Type: ${indexEntry.type}

Create a comprehensive journey with:
1. A landing page with title, lead paragraph, and sections about costs, timeframes, and requirements
2. Multiple form pages with appropriate components (text inputs, radios, etc.)
3. Proper validation rules for all inputs
4. A check your answers page
5. A completion/confirmation page

Use realistic GOV.UK design patterns and ensure the journey flows logically from start to completion.

The journey should be suitable for a ${indexEntry.type} service and include all necessary pages and components for a complete user journey.`;

    const aiResult = await openaiUtil.generateStructuredOutput({
        schema: JourneySchema,
        prompt,
        systemMessage: `You are an expert GOV.UK journey designer. Create complete, realistic government service journeys following GOV.UK design patterns.

Requirements:
- Landing page should have clear title, lead, and informational sections
- Form pages should have appropriate input components with validation
- Use kebab-case for all IDs
- Include check-your-answers and confirmation pages
- Make journeys realistic and complete for the service type
- Follow GOV.UK accessibility and usability guidelines

Create journeys that would work in a real government digital service.`,
        temperature: 0.3
    });

    return aiResult;
}

// Function to save generated journey
async function saveJourney(journey: z.infer<typeof JourneySchema>): Promise<void> {
    const journeyFilePath = `${CONFIG.JOURNEYS_DIR_PATH}${journey.id}.json`;

    // Check if journey file already exists
    const exists = await fileManager.fileExists(journeyFilePath);
    if (exists) {
        const { overwrite } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'overwrite',
                message: `Journey file ${journey.id}.json already exists. Overwrite?`,
                default: false
            }
        ]);

        if (!overwrite) {
            console.log(chalk.yellow('Journey generation cancelled.'));
            return;
        }
    }

    const writeResult = await fileManager.writeFile(journeyFilePath, JSON.stringify(journey, null, 2));
    if (!writeResult.success) {
        throw new FileOperationError(`Failed to save journey: ${writeResult.error}`);
    }

    console.log(chalk.green('✅ Journey saved successfully!'));
    console.log(chalk.blue(`📁 File: ${journeyFilePath}`));
}

// Main journey generation function
export async function genJourneys() {
    try {
        // Display header
        console.log(chalk.bold.blue('🚀 Journey Generation from Index Entry\n'));
        console.log('This tool generates complete journey JSON from a selected index entry\n');

        // Step 1: Preflight checks
        const isReady = await openaiUtil.isReady();
        if (!isReady) {
            throw new JourneyGenerationError('Preflight checks failed. Please check your configuration.', 'PREFLIGHT_FAILED');
        }

        logger.success('All preflight checks passed!');

        // Step 2: Read index entries
        const indexEntries = await readIndexFile();
        logger.info(`Found ${indexEntries.length} index entries`);

        // Step 3: Let user select index entry
        const selectedEntry = await selectIndexEntry(indexEntries);

        console.log(chalk.cyan(`\n📋 Selected: ${selectedEntry.name}`));
        console.log(chalk.gray(`   ${selectedEntry.description}`));
        console.log(chalk.gray(`   Department: ${selectedEntry.department}`));
        console.log(chalk.gray(`   Type: ${selectedEntry.type}\n`));

        // Step 4: Generate journey with AI
        const journey = await generateJourneyWithAI(selectedEntry);

        if (!journey) {
            throw new JourneyGenerationError('Failed to generate journey with AI', 'AI_GENERATION_FAILED');
        }

        // Step 5: Validate journey
        const validatedJourney = JourneySchema.parse(journey);

        // Step 6: Display journey summary
        const summary = [
            `${chalk.cyan('ID:')}          ${validatedJourney.id}`,
            `${chalk.cyan('Name:')}        ${validatedJourney.name}`,
            `${chalk.cyan('Pages:')}       ${validatedJourney.pages.length}`,
            `${chalk.cyan('Start Page:')}  ${validatedJourney.startPage}`,
            `${chalk.cyan('CYA Page:')}    ${validatedJourney.checkYourAnswersPage}`,
            `${chalk.cyan('Completion:')}  ${validatedJourney.completionPage}`
        ].join('\n');

        console.log(boxen(
            summary,
            {
                padding: 1,
                margin: 1,
                borderStyle: 'round',
                borderColor: 'green',
                title: '🎯 Generated Journey',
                titleAlignment: 'center'
            }
        ));

        // Step 7: Confirm and save
        const { saveJourney: shouldSave } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'saveJourney',
                message: 'Save this generated journey?',
                default: true
            }
        ]);

        if (!shouldSave) {
            console.log(chalk.yellow('❌ Journey not saved.'));
            return;
        }

        // Step 8: Save journey
        await saveJourney(validatedJourney);

        console.log(chalk.green('\n🎉 Journey generation completed successfully!'));

    } catch (error) {
        const errorMessage = error instanceof JourneyGenerationError
            ? `${error.name}: ${error.message}`
            : `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`;

        console.error(chalk.red('❌ Error during journey generation:'), errorMessage);

        // Log additional context for debugging
        if (error instanceof JourneyGenerationError) {
            logger.error(`Error code: ${error.code}`);
        }

        throw error;
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    genJourneys().catch(console.error);
}

