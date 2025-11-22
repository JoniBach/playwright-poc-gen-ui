import type { JourneyStories } from './user-story.schema.js';

/**
 * Simple Playwright test generator that works with journey analysis
 * Generates basic adaptive tests from user stories and journey analysis
 */

export function generatePlaywrightTestsSimple(
  analysis: any, // JourneyAnalysis type not exported
  stories: JourneyStories
): string {
  const lines: string[] = [];

  // Imports
  lines.push(`import { test, expect } from '../../fixtures/base.fixture';`);
  lines.push(`import { TestDataFactory } from '../../helpers/TestDataFactory';`);
  lines.push(`import { JourneyBuilder } from '../../helpers/JourneyBuilder';`);
  lines.push(`import { AdaptiveBlocks } from '../../helpers/AdaptiveBlocks';`);
  lines.push('');

  // File header
  lines.push(`/**`);
  lines.push(` * ${stories.journeyTitle} - Generated Tests`);
  lines.push(` * `);
  lines.push(` * Generated from journey: ${stories.journeyId}`);
  lines.push(` * Generated at: ${new Date().toISOString()}`);
  lines.push(` * `);
  lines.push(` * Journey Structure:`);
  lines.push(` * - Pages: ${analysis.statistics.totalPages}`);
  lines.push(` * - Components: ${analysis.statistics.totalComponents}`);
  lines.push(` * - User Stories: ${stories.summary.totalStories}`);
  lines.push(` * - Test Scenarios: ${stories.summary.totalTestScenarios}`);
  lines.push(` */`);
  lines.push('');

  // Test suite
  lines.push(`test.describe('${analysis.journeyName || analysis.journeyId}', () => {`);
  lines.push(`  const JOURNEY_PATH = '/department-for-business-and-trade/${analysis.journeyId}/apply';`);
  lines.push('');

  // Happy path test
  lines.push(`  test.describe('Happy Path Tests', () => {`);
  lines.push('');
  lines.push(`    test('should complete full journey using adaptive blocks @smoke @journey', async ({`);
  lines.push(`      page,`);
  lines.push(`      journeyRunner,`);
  lines.push(`      componentHelper`);
  lines.push(`    }) => {`);
  lines.push(`      const contactData = TestDataFactory.generateContactDetails();`);
  lines.push(`      const builder = new JourneyBuilder(page, journeyRunner, componentHelper);`);
  lines.push('');
  lines.push(`      await builder`);

  // Special case for the first page (start page)
  const startPage = analysis.pages[0];
  if (startPage) {
    lines.push(`        // Start journey`);
    lines.push(`        .addCustomStep(async ({ journeyRunner }) => {`);
    lines.push(`          await journeyRunner.startJourney(JOURNEY_PATH);`);
    lines.push(`          await journeyRunner.verifyHeading('Before you start');`);
    lines.push(`          await journeyRunner.continue();`);
    lines.push(`        })`);
  }

  // Process other pages
  analysis.pages.slice(1).forEach((page, index) => {
    const heading = page.components.find(c => c.type === 'heading');
    const headingText = heading?.props?.text || page.title || `Step ${index + 1}`;
    
    lines.push(`        // ${page.id}`);
    lines.push(`        .addCustomStep(async ({ journeyRunner }) => {`);
    
    // Generate possible heading variations
    const headingVariations = new Set([
      headingText, // Original
      headingText.replace(/’/g, "'"), // Smart quote to straight quote
      headingText.replace(/'/g, '&#39;'), // HTML entity
      headingText.replace(/'/g, '’'), // Straight to smart quote
      page.title // Fallback to page title
    ].filter(Boolean)); // Remove any empty strings
    
    // Use the first (most likely) heading variation
    let primaryHeading = Array.from(headingVariations)[0] || headingText;
    
    // Special handling for specific pages
    if (page.id === 'check-answers' || primaryHeading.toLowerCase().includes('check your answers')) {
      primaryHeading = 'Check your answers';
    } else if (page.id === 'confirmation' || primaryHeading.toLowerCase().includes('submitted')) {
      primaryHeading = 'Your application has been submitted';
    }
    
    const escapedHeading = primaryHeading.replace(/'/g, "\\'");
    lines.push(`          await journeyRunner.verifyHeading('${escapedHeading}');`);
    
    // Extract form fields from page
    const formFields = extractFormFields(page);
    
    if (formFields.length > 0) {
      lines.push(`          await journeyRunner.fillStep({`);
      formFields.forEach(field => {
        const value = generateFieldValue(field);
        lines.push(`            '${field.label.replace(/'/g, "\\'")}': ${value},`);
      });
      lines.push(`          });`);
    }
    
    // Handle different actions based on page type
    if (page.id === 'check-answers') {
      lines.push(`          await journeyRunner.submit();`);
    } else if (index < analysis.pages.length - 2) {
      lines.push(`          await journeyRunner.continue();`);
    }
    lines.push(`        })`);
  });

  lines.push('');
  lines.push(`        .execute();`);
  lines.push(`    });`);
  lines.push('');
  lines.push(`  });`);
  lines.push('');

  // Validation tests
  if (analysis.validationRules.length > 0) {
    lines.push(`  test.describe('Validation Tests', () => {`);
    lines.push('');
    lines.push(`    test('should validate required fields @journey @validation', async ({`);
    lines.push(`      page,`);
    lines.push(`      journeyRunner,`);
    lines.push(`      componentHelper`);
    lines.push(`    }) => {`);
    lines.push(`      await journeyRunner.startJourney(JOURNEY_PATH);`);
    lines.push(`      // TODO: Navigate to form page and submit without filling`);
    lines.push(`      // TODO: Use AdaptiveBlocks.smartVerifyErrors(['Error message'])`);
    lines.push(`    });`);
    lines.push('');
    lines.push(`  });`);
    lines.push('');
  }

  lines.push(`});`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Extract form fields from a page
 */
function extractFormFields(page: any): Array<{ label: string; type: string; id: string; props?: any }> {
  return page.components
    .filter((c: any) => ['textInput', 'radios', 'checkboxes', 'select'].includes(c.type))
    .map((c: any) => ({
      label: c.props?.label || c.props?.legend || c.id,
      type: c.type,
      id: c.id,
      props: c.props
    }));
}

/**
 * Generate appropriate test value for a field based on its label and type
 */
function generateFieldValue(field: { label: string; type: string; id: string; props?: any }): string {
  const label = (field.label || '').toLowerCase();
  const id = (field.id || '').toLowerCase();

  // Email fields
  if (label.includes('email') || id.includes('email')) {
    return 'contactData.email';
  }

  // Name fields
  if (label.includes('first name') || label.includes('given name') || id.includes('firstname')) {
    return "'John'";
  }
  if (label.includes('last name') || label.includes('surname') || label.includes('family name') || id.includes('lastname')) {
    return "'Smith'";
  }
  if (label.includes('full name') || (label.includes('name') && !label.includes('company'))) {
    return 'contactData.fullName';
  }

  // Company name
  if (label.includes('company name') || id.includes('company-name')) {
    return "'Test Company Ltd'";
  }

  // Address fields
  if (label.includes('address line 1') || label.includes('street') || id.includes('line1')) {
    return "'123 Test Street'";
  }
  if (label.includes('address line 2') || id.includes('line2')) {
    return "''"; // Optional field
  }
  if (label.includes('town') || label.includes('city') || id.includes('town')) {
    return "'London'";
  }
  if (label.includes('postcode') || label.includes('zip') || id.includes('postcode')) {
    return "'SW1A 1AA'";
  }
  if (label.includes('county') || label.includes('region')) {
    return "''"; // Optional field
  }

  // Phone fields
  if (label.includes('phone') || label.includes('telephone') || id.includes('phone')) {
    return 'contactData.phone';
  }

  // Date fields
  if (label.includes('date') || id.includes('date')) {
    return "'01/01/2024'";
  }

  // Number/quantity fields
  if (label.includes('number') || label.includes('count') || label.includes('quantity') || 
      label.includes('shares') || label.includes('value')) {
    return "'100'";
  }

  // Radio buttons - check for options
  if (field.type === 'radios') {
    // Try to get first option from props
    const items = field.props?.items || field.props?.options;
    if (items && items.length > 0) {
      const firstOption = items[0];
      const value = firstOption.value || firstOption.label || firstOption;
      return `'${value}'`;
    }
    return "'Yes'"; // Default
  }

  // Checkboxes
  if (field.type === 'checkboxes') {
    return "['Option 1']"; // Default to array
  }

  // Select dropdown
  if (field.type === 'select') {
    const options = field.props?.options;
    if (options && options.length > 0) {
      return `'${options[0].value || options[0]}'`;
    }
    return "'Option 1'";
  }

  // Default for text inputs
  return "'Test Value'";
}
