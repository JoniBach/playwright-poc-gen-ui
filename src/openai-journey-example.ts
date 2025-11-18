import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import dotenv from 'dotenv';
import inquirer from 'inquirer';
import { runPreflight } from './preflight.js';

// Load environment variables
dotenv.config();

// Define a simplified journey schema for demonstration
const ComponentSchema = z.object({
    type: z.enum(['heading', 'paragraph', 'textInput', 'radios', 'button']),
    id: z.string(),
    props: z.record(z.any()), // Simplified for example
});

const PageSchema = z.object({
    id: z.string(),
    title: z.string(),
    components: z.array(ComponentSchema),
});

const JourneySchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    startPage: z.string(),
    pages: z.array(PageSchema),
});

async function generateJourney(prompt: string) {
    const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        organization: process.env.OPENAI_ORG_ID,
    });

    console.log('🚀 Generating journey from prompt...\n');
    console.log(`📝 Prompt: "${prompt}"\n`);

    try {
        const completion = await client.beta.chat.completions.parse({
            model: process.env.OPENAI_MODEL || 'gpt-4o-2024-08-06',
            messages: [
                {
                    role: 'system',
                    content: `You are a GOV.UK journey designer. Create user journeys following GOV.UK design patterns.
                    
Each journey should have:
- A unique ID (kebab-case)
- A clear name and description
- Multiple pages with components
- Proper navigation flow

Available component types:
- heading: Page titles and section headers
- paragraph: Informational text
- textInput: Text input fields
- radios: Radio button groups
- button: Navigation buttons`,
                },
                { 
                    role: 'user', 
                    content: prompt 
                },
            ],
            response_format: zodResponseFormat(JourneySchema, 'journey'),
        });

        const message = completion.choices[0]?.message;
        
        if (message?.parsed) {
            console.log('✅ Successfully generated journey!\n');
            console.log('📋 Journey Details:');
            console.log(`  ID: ${message.parsed.id}`);
            console.log(`  Name: ${message.parsed.name}`);
            console.log(`  Description: ${message.parsed.description}`);
            console.log(`  Start Page: ${message.parsed.startPage}`);
            console.log(`  Pages: ${message.parsed.pages.length}\n`);
            
            message.parsed.pages.forEach((page, index) => {
                console.log(`  Page ${index + 1}: ${page.title} (${page.id})`);
                console.log(`    Components: ${page.components.length}`);
                page.components.forEach(comp => {
                    console.log(`      - ${comp.type}: ${comp.id}`);
                });
                console.log('');
            });

            // Output the full JSON
            console.log('📄 Full Journey JSON:');
            console.log(JSON.stringify(message.parsed, null, 2));
            
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

// Main execution
async function main() {
    // Run preflight checks
    const preflightResult = await runPreflight();
    
    if (!preflightResult.success) {
        console.error('\n❌ Preflight checks failed. Please fix the errors above before continuing.\n');
        process.exit(1);
    }

    console.log('🚀 Starting journey generation...\n');

    // Get prompt from CLI argument or prompt user
    let prompt: string;
    
    if (process.argv[2]) {
        prompt = process.argv.slice(2).join(' ');
        console.log(`📝 Using prompt from command line: "${prompt}"\n`);
    } else {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'prompt',
                message: 'Describe the journey you want to create:',
                default: 'Create a simple contact form journey with name, email, and message fields',
                validate: (input: string) => {
                    if (input.trim().length === 0) {
                        return 'Please enter a prompt';
                    }
                    return true;
                }
            },
            {
                type: 'confirm',
                name: 'confirm',
                message: 'Proceed with generation?',
                default: true
            }
        ]);

        if (!answers.confirm) {
            console.log('❌ Generation cancelled');
            process.exit(0);
        }

        prompt = answers.prompt;
    }

    await generateJourney(prompt);
}

main();
