import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import dotenv from 'dotenv';
import inquirer from 'inquirer';
import { runPreflight } from './preflight.js';
import fs from 'fs';
import path from 'path';
import { generateJourney, displayJourney, saveJourneyToFile } from './shared/journey-generator.js';

// Load environment variables
dotenv.config();

// Import the actual schema from the UI project
const JourneyMetadataSchema = z.object({
    id: z.string().describe('Unique identifier in kebab-case (e.g., "passport-apply")'),
    name: z.string().describe('Human-readable name of the journey'),
    description: z.string().describe('Brief description of what this journey does'),
    slug: z.string().describe('URL-friendly slug (usually same as id)'),
    department: z.string().describe('Full department name (e.g., "HM Passport Office")'),
    departmentSlug: z.string().describe('URL-friendly department slug (e.g., "hm-passport-office")'),
    enabled: z.boolean().default(true).describe('Whether this journey is currently enabled')
});

type JourneyMetadata = z.infer<typeof JourneyMetadataSchema>;

// Common UK government departments for suggestions
const COMMON_DEPARTMENTS = [
    { name: 'HM Passport Office', slug: 'hm-passport-office' },
    { name: 'HM Revenue and Customs (HMRC)', slug: 'hmrc' },
    { name: 'Department for Work and Pensions (DWP)', slug: 'dwp' },
    { name: 'National Health Service (NHS)', slug: 'nhs' },
    { name: 'Ministry of Defence (MOD)', slug: 'mod' },
    { name: 'Department for Education (DfE)', slug: 'dfe' },
    { name: 'Home Office', slug: 'home-office' },
    { name: 'Ministry of Justice (MOJ)', slug: 'moj' },
    { name: 'Driver and Vehicle Licensing Agency (DVLA)', slug: 'dvla' },
    { name: 'HM Courts & Tribunals Service (HMCTS)', slug: 'hmcts' },
];

async function generateJourneyMetadata(userPrompt: string): Promise<JourneyMetadata | null> {
    const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        organization: process.env.OPENAI_ORG_ID,
    });

    console.log('\n🤖 Generating journey metadata from your description...\n');

    try {
        const completion = await client.beta.chat.completions.parse({
            model: process.env.OPENAI_MODEL || 'gpt-4o-2024-08-06',
            messages: [
                {
                    role: 'system',
                    content: `You are a UK government service designer. Generate metadata for a new government service journey.

Guidelines:
- Use kebab-case for IDs and slugs (e.g., "passport-apply", "tax-summary")
- Keep names concise but descriptive
- Descriptions should be one clear sentence
- Match the department to the most appropriate UK government department
- Department slugs should be kebab-case versions of department names
- Set enabled to true by default

Common UK departments:
${COMMON_DEPARTMENTS.map(d => `- ${d.name} (${d.slug})`).join('\n')}

Examples:
- "Apply for a passport" → HM Passport Office
- "File tax return" → HM Revenue and Customs (HMRC)
- "Register with a GP" → National Health Service (NHS)
- "Apply for Universal Credit" → Department for Work and Pensions (DWP)`,
                },
                { 
                    role: 'user', 
                    content: `Create journey metadata for: ${userPrompt}` 
                },
            ],
            response_format: zodResponseFormat(JourneyMetadataSchema, 'journey_metadata'),
        });

        const message = completion.choices[0]?.message;
        
        if (message?.parsed) {
            return message.parsed;
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

function displayMetadata(metadata: JourneyMetadata) {
    console.log('\n✅ Successfully generated journey metadata!\n');
    console.log('📋 Journey Metadata:');
    console.log('┌─────────────────────────────────────────────────────────────');
    console.log(`│ ID:          ${metadata.id}`);
    console.log(`│ Name:        ${metadata.name}`);
    console.log(`│ Description: ${metadata.description}`);
    console.log(`│ Slug:        ${metadata.slug}`);
    console.log(`│ Department:  ${metadata.department}`);
    console.log(`│ Dept Slug:   ${metadata.departmentSlug}`);
    console.log(`│ Enabled:     ${metadata.enabled}`);
    console.log('└─────────────────────────────────────────────────────────────\n');
}

async function saveToIndexFile(metadata: JourneyMetadata): Promise<boolean> {
    const indexPath = path.join(process.cwd(), '../playwright-poc-ui/static/journeys/index.json');
    
    try {
        // Check if file exists
        if (!fs.existsSync(indexPath)) {
            console.error(`❌ Index file not found at: ${indexPath}`);
            return false;
        }

        // Read existing index
        const indexContent = fs.readFileSync(indexPath, 'utf-8');
        const indexData = JSON.parse(indexContent);

        // Check if journey already exists
        const existingIndex = indexData.journeys.findIndex((j: JourneyMetadata) => j.id === metadata.id);
        
        if (existingIndex !== -1) {
            const { overwrite } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'overwrite',
                    message: `⚠️  Journey with ID "${metadata.id}" already exists. Overwrite?`,
                    default: false
                }
            ]);

            if (!overwrite) {
                console.log('❌ Cancelled - journey not saved');
                return false;
            }

            indexData.journeys[existingIndex] = metadata;
            console.log(`✅ Updated existing journey: ${metadata.id}`);
        } else {
            indexData.journeys.push(metadata);
            console.log(`✅ Added new journey: ${metadata.id}`);
        }

        // Write back to file
        fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2) + '\n', 'utf-8');
        console.log(`💾 Saved to: ${indexPath}\n`);
        
        return true;
    } catch (error) {
        if (error instanceof Error) {
            console.error('❌ Error saving to index file:', error.message);
        }
        return false;
    }
}

async function main() {
    console.log('🎯 Journey Index Entry Generator\n');
    console.log('This tool generates metadata for new journeys to add to index.json\n');

    // Run preflight checks
    const preflightResult = await runPreflight();
    
    if (!preflightResult.success) {
        console.error('\n❌ Preflight checks failed. Please fix the errors above before continuing.\n');
        process.exit(1);
    }

    // Get user input
    let userPrompt: string = '';
    let useAI = true;
    
    if (process.argv[2]) {
        userPrompt = process.argv.slice(2).join(' ');
        console.log(`📝 Using prompt from command line: "${userPrompt}"\n`);
    } else {
        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'mode',
                message: 'How would you like to create the journey metadata?',
                choices: [
                    { name: '🤖 AI-assisted (answer questions, AI generates metadata)', value: 'ai' },
                    { name: '✍️  Manual (enter all fields yourself)', value: 'manual' }
                ],
                default: 'ai'
            }
        ]);

        useAI = answers.mode === 'ai';

        if (useAI) {
            const promptAnswer = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'prompt',
                    message: 'Describe the journey you want to create:',
                    default: 'Apply for a driving licence',
                    validate: (input: string) => {
                        if (input.trim().length === 0) {
                            return 'Please enter a description';
                        }
                        return true;
                    }
                }
            ]);
            userPrompt = promptAnswer.prompt;
        }
    }

    let metadata: JourneyMetadata | null = null;

    if (useAI) {
        // AI-assisted generation
        metadata = await generateJourneyMetadata(userPrompt);
        
        if (!metadata) {
            console.error('❌ Failed to generate metadata');
            process.exit(1);
        }

        displayMetadata(metadata);

        // Ask if user wants to edit
        const { shouldEdit } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'shouldEdit',
                message: 'Would you like to edit any fields?',
                default: false
            }
        ]);

        if (shouldEdit) {
            const editAnswers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'id',
                    message: 'ID (kebab-case):',
                    default: metadata.id
                },
                {
                    type: 'input',
                    name: 'name',
                    message: 'Name:',
                    default: metadata.name
                },
                {
                    type: 'input',
                    name: 'description',
                    message: 'Description:',
                    default: metadata.description
                },
                {
                    type: 'input',
                    name: 'slug',
                    message: 'Slug:',
                    default: metadata.slug
                },
                {
                    type: 'input',
                    name: 'department',
                    message: 'Department:',
                    default: metadata.department
                },
                {
                    type: 'input',
                    name: 'departmentSlug',
                    message: 'Department Slug:',
                    default: metadata.departmentSlug
                },
                {
                    type: 'confirm',
                    name: 'enabled',
                    message: 'Enabled:',
                    default: metadata.enabled
                }
            ]);

            metadata = editAnswers as JourneyMetadata;
            displayMetadata(metadata);
        }
    } else {
        // Manual entry
        const manualAnswers = await inquirer.prompt([
            {
                type: 'input',
                name: 'id',
                message: 'ID (kebab-case, e.g., "passport-apply"):',
                validate: (input: string) => {
                    if (!/^[a-z0-9-]+$/.test(input)) {
                        return 'ID must be kebab-case (lowercase letters, numbers, and hyphens only)';
                    }
                    return true;
                }
            },
            {
                type: 'input',
                name: 'name',
                message: 'Name:',
                validate: (input: string) => input.trim().length > 0 || 'Name is required'
            },
            {
                type: 'input',
                name: 'description',
                message: 'Description:',
                validate: (input: string) => input.trim().length > 0 || 'Description is required'
            },
            {
                type: 'input',
                name: 'slug',
                message: 'Slug (usually same as ID):',
                default: (answers: any) => answers.id,
                validate: (input: string) => {
                    if (!/^[a-z0-9-]+$/.test(input)) {
                        return 'Slug must be kebab-case';
                    }
                    return true;
                }
            },
            {
                type: 'list',
                name: 'department',
                message: 'Department:',
                choices: [
                    ...COMMON_DEPARTMENTS.map(d => ({ name: d.name, value: d.name })),
                    { name: 'Other (enter manually)', value: 'other' }
                ]
            },
            {
                type: 'input',
                name: 'customDepartment',
                message: 'Enter department name:',
                when: (answers: any) => answers.department === 'other',
                validate: (input: string) => input.trim().length > 0 || 'Department is required'
            },
            {
                type: 'input',
                name: 'departmentSlug',
                message: 'Department Slug:',
                default: (answers: any) => {
                    const dept = answers.department === 'other' 
                        ? answers.customDepartment 
                        : answers.department;
                    const found = COMMON_DEPARTMENTS.find(d => d.name === dept);
                    return found ? found.slug : dept.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                },
                validate: (input: string) => {
                    if (!/^[a-z0-9-]+$/.test(input)) {
                        return 'Department slug must be kebab-case';
                    }
                    return true;
                }
            },
            {
                type: 'confirm',
                name: 'enabled',
                message: 'Enabled:',
                default: true
            }
        ]);

        // Handle custom department
        if (manualAnswers.department === 'other') {
            manualAnswers.department = manualAnswers.customDepartment;
        }
        delete manualAnswers.customDepartment;

        metadata = manualAnswers as JourneyMetadata;
        displayMetadata(metadata);
    }

    // Validate with Zod schema
    try {
        JourneyMetadataSchema.parse(metadata);
        console.log('✅ Metadata validation passed\n');
    } catch (error) {
        console.error('❌ Validation failed:', error);
        process.exit(1);
    }

    // Show JSON output
    console.log('📄 JSON Output:');
    console.log(JSON.stringify(metadata, null, 2));
    console.log('');

    // Ask if user wants to save to index.json
    const { shouldSave } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'shouldSave',
            message: 'Save this entry to index.json?',
            default: true
        }
    ]);

    if (shouldSave) {
        const saved = await saveToIndexFile(metadata);
        if (saved) {
            console.log('🎉 Success! Your journey metadata has been added to index.json\n');
            
            // Offer to generate the full journey JSON
            const { generateFullJourney } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'generateFullJourney',
                    message: '🚀 Generate the full journey JSON file now?',
                    default: true
                }
            ]);

            if (generateFullJourney) {
                // Get additional context for journey generation
                const { journeyPrompt } = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'journeyPrompt',
                        message: 'Describe the journey flow (pages, questions, etc.):',
                        default: `Create a ${metadata.name} journey with appropriate pages and form fields`,
                        validate: (input: string) => {
                            if (input.trim().length === 0) {
                                return 'Please enter a description';
                            }
                            return true;
                        }
                    }
                ]);

                // Generate the full journey
                const journey = await generateJourney({
                    id: metadata.id,
                    name: metadata.name,
                    description: metadata.description,
                    prompt: journeyPrompt,
                    department: metadata.department
                });

                if (journey) {
                    displayJourney(journey);

                    // Show full JSON
                    console.log('📄 Full Journey JSON:');
                    console.log(JSON.stringify(journey, null, 2));
                    console.log('');

                    // Ask to save
                    const { saveJourney } = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'saveJourney',
                            message: 'Save this journey to file?',
                            default: true
                        }
                    ]);

                    if (saveJourney) {
                        const journeySaved = await saveJourneyToFile(journey);
                        if (journeySaved) {
                            console.log('🎉 Complete! Your journey is ready to use.\n');
                            console.log('💡 Next steps:');
                            console.log('   1. Review the generated journey JSON');
                            console.log('   2. Test your journey in the UI');
                            console.log(`   3. Navigate to: http://localhost:5173/${metadata.departmentSlug}/${metadata.slug}/apply\n`);
                        } else {
                            console.log('⚠️  Journey file already exists. Please delete it first or use a different ID.\n');
                        }
                    } else {
                        console.log('📋 Journey not saved. You can copy the JSON above manually.\n');
                    }
                } else {
                    console.error('❌ Failed to generate journey\n');
                }
            } else {
                console.log('\n💡 Next steps:');
                console.log('   1. Create the actual journey JSON file in static/journeys/');
                console.log(`   2. Use: npm run generate:ai "${metadata.name}"`);
                console.log('   3. Test your journey in the UI\n');
            }
        }
    } else {
        console.log('📋 Metadata not saved. You can copy the JSON above manually.\n');
    }
}

main();
