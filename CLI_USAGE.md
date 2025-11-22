# Test Generation CLI Usage

## 🎉 Complete! Generate Playwright Tests from Journey JSON

You can now generate complete, working Playwright tests directly from your journey JSON configs!

## Quick Start

### From Root Directory

```bash
# Generate tests for a specific journey
npm run gen:tests -- --journey=register-a-company

# Generate tests for all journeys
npm run gen:tests -- --all
```

### From playwright-poc-gen-ui Directory

```bash
# Generate tests for one journey (adaptive style - recommended)
npm run generate:tests -- --journey=register-a-company

# Generate tests for all journeys
npm run generate:tests:all

# Generate with specific test style
npm run generate:tests:adaptive -- --journey=passport-apply
npm run generate:tests:realistic -- --journey=visa-apply
npm run generate:tests:simple -- --journey=license-apply
```

## CLI Options

```bash
npm run gen:tests -- [options]

Options:
  --journey=<id>          Generate tests for a specific journey
  --all                   Generate tests for all journeys
  --format=playwright-full  Use complete test generation (default when using gen:tests)
  --test-style=<style>    Test style: adaptive, realistic, simple (default: adaptive)
  --output=<dir>          Output directory (default: ../playwright-poc-qa/tests/generated/)
  --verbose, -v           Verbose output
```

## Examples

### Generate for Single Journey

```bash
# From root
npm run gen:tests -- --journey=register-a-company

# From gen-ui
npm run generate:tests -- --journey=register-a-company --verbose
```

**Output:** `playwright-poc-qa/tests/generated/register-a-company.spec.ts`

### Generate for All Journeys

```bash
# From root
npm run gen:tests -- --all

# From gen-ui
npm run generate:tests:all
```

**Output:** One `.spec.ts` file per journey in `playwright-poc-qa/tests/generated/`

### Generate with Specific Style

```bash
# Adaptive (recommended - auto-detects patterns)
npm run gen:tests -- --journey=passport-apply --test-style=adaptive

# Realistic (journey-specific)
npm run gen:tests -- --journey=visa-apply --test-style=realistic

# Simple (basic smoke tests)
npm run gen:tests -- --journey=license-apply --test-style=simple
```

### Generate to Custom Location

```bash
npm run gen:tests -- --journey=register-a-company --output=tests/my-tests/
```

## Test Styles

### Adaptive (Default - Recommended)

**Best for:** Cross-journey compatibility, automated generation

```typescript
// Uses AdaptiveBlocks for pattern detection
await builder
  .addStep(AdaptiveBlocks.detectAndLogPatterns())
  .addStep(AdaptiveBlocks.smartVerifyErrors(['Error']))
  .addStep(AdaptiveBlocks.checkAnswersAndSubmit('Check your answers'))
  .execute();
```

**Features:**
- ✅ Auto-detects journey patterns
- ✅ Adapts to error display (summary vs inline)
- ✅ Adapts to summary lists (GOV.UK vs `<dl>`)
- ✅ Gracefully handles unsupported features
- ✅ Works across all journey types

### Realistic

**Best for:** Journey-specific comprehensive testing

```typescript
// Direct JourneyRunner calls
await journeyRunner.verifyHeading('Check your answers');
await journeyRunner.submit();
```

**Features:**
- ✅ Direct, explicit test steps
- ✅ Journey-specific assertions
- ✅ Easier to debug
- ✅ Tests actual patterns used

### Simple

**Best for:** Quick smoke tests

```typescript
// Minimal test structure
await journeyRunner.startJourney(JOURNEY_PATH);
// Basic journey flow
```

**Features:**
- ✅ Minimal code
- ✅ Quick to run
- ✅ Easy to understand

## Complete Workflow

```bash
# 1. Create/update journey JSON
vim playwright-poc-ui/static/journeys/my-journey.json

# 2. Validate journey
npm run validate

# 3. Generate user stories (optional)
npm run gen:stories -- --journey=my-journey

# 4. Generate Playwright tests
npm run gen:tests -- --journey=my-journey --verbose

# 5. Run generated tests
cd playwright-poc-qa
npx playwright test tests/generated/my-journey.spec.ts

# 6. Tests pass! ✅
```

## What Gets Generated

### Complete Test File Structure

```typescript
import { test, expect } from '../../fixtures/base.fixture';
import { TestDataFactory } from '../../helpers/TestDataFactory';
import { JourneyBuilder } from '../../helpers/JourneyBuilder';
import { AdaptiveBlocks } from '../../helpers/AdaptiveBlocks';

test.describe('Journey Title', () => {
  const JOURNEY_PATH = '/path/to/journey';

  test.describe('Happy Path Tests', () => {
    test('should complete full journey @smoke @journey', async ({...}) => {
      // Complete journey flow with adaptive blocks
    });
  });

  test.describe('Validation Tests', () => {
    test('should validate required fields @journey @validation', async ({...}) => {
      // Auto-generated validation tests
    });
  });

  test.describe('Edge Case Tests', () => {
    test('should handle special characters @journey', async ({...}) => {
      // Edge case tests
    });
  });
});
```

### Intelligent Features

**Field Value Mapping:**
- Email fields → `contactData.email`
- Name fields → `'John'`, `'Smith'`
- Address fields → `'123 Test Street'`, `'London'`, `'SW1A 1AA'`
- Phone fields → `contactData.phone`
- Date fields → `'01/01/2024'`
- Number fields → `'100'`

**Pattern Detection:**
- Error display (summary vs inline)
- Summary lists (GOV.UK vs `<dl>`)
- Change answers (supported vs not)
- Navigation (button vs link)
- Smart quotes (Unicode vs standard)

## Available Commands

### Root Level (from `/`)

```bash
npm run gen:tests -- --journey=<id>        # Generate for one journey
npm run gen:tests -- --all                 # Generate for all journeys
```

### Gen-UI Level (from `/playwright-poc-gen-ui`)

```bash
npm run generate:tests                     # Interactive (prompts for journey)
npm run generate:tests:all                 # Generate for all journeys
npm run generate:tests:adaptive            # Adaptive style (default)
npm run generate:tests:realistic           # Realistic style
npm run generate:tests:simple              # Simple style
```

## Tips

### Best Practices

1. **Use adaptive style** for most cases - it's the most flexible
2. **Run validation first** to ensure journey JSON is valid
3. **Review generated tests** before running to understand what they do
4. **Customize as needed** - generated tests are a starting point
5. **Regenerate when journey changes** - keep tests in sync with configs

### Troubleshooting

**Tests fail after generation:**
- Check journey path is correct
- Verify journey is deployed and accessible
- Run pattern detection to see what patterns journey uses
- Compare generated test with working manual test

**Field values incorrect:**
- Update field value mapping in `playwright-test-generator.ts`
- Add custom field mappings for your specific journey

**Missing validation tests:**
- Ensure journey config has validation rules defined
- Check that fields have `validation.required` set

## Next Steps

1. **Generate tests for your journeys**
2. **Run and verify they pass**
3. **Customize as needed**
4. **Integrate into CI/CD**
5. **Regenerate when journeys change**

## Success! 🎉

You now have a complete pipeline:

```
Journey JSON → Stories → Playwright Tests → Passing Tests
```

All automated, all from JSON, all using adaptive blocks! 🚀
