#!/usr/bin/env node

import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { JourneySchema } from '../../playwright-poc-ui/src/lib/schemas/journey.schema.js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import inquirer from 'inquirer';

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

async function generateJourney(answers) {
  console.log(`🤖 Generating journey: ${answers.serviceName}`);
  
  const prompt = `Create a complete UK government service journey for "${answers.serviceName}".

Service Details:
- Name: ${answers.serviceName}
- Description: ${answers.description}
- Department: ${answers.department}
- Type: ${answers.serviceType}

Requirements:
- Follow GOV.UK design patterns
- Include appropriate form fields for this type of service
- Create a logical flow from start to completion
- Include validation and error handling
- Use appropriate component types (textInput, radios, dateInput, etc.)
- Include a landing page, form pages, check answers, and confirmation
- Make it realistic and user-friendly`;

  const completion = await client.beta.chat.completions.parse({
    model: 'gpt-4o-2024-08-06',
    messages: [
      {
        role: "system",
        content: `You are a UK government service designer expert in GOV.UK design patterns. 
        Create complete user journeys that follow government digital service standards.
        Ensure all components use the correct props and structure.
        Make the journey realistic and appropriate for the service type.`
      },
      { role: "user", content: prompt }
    ],
    response_format: zodResponseFormat(JourneySchema, 'governmentJourney')
  });

  const journey = completion.choices[0]?.message?.parsed;
  if (!journey) {
    throw new Error('Failed to generate journey: ' + completion.choices[0]?.message?.refusal);
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
    const journey = await generateJourney(answers);
    
    // Validate the generated journey
    console.log('✅ Journey generated and validated successfully!');
    console.log(`📊 Pages: ${Object.keys(journey.pages).length}`);
    console.log(`🏷️  ID: ${journey.id}`);
    
    // Save files
    saveJourney(journey, indexEntry);
    
    console.log('\n🎉 Journey generation complete!');
    console.log(`🌐 View at: http://localhost:5173/${indexEntry.departmentSlug}/${indexEntry.slug}`);
    
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
