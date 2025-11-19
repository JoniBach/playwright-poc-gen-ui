# Integrated Journey Generation Workflow

## Overview

The integrated workflow allows you to create a complete journey in one seamless process:

1. **Generate Index Entry** - Creates metadata for your journey
2. **Generate Full Journey** - Creates the complete journey JSON with pages and components
3. **Auto-save Both Files** - Saves to `index.json` and `static/journeys/{id}.json`

## Quick Start

```bash
npm run generate:index
```

## Example Walkthrough

### Scenario: Creating a Fishing Licence Application Journey

```bash
$ npm run generate:index

🎯 Journey Index Entry Generator

This tool generates metadata for new journeys to add to index.json

✅ Preflight checks passed

? How would you like to create the journey metadata? 
  ❯ 🤖 AI-assisted (answer questions, AI generates metadata)
    ✍️  Manual (enter all fields yourself)

? Describe the journey you want to create: Apply for a fishing licence

🤖 Generating journey metadata from your description...

✅ Successfully generated journey metadata!

📋 Journey Metadata:
┌─────────────────────────────────────────────────────────────
│ ID:          fishing-licence-apply
│ Name:        Apply for a fishing licence
│ Description: Apply for a rod fishing licence online
│ Slug:        fishing-licence-apply
│ Department:  Department for Environment, Food & Rural Affairs
│ Dept Slug:   defra
│ Enabled:     true
└─────────────────────────────────────────────────────────────

? Would you like to edit any fields? No

✅ Metadata validation passed

📄 JSON Output:
{
  "id": "fishing-licence-apply",
  "name": "Apply for a fishing licence",
  "description": "Apply for a rod fishing licence online",
  "slug": "fishing-licence-apply",
  "department": "Department for Environment, Food & Rural Affairs",
  "departmentSlug": "defra",
  "enabled": true
}

? Save this entry to index.json? Yes

✅ Added new journey: fishing-licence-apply
💾 Saved to: ../playwright-poc-ui/static/journeys/index.json

🎉 Success! Your journey metadata has been added to index.json

? 🚀 Generate the full journey JSON file now? Yes

? Describe the journey flow: Include personal details, licence type selection (1-day, 8-day, annual), fishing location, and payment

🚀 Generating full journey JSON...

📝 Journey: Apply for a fishing licence
📝 Description: Apply for a rod fishing licence online
📝 Additional context: Include personal details, licence type selection...

✅ Successfully generated journey!

📋 Journey Details:
┌─────────────────────────────────────────────────────────────
│ ID:         fishing-licence-apply
│ Name:       Apply for a fishing licence
│ Start Page: start
│ Pages:      6
│ Landing:    ✓ Included
│ Check Page: check-answers
│ Complete:   confirmation
└─────────────────────────────────────────────────────────────

📄 Pages:

  start: Before you start
    Components: 3
      - heading: heading-start
      - paragraph: para-requirements
      - insetText: inset-cost
    → Next: personal-details

  personal-details: Your personal details
    Components: 5
      - heading: heading-personal
      - textInput: full-name
      - textInput: email
      - textInput: phone
      - textInput: date-of-birth
    → Next: licence-type

  licence-type: Choose your licence type
    Components: 3
      - heading: heading-licence
      - paragraph: para-licence-info
      - radios: licence-duration
    → Next: fishing-location

  fishing-location: Where will you fish?
    Components: 3
      - heading: heading-location
      - paragraph: para-location-info
      - radios: location-type
    → Next: check-answers

  check-answers: Check your answers
    Components: 2
      - heading: heading-check
      - paragraph: para-check-info
    → Next: confirmation

  confirmation: Application complete
    Components: 3
      - heading: heading-complete
      - paragraph: para-confirmation
      - insetText: inset-reference

📄 Full Journey JSON:
{
  "id": "fishing-licence-apply",
  "name": "Apply for a fishing licence",
  "landingPage": { ... },
  "startPage": "start",
  "pages": { ... },
  "checkYourAnswersPage": "check-answers",
  "completionPage": "confirmation"
}

? Save this journey to file? Yes

💾 Saved journey to: ../playwright-poc-ui/static/journeys/fishing-licence-apply.json

🎉 Complete! Your journey is ready to use.

💡 Next steps:
   1. Review the generated journey JSON
   2. Test your journey in the UI
   3. Navigate to: http://localhost:5173/journey/fishing-licence-apply
```

## What Gets Created

### 1. Index Entry (`index.json`)

```json
{
  "journeys": [
    ...existing journeys...,
    {
      "id": "fishing-licence-apply",
      "name": "Apply for a fishing licence",
      "description": "Apply for a rod fishing licence online",
      "slug": "fishing-licence-apply",
      "department": "Department for Environment, Food & Rural Affairs",
      "departmentSlug": "defra",
      "enabled": true
    }
  ]
}
```

### 2. Journey File (`static/journeys/fishing-licence-apply.json`)

```json
{
  "id": "fishing-licence-apply",
  "name": "Apply for a fishing licence",
  "landingPage": {
    "title": "Apply for a fishing licence",
    "lead": "Apply for a rod fishing licence online",
    "sections": [...],
    "startButtonText": "Start now",
    "startButtonHref": "/journey/fishing-licence-apply/start"
  },
  "startPage": "start",
  "pages": {
    "start": { ... },
    "personal-details": { ... },
    "licence-type": { ... },
    "fishing-location": { ... },
    "check-answers": { ... },
    "confirmation": { ... }
  },
  "checkYourAnswersPage": "check-answers",
  "completionPage": "confirmation"
}
```

## Features

### ✅ AI-Assisted Mode
- Describe what you want in plain English
- AI generates all metadata fields
- AI creates appropriate department assignments
- AI generates complete journey structure

### ✅ Manual Mode
- Full control over every field
- Dropdown of common UK departments
- Custom department support
- Validation at every step

### ✅ Schema Validation
- Index metadata validated against `JourneyMetadataSchema`
- Journey JSON validated against `JourneySchema`
- Component validation against `ComponentSchema`
- Ensures all generated content is valid

### ✅ Smart Defaults
- Auto-generates kebab-case IDs
- Matches slug to ID
- Suggests appropriate department slugs
- Creates proper navigation flow

### ✅ Integrated Workflow
- One command creates everything
- Consistent IDs across files
- Context-aware generation
- Ready to test immediately

## Command Line Usage

You can also provide the description directly:

```bash
npm run generate:index "Apply for a fishing licence"
```

This will use AI mode with your description and guide you through the rest of the process.

## Tips

### 1. Be Descriptive
The more detail you provide, the better the AI can generate appropriate pages and components:

**Good:**
```
"Apply for a fishing licence with personal details, licence type selection (1-day, 8-day, annual), fishing location, and payment"
```

**Better:**
```
"Create a fishing licence application journey. Start with a landing page explaining requirements. Collect personal details (name, email, DOB). Ask for licence type with radio buttons (1-day £6, 8-day £12, annual £30). Ask where they'll fish (river, lake, sea). Include check your answers page and confirmation."
```

### 2. Review Before Saving
Always review the generated metadata and journey before saving. You can:
- Edit metadata fields
- Review the journey structure
- Check component types and IDs
- Verify navigation flow

### 3. Test Immediately
After generation, test your journey in the UI:
```bash
cd ../playwright-poc-ui
npm run dev
```

Navigate to: `http://localhost:5173/journey/{your-slug}`

### 4. Iterate if Needed
If the generated journey isn't quite right:
- Delete the journey file
- Run the generator again with more specific instructions
- Or manually edit the generated JSON

## Troubleshooting

### "Journey file already exists"
The tool won't overwrite existing journey files. Either:
- Delete the existing file first
- Use a different ID/name
- Manually edit the existing file

### "Validation failed"
The generated content didn't match the schema. This is rare but can happen. Try:
- Running preflight checks: `npm run preflight`
- Regenerating with a clearer description
- Using manual mode for more control

### "Index entry already exists"
You'll be asked if you want to overwrite. Choose:
- Yes: Updates the existing entry
- No: Cancels the operation

## Next Steps

After generating your journey:

1. **Review the JSON** - Check pages, components, and navigation
2. **Test in UI** - Run the dev server and test the journey
3. **Refine** - Edit the JSON manually if needed
4. **Add validation** - Add field validation rules if required
5. **Add routing** - Add conditional routing if needed

## Related Commands

- `npm run preflight` - Check configuration
- `npm run generate:ai` - Generate journey only (no index)
- `npm run generate:article` - Generate article example
- `npm run validate` - Validate existing journeys
