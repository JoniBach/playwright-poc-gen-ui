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

CRITICAL REQUIREMENTS:

1. **Page ID Naming Convention:**
   - Use kebab-case for all page IDs (e.g., "applicant-details", "check-your-answers")
   - The check your answers page MUST be named "check-your-answers" (not "check-answers")
   - The completion page should be named "confirmation"

2. **Required Journey Properties:**
   - id: string (kebab-case)
   - name: string (human-readable)
   - checkYourAnswersPage: "check-your-answers" (MUST be this exact value)
   - completionPage: "confirmation"
   - startPage: string (first page ID)
   - pages: object with all page definitions

3. **Validation Rules for ALL Input Fields:**
   Every textInput, email, tel, textarea, radios component MUST have:
   
   "validation": {
     "required": true,
     "minLength": number (for text fields),
     "maxLength": number (for text fields),
     "pattern": "email" | "phone" | "postcode" (for pattern validation),
     "errorMessages": {
       "required": "Enter [field name]",
       "pattern": "Enter [field name] in the correct format, like [example]",
       "minLength": "[Field name] must be at least [N] characters",
       "maxLength": "[Field name] must be [N] characters or less"
     }
   }

4. **Error Message Style (GOV.UK Guidelines):**
   - Start with imperative verb: "Enter", "Select", "Choose"
   - Be specific and helpful
   - Include examples where appropriate
   - Example: "Enter an email address in the correct format, like name@example.com"

5. **Component Requirements:**
   - Every input component MUST have: id, props.id, props.name, props.label
   - Use consistent naming: id = props.id = props.name (all kebab-case)
   - Add helpful hints where appropriate
   - Use appropriate autocomplete attributes

6. **Component Naming:**
   - ALL IDs must use kebab-case (e.g., "applicant-full-name")
   - props.id MUST match component.id
   - props.name MUST match component.id
   - NO camelCase (e.g., "applicantFullName" is WRONG)

7. **Check Your Answers Page:**
   MUST be structured exactly like this:
   "check-your-answers": {
     "id": "check-your-answers",
     "title": "Check your answers",
     "components": [
       {
         "type": "heading",
         "id": "cya-heading",
         "props": {
           "text": "Check your answers before submitting",
           "size": "l"
         }
       }
     ],
     "nextPage": "confirmation"
   }

VALIDATION EXAMPLES:

**Text Input:**
{
  "type": "textInput",
  "id": "full-name",
  "props": {
    "id": "full-name",
    "name": "full-name",
    "label": "Full name",
    "type": "text",
    "autocomplete": "name"
  },
  "validation": {
    "required": true,
    "minLength": 2,
    "maxLength": 100,
    "errorMessages": {
      "required": "Enter your full name",
      "minLength": "Full name must be at least 2 characters",
      "maxLength": "Full name must be 100 characters or less"
    }
  }
}

**Email Input:**
{
  "type": "textInput",
  "id": "email-address",
  "props": {
    "id": "email-address",
    "name": "email-address",
    "label": "Email address",
    "type": "email",
    "autocomplete": "email"
  },
  "validation": {
    "required": true,
    "pattern": "email",
    "maxLength": 255,
    "errorMessages": {
      "required": "Enter your email address",
      "pattern": "Enter an email address in the correct format, like name@example.com",
      "maxLength": "Email address must be 255 characters or less"
    }
  }
}

**Radios:**
{
  "type": "radios",
  "id": "applicant-type",
  "props": {
    "id": "applicant-type",
    "name": "applicant-type",
    "legend": "Who is applying?",
    "items": [
      {"value": "individual", "text": "An individual"},
      {"value": "organisation", "text": "A company or organisation"}
    ]
  },
  "validation": {
    "required": true,
    "errorMessages": {
      "required": "Select who is applying"
    }
  }
}

Generate journeys that pass validation and work with the API!`,
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
