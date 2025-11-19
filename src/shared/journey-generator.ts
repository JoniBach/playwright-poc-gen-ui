import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { validateJourney, displayValidationResults, autoFixJourney } from './journey-validator.js';

// Import the actual schemas from the UI project
// Note: These are simplified versions - in production, import from the actual schema files
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

export async function generateJourney(options: GenerateJourneyOptions): Promise<JourneyJson | null> {
    const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        organization: process.env.OPENAI_ORG_ID,
    });

    const prompt = options.prompt || `Create a ${options.name} journey. ${options.description}`;

    console.log('\n🚀 Generating full journey JSON...\n');
    console.log(`📝 Journey: ${options.name}`);
    console.log(`📝 Description: ${options.description}`);
    if (options.prompt) {
        console.log(`📝 Additional context: ${options.prompt}`);
    }
    console.log('');

    try {
        const completion = await client.beta.chat.completions.parse({
            model: process.env.OPENAI_MODEL || 'gpt-4o-2024-08-06',
            messages: [
                {
                    role: 'system',
                    content: `You are a GOV.UK journey designer. Create user journeys following GOV.UK design patterns and best practices.

IMPORTANT: The journey MUST use the exact ID provided: "${options.id}"

Journey Structure:
- id: MUST be "${options.id}" (exact match required)
- name: "${options.name}"
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
            if (message.parsed.id !== options.id) {
                console.warn(`⚠️  Warning: Generated ID "${message.parsed.id}" doesn't match requested ID "${options.id}". Fixing...`);
                message.parsed.id = options.id;
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
                const correctHref = `/${options.department?.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '') || 'unknown'}/${options.id}/apply`;
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

export function displayJourney(journey: JourneyJson) {
    console.log('\n✅ Successfully generated journey!\n');
    console.log('📋 Journey Details:');
    console.log('┌─────────────────────────────────────────────────────────────');
    console.log(`│ ID:         ${journey.id}`);
    console.log(`│ Name:       ${journey.name}`);
    console.log(`│ Start Page: ${journey.startPage}`);
    console.log(`│ Pages:      ${Object.keys(journey.pages).length}`);
    if (journey.landingPage) {
        console.log(`│ Landing:    ✓ Included`);
    }
    if (journey.checkYourAnswersPage) {
        console.log(`│ Check Page: ${journey.checkYourAnswersPage}`);
    }
    if (journey.completionPage) {
        console.log(`│ Complete:   ${journey.completionPage}`);
    }
    console.log('└─────────────────────────────────────────────────────────────\n');

    console.log('📄 Pages:');
    Object.entries(journey.pages).forEach(([pageId, page]) => {
        console.log(`\n  ${pageId}: ${page.title}`);
        console.log(`    Components: ${page.components.length}`);
        page.components.forEach(comp => {
            console.log(`      - ${comp.type}: ${comp.id}`);
        });
        if (page.nextPage) {
            console.log(`    → Next: ${page.nextPage}`);
        }
    });
    console.log('');
}

export async function saveJourneyToFile(journey: JourneyJson, customPath?: string): Promise<boolean> {
    const journeyPath = customPath || path.join(
        process.cwd(),
        `../playwright-poc-ui/static/journeys/${journey.id}.json`
    );

    try {
        // Ensure directory exists
        const dir = path.dirname(journeyPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Check if file already exists
        if (fs.existsSync(journeyPath)) {
            console.log(`⚠️  File already exists: ${journeyPath}`);
            return false;
        }

        // Write journey to file
        fs.writeFileSync(journeyPath, JSON.stringify(journey, null, 2) + '\n', 'utf-8');
        console.log(`💾 Saved journey to: ${journeyPath}\n`);

        return true;
    } catch (error) {
        if (error instanceof Error) {
            console.error('❌ Error saving journey file:', error.message);
        }
        return false;
    }
}

export { JourneySchema };
