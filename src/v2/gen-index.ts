// The purpose of this file is to run the initial generation stage of building and creating the index file for the journey generator

import { z } from 'zod';
import { openaiUtil } from './openai-util.js';
import { Logger } from './logger.js';

// Get logger instance
const logger = Logger.getInstance();

// Define a simple test schema for demonstration
const TestSchema = z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    priority: z.enum(['low', 'medium', 'high']),
});

export async function genIndex() {
    logger.info('Testing OpenAI Utility in Gen Index...');

    try {
        // Check if OpenAI is ready
        const isReady = await openaiUtil.isReady();
        if (!isReady) {
            logger.error('OpenAI utility is not ready. Please check your configuration.');
            return;
        }

        logger.success('OpenAI utility is ready!');

        // Test structured output generation
        const testPrompt = 'Create a summary for a contact form journey with the following details: title should be "Contact Us Form", description should explain it collects basic contact information, tags should include "contact", "form", and "communication", and set priority to high.';

        const result = await openaiUtil.generateStructuredOutput({
            schema: TestSchema,
            prompt: testPrompt,
            systemMessage: 'You are a helpful assistant that generates structured data for journey configuration. Always respond with valid JSON that matches the required schema.',
            temperature: 0.1
        });

        if (result) {
            logger.info('Generated Test Output:');
            logger.info(`  Title: ${result.title}`);
            logger.info(`  Description: ${result.description}`);
            logger.info(`  Tags: ${result.tags.join(', ')}`);
            logger.info(`  Priority: ${result.priority}`);

            logger.success('OpenAI utility test completed successfully!');
        } else {
            logger.error('Failed to generate structured output');
        }

    } catch (error) {
        logger.error('Error during OpenAI utility test:', error);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    genIndex().catch(console.error);
}
