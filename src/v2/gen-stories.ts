// The purpose of this file is to take the index and the journey files and generate the user stories

import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import boxen from 'boxen';
import { Logger } from './logger.js';

// Import the actual story generation logic
import { JourneySchema } from './schemas/journey.js';
import { analyzeJourney } from '../shared/journey-analyzer.js';
import { generateUserStories } from '../shared/story-generator.js';
import {
	formatAsMarkdown,
	formatAsGherkin,
	formatAsJSON,
	formatAsCSV,
	formatAsPlaywrightStubs,
	formatAsConsole
} from '../shared/story-formatter.js';

const logger = Logger.getInstance();

// Helper functions for story generation
async function loadJourney(journeyId: string, journeysPath: string): Promise<any> {
	const journeyFile = join(journeysPath, `${journeyId}.json`);

	if (!existsSync(journeyFile)) {
		throw new Error(`Journey file not found: ${journeyFile}`);
	}

	const content = readFileSync(journeyFile, 'utf-8');
	const journey = JSON.parse(content);

	// Validate against schema
	const result = JourneySchema.safeParse(journey);
	if (!result.success) {
		throw new Error(`Invalid journey configuration: ${result.error.message}`);
	}

	return result.data;
}

function getAllJourneyIds(journeysPath: string): string[] {
	const files = readdirSync(journeysPath);
	return files
		.filter(f => f.endsWith('.json') && f !== 'index.json')
		.map(f => f.replace('.json', ''));
}

async function generateStoriesForJourney(
	journeyId: string,
	format: string,
	output: string,
	skipStories: boolean
): Promise<void> {
	if (!logger) {
		console.log(`\n📖 Processing journey: ${journeyId}`);
	}

	// Load journey
	const journeysPath = resolve(process.cwd(), '../playwright-poc-ui/static/journeys');
	const journey = await loadJourney(journeyId, journeysPath);

	// Tier 1: Analyze journey
	if (!logger) {
		console.log('   🔍 Analyzing journey structure...');
	}
	const analysis = analyzeJourney(journey, journeyId);

	if (!logger) {
		console.log(`   ✓ Found ${analysis.statistics.totalPages} pages, ${analysis.statistics.totalComponents} components`);
		console.log(`   ✓ Identified ${analysis.validationRules.length} validation rules`);
		console.log(`   ✓ Detected ${analysis.userFlows.length} user flows`);
	}

	// Tier 2: Generate stories with AI (or deterministic fallback)
	let stories: any;
	if (skipStories) {
		if (!logger) {
			console.log('   ⏭️  Skipping story generation (--skip-stories flag)');
		}
		// Create minimal stories object for test generation
		stories = {
			journeyId: journeyId,
			journeyTitle: analysis.metadata.title || journeyId,
			journeyDescription: analysis.metadata.description,
			generatedAt: new Date().toISOString(),
			totalPages: analysis.statistics.totalPages,
			totalComponents: analysis.statistics.totalComponents,
			summary: {
				totalStories: 1,
				totalAcceptanceCriteria: 1,
				totalTestScenarios: 1,
				complexityBreakdown: { 'medium': 1 },
				componentCoverage: {}
			},
			stories: [{
				id: `${journeyId}-test-story`,
				journeyId: journeyId,
				title: `Test Story for ${journeyId}`,
				asA: 'User',
				iWant: 'to complete the journey',
				soThat: 'I can submit my application',
				description: `Automated test story for ${journeyId}`,
				acceptanceCriteria: [{
					given: 'User is on the journey start page',
					when: 'User completes the journey',
					then: 'Journey completes successfully',
					priority: 'must' as const,
					testable: true,
					tags: ['automation']
				}],
				testScenarios: [{
					id: 'test-scenario-1',
					title: 'Test scenario',
					description: 'Basic test scenario for the journey',
					steps: [
						'Navigate to journey start page',
						'Complete all required fields',
						'Submit the journey'
					],
					expectedResult: 'Journey completes successfully',
					pageIds: analysis.pages.map((p: any) => p.id),
					componentTypes: Object.keys(analysis.statistics.componentTypeBreakdown),
					priority: 'high' as const,
					tags: ['end-to-end']
				}],
				pages: analysis.pages.map((p: any) => p.id),
				components: Object.entries(analysis.statistics.componentTypeBreakdown).map(([type, count]) => ({
					type,
					count
				})),
				estimatedComplexity: 'medium' as const,
				tags: ['generated']
			}]
		};
	} else {
		if (!logger) {
			console.log('   🤖 Generating user stories...');
		}
		stories = await generateUserStories(analysis, {
			openaiApiKey: process.env.OPENAI_API_KEY,
			model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
			includeTestScenarios: true
		});

		if (!logger) {
			console.log(`   ✓ Generated ${stories.summary.totalStories} stories`);
			console.log(`   ✓ Created ${stories.summary.totalAcceptanceCriteria} acceptance criteria`);
			console.log(`   ✓ Prepared ${stories.summary.totalTestScenarios} test scenarios`);
		}
	}

	// Format output
	let outputContent: string;
	let fileExtension: string;

	switch (format) {
		case 'gherkin':
			outputContent = formatAsGherkin(stories);
			fileExtension = 'feature';
			break;
		case 'json':
			outputContent = formatAsJSON(stories);
			fileExtension = 'json';
			break;
		case 'csv':
			outputContent = formatAsCSV(stories);
			fileExtension = 'csv';
			break;
		case 'playwright':
			outputContent = formatAsPlaywrightStubs(stories);
			fileExtension = 'spec.ts';
			break;
		case 'markdown':
		default:
			outputContent = formatAsMarkdown(stories);
			fileExtension = 'md';
			break;
	}

	// Write output
	if (output) {
		// Default to QA project's stories directory if output is relative
		let outputDir: string;
		if (output.startsWith('/') || output.startsWith('.')) {
			outputDir = resolve(output);
		} else {
			// Relative path - put in QA project
			outputDir = resolve(process.cwd(), '../playwright-poc-qa/stories', output);
		}

		if (!existsSync(outputDir)) {
			mkdirSync(outputDir, { recursive: true });
		}

		const outputFile = join(outputDir, `${journeyId}.${fileExtension}`);
		writeFileSync(outputFile, outputContent, 'utf-8');
		console.log(`   ✅ Saved to: ${outputFile}`);
	} else {
		// Console output
		console.log(formatAsConsole(stories));
		if (!logger) {
			console.log('\n💡 Tip: Use --output=<dir> to save to files');
		}
	}
}

export async function genStories() {
    console.log(chalk.bold.blue('📖 Story Generation - Tier 1 & 2'));
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Check if journeys exist
    const journeysPath = resolve(process.cwd(), '../playwright-poc-ui/static/journeys');
    if (!existsSync(journeysPath)) {
        throw new Error(`Journeys directory not found: ${journeysPath}`);
    }

    const journeyFiles = readdirSync(journeysPath)
        .filter(f => f.endsWith('.json') && f !== 'index.json')
        .map(f => f.replace('.json', ''));

    if (journeyFiles.length === 0) {
        console.log(chalk.yellow('⚠️  No journey files found. Please generate some journeys first.'));
        return;
    }

    console.log(`📚 Found ${journeyFiles.length} journeys\n`);

    // Interactive selection - simplified to only journey selection and format
    const answers: {
        journey: string;
        format: string;
    } = await inquirer.prompt([
        {
            type: 'list',
            name: 'journey',
            message: 'Select a journey:',
            choices: journeyFiles.map(j => ({ name: j, value: j }))
        },
        {
            type: 'list',
            name: 'format',
            message: 'Select output format:',
            choices: [
                { name: '📊 JSON - Structured data format', value: 'json' },
                { name: '📝 Markdown - Rich documentation format', value: 'markdown' },
                { name: '🥒 Gherkin - BDD feature files', value: 'gherkin' },
                { name: '🧪 Playwright - Test stubs for automation', value: 'playwright' },
                { name: '📈 CSV - Spreadsheet/Jira import', value: 'csv' }
            ],
            default: 'json'
        }
    ]);

    // Show simplified summary
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    Generation Summary                         ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log(`\n📄 Journey: ${answers.journey}`);
    console.log(`📝 Format: ${answers.format}`);
    console.log(`📁 Output: playwright-poc-qa/stories/${answers.format}/`);
    
    // Execute generation directly without confirmation
    console.log('\n🚀 Starting story generation...\n');

    try {
        // Generate for single journey with default settings
        // Always use deterministic generation (no AI)
        const outputDir = answers.format;
        const skipAI = true;
        
        await generateStoriesForJourney(answers.journey, answers.format, outputDir, skipAI);
        
        console.log('\n✨ Story generation complete!\n');
    } catch (error) {
        console.error('\n❌ Story generation failed\n');
        throw error;
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    genStories().catch(console.error);
}

