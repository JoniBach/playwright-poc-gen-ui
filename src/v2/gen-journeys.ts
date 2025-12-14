// The purpose of this file is to generate full journey JSON configurations from index entries

import { z } from 'zod';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { validateJourney, displayValidationResults, autoFixJourney } from './validation/index.js';
import { openaiUtil } from './openai-util.js';
import { Logger } from './logger.js';
import { fileManager } from './file-manager.js';
import inquirer from 'inquirer';
import boxen from 'boxen';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { ComponentSchema } from './schemas/component.js';
import { JourneySchema, JourneySchemaForAI, JourneyJson } from './schemas/journey.js';

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

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

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
            logger.info('AI successfully generated journey structure');
            // Ensure the ID matches what was requested
            if (message.parsed.id !== indexEntry.id) {
                logger.warn(`Generated ID "${message.parsed.id}" doesn't match requested ID "${indexEntry.id}". Fixing...`);
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
            logger.info('Post-processing journey...');
            
            // 1. Ensure journey ID matches the index entry ID exactly
            if (cleanedJourney.id !== indexEntry.id) {
                logger.warn(`Fixing journey ID: "${cleanedJourney.id}" → "${indexEntry.id}"`);
                cleanedJourney.id = indexEntry.id;
            }
            
            // 2. Ensure journey name matches the index entry name exactly
            if (cleanedJourney.name !== indexEntry.name) {
                logger.warn(`Fixing journey name: "${cleanedJourney.name}" → "${indexEntry.name}"`);
                cleanedJourney.name = indexEntry.name;
            }
            
            // 3. Fix startButtonHref if it's wrong
            if (cleanedJourney.landingPage?.startButtonHref) {
                // Use the exact departmentSlug from the index entry
                const correctHref = `/${indexEntry.departmentSlug || 'unknown'}/${indexEntry.id}/apply`;
                if (cleanedJourney.landingPage.startButtonHref !== correctHref) {
                    logger.warn(`Fixing startButtonHref: "${cleanedJourney.landingPage.startButtonHref}" → "${correctHref}"`);
                    cleanedJourney.landingPage.startButtonHref = correctHref;
                }
            }
            
            // 4. Remove button components (navigation is automatic)
            let buttonCount = 0;
            Object.keys(cleanedJourney.pages).forEach(pageId => {
                const page = cleanedJourney.pages[pageId];
                const originalLength = page.components.length;
                page.components = page.components.filter((c: any) => c.type !== 'button');
                const removed = originalLength - page.components.length;
                if (removed > 0) {
                    buttonCount += removed;
                    logger.warn(`Removed ${removed} button(s) from page: ${pageId}`);
                }
            });
            
            if (buttonCount > 0) {
                logger.info(`Removed ${buttonCount} button component(s) total`);
            }
            
            // 5. Ensure all URLs and paths use the correct slugs
            const correctJourneyId = indexEntry.id;
            const correctDeptSlug = indexEntry.departmentSlug || 'unknown';
            
            // Check for URLs in components that might reference the journey
            Object.keys(cleanedJourney.pages).forEach(pageId => {
                const page = cleanedJourney.pages[pageId];
                page.components.forEach((component: any) => {
                    // Fix URLs in links, buttons, etc.
                    if (component.props && component.props.href) {
                        const href = component.props.href;
                        if (href.includes('/apply') || href.includes('/start')) {
                            const correctHref = `/${correctDeptSlug}/${correctJourneyId}/apply`;
                            if (href !== correctHref) {
                                logger.warn(`Fixing component href: "${href}" → "${correctHref}"`);
                                component.props.href = correctHref;
                            }
                        }
                    }
                });
            });

            // Validate the journey against UI schema requirements
            logger.info('Validating generated journey...');
            let validationResult = validateJourney(cleanedJourney);
            
            // If validation fails, attempt auto-fix
            if (!validationResult.valid) {
                logger.warn('Validation errors found. Attempting auto-fix...');
                const { fixed, changes } = autoFixJourney(cleanedJourney);
                
                if (changes.length > 0) {
                    logger.info('Auto-fix applied the following changes:');
                    changes.forEach(change => logger.info(`   - ${change}`));
                    
                    cleanedJourney = fixed;
                    
                    // Re-validate after fixes
                    validationResult = validateJourney(cleanedJourney);
                }
            }
            
            // Display validation results
            displayValidationResults(validationResult, cleanedJourney.id);
            
            // If still invalid after auto-fix, warn user
            if (!validationResult.valid) {
                logger.warn('WARNING: Journey still has validation errors after auto-fix.');
                logger.warn('   The journey may not work correctly in the UI.');
                logger.warn('   Please review the errors above and fix manually if needed.');
            }

            return cleanedJourney;
        } else if (message?.refusal) {
            logger.error('AI refused the request:', message.refusal);
            logger.error('This usually means the prompt or schema is too complex for the model');
            return null;
        } else {
            logger.error('AI did not return a valid structured response');
            logger.error('This could be due to:');
            logger.error('1. Schema too complex for the model');
            logger.error('2. Prompt too long or confusing');
            logger.error('3. Model limitations with structured outputs');

            // Log more details about the response
            if (message) {
                logger.error('Message object exists but no parsed content');
                if (message.content) {
                    logger.error('Raw content length:', message.content.length);
                    // Log first 500 characters of content for debugging
                    logger.error('Raw content preview:', message.content.substring(0, 500));
                } else {
                    logger.error('No content in message');
                }
            } else {
                logger.error('No message object returned from AI');
            }
            return null;
        }
    } catch (error) {
        if (error instanceof Error) {
            logger.error('Error:', error.message);
        } else {
            logger.error('Unknown error occurred');
        }
        return null;
    }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

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
            logger.info('Journey generation cancelled.');
            return;
        }
    }

    const writeResult = await fileManager.writeFile(journeyFilePath, JSON.stringify(journey, null, 2));
    if (!writeResult.success) {
        throw new FileOperationError(`Failed to save journey: ${writeResult.error}`);
    }

    logger.success('Journey saved successfully!');
    logger.info(`File: ${journeyFilePath}`);
}

// Main journey generation function
export async function genJourneys() {
    try {
        // Display header
        logger.info('Journey Generation from Index Entry');
        logger.info('This tool generates complete journey JSON from a selected index entry');

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

        logger.info(`Selected: ${selectedEntry.name}`);
        logger.info(`${selectedEntry.description}`);
        logger.info(`Department: ${selectedEntry.department}`);
        logger.info(`Type: ${selectedEntry.type}`);

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
            logger.info('Journey not saved.');
            return;
        }

        // Step 8: Save journey
        await saveJourney(validatedJourney);

        logger.success('Journey generation completed successfully!');

    } catch (error) {
        const errorMessage = error instanceof JourneyGenerationError
            ? `${error.name}: ${error.message}`
            : `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`;

        logger.error('Error during journey generation:', errorMessage);

        // Log additional context for debugging
        if (error instanceof JourneyGenerationError) {
            logger.error(`Error code: ${error.code}`);
        }

        throw error;
    }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    genJourneys().catch(console.error);
}

