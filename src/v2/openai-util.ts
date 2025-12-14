import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import dotenv from 'dotenv';

// Import sophisticated logger from separate utility
import { Logger } from './logger.js';

// Load environment variables
dotenv.config();

// Get logger instance
const logger = Logger.getInstance();

interface PreflightResult {
    success: boolean;
    errors: string[];
    warnings: string[];
}

interface StructuredOutputOptions<T extends z.ZodTypeAny> {
    schema: T;
    prompt: string;
    systemMessage?: string;
    model?: string;
    temperature?: number;
}

export class OpenAIUtil {
    private client: OpenAI | null = null;
    private preflightResult: PreflightResult | null = null;

    /**
     * Run preflight checks to ensure OpenAI is properly configured
     */
    async runPreflight(): Promise<PreflightResult> {
        if (this.preflightResult) {
            return this.preflightResult;
        }

        const result: PreflightResult = {
            success: true,
            errors: [],
            warnings: []
        };

        logger.info('Running OpenAI preflight checks...');


        // Check 1: Environment variables
        logger.info('Checking environment variables...');

        if (!process.env.OPENAI_API_KEY) {
            result.errors.push('OPENAI_API_KEY is not set in .env file');
            result.success = false;
        } else {
            logger.info('OPENAI_API_KEY is set');
        }

        if (!process.env.OPENAI_MODEL) {
            result.warnings.push('OPENAI_MODEL not set, will use default: gpt-4o-2024-08-06');
            logger.warn('OPENAI_MODEL not set (will use default)');
        } else {
            logger.info(`OPENAI_MODEL is set: ${process.env.OPENAI_MODEL}`);
        }

        if (!process.env.OPENAI_ORG_ID) {
            result.warnings.push('OPENAI_ORG_ID not set');
            logger.warn('OPENAI_ORG_ID not set (optional)');
        } else {
            logger.info(`OPENAI_ORG_ID is set: ${process.env.OPENAI_ORG_ID}`);
        }

        // Check 2: API Key format
        if (process.env.OPENAI_API_KEY) {
            logger.info('Validating API key format...');
            if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
                result.errors.push('OPENAI_API_KEY does not appear to be valid (should start with "sk-")');
                result.success = false;
                logger.error('Invalid API key format');
            } else {
                logger.info('API key format looks valid');
            }
        }

        // Check 3: Model compatibility
        if (process.env.OPENAI_MODEL) {
            logger.info('Checking model compatibility...');
            const model = process.env.OPENAI_MODEL;
            const compatibleModels = [
                'gpt-4o-2024-08-06',
                'gpt-4o-2024-11-20',
                'gpt-4o-mini-2024-07-18'
            ];

            if (!compatibleModels.some(m => model.includes(m.split('-').slice(0, 2).join('-')))) {
                result.warnings.push(`Model ${model} may not support structured outputs. Recommended: gpt-4o-2024-08-06 or later`);
                logger.warn('Model may not support structured outputs');
            } else {
                logger.info('Model supports structured outputs');
            }
        }

        // Check 4: Test API connection
        if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
            logger.info('Testing API connection...');
            try {
                const testClient = new OpenAI({
                    apiKey: process.env.OPENAI_API_KEY,
                    organization: process.env.OPENAI_ORG_ID,
                });

                // Make a minimal API call to verify connection
                await testClient.models.list();
                logger.success('Successfully connected to OpenAI API');

                // Initialize client if connection successful
                this.client = testClient;
            } catch (error) {
                if (error instanceof Error) {
                    result.errors.push(`Failed to connect to OpenAI API: ${error.message}`);
                    result.success = false;
                    logger.error(`Connection failed: ${error.message}`);
                }
            }
        }

        // Check 5: Dependencies
        logger.info('Checking dependencies...');
        try {
            await import('zod');
            logger.info('zod is installed');
        } catch {
            result.errors.push('zod package is not installed');
            result.success = false;
            logger.error('zod is not installed');
        }

        // Summary
        logger.info('═'.repeat(50));
        if (result.success) {
            logger.success('All preflight checks passed!');
            if (result.warnings.length > 0) {
                logger.warn('Warnings:');
                result.warnings.forEach(w => logger.warn(`  - ${w}`));
            }
        } else {
            logger.error('Preflight checks failed!');
            logger.error('Errors:');
            result.errors.forEach(e => logger.error(`  - ${e}`));

            if (result.warnings.length > 0) {
                logger.warn('Warnings:');
                result.warnings.forEach(w => logger.warn(`  - ${w}`));
            }

            logger.info('To fix:');
            logger.info('  1. Create a .env file in the project root');
            logger.info('  2. Add your OpenAI API key: OPENAI_API_KEY=sk-...');
            logger.info('  3. Optionally set OPENAI_MODEL and OPENAI_ORG_ID');
            logger.info('  4. Run: npm install');
        }
        logger.info('═'.repeat(50));

        this.preflightResult = result;
        return result;
    }

    /**
     * Generate structured output using OpenAI with Zod schema validation
     */
    async generateStructuredOutput<T extends z.ZodTypeAny>(
        options: StructuredOutputOptions<T>
    ): Promise<z.infer<T> | null> {
        // Ensure preflight checks have been run
        if (!this.preflightResult) {
            const preflight = await this.runPreflight();
            if (!preflight.success) {
                throw new Error('Preflight checks failed. Please fix configuration issues before proceeding.');
            }
        }

        if (!this.client) {
            throw new Error('OpenAI client not initialized. Run preflight checks first.');
        }

        const {
            schema,
            prompt,
            systemMessage = 'You are a helpful assistant that generates structured data.',
            model = process.env.OPENAI_MODEL || 'gpt-4o-2024-08-06',
            temperature = 0.1
        } = options;

        logger.info('Generating structured output...');
        logger.info(`Prompt: "${prompt}"`);

        try {
            const completion = await this.client.beta.chat.completions.parse({
                model,
                temperature,
                messages: [
                    {
                        role: 'system',
                        content: systemMessage
                    },
                    {
                        role: 'user',
                        content: prompt
                    },
                ],
                response_format: zodResponseFormat(schema, 'structured_output'),
            });

            const message = completion.choices[0]?.message;

            if (message?.parsed) {
                logger.success('Successfully generated structured output!');
                return message.parsed;
            } else if (message?.refusal) {
                logger.error('Request was refused:', message.refusal);
                return null;
            } else {
                logger.error('No response received');
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

    /**
     * Check if the utility is ready to use
     */
    async isReady(): Promise<boolean> {
        if (!this.preflightResult) {
            await this.runPreflight();
        }
        return this.preflightResult?.success ?? false;
    }
}

// Export singleton instance for easy use across the application
export const openaiUtil = new OpenAIUtil();
