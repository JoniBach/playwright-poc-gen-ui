# Journey Validation System

## Overview

The journey generator now includes comprehensive validation and auto-fix capabilities that catch errors **before** the journey is saved to disk.

## Features

### ✅ Real-Time Validation
- Validates generated journeys against UI schema requirements
- Catches errors immediately in the terminal
- No need to wait for UI rendering to see errors

### 🔧 Auto-Fix Capabilities
The system automatically fixes common issues:
- Missing `id` field in textInput props
- Missing `id` field in radios props
- Missing `id` field in checkboxes props
- `text` property in warningText (renames to `content`)

### 📊 Detailed Error Reporting
Shows exactly what's wrong and where:
```
❌ Journey validation FAILED!

Found 2 error(s) in journey "register-a-plane":

1. Path: pages → owner-address → components → 3 → props → label
   Message: textInput must have label
   Expected: string
   Received: undefined

2. Path: pages → applicant-type → props → id
   Message: radios props must have an id field
   Expected: string
   Received: undefined
```

## How It Works

### Generation Flow

1. **AI generates journey** using OpenAI structured outputs
2. **Cleanup phase** removes empty strings and null values
3. **🆕 Validation phase** checks against UI schema
4. **🆕 Auto-fix phase** attempts to fix common errors
5. **🆕 Re-validation** confirms fixes worked
6. **Display results** shows what was fixed
7. **Save to file** only if validation passes (or with warnings)

### Terminal Output Example

```bash
🚀 Generating full journey JSON...

✅ Successfully generated journey!

🔍 Validating generated journey...

⚠️  Validation errors found. Attempting auto-fix...

🔧 Auto-fix applied the following changes:
   - Added missing id to textInput props at page owner-address, component 3
   - Added missing id to radios props at page applicant-type, component 1
   - Renamed text to content in warningText at page declaration, component 2

✅ Journey validation passed!

⚠️  Warnings:
   - Page confirmation has no components

📄 Full Journey JSON:
{...}

? Save this journey to file? yes
💾 Saved journey to: .../register-a-plane.json

🎉 Complete! Your journey is ready to use.
```

## Validation Rules

### Component-Specific Validation

#### textInput
- ✅ Must have `id` in props (same as component id)
- ✅ Must have `name`
- ✅ Must have `label`

#### radios
- ✅ Must have `id` in props (same as component id)
- ✅ Must have `name`
- ✅ Must have `legend` (not nested in fieldset)
- ✅ Must have `items` array

#### checkboxes
- ✅ Must have `id` in props (same as component id)
- ✅ Must have `name`
- ✅ Must have `legend` (not nested in fieldset)
- ✅ Must have `items` array

#### warningText
- ✅ Must have `content` property (not `text`)

#### heading
- ✅ Must have either `text` or `content`

#### paragraph
- ✅ Must have either `text` or `content`

#### insetText
- ✅ Must have either `text` or `content`

#### button
- ✅ Must have `text`

## Files

### `src/shared/journey-validator.ts`
- `validateJourney()` - Main validation function
- `displayValidationResults()` - Pretty-print results
- `autoFixJourney()` - Automatic error fixing

### `src/shared/journey-generator.ts`
- Integrated validation after AI generation
- Auto-fix before saving
- Detailed error reporting

## Benefits

### 1. **Catch Errors Early**
No more discovering errors when the UI tries to render the journey. See them immediately in the terminal.

### 2. **Auto-Fix Common Issues**
Most schema mismatches are fixed automatically without manual intervention.

### 3. **Clear Error Messages**
Know exactly what's wrong, where it is, and what's expected.

### 4. **Prevent Bad Saves**
Won't save journeys with critical validation errors.

### 5. **Faster Development**
Less time debugging, more time creating journeys.

## Usage

The validation runs automatically when you use:

```bash
npm run generate:index
```

When it asks to generate the full journey and you say yes, validation happens automatically before saving.

## Current Coverage

### Validated Components (8)
- textInput
- radios
- checkboxes
- heading
- paragraph
- insetText
- warningText
- button

### Not Yet Validated (15)
- email, tel, textarea
- dateInput, select
- list, details
- panel, summaryList, table
- notificationBanner
- And more...

## Future Enhancements

### Planned Features
1. **Import actual UI schemas** - Use the exact same Zod schemas from the UI project
2. **More auto-fixes** - Handle more error types automatically
3. **Validation for all components** - Add validation for remaining 15 component types
4. **AI retry mechanism** - If validation fails, send errors back to AI for regeneration
5. **Interactive fix mode** - Let user choose which fixes to apply

### AI Retry Flow (Planned)
```
1. Generate journey
2. Validate
3. If errors found:
   - Show errors to user
   - Ask: "Retry with AI to fix these errors?"
   - If yes: Send errors + original prompt back to AI
   - AI regenerates with error context
   - Validate again
   - Repeat up to 3 times
4. If still errors: Apply auto-fix
5. Save
```

## Troubleshooting

### Validation Not Running?
Check the terminal output. If you don't see validation messages, the output may be truncated. The validation still ran, just not visible in the output.

### Journey Still Has Errors?
If auto-fix couldn't resolve all errors, you'll see a warning. Review the error messages and either:
1. Regenerate the journey with a more specific prompt
2. Manually edit the JSON file
3. Report the issue so we can add more auto-fixes

### False Positives?
If validation reports an error that's actually correct, please report it so we can update the validation rules.

## Testing

To test the validation system:

```bash
# Generate a journey
npm run generate:index "Test journey"

# Watch for validation output in terminal
# Should see: 🔍 Validating generated journey...
# And either: ✅ Journey validation passed!
# Or: ⚠️ Validation errors found. Attempting auto-fix...
```

## Contributing

To add validation for a new component type:

1. Add validation function in `journey-validator.ts`
2. Add case in `validateJourney()` switch statement
3. Add auto-fix logic in `autoFixJourney()` if applicable
4. Test with actual journeys
5. Update this documentation

## Summary

The validation system ensures that AI-generated journeys match your comprehensive Zod schema system, catching errors early and fixing them automatically. This dramatically improves the reliability of AI-generated journeys and reduces debugging time.
