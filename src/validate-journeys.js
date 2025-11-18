#!/usr/bin/env node

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { validateAllJourneys, formatValidationResults } from '../../playwright-poc-ui/src/lib/utils/journey-validator.js';

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
    // Load all journeys and index
    const journeys = await loadAllJourneys();
    const journeyIndex = await loadJourneyIndex();
    
    console.log(`📁 Loaded ${Object.keys(journeys).length} journey files`);
    
    // Validate everything
    const result = validateAllJourneys(journeys, journeyIndex);
    
    // Output formatted results
    console.log('\n' + formatValidationResults(result));
    
    // Exit with appropriate code for CI/CD
    process.exit(result.isValid ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { loadAllJourneys, loadJourneyIndex };
