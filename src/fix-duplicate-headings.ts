#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { validateJourney, autoFixJourney } from './shared/journey-validator.js';
import type { JourneyJson } from './shared/journey-generator.js';

/**
 * Auto-fix duplicate headings in all journey files
 */

async function fixAllJourneys() {
  console.log('🔧 Auto-fixing duplicate headings in journey files');
  console.log('='.repeat(50));
  console.log('');

  const journeysDir = join(process.cwd(), '../playwright-poc-ui/static/journeys');
  
  try {
    const files = readdirSync(journeysDir)
      .filter(file => file.endsWith('.json') && file !== 'index.json');
    
    console.log(`📁 Found ${files.length} journey files\n`);
    
    let totalFixed = 0;
    let totalChanges = 0;
    
    for (const file of files) {
      const journeyId = file.replace('.json', '');
      const filePath = join(journeysDir, file);
      
      try {
        // Load journey
        const content = readFileSync(filePath, 'utf-8');
        const journey: JourneyJson = JSON.parse(content);
        
        // Validate to see if there are issues
        const validationResult = validateJourney(journey);
        const hasDuplicateHeadings = validationResult.errors.some(
          err => err.message.includes('duplicates the page title')
        );
        
        if (!hasDuplicateHeadings) {
          console.log(`✅ ${journeyId}: No duplicate headings`);
          continue;
        }
        
        // Apply auto-fix
        const { fixed, changes } = autoFixJourney(journey);
        
        if (changes.length > 0) {
          // Write fixed journey back to file
          writeFileSync(filePath, JSON.stringify(fixed, null, 2) + '\n', 'utf-8');
          
          console.log(`🔧 ${journeyId}: Fixed ${changes.length} issue(s)`);
          changes.forEach(change => {
            console.log(`   - ${change}`);
          });
          console.log('');
          
          totalFixed++;
          totalChanges += changes.length;
        }
        
      } catch (error) {
        console.error(`❌ Failed to fix ${file}:`, error instanceof Error ? error.message : error);
      }
    }
    
    console.log('='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`Journeys processed: ${files.length}`);
    console.log(`Journeys fixed: ${totalFixed}`);
    console.log(`Total changes: ${totalChanges}`);
    console.log('');
    
    if (totalFixed > 0) {
      console.log('✅ Auto-fix complete! All duplicate headings have been removed.');
      console.log('💡 Refresh your browser to see the updated validation status.');
    } else {
      console.log('✅ No fixes needed - all journeys are already clean!');
    }
    
  } catch (error) {
    console.error('❌ Failed to process journeys:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if called directly
fixAllJourneys().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
