#!/usr/bin/env node

import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { JourneySchema } from '../../playwright-poc-ui/src/lib/schemas/journey.schema.js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import inquirer from 'inquirer';
import { validateAndRepair, displayValidationErrors } from './repair-journey.js';

/**
 * AI-powered journey generator using Zod schemas
 * Generates complete government service journeys from simple prompts
 */

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Core questions for journey generation
const questions = [
  {
    type: 'input',
    name: 'serviceName',
    message: 'What government service do you want to create?',
    validate: input => input.length > 0 || 'Service name is required'
  },
  {
    type: 'input', 
    name: 'description',
    message: 'Describe what this service does (1-2 sentences):',
    validate: input => input.length > 0 || 'Description is required'
  },
  {
    type: 'list',
    name: 'department',
    message: 'Which department runs this service?',
    choices: [
      'Department for Work and Pensions (DWP)',
      'HM Revenue and Customs (HMRC)',
      'Driver and Vehicle Licensing Agency (DVLA)',
      'Home Office',
      'Ministry of Justice (MOJ)',
      'Department for Education (DfE)',
      'National Health Service (NHS)',
      'HM Passport Office',
      'HM Courts & Tribunals Service (HMCTS)'
    ]
  },
  {
    type: 'list',
    name: 'serviceType', 
    message: 'What type of service is this?',
    choices: [
      { name: 'Application/Form submission (data-entry)', value: 'data-entry' },
      { name: 'Check/lookup existing information (data-lookup)', value: 'data-lookup' }
    ]
  }
];

function generateIndexEntry(answers) {
  const name = answers.serviceName;
  const id = name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');
  
  const departmentSlug = answers.department.toLowerCase()
    .replace(/\([^)]*\)/g, '') // Remove abbreviations like (DWP)
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .trim();
  
  return {
    id,
    name,
    description: answers.description,
    slug: id,
    department: answers.department,
    departmentSlug,
    type: answers.serviceType,
    enabled: true
  };
}

async function generateJourney(answers, indexEntry) {
  console.log(`🤖 Generating journey: ${answers.serviceName}`);
  
  const prompt = `Create a complete UK government service journey for "${answers.serviceName}".

Service Details:
- Name: ${answers.serviceName}
- Description: ${answers.description}
- Department: ${answers.department}
- Department Slug: ${indexEntry.departmentSlug}
- Journey ID: ${indexEntry.id}
- Type: ${answers.serviceType}

CRITICAL: The landingPage.startButtonHref MUST be exactly: "/${indexEntry.departmentSlug}/${indexEntry.id}/apply"

Requirements:
- Follow GOV.UK design patterns
- Include appropriate form fields for this type of service
- Create a logical flow from start to completion
- Include validation and error handling
- Use appropriate component types (textInput, radios, dateInput, etc.)
- Include a landing page, form pages, check answers, and confirmation
- Make it realistic and user-friendly

Component Guidelines:
- For text content components (paragraph, heading, insetText), use "text" property
- For details and warningText components, use "text" property (not "content")
- For summaryList with cards, use "card: true" for simple styling
- For summaryList, add a "title" property for the card heading
- For table components, use "headers" array for column names
- For input widths, use values: "2", "5", "10", "20", "30", or "full"
- DO NOT generate button components - navigation is automatic via nextPage/previousPage
- Always include check-answers and confirmation pages`;

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-2024-08-06',
    messages: [
      {
        role: "system",
        content: `You are a UK government service designer expert in GOV.UK design patterns. 
        Create complete user journeys that follow government digital service standards.
        
        Return ONLY valid JSON matching the journey schema. No markdown, no explanations.
        
        CRITICAL URL REQUIREMENT:
        The landingPage.startButtonHref MUST be exactly: "/${indexEntry.departmentSlug}/${indexEntry.id}/apply"
        This is provided in the user prompt. Use it EXACTLY as specified.
        
        IMPORTANT Component Property Guidelines:
        - Use "text" property for: paragraph, heading, insetText, details, warningText
        - Use "content" property for: panel, notificationBanner (alternative to text)
        - For summaryList: use "card: true" for simple cards, add "title" for card heading
        - For table: use "headers" array for column names, "rows" as array of objects
        - Input width values: "2", "5", "10", "20", "30", "full"
        - DO NOT generate button components - navigation is automatic via nextPage/previousPage
        - Always create check-answers and confirmation pages
        
        CRITICAL: Do not add button components to pages. The journey system automatically 
        handles navigation using the nextPage and previousPage properties on each page.
        
        Ensure all components use the correct props and structure.
        Make the journey realistic and appropriate for the service type.`
      },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Failed to generate journey: No content returned');
  }

  let journey;
  try {
    journey = JSON.parse(content);
  } catch (e) {
    throw new Error('Failed to parse journey JSON: ' + e.message);
  }

  // Post-process: Fix startButtonHref if AI generated it incorrectly
  // This MUST happen before validation since the schema will reject incorrect URLs
  if (journey.landingPage && journey.landingPage.startButtonHref) {
    const correctHref = `/${indexEntry.departmentSlug}/${indexEntry.id}/apply`;
    if (journey.landingPage.startButtonHref !== correctHref) {
      console.log(`⚠️  Fixing incorrect startButtonHref: "${journey.landingPage.startButtonHref}" → "${correctHref}"`);
      journey.landingPage.startButtonHref = correctHref;
    }
  }

  // Remove button components if AI generated them (they shouldn't exist)
  if (journey.pages) {
    Object.keys(journey.pages).forEach(pageId => {
      const page = journey.pages[pageId];
      if (page.components) {
        const originalLength = page.components.length;
        page.components = page.components.filter(c => c.type !== 'button');
        if (page.components.length < originalLength) {
          console.log(`⚠️  Removed ${originalLength - page.components.length} button component(s) from page: ${pageId}`);
        }
      }
    });
  }

  // Now validate the fixed journey
  const validationResult = JourneySchema.safeParse(journey);
  if (!validationResult.success) {
    console.warn('⚠️  Journey validation failed after post-processing. Errors:', validationResult.error.errors);
    // Return the journey anyway - the main validation loop will catch it
  }

  return journey;
}

function saveJourney(journey, indexEntry) {
  // Save journey file to main UI project
  const journeyPath = join(process.cwd(), '../playwright-poc-ui/static/journeys', `${journey.id}.json`);
  writeFileSync(journeyPath, JSON.stringify(journey, null, 2));
  console.log(`📁 Journey saved: ${journeyPath}`);
  
  // Update index in main UI project
  const indexPath = join(process.cwd(), '../playwright-poc-ui/static/journeys/index.json');
  const index = JSON.parse(readFileSync(indexPath, 'utf-8'));
  
  // Check if journey already exists
  const existingIndex = index.journeys.findIndex(j => j.id === indexEntry.id);
  if (existingIndex >= 0) {
    index.journeys[existingIndex] = indexEntry;
    console.log(`📝 Updated existing index entry: ${indexEntry.id}`);
  } else {
    index.journeys.push(indexEntry);
    console.log(`➕ Added new index entry: ${indexEntry.id}`);
  }
  
  writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`📁 Index updated: ${indexPath}`);
}

async function main() {
  console.log('🎯 AI Journey Generator');
  console.log('========================\n');
  
  // Check for OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable is required');
    console.log('Set it with: export OPENAI_API_KEY="your-key-here"');
    process.exit(1);
  }
  
  try {
    // Get user input
    const answers = await inquirer.prompt(questions);
    
    console.log('\n📋 Summary:');
    console.log(`Service: ${answers.serviceName}`);
    console.log(`Department: ${answers.department}`);
    console.log(`Type: ${answers.serviceType}`);
    console.log(`Description: ${answers.description}\n`);
    
    // Generate index entry
    const indexEntry = generateIndexEntry(answers);
    
    // Generate journey with AI
    let journey = await generateJourney(answers, indexEntry);
    
    // Validate the generated journey
    console.log('\n🔍 Validating generated journey...');
    const validationResult = JourneySchema.safeParse(journey);
    
    if (!validationResult.success) {
      // Validation failed - show errors and offer repair
      console.log('\n⚠️  Generated journey has validation errors!');
      displayValidationErrors(validationResult.error);
      
      // Ask user if they want to attempt repair
      const repairChoice = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '🔧 Attempt AI-powered repair (recommended)', value: 'repair' },
            { name: '💾 Save anyway (may cause runtime errors)', value: 'save' },
            { name: '❌ Cancel and exit', value: 'cancel' }
          ]
        }
      ]);
      
      if (repairChoice.action === 'cancel') {
        console.log('\n❌ Journey generation cancelled.');
        process.exit(0);
      }
      
      if (repairChoice.action === 'repair') {
        console.log('\n🔧 Attempting AI-powered repair...');
        const repairResult = await validateAndRepair(journey, 3);
        
        if (repairResult.success) {
          console.log(`\n✅ Journey repaired successfully after ${repairResult.attemptsUsed} attempt(s)!`);
          journey = repairResult.journey;
        } else {
          console.log('\n❌ Repair failed after maximum attempts.');
          displayValidationErrors(repairResult.zodError);
          
          const finalChoice = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'saveAnyway',
              message: 'Save the journey anyway? (may cause runtime errors)',
              default: false
            }
          ]);
          
          if (!finalChoice.saveAnyway) {
            console.log('\n❌ Journey generation cancelled.');
            process.exit(1);
          }
          
          journey = repairResult.lastAttempt;
        }
      }
    } else {
      console.log('✅ Journey validation passed!');
    }
    
    console.log(`📊 Pages: ${Object.keys(journey.pages).length}`);
    console.log(`🏷️  ID: ${journey.id}`);
    
    // Save files
    saveJourney(journey, indexEntry);
    
    console.log('\n🎉 Journey generation complete!');
    console.log(`🌐 View at: http://localhost:5173/${indexEntry.departmentSlug}/${indexEntry.slug}/apply`);
    
  } catch (error) {
    console.error('❌ Generation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateJourney, generateIndexEntry };
