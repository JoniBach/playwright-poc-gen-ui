#!/usr/bin/env node
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

interface PreflightResult {
    success: boolean;
    errors: string[];
    warnings: string[];
}

async function runPreflight(): Promise<PreflightResult> {
    const result: PreflightResult = {
        success: true,
        errors: [],
        warnings: []
    };

    console.log('🔍 Running preflight checks...\n');

    // Check 1: Environment variables
    console.log('📋 Checking environment variables...');
    
    if (!process.env.OPENAI_API_KEY) {
        result.errors.push('OPENAI_API_KEY is not set in .env file');
        result.success = false;
    } else {
        console.log('  ✅ OPENAI_API_KEY is set');
    }

    if (!process.env.OPENAI_MODEL) {
        result.warnings.push('OPENAI_MODEL not set, will use default: gpt-4o-2024-08-06');
        console.log('  ⚠️  OPENAI_MODEL not set (will use default)');
    } else {
        console.log(`  ✅ OPENAI_MODEL is set: ${process.env.OPENAI_MODEL}`);
    }

    if (!process.env.OPENAI_ORG_ID) {
        result.warnings.push('OPENAI_ORG_ID not set');
        console.log('  ⚠️  OPENAI_ORG_ID not set (optional)');
    } else {
        console.log(`  ✅ OPENAI_ORG_ID is set: ${process.env.OPENAI_ORG_ID}`);
    }

    // Check 2: API Key format
    if (process.env.OPENAI_API_KEY) {
        console.log('\n🔑 Validating API key format...');
        if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
            result.errors.push('OPENAI_API_KEY does not appear to be valid (should start with "sk-")');
            result.success = false;
            console.log('  ❌ Invalid API key format');
        } else {
            console.log('  ✅ API key format looks valid');
        }
    }

    // Check 3: Model compatibility
    if (process.env.OPENAI_MODEL) {
        console.log('\n🤖 Checking model compatibility...');
        const model = process.env.OPENAI_MODEL;
        const compatibleModels = [
            'gpt-4o-2024-08-06',
            'gpt-4o-2024-11-20',
            'gpt-4o-mini-2024-07-18'
        ];
        
        if (!compatibleModels.some(m => model.includes(m.split('-').slice(0, 2).join('-')))) {
            result.warnings.push(`Model ${model} may not support structured outputs. Recommended: gpt-4o-2024-08-06 or later`);
            console.log(`  ⚠️  Model may not support structured outputs`);
        } else {
            console.log('  ✅ Model supports structured outputs');
        }
    }

    // Check 4: Test API connection
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
        console.log('\n🌐 Testing API connection...');
        try {
            const client = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
                organization: process.env.OPENAI_ORG_ID,
            });

            // Make a minimal API call to verify connection
            await client.models.list();
            console.log('  ✅ Successfully connected to OpenAI API');
        } catch (error) {
            if (error instanceof Error) {
                result.errors.push(`Failed to connect to OpenAI API: ${error.message}`);
                result.success = false;
                console.log(`  ❌ Connection failed: ${error.message}`);
            }
        }
    }

    // Check 5: Dependencies
    console.log('\n📦 Checking dependencies...');
    try {
        await import('zod');
        console.log('  ✅ zod is installed');
    } catch {
        result.errors.push('zod package is not installed');
        result.success = false;
        console.log('  ❌ zod is not installed');
    }

    try {
        await import('inquirer');
        console.log('  ✅ inquirer is installed');
    } catch {
        result.errors.push('inquirer package is not installed');
        result.success = false;
        console.log('  ❌ inquirer is not installed');
    }

    // Summary
    console.log('\n' + '═'.repeat(50));
    if (result.success) {
        console.log('✅ All preflight checks passed!');
        if (result.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            result.warnings.forEach(w => console.log(`  - ${w}`));
        }
    } else {
        console.log('❌ Preflight checks failed!');
        console.log('\n🚨 Errors:');
        result.errors.forEach(e => console.log(`  - ${e}`));
        
        if (result.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            result.warnings.forEach(w => console.log(`  - ${w}`));
        }
        
        console.log('\n💡 To fix:');
        console.log('  1. Create a .env file in the project root');
        console.log('  2. Add your OpenAI API key: OPENAI_API_KEY=sk-...');
        console.log('  3. Optionally set OPENAI_MODEL and OPENAI_ORG_ID');
        console.log('  4. Run: npm install');
    }
    console.log('═'.repeat(50) + '\n');

    return result;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runPreflight().then(result => {
        process.exit(result.success ? 0 : 1);
    });
}

export { runPreflight };
