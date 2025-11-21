#!/usr/bin/env node

/**
 * Interactive CLI for story generation
 * Provides a user-friendly menu interface for generating user stories
 */

import 'dotenv/config';
import inquirer from 'inquirer';
import { readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

interface MenuAnswers {
	action: 'single' | 'multiple' | 'all' | 'exit';
	journeys?: string[];
	format: 'markdown' | 'gherkin' | 'json' | 'csv' | 'playwright';
	outputLocation: 'default' | 'custom';
	customOutput?: string;
	verbose: boolean;
	aiEnabled: boolean;
}

async function main() {
	console.log('\n╔═══════════════════════════════════════════════════════════════╗');
	console.log('║         🚀 Story Generator - Interactive CLI                 ║');
	console.log('║         Tier 1 & 2: AI-Enhanced Story Generation             ║');
	console.log('╚═══════════════════════════════════════════════════════════════╝\n');

	// Check for OpenAI API key
	const hasApiKey = !!process.env.OPENAI_API_KEY;
	if (hasApiKey) {
		console.log('✅ OpenAI API key detected - AI-enhanced generation available');
	} else {
		console.log('⚠️  No OpenAI API key - will use deterministic generation');
		console.log('   Set OPENAI_API_KEY in .env for AI-enhanced stories\n');
	}

	// Get available journeys
	const journeysPath = resolve(process.cwd(), '../playwright-poc-ui/static/journeys');
	if (!existsSync(journeysPath)) {
		console.error('❌ Journeys directory not found:', journeysPath);
		process.exit(1);
	}

	const journeyFiles = readdirSync(journeysPath)
		.filter(f => f.endsWith('.json') && f !== 'index.json')
		.map(f => f.replace('.json', ''))
		.sort();

	console.log(`📚 Found ${journeyFiles.length} journeys\n`);

	// Main menu
	const answers = await inquirer.prompt<MenuAnswers>([
		{
			type: 'list',
			name: 'action',
			message: 'What would you like to do?',
			choices: [
				{ name: '📄 Generate stories for a single journey', value: 'single' },
				{ name: '📚 Generate stories for multiple journeys', value: 'multiple' },
				{ name: '🌍 Generate stories for ALL journeys', value: 'all' },
				{ name: '❌ Exit', value: 'exit' }
			]
		},
		{
			type: 'list',
			name: 'journeys',
			message: 'Select a journey:',
			choices: journeyFiles.map(j => ({ name: j, value: j })),
			when: (answers) => answers.action === 'single'
		},
		{
			type: 'checkbox',
			name: 'journeys',
			message: 'Select journeys (use space to select, enter to confirm):',
			choices: journeyFiles.map(j => ({ name: j, value: j })),
			when: (answers) => answers.action === 'multiple',
			validate: (input) => {
				if (input.length === 0) {
					return 'Please select at least one journey';
				}
				return true;
			}
		},
		{
			type: 'list',
			name: 'format',
			message: 'Select output format:',
			choices: [
				{ name: '📝 Markdown - Rich documentation format', value: 'markdown' },
				{ name: '🥒 Gherkin - BDD feature files', value: 'gherkin' },
				{ name: '🧪 Playwright - Test stubs for automation', value: 'playwright' },
				{ name: '📊 JSON - Structured data format', value: 'json' },
				{ name: '📈 CSV - Spreadsheet/Jira import', value: 'csv' }
			],
			when: (answers) => answers.action !== 'exit'
		},
		{
			type: 'list',
			name: 'outputLocation',
			message: 'Where should the files be saved?',
			choices: [
				{ 
					name: '📁 Default (playwright-poc-qa/stories/[format])', 
					value: 'default' 
				},
				{ 
					name: '📂 Custom directory', 
					value: 'custom' 
				}
			],
			when: (answers) => answers.action !== 'exit'
		},
		{
			type: 'input',
			name: 'customOutput',
			message: 'Enter custom output directory (relative to playwright-poc-qa):',
			when: (answers) => answers.outputLocation === 'custom',
			validate: (input) => {
				if (!input || input.trim() === '') {
					return 'Please enter a directory path';
				}
				return true;
			}
		},
		{
			type: 'confirm',
			name: 'verbose',
			message: 'Enable verbose output (show detailed progress)?',
			default: true,
			when: (answers) => answers.action !== 'exit'
		},
		{
			type: 'confirm',
			name: 'aiEnabled',
			message: hasApiKey 
				? 'Use AI-enhanced generation (recommended)?' 
				: 'Use deterministic generation?',
			default: hasApiKey,
			when: (answers) => answers.action !== 'exit'
		}
	]);

	if (answers.action === 'exit') {
		console.log('\n👋 Goodbye!\n');
		process.exit(0);
	}

	// Build command
	let command = 'npm run generate:stories --';

	// Add journey selection
	if (answers.action === 'all') {
		command += ' --all';
	} else if (answers.action === 'single' && answers.journeys) {
		command += ` --journey=${answers.journeys}`;
	} else if (answers.action === 'multiple' && answers.journeys) {
		// For multiple journeys, we'll run them sequentially
		console.log('\n🚀 Starting story generation...\n');
		for (const journey of answers.journeys) {
			await generateForJourney(journey, answers);
		}
		console.log('\n✨ All journeys processed!\n');
		return;
	}

	// Add format
	command += ` --format=${answers.format}`;

	// Add output location
	const outputPath = answers.outputLocation === 'custom' 
		? answers.customOutput 
		: answers.format;
	command += ` --output=${outputPath}`;

	// Add verbose flag
	if (answers.verbose) {
		command += ' --verbose';
	}

	// Show summary
	console.log('\n╔═══════════════════════════════════════════════════════════════╗');
	console.log('║                    Generation Summary                         ║');
	console.log('╚═══════════════════════════════════════════════════════════════╝');
	console.log(`\n📋 Action: ${answers.action === 'all' ? 'All journeys' : 'Selected journey(ies)'}`);
	if (answers.action === 'single') {
		console.log(`📄 Journey: ${answers.journeys}`);
	}
	console.log(`📝 Format: ${answers.format}`);
	console.log(`📁 Output: playwright-poc-qa/stories/${outputPath}/`);
	console.log(`🤖 AI: ${answers.aiEnabled ? 'Enabled' : 'Disabled'}`);
	console.log(`📊 Verbose: ${answers.verbose ? 'Yes' : 'No'}`);

	const { confirm } = await inquirer.prompt([
		{
			type: 'confirm',
			name: 'confirm',
			message: '\nProceed with generation?',
			default: true
		}
	]);

	if (!confirm) {
		console.log('\n❌ Generation cancelled\n');
		process.exit(0);
	}

	// Execute command
	console.log('\n🚀 Starting story generation...\n');
	console.log(`Running: ${command}\n`);
	
	try {
		execSync(command, { 
			stdio: 'inherit',
			cwd: process.cwd()
		});
		console.log('\n✨ Story generation complete!\n');
	} catch (error) {
		console.error('\n❌ Story generation failed\n');
		process.exit(1);
	}
}

async function generateForJourney(journey: string, answers: MenuAnswers) {
	const outputPath = answers.outputLocation === 'custom' 
		? answers.customOutput 
		: answers.format;
	
	let command = `npm run generate:stories -- --journey=${journey}`;
	command += ` --format=${answers.format}`;
	command += ` --output=${outputPath}`;
	if (answers.verbose) {
		command += ' --verbose';
	}

	console.log(`\n📖 Processing: ${journey}`);
	
	try {
		execSync(command, { 
			stdio: answers.verbose ? 'inherit' : 'pipe',
			cwd: process.cwd()
		});
		console.log(`✅ ${journey} complete`);
	} catch (error) {
		console.error(`❌ ${journey} failed`);
	}
}

// Run the interactive CLI
main().catch(error => {
	console.error('\n❌ Error:', error);
	process.exit(1);
});
