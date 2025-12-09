import type { JourneyStories } from './user-story.schema.js';

/**
 * Simple Playwright test generator that works with journey analysis
 * Generates basic adaptive tests from user stories and journey analysis
 */

export function generatePlaywrightTestsSimple(
  analysis: any, // JourneyAnalysis type not exported
  stories: JourneyStories,
  journey?: any // Journey config object
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
  // Extract journey path from the journey configuration
  console.log('DEBUG journey object:', JSON.stringify(journey, null, 2));
  const journeyPath = journey?.landingPage?.startButtonHref || `/${journey?.departmentSlug || 'department-for-business-and-trade'}/${analysis.journeyId}/apply`;
  lines.push(`  const JOURNEY_PATH = '${journeyPath}';`);
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
  lines.push(`      const testPostcode = TestDataFactory.generatePostcode();`);
  lines.push(`      const builder = new JourneyBuilder(page, journeyRunner, componentHelper);`);
  lines.push('');
  lines.push(`      await builder`);

  // Special case for the first page (start page)
  const startPage = analysis.pages[0];
  if (startPage) {
    lines.push(`        // Start journey`);
    lines.push(`        .addCustomStep(async ({ journeyRunner }) => {`);
    lines.push(`          await journeyRunner.startJourney(JOURNEY_PATH);`);
    const startHeading = startPage.title || 'Before you start';
    lines.push(`          await journeyRunner.verifyHeading('${startHeading.replace(/'/g, "\\'")}');`);
    lines.push(`          await journeyRunner.continue();`);
    lines.push(`        })`);
  }

  // Process other pages
  analysis.pages.slice(1).forEach((page, index) => {
    const heading = page.components.find(c => c.type === 'heading');
    const headingText = page.title || heading?.props?.text || `Step ${index + 1}`;
    
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
    .map((c: any) => {
      let label = c.props?.label || c.props?.legend || c.id;

      // For radio buttons, use the first option's text as the label for selection
      if (c.type === 'radios') {
        const items = c.props?.items || c.props?.options || [];
        if (items.length > 0) {
          label = items[0].text || items[0].label || label;
        }
      }

      return {
        label: label,
        type: c.type,
        id: c.id,
        props: c.props
      };
    });
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

  // Date picker components - Day/Month/Year pattern
  if (label === 'day' || id.includes('day') || id.includes('dob-day')) {
    return "'15'"; // Valid day 1-31
  }
  if (label === 'month' || id.includes('month') || id.includes('dob-month')) {
    return "'06'"; // Valid month 1-12
  }
  if (label === 'year' || id.includes('year') || id.includes('dob-year')) {
    return "'1990'"; // Valid birth year
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

  // National Insurance number
  if (label.includes('national insurance') || id.includes('national-insurance')) {
    return "'QQ 12 34 56 C'";
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
    return 'testPostcode';
  }
  if (label.includes('county') || label.includes('region')) {
    return "''"; // Optional field
  }

  // Phone fields
  if (label.includes('phone') || label.includes('telephone') || id.includes('phone')) {
    return 'contactData.phone';
  }

  // Date fields (handle dateInput components with separate day/month/year fields)
  if (label.includes('date') || id.includes('date')) {
    // For dateInput components, we need to fill separate fields
    // This will be handled by JourneyRunner.fillDateField()
    return "'01 01 2000'"; // DD MM YYYY format for parsing
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
    // Try to get checkbox labels from props (not values)
    const items = field.props?.items || field.props?.options;
    if (items && items.length > 0) {
      const labels = items.map((item: any) => item.text || item.label || item.value || item).filter(Boolean);
      return `[${labels.map((l: string) => `'${l.replace(/'/g, "\\'")}'`).join(', ')}]`;
    }
    return "['The information I have given is true, complete and accurate.', 'I consent to the Disclosure and Barring Service checking the information I have provided.']"; // Default for consent checkboxes
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
