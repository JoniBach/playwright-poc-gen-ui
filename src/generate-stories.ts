#!/usr/bin/env node

/**
 * CLI tool to generate user stories and acceptance criteria from journey configurations
 * 
 * Usage:
 *   npm run generate-stories -- --journey=passport-apply
 *   npm run generate-stories -- --all
 *   npm run generate-stories -- --journey=passport-apply --format=markdown --output=stories/
 */

import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { JourneySchema } from '../../playwright-poc-ui/src/lib/schemas/journey.schema.js';
import { analyzeJourney } from './shared/journey-analyzer.js';
import { generateUserStories } from './shared/story-generator.js';
import {
	formatAsMarkdown,
	formatAsGherkin,
	formatAsJSON,
	formatAsCSV,
	formatAsPlaywrightStubs,
	formatAsConsole
} from './shared/story-formatter.js';
import { generatePlaywrightTestsSimple } from './shared/playwright-test-generator-simple.js';

interface CLIOptions {
	journey?: string;
	all?: boolean;
	format?: 'markdown' | 'gherkin' | 'json' | 'csv' | 'playwright' | 'playwright-full';
	output?: string;
	openaiKey?: string;
	model?: string;
	verbose?: boolean;
	testStyle?: 'simple' | 'realistic' | 'adaptive';
	skipStories?: boolean;
}

function parseArgs(): CLIOptions {
	const args = process.argv.slice(2);
	const options: CLIOptions = {
		format: 'markdown',
		verbose: false,
		testStyle: 'adaptive'
	};

	args.forEach(arg => {
		if (arg.startsWith('--journey=')) {
			options.journey = arg.split('=')[1];
		} else if (arg === '--all') {
			options.all = true;
		} else if (arg.startsWith('--format=')) {
			options.format = arg.split('=')[1] as CLIOptions['format'];
		} else if (arg.startsWith('--output=')) {
			options.output = arg.split('=')[1];
		} else if (arg.startsWith('--openai-key=')) {
			options.openaiKey = arg.split('=')[1];
		} else if (arg.startsWith('--model=')) {
			options.model = arg.split('=')[1];
		} else if (arg.startsWith('--test-style=')) {
			options.testStyle = arg.split('=')[1] as CLIOptions['testStyle'];
		} else if (arg === '--skip-stories') {
			options.skipStories = true;
		} else if (arg === '--verbose' || arg === '-v') {
			options.verbose = true;
		}
	});

	return options;
}

function printUsage() {
	console.log(`
Usage: npm run generate-stories -- [options]

Options:
  --journey=<id>        Generate stories for a specific journey
  --all                 Generate stories for all journeys
  --format=<format>     Output format: markdown, gherkin, json, csv, playwright (default: markdown)
  --output=<dir>        Output directory (default: console output)
  --openai-key=<key>    OpenAI API key (or set OPENAI_API_KEY env var)
  --model=<model>       OpenAI model (default: gpt-4o-mini)
  --verbose, -v         Verbose output

Examples:
  npm run generate-stories -- --journey=passport-apply
  npm run generate-stories -- --all --format=markdown --output=stories/
  npm run generate-stories -- --journey=visa-apply --format=playwright --output=tests/
  npm run generate-stories -- --journey=passport-apply --openai-key=sk-xxx
`);
}

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
	journeysPath: string,
	options: CLIOptions
): Promise<void> {
	if (options.verbose) {
		console.log(`\n📖 Processing journey: ${journeyId}`);
	}

	// Load journey
	const journey = await loadJourney(journeyId, journeysPath);

	// Tier 1: Analyze journey
	if (options.verbose) {
		console.log('   🔍 Analyzing journey structure...');
	}
	const analysis = analyzeJourney(journey, journeyId);

	if (options.verbose) {
		console.log(`   ✓ Found ${analysis.statistics.totalPages} pages, ${analysis.statistics.totalComponents} components`);
		console.log(`   ✓ Identified ${analysis.validationRules.length} validation rules`);
		console.log(`   ✓ Detected ${analysis.userFlows.length} user flows`);
	}

	// Tier 2: Generate stories with AI (or deterministic fallback)
	let stories: JourneyStories;
	if (options.skipStories) {
		if (options.verbose) {
			console.log('   ⏭️  Skipping story generation (--skip-stories flag)');
		}
		// Create minimal stories object for test generation
		stories = {
			journeyId: journeyId,
			journeyTitle: analysis.journeyName || journeyId,
			summary: {
				totalStories: 1,
				totalAcceptanceCriteria: 1,
				totalTestScenarios: 1
			},
			stories: [{
				id: `${journeyId}-test-story`,
				title: `Test Story for ${journeyId}`,
				description: `Automated test story for ${journeyId}`,
				acceptanceCriteria: [{
					id: 'test-ac-1',
					description: 'Test acceptance criteria',
					priority: 'high' as const,
					tags: ['automation']
				}],
				testScenarios: [{
					id: 'test-scenario-1',
					title: 'Test scenario',
					given: 'User is on the journey start page',
					when: 'User completes the journey',
					then: 'Journey completes successfully',
					priority: 'high' as const,
					tags: ['end-to-end']
				}],
				complexity: 'medium' as const,
				pages: analysis.pages.map(p => p.id),
				tags: ['generated']
			}]
		};
	} else {
		if (options.verbose) {
			console.log('   🤖 Generating user stories...');
		}
		stories = await generateUserStories(analysis, {
			openaiApiKey: options.openaiKey || process.env.OPENAI_API_KEY,
			model: options.model,
			includeTestScenarios: true
		});

		if (options.verbose) {
			console.log(`   ✓ Generated ${stories.summary.totalStories} stories`);
			console.log(`   ✓ Created ${stories.summary.totalAcceptanceCriteria} acceptance criteria`);
			console.log(`   ✓ Prepared ${stories.summary.totalTestScenarios} test scenarios`);
		}
	}

	// Format output
	let output: string;
	let fileExtension: string;

	switch (options.format) {
		case 'gherkin':
			output = formatAsGherkin(stories);
			fileExtension = 'feature';
			break;
		case 'json':
			output = formatAsJSON(stories);
			fileExtension = 'json';
			break;
		case 'csv':
			output = formatAsCSV(stories);
			fileExtension = 'csv';
			break;
		case 'playwright':
			output = formatAsPlaywrightStubs(stories);
			fileExtension = 'spec.ts';
			break;
		case 'playwright-full':
			// Generate complete working Playwright tests using adaptive blocks
			output = generatePlaywrightTestsSimple(analysis, stories, journey);
			fileExtension = 'spec.ts';
			break;
		case 'markdown':
		default:
			output = formatAsMarkdown(stories);
			fileExtension = 'md';
			break;
	}

	// Write output
	if (options.output) {
		// Default to QA project's tests directory for playwright-full format, stories for others
		let outputDir: string;
		if (options.output.startsWith('/') || options.output.startsWith('.')) {
			outputDir = resolve(options.output);
		} else {
			// Relative path - put in QA project
			const defaultDir = options.format === 'playwright-full' ? 'tests' : 'stories';
			outputDir = resolve(process.cwd(), `../playwright-poc-qa/${defaultDir}`, options.output);
		}
		
		if (!existsSync(outputDir)) {
			mkdirSync(outputDir, { recursive: true });
		}

		const outputFile = join(outputDir, `${journeyId}.${fileExtension}`);
		writeFileSync(outputFile, output, 'utf-8');
		console.log(`   ✅ Saved to: ${outputFile}`);
	} else {
		// Console output
		console.log(formatAsConsole(stories));
		if (!options.verbose) {
			console.log('\n💡 Tip: Use --output=<dir> to save to files');
			console.log('💡 Tip: Use --format=playwright to generate test stubs');
		}
	}
}

async function main() {
	const options = parseArgs();

	// Show usage if no options provided
	if (!options.journey && !options.all) {
		printUsage();
		process.exit(0);
	}

	// Set up log capture
	const logLines: string[] = [];
	const originalLog = console.log;
	const originalError = console.error;
	
	console.log = (...args: any[]) => {
		const message = args.join(' ');
		logLines.push(message);
		originalLog(...args);
	};
	
	console.error = (...args: any[]) => {
		const message = 'ERROR: ' + args.join(' ');
		logLines.push(message);
		originalError(...args);
	};

	console.log('🚀 Story Generator - Tier 1 & 2');
	console.log('═══════════════════════════════════════════════════════════════');

	const journeysPath = resolve(process.cwd(), '../playwright-poc-ui/static/journeys');

	if (!existsSync(journeysPath)) {
		console.error(`❌ Journeys directory not found: ${journeysPath}`);
		process.exit(1);
	}

	try {
		if (options.all) {
			// Generate for all journeys
			const journeyIds = getAllJourneyIds(journeysPath);
			console.log(`\n📚 Processing ${journeyIds.length} journeys...\n`);

			for (const journeyId of journeyIds) {
				await generateStoriesForJourney(journeyId, journeysPath, options);
			}

			console.log('\n✅ All journeys processed successfully!');
		} else if (options.journey) {
			// Generate for single journey
			await generateStoriesForJourney(options.journey, journeysPath, options);
		}

		console.log('\n═══════════════════════════════════════════════════════════════');
		console.log('✨ Story generation complete!');
		
		if (!process.env.OPENAI_API_KEY && !options.openaiKey) {
			console.log('\n💡 Tip: Set OPENAI_API_KEY environment variable for AI-enhanced stories');
			console.log('   (Currently using deterministic generation)');
		}

	} catch (error) {
		console.error('\n❌ Error:', error instanceof Error ? error.message : error);
		if (options.verbose && error instanceof Error) {
			console.error('\nStack trace:', error.stack);
		}
		
		// Restore console functions before saving log
		console.log = originalLog;
		console.error = originalError;
		
		// Save log file even on error
		saveLogFile(logLines, options);
		
		process.exit(1);
	}
	
	// Restore console functions
	console.log = originalLog;
	console.error = originalError;
	
	// Save log file
	saveLogFile(logLines, options);
}

function saveLogFile(logLines: string[], options: CLIOptions) {
	try {
		// Create logs directory in QA project
		const logsDir = resolve(process.cwd(), '../playwright-poc-qa/logs/story-generation');
		if (!existsSync(logsDir)) {
			mkdirSync(logsDir, { recursive: true });
		}
		
		// Generate timestamp filename
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
		const journeyPart = options.journey ? `-${options.journey}` : '-all';
		const logFile = join(logsDir, `story-generation${journeyPart}-${timestamp}.log`);
		
		// Add metadata header
		const logContent = [
			'═══════════════════════════════════════════════════════════════',
			'Story Generation Log',
			'═══════════════════════════════════════════════════════════════',
			`Timestamp: ${new Date().toISOString()}`,
			`Journey: ${options.journey || 'all'}`,
			`Format: ${options.format || 'markdown'}`,
			`Output: ${options.output || 'console'}`,
			`OpenAI: ${process.env.OPENAI_API_KEY ? 'enabled' : 'disabled'}`,
			'═══════════════════════════════════════════════════════════════',
			'',
			...logLines,
			'',
			'═══════════════════════════════════════════════════════════════',
			`Log saved: ${new Date().toISOString()}`,
			'═══════════════════════════════════════════════════════════════'
		].join('\n');
		
		writeFileSync(logFile, logContent, 'utf-8');
		console.log(`\n📋 Log saved to: ${logFile}`);
	} catch (error) {
		console.error('Failed to save log file:', error);
	}
}

main();
