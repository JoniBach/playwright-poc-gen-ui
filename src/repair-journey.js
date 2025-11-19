#!/usr/bin/env node

import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { JourneySchema } from '../../playwright-poc-ui/src/lib/schemas/journey.schema.js';

/**
 * AI-powered journey repair utility
 * Takes invalid journey JSON and Zod validation errors, sends to OpenAI to fix
 */

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Attempt to repair an invalid journey using AI
 * @param {object} invalidJourney - The journey object that failed validation
 * @param {object} zodError - The Zod validation error object
 * @param {number} attemptNumber - Current repair attempt number
 * @returns {Promise<object>} - Repaired journey object
 */
export async function repairJourney(invalidJourney, zodError, attemptNumber = 1) {
  console.log(`\n🔧 Repair Attempt ${attemptNumber}/3`);
  console.log('Sending to AI for repair...\n');

  // Format Zod errors into a readable string
  const errorDetails = formatZodErrors(zodError);

  const repairPrompt = `The following journey JSON failed Zod schema validation. Please fix ALL the errors and return a valid journey.

VALIDATION ERRORS:
${errorDetails}

INVALID JOURNEY JSON:
${JSON.stringify(invalidJourney, null, 2)}

INSTRUCTIONS:
1. Carefully read each validation error
2. Fix the corresponding issues in the JSON
3. Ensure ALL required fields are present
4. Ensure ALL field types match the schema
5. Maintain the original intent and structure where possible
6. Return a complete, valid journey that passes schema validation

Common fixes needed:
- Use "text" property for paragraph, heading, insetText, details, warningText components
- Use "card: true" (boolean) for simple summaryList cards
- Add "title" property to summaryList when using cards
- Use "headers" array for table components
- Ensure all pages referenced in nextPage/previousPage exist
- Include check-answers and confirmation pages if referenced
- Use valid width values: "2", "5", "10", "20", "30", "full"`;

  try {
    const completion = await client.beta.chat.completions.parse({
      model: process.env.OPENAI_MODEL || 'gpt-4o-2024-08-06',
      messages: [
        {
          role: "system",
          content: `You are an expert at fixing JSON schema validation errors. 
          You carefully analyze Zod validation errors and fix the corresponding issues in the JSON.
          You always return valid, complete JSON that passes all schema validations.
          You preserve the original intent and content while fixing structural issues.`
        },
        { role: "user", content: repairPrompt }
      ],
      response_format: zodResponseFormat(JourneySchema, 'repairedJourney'),
      temperature: 0.3 // Lower temperature for more consistent repairs
    });

    const repairedJourney = completion.choices[0]?.message?.parsed;
    
    if (!repairedJourney) {
      throw new Error('AI repair failed: ' + completion.choices[0]?.message?.refusal);
    }

    console.log('✅ AI successfully repaired the journey!');
    return repairedJourney;

  } catch (error) {
    console.error(`❌ Repair attempt ${attemptNumber} failed:`, error.message);
    throw error;
  }
}

/**
 * Format Zod errors into a human-readable string for the AI
 * @param {object} zodError - Zod validation error
 * @returns {string} - Formatted error message
 */
function formatZodErrors(zodError) {
  if (!zodError.errors || zodError.errors.length === 0) {
    return zodError.message || 'Unknown validation error';
  }

  const errorLines = zodError.errors.map((err, index) => {
    const path = err.path.join(' → ');
    const message = err.message;
    const received = err.received ? ` (received: ${err.received})` : '';
    const expected = err.expected ? ` (expected: ${err.expected})` : '';
    
    return `${index + 1}. Path: ${path}
   Error: ${message}${expected}${received}
   Code: ${err.code}`;
  });

  return errorLines.join('\n\n');
}

/**
 * Validate a journey and attempt repairs if needed
 * @param {object} journey - Journey object to validate
 * @param {number} maxAttempts - Maximum number of repair attempts
 * @returns {Promise<{success: boolean, journey?: object, error?: string}>}
 */
export async function validateAndRepair(journey, maxAttempts = 3) {
  let currentJourney = journey;
  let attemptNumber = 0;

  while (attemptNumber < maxAttempts) {
    attemptNumber++;

    // Try to validate
    const validationResult = JourneySchema.safeParse(currentJourney);

    if (validationResult.success) {
      return {
        success: true,
        journey: validationResult.data,
        attemptsUsed: attemptNumber
      };
    }

    // Validation failed
    console.log(`\n⚠️  Validation failed (Attempt ${attemptNumber}/${maxAttempts})`);
    
    if (attemptNumber >= maxAttempts) {
      return {
        success: false,
        error: 'Maximum repair attempts reached',
        zodError: validationResult.error,
        lastAttempt: currentJourney
      };
    }

    // Attempt repair
    try {
      currentJourney = await repairJourney(
        currentJourney,
        validationResult.error,
        attemptNumber
      );
    } catch (repairError) {
      return {
        success: false,
        error: `Repair failed: ${repairError.message}`,
        zodError: validationResult.error,
        lastAttempt: currentJourney
      };
    }
  }

  return {
    success: false,
    error: 'Unexpected error in validation loop'
  };
}

/**
 * Display validation errors in a user-friendly format
 * @param {object} zodError - Zod validation error
 */
export function displayValidationErrors(zodError) {
  console.log('\n❌ VALIDATION ERRORS:\n');
  console.log('═'.repeat(60));
  
  if (!zodError.errors || zodError.errors.length === 0) {
    console.log(zodError.message || 'Unknown validation error');
    return;
  }

  zodError.errors.forEach((err, index) => {
    console.log(`\n${index + 1}. ${err.message}`);
    console.log(`   Path: ${err.path.join(' → ')}`);
    if (err.expected) console.log(`   Expected: ${err.expected}`);
    if (err.received) console.log(`   Received: ${err.received}`);
    console.log(`   Code: ${err.code}`);
  });

  console.log('\n' + '═'.repeat(60));
}

export default {
  repairJourney,
  validateAndRepair,
  displayValidationErrors,
  formatZodErrors
};
