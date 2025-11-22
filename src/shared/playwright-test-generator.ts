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
      lines.push(`        .addCustomStep(async ({ journeyRunner }) => {`);
      lines.push(`          await journeyRunner.verifyHeading('${heading}');`);
      
      if (fields.length > 0) {
        lines.push(`          await journeyRunner.fillStep({`);
        fields.forEach(field => {
          lines.push(`            '${field.label}': ${generateFieldValue(field)},`);
        });
        lines.push(`          });`);
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
  const pagesWithValidation = config.pages.filter(page => 
    page.components.some(c => c.type === 'textInput' && (c as any).props?.validation?.required)
  );

  if (pagesWithValidation.length === 0) {
    lines.push(`    // No validation rules found in journey config`);
    lines.push('');
    return lines;
  }

  pagesWithValidation.forEach(page => {
    const heading = extractHeading(page);
    const requiredFields = page.components
      .filter(c => c.type === 'textInput' && (c as any).props?.validation?.required)
      .map(c => (c as any).props?.label || 'field');

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
        requiredFields.forEach(field => {
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
function extractFields(page: any): Array<{ label: string; type: string; id: string }> {
  return page.components
    .filter((c: any) => ['textInput', 'radios', 'checkboxes', 'select'].includes(c.type))
    .map((c: any) => ({
      label: c.props?.label || c.props?.legend || c.id,
      type: c.type,
      id: c.id
    }));
}

/**
 * Generate appropriate test value for field
 */
function generateFieldValue(field: { label: string; type: string; id: string }): string {
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
    return "'SW1A 1AA'";
  }

  // Phone fields
  if (label.includes('phone') || label.includes('telephone')) {
    return 'contactData.phone';
  }

  // Date fields
  if (label.includes('date')) {
    return "'01/01/2024'";
  }

  // Number fields
  if (label.includes('number') || label.includes('count') || label.includes('quantity')) {
    return "'100'";
  }

  // Boolean/radio fields
  if (field.type === 'radios') {
    return "'Yes'"; // Default to first option
  }

  // Default
  return "'Test Value'";
}
