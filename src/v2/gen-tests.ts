// The purpose of this file is to generate the tests using the generated stories, journeys and index record

import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { execSync } from 'node:child_process';
import { Logger } from './logger.js';

const logger = Logger.getInstance();

export async function genTests() {
    console.log(chalk.bold.blue('🧪 Test Generation - Tier 3'));
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

    // Interactive selection
    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
                { name: '🧪 Generate tests for a single journey', value: 'single' },
                { name: '🧪 Generate tests for multiple journeys', value: 'multiple' },
                { name: '🧪 Generate tests for ALL journeys', value: 'all' }
            ]
        },
        {
            type: 'list',
            name: 'journey',
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
        }
    ]);

    // Build command arguments
    let command = 'npm run generate:tests -- --skip-stories --output=generated';

    // Add journey selection
    if (answers.action === 'all') {
        command += ' --all';
    } else if (answers.action === 'single') {
        command += ` --journey=${answers.journey}`;
    } else if (answers.action === 'multiple') {
        // For multiple journeys, run them sequentially
        console.log('\n🚀 Starting test generation...\n');
        for (const journey of answers.journeys) {
            let journeyCommand = `npm run generate:tests -- --skip-stories --journey=${journey} --output=generated`;
            console.log(`\n🧪 Processing: ${journey}`);

            try {
                execSync(journeyCommand, {
                    stdio: 'inherit',
                    cwd: process.cwd()
                });
                console.log(`✅ ${journey} tests generated`);
            } catch (error) {
                console.error(`❌ ${journey} test generation failed`);
            }
        }
        console.log('\n✨ All journey tests processed!\n');
        return;
    }

    // Show summary
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    Test Generation Summary                    ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log(`\n📋 Action: ${answers.action === 'all' ? 'All journeys' : 'Selected journey'}`);
    if (answers.action === 'single') {
        console.log(`📄 Journey: ${answers.journey}`);
    }
    console.log(`📖 Stories: Generated fresh`);

    const { confirm } = await inquirer.prompt({
        type: 'confirm',
        name: 'confirm',
        message: '\nProceed with test generation?',
        default: true
    });

    if (!confirm) {
        console.log('\n❌ Test generation cancelled\n');
        return;
    }

    // Execute command
    console.log('\n🚀 Starting test generation...\n');
    console.log(`Running: ${command}\n`);

    try {
        execSync(command, {
            stdio: 'inherit',
            cwd: process.cwd()
        });
        console.log('\n✨ Test generation complete!\n');
        console.log(chalk.yellow('💡 Note: Generated tests may contain TODO markers for form field values'));
        console.log(chalk.yellow('   Fill in the TODOs and customize the tests for your specific needs\n'));
    } catch (error) {
        console.error('\n❌ Test generation failed\n');
        throw error;
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    genTests().catch(console.error);
}

