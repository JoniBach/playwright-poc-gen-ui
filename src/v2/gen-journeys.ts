// The purpose of this file is to take an index record and generate the full journey file

import { z } from 'zod';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { validateJourney, displayValidationResults, autoFixJourney } from '../shared/journey-validator.js';
import { openaiUtil } from './openai-util.js';
import { Logger } from './logger.js';
import { fileManager } from './file-manager.js';
import inquirer from 'inquirer';
import boxen from 'boxen';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

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
const ComponentSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('heading'),
        id: z.string(),
        props: z.object({
            text: z.string(),
            size: z.enum(['s', 'm', 'l', 'xl']).nullable().optional(),
        }),
    }),
    z.object({
        type: z.literal('paragraph'),
        id: z.string(),
        props: z.object({
            text: z.string(),
        }),
    }),
    z.object({
        type: z.literal('textInput'),
        id: z.string(),
        props: z.object({
            id: z.string(), // Required by UI schema
            name: z.string(),
            label: z.string(),
            hint: z.string().nullable().optional(),
            value: z.string().nullable().optional(),
            type: z.enum(['text', 'email', 'tel', 'number']).nullable().optional(),
            autocomplete: z.string().nullable().optional(),
            width: z.enum(['5', '10', '20', '30', 'full']).nullable().optional(),
            disabled: z.boolean().nullable().optional(),
            readonly: z.boolean().nullable().optional(),
            spellcheck: z.boolean().nullable().optional(),
        }),
    }),
    z.object({
        type: z.literal('radios'),
        id: z.string(),
        props: z.object({
            id: z.string(),
            name: z.string(),
            legend: z.string(),
            hint: z.string().nullable().optional(),
            items: z.array(z.object({
                value: z.string(),
                text: z.string(),
                hint: z.string().nullable().optional(),
                checked: z.boolean().nullable().optional(),
                disabled: z.boolean().nullable().optional(),
            })),
        }),
    }),
    z.object({
        type: z.literal('checkboxes'),
        id: z.string(),
        props: z.object({
            id: z.string(),
            name: z.string(),
            legend: z.string(),
            hint: z.string().nullable().optional(),
            items: z.array(z.object({
                value: z.string(),
                text: z.string(),
                hint: z.string().nullable().optional(),
                checked: z.boolean().nullable().optional(),
                disabled: z.boolean().nullable().optional(),
            })),
        }),
    }),
    z.object({
        type: z.literal('button'),
        id: z.string(),
        props: z.object({
            text: z.string(),
            href: z.string().nullable().optional(),
        }),
    }),
    z.object({
        type: z.literal('insetText'),
        id: z.string(),
        props: z.object({
            text: z.string(),
        }),
    }),
    z.object({
        type: z.literal('warningText'),
        id: z.string(),
        props: z.object({
            content: z.string(), // UI schema uses 'content', not 'text'
            iconFallbackText: z.string().nullable().optional(),
        }),
    }),
]);

const JourneyPageSchema = z.object({
    id: z.string(),
    title: z.string(),
    components: z.array(ComponentSchema),
    nextPage: z.string().nullable().optional(),
    previousPage: z.string().nullable().optional(),
});

const LandingPageSectionSchema = z.object({
    type: z.enum(['paragraph', 'heading', 'list', 'insetText', 'warningText', 'details']),
    content: z.union([z.string(), z.array(z.string())]),
    level: z.enum(['s', 'm', 'l', 'xl']).nullable().optional(),
    summary: z.string().nullable().optional(),
    listType: z.enum(['bullet', 'number']).nullable().optional(),
});

const LandingPageSchema = z.object({
    title: z.string(),
    lead: z.string(),
    sections: z.array(LandingPageSectionSchema),
    startButtonText: z.string().nullable().optional(),
    startButtonHref: z.string(),
});

// For OpenAI structured outputs, we need to use an array instead of a record
const JourneyPageWithIdSchema = z.object({
    id: z.string(),
    title: z.string(),
    components: z.array(ComponentSchema),
    nextPage: z.string().nullable().optional(),
    previousPage: z.string().nullable().optional(),
});

const JourneySchemaForAI = z.object({
    id: z.string(),
    name: z.string(),
    landingPage: LandingPageSchema.nullable().optional(),
    startPage: z.string(),
    pages: z.array(JourneyPageWithIdSchema), // Array instead of record for OpenAI
    checkYourAnswersPage: z.string().nullable().optional(),
    completionPage: z.string().nullable().optional(),
});

// Final schema with record for actual use
const JourneySchema = z.object({
    id: z.string(),
    name: z.string(),
    landingPage: LandingPageSchema.nullable().optional(),
    startPage: z.string(),
    pages: z.record(z.string(), JourneyPageSchema),
    checkYourAnswersPage: z.string().nullable().optional(),
    completionPage: z.string().nullable().optional(),
});

export type JourneyJson = z.infer<typeof JourneySchema>;

// Helper function to clean up empty strings and null values from optional fields
function cleanupOptionalFields(obj: any): any {
    if (obj === null || obj === undefined) {
        return undefined;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => cleanupOptionalFields(item));
    }
    
    if (typeof obj === 'object') {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
            // Skip empty strings, null, and undefined for optional fields
            if (value === '' || value === null) {
                continue;
            }
            cleaned[key] = cleanupOptionalFields(value);
        }
        return cleaned;
    }
    
    return obj;
}

export interface GenerateJourneyOptions {
    id: string;
    name: string;
    description: string;
    prompt?: string;
    department?: string;
}
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
async function generateJourneyWithAI(indexEntry: any): Promise<JourneyJson | null> {
    const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        organization: process.env.OPENAI_ORG_ID,
    });

    const prompt = `Create a ${indexEntry.name} journey. ${indexEntry.description}`;

    console.log('\n🚀 Generating full journey JSON...\n');
    console.log(`📝 Journey: ${indexEntry.name}`);
    console.log(`📝 Description: ${indexEntry.description}`);
    if (prompt) {
        console.log(`📝 Additional context: ${prompt}`);
    }
    console.log('');

    try {
        const completion = await client.beta.chat.completions.parse({
            model: process.env.OPENAI_MODEL || 'gpt-4o-2024-08-06',
            messages: [
                {
                    role: 'system',
                    content: `You are a GOV.UK journey designer. Create user journeys following GOV.UK design patterns and best practices.

IMPORTANT: The journey MUST use the exact ID provided: "${indexEntry.id}"

Journey Structure:
- id: MUST be "${indexEntry.id}" (exact match required)
- name: "${indexEntry.name}"
- landingPage: Optional landing page with title, lead text, and informational sections
- startPage: ID of the first page (e.g., "start" or "personal-details")
- pages: Array of page objects (each with an id field)
- checkYourAnswersPage: Optional "check your answers" page ID
- completionPage: Optional confirmation/completion page ID

Page Structure:
- Each page has: id (unique identifier), title, components array
- nextPage: ID of the next page in the flow (or null if last page)
- previousPage: Optional ID of the previous page (or null if first page)

Available Component Types:
1. heading: Page titles and section headers
   - props: { text, size: 's'|'m'|'l'|'xl' }

2. paragraph: Informational text
   - props: { text }

3. textInput: Text input fields
   - props: { id (required), name, label, hint?, value?, type?: 'text'|'email'|'tel'|'number', autocomplete?, width?, disabled?, readonly?, spellcheck? }
   - IMPORTANT: Must include 'id' field in props (same value as component id)

4. radios: Radio button groups (single choice)
   - props: { id (required), name, legend, hint?, items: [{ value, text, hint?, checked?, disabled? }] }
   - IMPORTANT: Must include 'id' field in props (same value as component id)

5. checkboxes: Checkbox groups (multiple choice)
   - props: { id (required), name, legend, hint?, items: [{ value, text, hint?, checked?, disabled? }] }
   - IMPORTANT: Must include 'id' field in props (same value as component id)

6. button: Navigation buttons
   - props: { text, href? }

7. insetText: Highlighted information boxes
   - props: { text }

8. warningText: Warning messages
   - props: { content (not 'text'), iconFallbackText? }
   - IMPORTANT: Use 'content' property, NOT 'text'

GOV.UK Design Principles:
- Use clear, simple language
- One thing per page
- Start with a landing page explaining what the service does
- Group related questions logically
- Include helpful hint text
- Use appropriate input types (email, tel, etc.)
- Include a "Check your answers" page before submission
- End with a clear confirmation page
- Use proper navigation (nextPage/previousPage)

Example Flow:
1. Landing page (optional) - explains the service
2. Start page - first question or information
3. Question pages - one topic per page
4. Check your answers - review before submit
5. Completion - confirmation and next steps`,
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            response_format: zodResponseFormat(JourneySchemaForAI, 'journey'),
        });

        const message = completion.choices[0]?.message;

        if (message?.parsed) {
            // Ensure the ID matches what was requested
            if (message.parsed.id !== indexEntry.id) {
                console.warn(`⚠️  Warning: Generated ID "${message.parsed.id}" doesn't match requested ID "${indexEntry.id}". Fixing...`);
                message.parsed.id = indexEntry.id;
            }

            // Convert pages array to record (object with page IDs as keys)
            const pagesRecord: Record<string, any> = {};
            message.parsed.pages.forEach((page: any) => {
                const { id, ...pageWithoutId } = page;
                pagesRecord[id] = { id, ...pageWithoutId };
            });

            // Create the final journey object with pages as a record
            const journey: JourneyJson = {
                id: message.parsed.id,
                name: message.parsed.name,
                landingPage: message.parsed.landingPage,
                startPage: message.parsed.startPage,
                pages: pagesRecord,
                checkYourAnswersPage: message.parsed.checkYourAnswersPage,
                completionPage: message.parsed.completionPage,
            };

            // Clean up empty strings and null values from optional fields
            let cleanedJourney = cleanupOptionalFields(journey) as JourneyJson;

            // POST-PROCESSING: Fix common AI mistakes BEFORE validation
            console.log('\n🔧 Post-processing journey...\n');
            
            // 1. Fix startButtonHref if it's wrong
            if (cleanedJourney.landingPage?.startButtonHref) {
                const correctHref = `/${indexEntry.department?.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '') || 'unknown'}/${indexEntry.id}/apply`;
                if (cleanedJourney.landingPage.startButtonHref !== correctHref) {
                    console.log(`⚠️  Fixing startButtonHref: "${cleanedJourney.landingPage.startButtonHref}" → "${correctHref}"`);
                    cleanedJourney.landingPage.startButtonHref = correctHref;
                }
            }
            
            // 2. Remove button components (navigation is automatic)
            let buttonCount = 0;
            Object.keys(cleanedJourney.pages).forEach(pageId => {
                const page = cleanedJourney.pages[pageId];
                const originalLength = page.components.length;
                page.components = page.components.filter((c: any) => c.type !== 'button');
                const removed = originalLength - page.components.length;
                if (removed > 0) {
                    buttonCount += removed;
                    console.log(`⚠️  Removed ${removed} button(s) from page: ${pageId}`);
                }
            });
            
            if (buttonCount > 0) {
                console.log(`✅ Removed ${buttonCount} button component(s) total\n`);
            }

            // Validate the journey against UI schema requirements
            console.log('🔍 Validating generated journey...\n');
            let validationResult = validateJourney(cleanedJourney);
            
            // If validation fails, attempt auto-fix
            if (!validationResult.valid) {
                console.log('⚠️  Validation errors found. Attempting auto-fix...\n');
                const { fixed, changes } = autoFixJourney(cleanedJourney);
                
                if (changes.length > 0) {
                    console.log('🔧 Auto-fix applied the following changes:');
                    changes.forEach(change => console.log(`   - ${change}`));
                    console.log('');
                    
                    cleanedJourney = fixed;
                    
                    // Re-validate after fixes
                    validationResult = validateJourney(cleanedJourney);
                }
            }
            
            // Display validation results
            displayValidationResults(validationResult, cleanedJourney.id);
            
            // If still invalid after auto-fix, warn user
            if (!validationResult.valid) {
                console.warn('⚠️  WARNING: Journey still has validation errors after auto-fix.');
                console.warn('   The journey may not work correctly in the UI.');
                console.warn('   Please review the errors above and fix manually if needed.\n');
            }

            return cleanedJourney;
        } else if (message?.refusal) {
            console.error('❌ Request was refused:', message.refusal);
            return null;
        } else {
            console.error('❌ No response received');
            return null;
        }
    } catch (error) {
        if (error instanceof Error) {
            console.error('❌ Error:', error.message);
        } else {
            console.error('❌ Unknown error occurred');
        }
        return null;
    }
}

// Function to save generated journey
async function saveJourney(journey: JourneyJson): Promise<void> {
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

