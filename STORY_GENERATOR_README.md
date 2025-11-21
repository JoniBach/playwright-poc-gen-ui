# User Story Generator - Tier 1 & 2

Auto-generate user stories, acceptance criteria, and test requirements from journey prototypes.

## Overview

This system extracts structured data from your journey configurations and generates comprehensive user stories with acceptance criteria, ready for Playwright test generation (Tier 3 - future).

### Architecture

**Tier 1: Deterministic Analysis**
- Parses journey configs using validated Zod schemas
- Extracts pages, components, validation rules, and user flows
- Generates basic acceptance criteria from validation patterns
- Analyzes component interactions for test scenarios

**Tier 2: AI-Enhanced Generation**
- Uses OpenAI structured output to generate rich, contextual user stories
- Creates natural language acceptance criteria in Given-When-Then format
- Generates detailed test scenarios with steps and expected results
- Falls back to deterministic generation if no API key provided

**Tier 3: Playwright Test Generation** (Future)
- Auto-generate Playwright test specs from test scenarios
- Ready-to-run test stubs with proper structure

## Quick Start

### 1. Generate Stories for a Single Journey

```bash
npm run generate-stories -- --journey=passport-apply
```

This will output stories to the console.

### 2. Generate Stories for All Journeys

```bash
npm run generate-stories:all
```

Generates stories for all 20+ journeys with verbose output.

### 3. Generate Playwright Test Stubs

```bash
npm run generate-stories:playwright
```

Generates Playwright test stubs and saves them to `../playwright-poc-qa/tests/generated/`.

## Usage

### Basic Command

```bash
npm run generate-stories -- [options]
```

### Options

| Option | Description | Example |
|--------|-------------|---------|
| `--journey=<id>` | Generate for specific journey | `--journey=visa-apply` |
| `--all` | Generate for all journeys | `--all` |
| `--format=<format>` | Output format (see below) | `--format=markdown` |
| `--output=<dir>` | Save to directory | `--output=stories/` |
| `--openai-key=<key>` | OpenAI API key | `--openai-key=sk-xxx` |
| `--model=<model>` | OpenAI model | `--model=gpt-4o-mini` |
| `--verbose, -v` | Verbose output | `--verbose` |

### Output Formats

- **`markdown`** (default) - Rich markdown with full details
- **`gherkin`** - BDD feature files for Cucumber/SpecFlow
- **`json`** - Structured JSON for programmatic use
- **`csv`** - Spreadsheet-friendly format
- **`playwright`** - Playwright test stubs (Tier 3 prep)

## Examples

### Example 1: Generate Markdown Stories

```bash
npm run generate-stories -- --journey=passport-apply --format=markdown --output=stories/
```

Creates `stories/passport-apply.md` with full user stories.

### Example 2: Generate Gherkin Features

```bash
npm run generate-stories -- --all --format=gherkin --output=features/
```

Creates `.feature` files for all journeys.

### Example 3: AI-Enhanced Generation

```bash
export OPENAI_API_KEY=sk-your-key-here
npm run generate-stories -- --journey=visa-apply --verbose
```

Uses OpenAI to generate rich, contextual stories.

### Example 4: Generate Test Stubs for All Journeys

```bash
npm run generate-stories -- --all --format=playwright --output=../playwright-poc-qa/tests/generated/
```

## Output Structure

### User Story Format

Each generated story includes:

```markdown
## Story 1: Journey Start - Apply for Passport

**ID:** `passport-apply-journey-start-123456`
**Complexity:** medium
**Tags:** `journey-start`, `data-entry`

### User Story

> **As a** user of the service
> **I want** to start the passport application process
> **So that** I can apply for a new passport

### Acceptance Criteria

#### 1. [MUST] ✅
- **Given** I am on the start page
- **When** I click the "Start now" button
- **Then** I should navigate to the first data entry page
- **Tags:** `navigation`

#### 2. [MUST] ✅
- **Given** I am on the page with the "full-name" field
- **When** I submit the form without entering a value
- **Then** I should see an error message "Full name is required"
- **Tags:** `validation`

### Test Scenarios

#### 1. Test form-submission on personal-details [critical]

**Steps:**
1. Navigate to personal-details
2. Complete and submit form with 3 input field(s)
3. Verify expected behavior

**Expected Result:** Interaction completes successfully
```

## Generated Files

### Tier 1 Analysis Output

The journey analyzer extracts:
- **Pages**: All pages with components and navigation
- **Validation Rules**: Field-level validation requirements
- **User Flows**: Happy path, alternative paths, back navigation
- **Component Statistics**: Breakdown by type
- **Interactions**: Form submissions, selections, navigation

### Tier 2 Story Output

The story generator creates:
- **User Stories**: As a... I want... So that...
- **Acceptance Criteria**: Given-When-Then format with priority
- **Test Scenarios**: Step-by-step test instructions
- **Metadata**: Complexity, tags, component coverage

## AI Integration

### Using OpenAI (Recommended)

Set your API key:

```bash
export OPENAI_API_KEY=sk-your-key-here
```

Or pass it directly:

```bash
npm run generate-stories -- --journey=passport-apply --openai-key=sk-xxx
```

### Benefits of AI Generation

- **Contextual Stories**: Natural language that reflects user intent
- **Rich Acceptance Criteria**: 3-7 criteria per story with proper Given-When-Then
- **Detailed Test Scenarios**: 2-5 scenarios with specific steps
- **Smart Grouping**: Stories grouped by theme (start, data-entry, review, completion)
- **Proper Tagging**: Automatic categorization

### Fallback Mode

Without an API key, the system uses **deterministic generation**:
- Extracts validation rules → acceptance criteria
- Analyzes interactions → test scenarios
- Groups pages by component types
- Still produces valid, testable stories

## Integration with Playwright

### Current State (Tier 2)

Generate test stubs:

```bash
npm run generate-stories:playwright
```

Output example:

```typescript
test.describe('Journey Start - Apply for Passport', () => {
  test('Test form-submission on personal-details', async ({ page }) => {
    // Navigate to personal-details
    // TODO: Implement step
    
    // Complete and submit form
    // TODO: Implement step
    
    // Expected: Interaction completes successfully
    // TODO: Add assertions
  });
});
```

### Future (Tier 3)

The generated test scenarios include all metadata needed for full test generation:
- Page IDs for navigation
- Component types for selectors
- Expected results for assertions
- Priority for test organization

## Architecture Details

### File Structure

```
playwright-poc-ui/
├── src/lib/
│   ├── schemas/
│   │   ├── user-story.schema.ts      # Story/AC/Test schemas
│   │   ├── component.schema.ts       # Component schemas (existing)
│   │   └── journey.schema.ts         # Journey schemas (existing)
│   └── utils/
│       ├── journey-analyzer.ts       # Tier 1: Extract structured data
│       ├── story-generator.ts        # Tier 2: AI-enhanced generation
│       ├── story-formatter.ts        # Output formatters
│       └── journey-validator.ts      # Validation (existing)
├── scripts/
│   └── generate-stories.ts           # CLI tool
└── static/journeys/                  # Journey configs (20+ files)
```

### Data Flow

```
Journey Config (JSON)
    ↓
[Tier 1] Journey Analyzer
    ↓
Journey Analysis (structured data)
    ↓
[Tier 2] Story Generator (with/without AI)
    ↓
User Stories + Acceptance Criteria + Test Scenarios
    ↓
Formatters (markdown/gherkin/json/csv/playwright)
    ↓
Output Files
```

## Best Practices

### 1. Start with One Journey

Test the system on a single journey first:

```bash
npm run generate-stories -- --journey=passport-apply --verbose
```

### 2. Use AI for Production Stories

For stories you'll actually use, enable AI generation:

```bash
export OPENAI_API_KEY=sk-xxx
npm run generate-stories:all --output=stories/
```

### 3. Review and Refine

Generated stories are a starting point. Review and refine them:
- Adjust acceptance criteria priorities
- Add edge cases
- Enhance test scenario steps
- Update tags for better organization

### 4. Version Control

Commit generated stories to version control:
- Track changes to journey requirements
- Review story diffs in PRs
- Maintain history of test coverage

### 5. Integrate with Jira/Azure DevOps

Export to CSV for import into project management tools:

```bash
npm run generate-stories -- --all --format=csv --output=exports/
```

## Troubleshooting

### No OpenAI API Key

**Symptom:** Warning message about missing API key

**Solution:** Set the environment variable or use `--openai-key` flag. The system will fall back to deterministic generation.

### TypeScript Errors in Scripts

**Symptom:** Lint errors about `node:fs` or `process`

**Solution:** These are false positives. The `tsx` runner handles these correctly. The code will run fine.

### Empty or Missing Stories

**Symptom:** No stories generated for a journey

**Solution:** Check that:
1. Journey file exists in `static/journeys/`
2. Journey passes validation
3. Journey has pages with components

### Invalid Journey Schema

**Symptom:** Schema validation errors

**Solution:** Run the journey validator first:

```bash
npm run dev
# Check console for validation errors
```

## Future Enhancements (Tier 3)

### Planned Features

1. **Full Playwright Test Generation**
   - Auto-generate complete test implementations
   - Smart selector generation from component props
   - Assertion generation from expected results

2. **Test Data Generation**
   - Generate test data based on validation rules
   - Create valid/invalid input scenarios
   - Mock API responses

3. **Visual Regression Tests**
   - Screenshot comparison tests
   - Accessibility audit tests
   - Cross-browser compatibility tests

4. **CI/CD Integration**
   - Auto-generate tests on journey config changes
   - Create PRs with updated test specs
   - Run tests automatically

## Contributing

When adding new component types or journey features:

1. Update component schemas in `component.schema.ts`
2. Update journey analyzer to handle new patterns
3. Test with `npm run generate-stories -- --journey=test-journey`
4. Update this README with new capabilities

## Support

For issues or questions:
1. Check existing journey validation with the validator
2. Review generated stories for a working journey
3. Enable `--verbose` mode for debugging
4. Check that journey configs follow the schema

## Summary

This story generator bridges the gap between journey prototypes and automated testing:

- **Tier 1**: Deterministic extraction from configs ✅
- **Tier 2**: AI-enhanced story generation ✅  
- **Tier 3**: Full Playwright test generation 🔜

Start generating stories today and build a comprehensive test suite from your journey configurations!
