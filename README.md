# Playwright POC Generator UI

AI-powered journey generation for the playwright-poc project using OpenAI and Zod schemas.

## Overview

This submodule provides tools to generate government service journeys using AI, leveraging the strict Zod schemas from the main UI project for validation and type safety.

## Features

- 🤖 **AI Journey Generation** - Create complete government service journeys from simple prompts
- ✅ **Schema Validation** - All generated content validates against strict Zod schemas
- 🎯 **Interactive CLI** - Simple question-based interface for journey creation
- 📁 **File Management** - Automatic saving to static files and index updates
- 🔍 **Validation Tools** - Comprehensive journey validation utilities

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set OpenAI API key:**
   ```bash
   export OPENAI_API_KEY="your-openai-api-key"
   ```

## Usage

### Generate a New Journey

```bash
npm run generate
```

This will prompt you for:
- Service name (e.g., "Apply for a Blue Badge")
- Service description
- Government department
- Service type (data-entry or data-lookup)

### Validate All Journeys

```bash
npm run validate
```

Validates all existing journey files against the Zod schemas.

## Project Structure

```
src/
├── generate-journey.js     # Main AI generation script
├── validate-journeys.js    # Journey validation utility
└── utils/
    ├── openai-client.js    # OpenAI API wrapper
    ├── file-writer.js      # File system utilities
    └── prompts.js          # AI prompt templates
```

## Integration

This submodule works with the main playwright-poc-ui project by:

1. **Importing Zod schemas** from `../playwright-poc-ui/src/lib/schemas/`
2. **Writing generated files** to `../playwright-poc-ui/static/journeys/`
3. **Updating the journey index** at `../playwright-poc-ui/static/journeys/index.json`

## Generated Journey Structure

Each generated journey includes:
- **Landing page** with service information
- **Form pages** with appropriate GOV.UK components
- **Check answers page** for review
- **Confirmation page** with next steps
- **Proper validation** and error handling

## Development

The generator uses OpenAI's structured output with `zodResponseFormat()` to ensure all generated content matches the expected schemas perfectly.

## Requirements

- Node.js 18+
- OpenAI API key
- Access to the main playwright-poc-ui schemas
