#!/usr/bin/env node

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { validateJourney, displayValidationResults, autoFixJourney } from './shared/journey-validator.ts';

/**
 * Validate all journey files against Zod schemas
 * Useful for CI/CD and development workflow
 */

async function loadAllJourneys() {
  const journeysDir = join(process.cwd(), '../playwright-poc-ui/static/journeys');
  const journeys = {};
  
  try {
    const files = readdirSync(journeysDir)
      .filter(file => file.endsWith('.json') && file !== 'index.json');
    
    for (const file of files) {
      const journeyId = file.replace('.json', '');
      try {
        const content = readFileSync(join(journeysDir, file), 'utf-8');
        journeys[journeyId] = JSON.parse(content);
      } catch (error) {
        console.error(`❌ Failed to load ${file}:`, error.message);
      }
    }
    
    return journeys;
  } catch (error) {
    console.error('❌ Failed to read journeys directory:', error.message);
    return {};
  }
}

async function loadJourneyIndex() {
  try {
    const indexPath = join(process.cwd(), '../playwright-poc-ui/static/journeys/index.json');
    const content = readFileSync(indexPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ Failed to load journey index:', error.message);
    return null;
  }
}

async function main() {
  console.log('🔍 Journey Validation');
  console.log('=====================\n');
  
  try {
    // Load all journeys
    const journeys = await loadAllJourneys();
    
    console.log(`📁 Loaded ${Object.keys(journeys).length} journey files\n`);
    
    let allValid = true;
    let totalErrors = 0;
    let totalWarnings = 0;
    
    // Validate each journey
    for (const [journeyId, journey] of Object.entries(journeys)) {
      console.log(`\n📋 Validating: ${journeyId}`);
      console.log('─'.repeat(50));
      
      const result = validateJourney(journey);
      displayValidationResults(result, journeyId);
      
      if (!result.valid) {
        allValid = false;
        totalErrors += result.errors.length;
      }
      totalWarnings += result.warnings.length;
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Journeys: ${Object.keys(journeys).length}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Total Warnings: ${totalWarnings}`);
    
    if (allValid) {
      console.log('\n✅ All journeys passed validation!');
    } else {
      console.log('\n❌ Some journeys have validation errors.');
    }
    
    // Exit with appropriate code for CI/CD
    process.exit(allValid ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { loadAllJourneys, loadJourneyIndex };
