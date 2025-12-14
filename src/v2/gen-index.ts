// The purpose of this file is to run the initial generation stage of building and creating the index file for the journey generator

import { z } from 'zod';
import { openaiUtil } from './openai-util.js';
import { Logger } from './logger.js';
import { fileManager } from './file-manager.js';
import inquirer from 'inquirer';
import boxen from 'boxen';
import chalk from 'chalk';
import { JourneyMetadataSchema, IndexEntrySchema } from './schemas/index.js';

// Get logger instance
const logger = Logger.getInstance();

// Configuration constants
const CONFIG = {
    INDEX_FILE_PATH: '../playwright-poc-ui/static/journeys/index.json',
    DEFAULT_JOURNEY_DESCRIPTION: 'Apply for a driving licence',
    MIN_DESCRIPTION_LENGTH: 3,
} as const;

// Error classes for better error handling
class IndexGenerationError extends Error {
    constructor(message: string, public readonly code: string) {
        super(message);
        this.name = 'IndexGenerationError';
    }
}

class ValidationError extends IndexGenerationError {
    constructor(message: string) {
        super(message, 'VALIDATION_ERROR');
    }
}

class FileOperationError extends IndexGenerationError {
    constructor(message: string) {
        super(message, 'FILE_OPERATION_ERROR');
    }
}

// Preflight check function
async function performPreflightChecks(): Promise<void> {
    logger.info('Running OpenAI preflight checks...');

    const isReady = await openaiUtil.isReady();
    if (!isReady) {
        throw new IndexGenerationError('Preflight checks failed. Please check your configuration.', 'PREFLIGHT_FAILED');
    }

    logger.success('All preflight checks passed!');
}

// Function to read and parse the index file
async function readIndexFile(): Promise<any[]> {
    try {
        const readResult = await fileManager.readFile(CONFIG.INDEX_FILE_PATH);
        if (!readResult.success) {
            logger.warn('Could not read index file, starting with empty list');
            return [];
        }

        const indexData = JSON.parse(readResult.data as string);
        return indexData.journeys || [];
    } catch (error) {
        logger.warn('Error reading index file, starting with empty list');
        return [];
    }
}

// Function to extract unique departments from existing journeys
function getUniqueDepartments(journeys: any[]): Array<{name: string, value: string, slug: string}> {
    const departmentMap = new Map<string, {name: string, slug: string}>();

    journeys.forEach(journey => {
        if (journey.department && journey.departmentSlug) {
            departmentMap.set(journey.departmentSlug, {
                name: journey.department,
                slug: journey.departmentSlug
            });
        }
    });

    return Array.from(departmentMap.values()).map(dept => ({
        name: dept.name,
        value: dept.slug,
        slug: dept.slug
    }));
}

// Function to generate department slug from full name
function generateDepartmentSlug(departmentName: string): string {
    return departmentName.toLowerCase()
        .replace(/\([^)]*\)/g, '') // Remove abbreviations like (DWP)
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .trim();
}

// User input collection function
async function collectUserInput(existingDepartments: Array<{name: string, value: string, slug: string}>): Promise<{ creationMethod: string; journeyDescription: string }> {
    // Skip the creation method question and default to AI-assisted mode
    const questions: any[] = [
        {
            type: 'input',
            name: 'journeyDescription',
            message: 'Describe the journey you want to create:',
            default: CONFIG.DEFAULT_JOURNEY_DESCRIPTION,
            validate: (input: string) => {
                if (input.trim().length < CONFIG.MIN_DESCRIPTION_LENGTH) {
                    return `Please provide a more detailed description (at least ${CONFIG.MIN_DESCRIPTION_LENGTH} characters)`;
                }
                return true;
            }
        }
    ];

    const result = await inquirer.prompt(questions);
    // Always set creationMethod to 'ai-assisted'
    return { 
        creationMethod: 'ai-assisted', 
        journeyDescription: result.journeyDescription 
    };
}

// Entry validation function
function validateIndexEntry(entry: any): z.infer<typeof IndexEntrySchema> {
    try {
        return IndexEntrySchema.parse(entry);
    } catch (error) {
        throw new ValidationError(`Invalid index entry: ${error instanceof Error ? error.message : 'Unknown validation error'}`);
    }
}

// Results display function
function displayGeneratedEntry(entry: z.infer<typeof IndexEntrySchema>): void {
    const resultDisplay = [
        `${chalk.cyan('ID:')}          ${entry.id}`,
        `${chalk.cyan('Name:')}        ${entry.name}`,
        `${chalk.cyan('Description:')} ${entry.description}`,
        `${chalk.cyan('Slug:')}        ${entry.slug}`,
        `${chalk.cyan('Department:')}  ${entry.department}`,
        `${chalk.cyan('Dept Slug:')}   ${entry.departmentSlug}`,
        `${chalk.cyan('Type:')}        ${entry.type}`,
        `${chalk.cyan('Enabled:')}     ${entry.enabled}`,
        `${chalk.cyan('Created:')}     ${entry.created}`
    ].join('\n');

    console.log(boxen(
        resultDisplay,
        {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'green',
            title: '📋 Journey Metadata',
            titleAlignment: 'center'
        }
    ));
}

// Save confirmation function
async function confirmSave(): Promise<boolean> {
    const { saveEntry } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'saveEntry',
            message: 'Save this entry to the journey index?',
            default: true
        }
    ]);

    return saveEntry;
}

// Index saving function
async function saveIndexEntry(entry: z.infer<typeof IndexEntrySchema>, existingJourneys: any[]): Promise<void> {
    // Check if journey with this ID already exists
    const existingJourney = existingJourneys.find((j: any) => j.id === entry.id);
    if (existingJourney) {
        throw new ValidationError(`Journey with ID '${entry.id}' already exists in index.`);
    }

    // Add new journey
    const updatedJourneys = [...existingJourneys, entry];

    // Write updated index back to file
    logger.info('Updating journey index file...');
    const writeResult = await fileManager.writeFile(CONFIG.INDEX_FILE_PATH, JSON.stringify({ journeys: updatedJourneys }, null, 2));

    if (!writeResult.success) {
        throw new FileOperationError(`Failed to update index file: ${writeResult.error}`);
    }

    logger.success('Successfully added entry to journey index file!');
    console.log(chalk.blue(`📁 Index file: ${CONFIG.INDEX_FILE_PATH}`));
}

// AI-powered journey metadata generation
async function generateJourneyMetadata(description: string, existingDepartments: Array<{name: string, value: string, slug: string}>): Promise<z.infer<typeof JourneyMetadataSchema> | null> {
    logger.info(`🤖 Generating journey metadata from your description...`);

    // Create department list from existing data
    const departmentList = existingDepartments.map(dept => dept.name).join(', ');

    const prompt = `Generate complete journey metadata for this UK government service: "${description}"

Please create:
- A unique ID (kebab-case, e.g., "apply-driving-licence")
- A clear, professional name
- A detailed description of what the service does
- The appropriate government department (choose from existing: ${departmentList})
- The service type (data-entry for applications/forms, data-lookup for checking info)
- A URL-friendly slug

Choose from these existing departments: ${departmentList}

Make this realistic and something that would actually exist as a government service.`;

    const aiResult = await openaiUtil.generateStructuredOutput({
        schema: JourneyMetadataSchema,
        prompt,
        systemMessage: `You are an expert in UK government services. Generate complete, realistic journey metadata for government services that would benefit from online user journeys.

Choose from the existing departments list provided. Create unique, professional IDs and names. Make descriptions clear and specific about what the service does.

For service types:
- data-entry: Services where users submit applications, forms, or new information
- data-lookup: Services where users check existing records or status information

Generate metadata that would be suitable for a real government digital service.`,
        temperature: 0.3
    });

    return aiResult;
}

// Interactive questions for journey metadata creation
const baseQuestions: any[] = [
    {
        type: 'list',
        name: 'creationMethod',
        message: 'How would you like to create the journey metadata?',
        choices: [
            {
                name: '🤖 AI-assisted (describe journey, AI generates metadata)',
                value: 'ai-assisted',
                short: 'AI-assisted'
            }
        ]
    },
    {
        type: 'input',
        name: 'journeyDescription',
        message: 'Describe the journey you want to create:',
        default: 'Apply for a driving licence',
        when: (answers: any) => answers.creationMethod === 'ai-assisted',
        validate: (input: string) => {
            if (input.trim().length < 3) {
                return 'Please provide a more detailed description (at least 3 characters)';
            }
            return true;
        }
    }
];

export async function genIndex() {
    try {
        // Display header
        console.log(chalk.bold.blue('🎯 Journey Index Entry Generator\n'));
        console.log('This tool generates metadata for new journeys to add to index.json\n');

        // Step 1: Preflight checks
        await performPreflightChecks();

        // Step 2: Read existing index data
        const existingJourneys = await readIndexFile();
        const existingDepartments = getUniqueDepartments(existingJourneys);

        logger.info(`Loaded ${existingDepartments.length} existing departments from index`);

        // Step 3: Collect user input
        const userInput = await collectUserInput(existingDepartments);

        // Step 4: Generate metadata with AI
        if (userInput.creationMethod === 'ai-assisted') {
            const metadata = await generateJourneyMetadata(userInput.journeyDescription, existingDepartments);

            if (!metadata) {
                throw new IndexGenerationError('Failed to generate journey metadata', 'AI_GENERATION_FAILED');
            }

            // Step 5: Create and validate final entry
            const indexEntry: z.infer<typeof IndexEntrySchema> = {
                ...metadata,
                enabled: metadata.enabled ?? true,
                created: new Date().toISOString(),
            };

            const validatedEntry = validateIndexEntry(indexEntry);

            // Step 6: Display results
            displayGeneratedEntry(validatedEntry);

            // Step 7: Confirm save
            const shouldSave = await confirmSave();
            if (!shouldSave) {
                console.log(chalk.yellow('❌ Entry not saved.'));
                return;
            }

            // Step 8: Save to index
            await saveIndexEntry(validatedEntry, existingJourneys);

            console.log(chalk.green('\n🎉 Journey index entry generation completed successfully!'));
        }

    } catch (error) {
        const errorMessage = error instanceof IndexGenerationError
            ? `${error.name}: ${error.message}`
            : `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`;

        console.error(chalk.red('❌ Error during index entry generation:'), errorMessage);

        // Log additional context for debugging
        if (error instanceof IndexGenerationError) {
            logger.error(`Error code: ${error.code}`);
        }

        throw error; // Re-throw for external error handling
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    genIndex().catch(console.error);
}
