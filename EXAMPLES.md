# OpenAI Structured Output Examples

This directory contains TypeScript examples demonstrating how to use Zod schemas with OpenAI's structured output feature.

## Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   
   Create a `.env` file in the root of the `playwright-poc-gen-ui` directory with:
   ```env
   OPENAI_API_KEY=your_api_key_here
   OPENAI_MODEL=gpt-4o-2024-08-06
   OPENAI_ORG_ID=org-ItpJzKN5wqWedLbRiBeGTApf
   ```

3. **Run preflight checks:**
   ```bash
   npm run preflight
   ```

## Preflight Checks

Before making any OpenAI requests, run the preflight check to ensure everything is configured correctly:

```bash
npm run preflight
```

**What it checks:**
- ✅ Environment variables are set
- ✅ API key format is valid
- ✅ Model supports structured outputs
- ✅ API connection works
- ✅ All dependencies are installed

**Example output:**
```
🔍 Running preflight checks...

📋 Checking environment variables...
  ✅ OPENAI_API_KEY is set
  ✅ OPENAI_MODEL is set: gpt-4o-2024-08-06
  ✅ OPENAI_ORG_ID is set: org-xxx

🔑 Validating API key format...
  ✅ API key format looks valid

🤖 Checking model compatibility...
  ✅ Model supports structured outputs

🌐 Testing API connection...
  ✅ Successfully connected to OpenAI API

📦 Checking dependencies...
  ✅ zod is installed
  ✅ inquirer is installed

✅ All preflight checks passed!
```

## Journey Generation

Generate GOV.UK journey configurations using AI with interactive CLI prompts.

### Interactive Mode

**Run it:**
```bash
npm run generate:ai
```

This will:
1. Run preflight checks automatically
2. Prompt you to describe the journey you want to create
3. Ask for confirmation before making the API request
4. Generate a structured journey configuration

### Command Line Mode

**With custom prompt:**
```bash
npm run generate:ai "Create a passport application journey with personal details and document upload"
```

This will:
1. Run preflight checks automatically
2. Use your command line prompt directly
3. Generate the journey without additional prompts

### What it does

- Runs comprehensive preflight checks before making requests
- Generates a complete journey structure based on your text prompt
- Returns structured JSON with pages and components
- Validates the output against a Zod schema
- Displays a detailed breakdown of the generated journey

**Schema:**
```typescript
const JourneySchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    startPage: z.string(),
    pages: z.array(PageSchema),
});
```

## How It Works

### 1. Define Your Schema

Use Zod to define the structure you want:

```typescript
import { z } from 'zod';

const MySchema = z.object({
    field1: z.string(),
    field2: z.number(),
    nested: z.object({
        items: z.array(z.string())
    })
});
```

### 2. Create OpenAI Client

```typescript
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORG_ID,
});
```

### 3. Request Structured Output

```typescript
import { zodResponseFormat } from 'openai/helpers/zod';

const completion = await client.beta.chat.completions.parse({
    model: process.env.OPENAI_MODEL || 'gpt-4o-2024-08-06',
    messages: [
        { role: 'system', content: 'Your system prompt' },
        { role: 'user', content: 'Your request' },
    ],
    response_format: zodResponseFormat(MySchema, 'schemaName'),
});
```

### 4. Handle the Response

```typescript
const message = completion.choices[0]?.message;

if (message?.parsed) {
    // TypeScript knows the exact structure!
    console.log(message.parsed.field1);
    console.log(message.parsed.nested.items);
} else if (message?.refusal) {
    console.error('Request refused:', message.refusal);
}
```

## Benefits

✅ **Type Safety**: Full TypeScript support with autocomplete  
✅ **Validation**: Automatic validation of AI responses  
✅ **Reliability**: Guaranteed structure in responses  
✅ **Error Handling**: Clear error messages when validation fails  

## Integration with Journey Schemas

The examples can be extended to use the comprehensive journey schemas from the main UI project:

```typescript
import { journeyConfigSchema } from '../../playwright-poc-ui/src/lib/validation/journey-validator';
```

This allows you to generate fully validated journey configurations that work directly with the UI.

## Troubleshooting

**Run preflight checks first:**
```bash
npm run preflight
```

This will identify most common issues automatically.

**Error: Missing API Key**
- Make sure your `.env` file exists and contains `OPENAI_API_KEY`
- Run `npm run preflight` to verify

**Error: Invalid model**
- Structured outputs require `gpt-4o-2024-08-06` or later
- Set `OPENAI_MODEL=gpt-4o-2024-08-06` in your `.env` file

**Error: API connection failed**
- Check your API key is valid
- Verify your organization ID (if set)
- Check your internet connection

**TypeScript errors**
- Run `npm install` to ensure all dependencies are installed
- Make sure you're using Node.js 18 or later

## Next Steps

- Integrate with the full journey schema system
- Add file output for generated journeys
- Create interactive CLI for journey generation
- Add validation against existing journey patterns
