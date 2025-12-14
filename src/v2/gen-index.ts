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

// Function to read and parse the index file
async function readIndexFile(): Promise<any[]> {
    const indexFilePath = '../playwright-poc-ui/static/journeys/index.json';

    try {
        const readResult = await fileManager.readFile(indexFilePath);
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
    console.log(chalk.bold.blue('🎯 Journey Index Entry Generator\n'));
    console.log('This tool generates metadata for new journeys to add to index.json\n');

    try {
        // Run preflight checks
        const isReady = await openaiUtil.isReady();
        if (!isReady) {
            console.error(chalk.red('❌ Preflight checks failed. Please check your configuration.'));
            return;
        }

        // Read existing journeys to get department options
        const existingJourneys = await readIndexFile();
        const existingDepartments = getUniqueDepartments(existingJourneys);

        logger.info(`Loaded ${existingDepartments.length} existing departments from index`);

        // Create dynamic department choices
        const departmentChoices = [
            ...existingDepartments.map(dept => ({
                name: `${dept.name} (${dept.slug})`,
                value: dept.slug,
                short: dept.slug
            })),
            {
                name: '➕ Create new department',
                value: '__create_new__',
                short: 'new'
            }
        ];

        // Ask questions interactively
        const answers = await inquirer.prompt(baseQuestions);

        if (answers.creationMethod === 'ai-assisted') {
            // Generate journey metadata with AI
            const metadata = await generateJourneyMetadata(answers.journeyDescription, existingDepartments);

            if (!metadata) {
                console.error(chalk.red('❌ Failed to generate journey metadata'));
                return;
            }

            // Create final index entry
            const indexEntry: z.infer<typeof IndexEntrySchema> = {
                ...metadata,
                enabled: metadata.enabled ?? true, // Default to true if not set
                created: new Date().toISOString(),
            };

            // Validate the entry
            const validatedEntry = IndexEntrySchema.parse(indexEntry);

            // Display the results in a nice box
            const resultDisplay = [
                `${chalk.cyan('ID:')}          ${validatedEntry.id}`,
                `${chalk.cyan('Name:')}        ${validatedEntry.name}`,
                `${chalk.cyan('Description:')} ${validatedEntry.description}`,
                `${chalk.cyan('Slug:')}        ${validatedEntry.slug}`,
                `${chalk.cyan('Department:')}  ${validatedEntry.department}`,
                `${chalk.cyan('Dept Slug:')}   ${validatedEntry.departmentSlug}`,
                `${chalk.cyan('Type:')}        ${validatedEntry.type}`,
                `${chalk.cyan('Enabled:')}     ${validatedEntry.enabled}`,
                `${chalk.cyan('Created:')}     ${validatedEntry.created}`
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

            // Ask if they want to save
            const { saveEntry } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'saveEntry',
                    message: 'Save this entry to the journey index?',
                    default: true
                }
            ]);

            if (!saveEntry) {
                console.log(chalk.yellow('❌ Entry not saved.'));
                return;
            }

            // Save to UI directory index file
            const indexFilePath = '../playwright-poc-ui/static/journeys/index.json';

            // Read existing index file
            logger.info('Reading existing journey index file...');
            const readResult = await fileManager.readFile(indexFilePath);
            if (!readResult.success) {
                console.error(chalk.red('❌ Failed to read existing index file:'), readResult.error);
                return;
            }

            const indexData = JSON.parse(readResult.data as string);

            // Check if journey with this ID already exists
            const existingJourney = indexData.journeys.find((j: any) => j.id === validatedEntry.id);
            if (existingJourney) {
                console.log(chalk.yellow(`⚠️  Journey with ID '${validatedEntry.id}' already exists in index. Skipping.`));
                return;
            }

            // Add new journey
            indexData.journeys.push(validatedEntry);

            // Write updated index back to file
            logger.info('Updating journey index file...');
            const writeResult = await fileManager.writeFile(indexFilePath, JSON.stringify(indexData, null, 2));

            if (writeResult.success) {
                console.log(chalk.green('✅ Successfully added entry to journey index file!'));
                console.log(chalk.blue(`📁 Index file: ${indexFilePath}`));
            } else {
                console.error(chalk.red('❌ Failed to update index file:'), writeResult.error);
                return;
            }

            console.log(chalk.green('\n🎉 Journey index entry generation completed successfully!'));
        }

    } catch (error) {
        console.error(chalk.red('❌ Error during index entry generation:'), error);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    genIndex().catch(console.error);
}
