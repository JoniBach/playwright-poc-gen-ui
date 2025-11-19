# Quick Start Guide

## Setup (One-time)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure `.env` file:**
   ```env
   OPENAI_API_KEY=sk-your-key-here
   OPENAI_MODEL=gpt-4o-2024-08-06
   OPENAI_ORG_ID=org-ItpJzKN5wqWedLbRiBeGTApf
   ```

3. **Verify setup:**
   ```bash
   npm run preflight
   ```

## Usage

### Generate Complete Journey (Recommended - Full Workflow)
```bash
npm run generate:index
```

**This is the complete workflow that:**
1. Creates the index entry (metadata)
2. Generates the full journey JSON
3. Saves both files automatically

**Interactive prompts:**
- AI-assisted or Manual mode?
- Describe the journey (e.g., "Apply for a fishing licence")
- AI generates metadata (id, name, description, department)
- Edit fields if needed
- Save to index.json?
- Generate full journey JSON? ✨ **NEW!**
- Describe the journey flow
- Save journey file?

**Result:**
- ✅ Entry added to `index.json`
- ✅ Full journey JSON created in `static/journeys/{id}.json`
- ✅ Ready to test in the UI immediately!

### Generate Article (Simple Example)
```bash
npm run generate:article
```

**Interactive prompts:**
- What topic? (e.g., "The future of AI")
- What tone? (Professional, Casual, Academic, etc.)
- How long? (Very Short, Short, Medium)
- Confirm generation?

**Shows structured output:**
- Title, Author, Summary
- Multiple sections with headings
- Tags and word count
- Full JSON output

### Check Configuration
```bash
npm run preflight
```

### Generate Journey Only (Advanced)

**Interactive:**
```bash
npm run generate:ai
```

**Command Line:**
```bash
npm run generate:ai "Create a passport renewal journey"
```

**Examples:**
```bash
# Simple contact form
npm run generate:ai "Create a contact form with name, email, and message"

# Complex application
npm run generate:ai "Create a passport application journey with personal details"

# Service request
npm run generate:ai "Create a parking permit application"
```

## What Happens

1. ✅ **Preflight checks** - Validates configuration and API connection
2. 📝 **Prompt processing** - Takes your description
3. 🤖 **AI generation** - Creates structured journey JSON
4. ✅ **Validation** - Validates against Zod schema
5. 📄 **Output** - Displays journey details and full JSON

## Troubleshooting

If anything goes wrong, run:
```bash
npm run preflight
```

This will tell you exactly what needs to be fixed.
