# Article Generator - Structured Output Example

A simple, interactive example demonstrating OpenAI's structured output with Zod schemas.

## What It Does

This script shows how to:
1. ✅ Run preflight checks to validate configuration
2. 📝 Prompt users with multiple questions
3. 🤖 Send structured requests to OpenAI
4. ✅ Receive validated JSON responses
5. 📄 Display formatted output

## Quick Start

```bash
npm run generate:article
```

## Interactive Prompts

You'll be asked:

1. **Topic**: What should the article be about?
   - Example: "The benefits of TypeScript"

2. **Tone**: What style should it have?
   - Professional
   - Casual
   - Academic
   - Humorous
   - Technical

3. **Length**: How long should it be?
   - Very Short (200-300 words)
   - Short (400-500 words)
   - Medium (600-800 words)

4. **Confirmation**: Proceed with generation?

## Example Output

```
📄 GENERATED ARTICLE
═══════════════════════════════════════════════════════════

📌 Title: TypeScript: The Modern Developer's Secret Weapon
✍️  Author: Alex Thompson
📊 Word Count: 285
🏷️  Tags: TypeScript, JavaScript, Web Development, Programming

📝 Summary:
   An exploration of how TypeScript enhances modern web development...

📖 Content:

1. Introduction to TypeScript
   TypeScript has revolutionized the way developers write JavaScript...

2. Key Benefits
   The primary advantages of TypeScript include type safety...

3. Conclusion
   As web applications grow in complexity...

═══════════════════════════════════════════════════════════

📄 Full JSON Output:

{
  "title": "TypeScript: The Modern Developer's Secret Weapon",
  "author": "Alex Thompson",
  "summary": "An exploration of how TypeScript enhances...",
  "sections": [
    {
      "heading": "Introduction to TypeScript",
      "content": "TypeScript has revolutionized..."
    },
    ...
  ],
  "tags": ["TypeScript", "JavaScript", "Web Development"],
  "wordCount": 285
}
```

## The Schema

```typescript
const ArticleSchema = z.object({
    title: z.string(),
    author: z.string(),
    summary: z.string(),
    sections: z.array(z.object({
        heading: z.string(),
        content: z.string()
    })),
    tags: z.array(z.string()),
    wordCount: z.number()
});
```

## How It Works

### 1. Preflight Checks
Automatically validates:
- API key is set and valid
- Model supports structured outputs
- API connection works
- Dependencies are installed

### 2. User Input
Uses `inquirer` to collect:
- Topic (text input)
- Tone (selection list)
- Length (selection list)
- Confirmation (yes/no)

### 3. OpenAI Request
```typescript
const completion = await client.beta.chat.completions.parse({
    model: 'gpt-4o-2024-08-06',
    messages: [...],
    response_format: zodResponseFormat(ArticleSchema, 'article'),
});
```

### 4. Validated Response
OpenAI returns JSON that **exactly matches** the schema:
- Type-safe
- Validated structure
- No parsing errors
- Guaranteed format

## Benefits

✅ **Type Safety**: Full TypeScript support  
✅ **Validation**: Automatic schema validation  
✅ **Reliability**: Guaranteed JSON structure  
✅ **User-Friendly**: Interactive prompts  
✅ **Error Handling**: Comprehensive checks  

## Customization

You can easily modify this example for other use cases:

- **Product Descriptions**: Generate structured product info
- **Meeting Notes**: Create formatted meeting summaries
- **Code Documentation**: Generate API documentation
- **Recipe Generator**: Create structured recipes
- **Quiz Generator**: Generate questions and answers

Just update the schema and prompts!

## Next Steps

1. Try generating different articles
2. Modify the schema for your use case
3. Add more prompt options
4. Save output to files
5. Integrate with your application
