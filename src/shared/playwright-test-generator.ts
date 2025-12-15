import type { JourneyStories, TestScenario } from './user-story.schema.js';

// Journey config type (from journey schema)
type JourneyConfig = any; // Using any for now since journey structure varies

/**
 * Generate complete Playwright tests using Adaptive Blocks
 * This is Tier 3: Full test generation from journey configs and user stories
 */

export interface PlaywrightTestGeneratorOptions {
  useAdaptiveBlocks?: boolean;
  includeValidationTests?: boolean;
  includeEdgeCaseTests?: boolean;
  testStyle?: 'simple' | 'realistic' | 'adaptive';
}

/**
 * Generate complete Playwright test file from journey config and stories
 */
export function generatePlaywrightTests(
  journeyConfig: JourneyConfig,
  journeyStories: JourneyStories,
  options: PlaywrightTestGeneratorOptions = {}
): string {
  const {
    useAdaptiveBlocks = true,
    includeValidationTests = true,
    includeEdgeCaseTests = true,
    testStyle = 'adaptive'
  } = options;

  const lines: string[] = [];

  // Imports
  lines.push(`import { test, expect } from '../../fixtures/base.fixture';`);
  lines.push(`import { TestDataFactory } from '../../helpers/TestDataFactory';`);
  
  if (useAdaptiveBlocks) {
    lines.push(`import { JourneyBuilder } from '../../helpers/JourneyBuilder';`);
    lines.push(`import { AdaptiveBlocks } from '../../helpers/AdaptiveBlocks';`);
  }
  
  lines.push('');

  // File header
  lines.push(`/**`);
  lines.push(` * ${journeyStories.journeyTitle} - Generated Tests`);
  lines.push(` * `);
  lines.push(` * Generated from journey config: ${journeyConfig.id}`);
  lines.push(` * Generated at: ${new Date().toISOString()}`);
  lines.push(` * Test style: ${testStyle}`);
  lines.push(` * `);
  lines.push(` * Journey Structure:`);
  lines.push(` * - Pages: ${journeyConfig.pages.length}`);
  lines.push(` * - Total Components: ${journeyStories.totalComponents}`);
  lines.push(` * - User Stories: ${journeyStories.summary.totalStories}`);
  lines.push(` * - Test Scenarios: ${journeyStories.summary.totalTestScenarios}`);
  lines.push(` */`);
  lines.push('');

  // Test suite
  lines.push(`test.describe('${journeyStories.journeyTitle}', () => {`);
  lines.push(`  const JOURNEY_PATH = '${getJourneyPath(journeyConfig)}';`);
  lines.push('');

  // Generate happy path tests
  lines.push(`  test.describe('Happy Path Tests', () => {`);
  lines.push('');
  
  if (testStyle === 'adaptive') {
    lines.push(...generateAdaptiveHappyPathTest(journeyConfig, journeyStories));
  } else if (testStyle === 'realistic') {
    lines.push(...generateRealisticHappyPathTest(journeyConfig, journeyStories));
  } else {
    lines.push(...generateSimpleHappyPathTest(journeyConfig, journeyStories));
  }
  
  lines.push(`  });`);
  lines.push('');

  // Generate validation tests if requested
  if (includeValidationTests) {
    lines.push(`  test.describe('Validation Tests', () => {`);
    lines.push('');
    lines.push(...generateValidationTests(journeyConfig, testStyle));
    lines.push(`  });`);
    lines.push('');
  }

  // Generate edge case tests if requested
  if (includeEdgeCaseTests) {
    lines.push(`  test.describe('Edge Case Tests', () => {`);
    lines.push('');
    lines.push(...generateEdgeCaseTests(journeyConfig, testStyle));
    lines.push(`  });`);
    lines.push('');
  }

  lines.push(`});`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Get journey path from config
 */
function getJourneyPath(config: JourneyConfig): string {
  // Try to extract from config or construct from ID
  return config.startUrl || `/${config.id.replace(/-/g, '/')}`;
}

/**
 * Generate adaptive happy path test using AdaptiveBlocks
 */
function generateAdaptiveHappyPathTest(config: JourneyConfig, stories: JourneyStories): string[] {
  const lines: string[] = [];

  lines.push(`    test('should complete full journey using adaptive blocks @smoke @journey', async ({`);
  lines.push(`      page,`);
  lines.push(`      journeyRunner,`);
  lines.push(`      componentHelper`);
  lines.push(`    }) => {`);
  lines.push(`      const contactData = TestDataFactory.generateContactDetails();`);
  lines.push(`      const builder = new JourneyBuilder(page, journeyRunner, componentHelper);`);
  lines.push('');
  lines.push(`      await builder`);
  lines.push(`        // Start journey and detect patterns`);
  lines.push(`        .addCustomStep(async ({ journeyRunner }) => {`);
  lines.push(`          await journeyRunner.startJourney(JOURNEY_PATH);`);
  lines.push(`        })`);
  lines.push(`        .addStep(AdaptiveBlocks.detectAndLogPatterns())`);
  lines.push('');

  // Generate steps for each page
  const pages = config.pages || [];
  pages.forEach((page: any, index: number) => {
    const heading = extractHeading(page);
    const fields = extractFields(page);

    if (heading) {
      lines.push(`        // Step ${index + 1}: ${page.id}`);
      lines.push(`        .addCustomStep(async ({ page, journeyRunner }) => {`);
      lines.push(`          await journeyRunner.verifyHeading('${heading}');`);
      
      if (fields.length > 0) {
        // Group fields by type
        const radioFields = fields.filter(f => f.type === 'radios');
        const dateFields = fields.filter(f => f.type === 'dateInput' || f.label.toLowerCase().includes('date of birth'));
        const otherFields = fields.filter(f => f.type !== 'radios' && f.type !== 'dateInput' && !f.label.toLowerCase().includes('date of birth'));
        
        // Handle radio buttons with selectRadio
        radioFields.forEach(field => {
          // Use the first option text if available, otherwise use a default value
          if (field.options && field.options.length > 0) {
            const optionText = field.options[0].text;
            lines.push(`          await journeyRunner.selectRadio('${optionText}');`);
          } else {
            // Fallback for radio buttons without options
            lines.push(`          // No options found for radio button ${field.id}, using default value`);
            lines.push(`          await journeyRunner.selectRadio('Yes');`);
          }
        });
        
        // Handle date fields with special handling
        dateFields.forEach(field => {
          // Check if it's a date of birth field
          if (field.label.toLowerCase().includes('date of birth') || field.id.toLowerCase().includes('birth')) {
            lines.push(`          // Handle date of birth field`);
            // Try to detect if it's a GOV.UK date input component with separate day/month/year fields
            lines.push(`          try {`);
            lines.push(`            // First try to find separate day/month/year fields`);
            lines.push(`            const dayField = page.locator(\`#${field.id}-day, input[id*='-day']\`).first();`);
            lines.push(`            const monthField = page.locator(\`#${field.id}-month, input[id*='-month']\`).first();`);
            lines.push(`            const yearField = page.locator(\`#${field.id}-year, input[id*='-year']\`).first();`);
            lines.push(`            `);
            lines.push(`            // Check if the fields exist`);
            lines.push(`            const dayExists = await dayField.count() > 0;`);
            lines.push(`            `);
            lines.push(`            if (dayExists) {`);
            lines.push(`              // Fill the separate fields`);
            lines.push(`              await dayField.fill('01');`);
            lines.push(`              await monthField.fill('01');`);
            lines.push(`              await yearField.fill('2000');`);
            lines.push(`            } else {`);
            lines.push(`              // Fall back to single field`);
            lines.push(`              await page.locator('#${field.id}').fill('01 01 2000');`);
            lines.push(`            }`);
            lines.push(`          } catch (error) {`);
            lines.push(`            // If all else fails, try the standard approach`);
            lines.push(`            await journeyRunner.fillStep({`);
            lines.push(`              '${field.label}': '01 01 2000'`);
            lines.push(`            });`);
            lines.push(`          }`);
          } else {
            // Regular date field
            lines.push(`          // Fill date field`);
            lines.push(`          await journeyRunner.fillStep({`);
            lines.push(`            '${field.label}': '01 01 2024'`);
            lines.push(`          });`);
          }
        });
        
        // Handle other fields with fillStep
        if (otherFields.length > 0) {
          lines.push(`          await journeyRunner.fillStep({`);
          otherFields.forEach(field => {
            lines.push(`            '${field.label}': ${generateFieldValue(field)},`);
          });
          lines.push(`          });`);
        }
      }
      
      lines.push(`          await journeyRunner.continue();`);
      lines.push(`        })`);
    }
  });

  // Check answers page
  lines.push('');
  lines.push(`        // Check answers`);
  lines.push(`        .addStep(AdaptiveBlocks.checkAnswersAndSubmit('Check your answers'))`);
  lines.push('');
  lines.push(`        // Verify confirmation`);
  lines.push(`        .addCustomStep(async ({ journeyRunner }) => {`);
  lines.push(`          await journeyRunner.verifyHeading('Application submitted');`);
  lines.push(`        })`);
  lines.push('');
  lines.push(`        .execute();`);
  lines.push(`    });`);
  lines.push('');

  return lines;
}

/**
 * Generate realistic journey-specific test
 */
function generateRealisticHappyPathTest(config: JourneyConfig, stories: JourneyStories): string[] {
  const lines: string[] = [];

  lines.push(`    test('should complete full journey @smoke @journey', async ({`);
  lines.push(`      page,`);
  lines.push(`      journeyRunner`);
  lines.push(`    }) => {`);
  lines.push(`      const contactData = TestDataFactory.generateContactDetails();`);
  lines.push('');
  lines.push(`      await journeyRunner.startJourney(JOURNEY_PATH);`);
  lines.push('');

  // Generate steps for each page
  const pages = config.pages || [];
  pages.forEach((page: any, index: number) => {
    const heading = extractHeading(page);
    const fields = extractFields(page);

    if (heading) {
      lines.push(`      // Step ${index + 1}: ${page.id}`);
      lines.push(`      await journeyRunner.verifyHeading('${heading}');`);
      
      if (fields.length > 0) {
        lines.push(`      await journeyRunner.fillStep({`);
        fields.forEach(field => {
          lines.push(`        '${field.label}': ${generateFieldValue(field)},`);
        });
        lines.push(`      });`);
      }
      
      lines.push(`      await journeyRunner.continue();`);
      lines.push('');
    }
  });

  lines.push(`      // Check answers`);
  lines.push(`      await journeyRunner.verifyHeading('Check your answers');`);
  lines.push(`      await journeyRunner.submit();`);
  lines.push('');
  lines.push(`      // Verify confirmation`);
  lines.push(`      await journeyRunner.verifyHeading('Application submitted');`);
  lines.push(`    });`);
  lines.push('');

  return lines;
}

/**
 * Generate simple smoke test
 */
function generateSimpleHappyPathTest(config: JourneyConfig, stories: JourneyStories): string[] {
  const lines: string[] = [];

  lines.push(`    test('should complete journey @smoke @journey', async ({ journeyRunner }) => {`);
  lines.push(`      await journeyRunner.startJourney(JOURNEY_PATH);`);
  lines.push(`      // TODO: Add journey steps`);
  lines.push(`      // Generated from ${config.pages.length} pages`);
  lines.push(`    });`);
  lines.push('');

  return lines;
}

/**
 * Generate validation tests
 */
function generateValidationTests(config: JourneyConfig, testStyle: string): string[] {
  const lines: string[] = [];

  // Find pages with required fields
  const pagesWithValidation = config.pages.filter((page: any) => 
    page.components.some((c: any) => c.type === 'textInput' && c.props?.validation?.required)
  );

  if (pagesWithValidation.length === 0) {
    lines.push(`    // No validation rules found in journey config`);
    lines.push('');
    return lines;
  }

  pagesWithValidation.forEach((page: any) => {
    const heading = extractHeading(page);
    const requiredFields = page.components
      .filter((c: any) => c.type === 'textInput' && c.props?.validation?.required)
      .map((c: any) => c.props?.label || 'field');

    if (heading && requiredFields.length > 0) {
      lines.push(`    test('should validate required fields on ${page.id} @journey @validation', async ({`);
      lines.push(`      page,`);
      lines.push(`      journeyRunner,`);
      lines.push(`      componentHelper`);
      lines.push(`    }) => {`);
      lines.push(`      await journeyRunner.startJourney(JOURNEY_PATH);`);
      lines.push(`      // Navigate to ${page.id}`);
      lines.push(`      // TODO: Add navigation steps`);
      lines.push('');
      lines.push(`      await journeyRunner.verifyHeading('${heading}');`);
      lines.push(`      await journeyRunner.continue(); // Submit without filling`);
      lines.push('');
      
      if (testStyle === 'adaptive') {
        lines.push(`      // Adaptive error verification`);
        lines.push(`      const builder = new JourneyBuilder(page, journeyRunner, componentHelper);`);
        lines.push(`      await builder`);
        lines.push(`        .addStep(AdaptiveBlocks.smartVerifyErrors([`);
        requiredFields.forEach((field: string) => {
          lines.push(`          '${field} is required',`);
        });
        lines.push(`        ]))`);
        lines.push(`        .execute();`);
      } else {
        lines.push(`      // TODO: Verify validation errors for: ${requiredFields.join(', ')}`);
      }
      
      lines.push(`    });`);
      lines.push('');
    }
  });

  return lines;
}

/**
 * Generate edge case tests
 */
function generateEdgeCaseTests(config: JourneyConfig, testStyle: string): string[] {
  const lines: string[] = [];

  lines.push(`    test('should handle special characters @journey', async ({ journeyRunner }) => {`);
  lines.push(`      // TODO: Test with special characters (apostrophes, quotes, etc.)`);
  lines.push(`      await journeyRunner.startJourney(JOURNEY_PATH);`);
  lines.push(`    });`);
  lines.push('');

  return lines;
}

/**
 * Extract heading from page
 */
function extractHeading(page: any): string | null {
  const heading = page.components.find((c: any) => c.type === 'heading');
  return heading?.props?.text || page.title || null;
}

/**
 * Extract form fields from page
 */
function extractFields(page: any): Array<{ label: string; type: string; id: string; options?: Array<{text: string; value: string}> }> {
  return page.components
    .filter((c: any) => ['textInput', 'radios', 'checkboxes', 'select', 'dateInput'].includes(c.type))
    .map((c: any) => {
      // Extract options for radio buttons, checkboxes, and selects
      let options;
      if (['radios', 'checkboxes', 'select'].includes(c.type) && c.props?.items) {
        options = c.props.items.map((item: any) => ({
          text: item.text,
          value: item.value
        }));
      }
      
      return {
        label: c.props?.label || c.props?.legend || c.id,
        type: c.type,
        id: c.id,
        options
      };
    });
}

/**
 * Generate appropriate test value for field
 */
function generateFieldValue(field: { label: string; type: string; id: string; options?: Array<{text: string; value: string}> }): string {
  const label = field.label.toLowerCase();

  // Email fields
  if (label.includes('email')) {
    return 'contactData.email';
  }

  // Name fields
  if (label.includes('first name') || label.includes('given name')) {
    return "'John'";
  }
  if (label.includes('last name') || label.includes('surname') || label.includes('family name')) {
    return "'Smith'";
  }
  if (label.includes('full name') || label.includes('name')) {
    return 'contactData.fullName';
  }

  // Address fields
  if (label.includes('address line 1') || label.includes('street')) {
    return "'123 Test Street'";
  }
  if (label.includes('town') || label.includes('city')) {
    return "'London'";
  }
  if (label.includes('postcode') || label.includes('zip')) {
    return 'testPostcode';
  }

  // Phone fields
  if (label.includes('phone') || label.includes('telephone')) {
    return "'07700 900123'";
  }

  // Date fields
  if (label.includes('date of birth') || label.includes('dob')) {
    return "'01 01 2000'";
  }
  if (label.includes('date')) {
    return "'01 01 2024'";
  }

  // Number fields
  if (label.includes('number') || label.includes('count') || label.includes('quantity')) {
    return "'100'";
  }

  // Radio buttons - use the first option value if available
  if (field.type === 'radios' && field.options && field.options.length > 0) {
    return `'${field.options[0].value}'`;
  }

  // Checkbox fields - use the first two option values if available
  if (field.type === 'checkboxes') {
    if (field.options && field.options.length > 0) {
      const values = field.options.slice(0, Math.min(2, field.options.length)).map(opt => `'${opt.value}'`);
      return `[${values.join(', ')}]`;
    }
    return "['Option 1', 'Option 2']";
  }

  // Default
  return "'Test Value'";
}
