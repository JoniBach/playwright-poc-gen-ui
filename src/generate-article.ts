#!/usr/bin/env node
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import dotenv from 'dotenv';
import inquirer from 'inquirer';
import { runPreflight } from './preflight.js';

// Load environment variables
dotenv.config();

// Define the article schema
const ArticleSchema = z.object({
    title: z.string().describe('The article title'),
    author: z.string().describe('The author name'),
    summary: z.string().describe('A brief summary of the article'),
    sections: z.array(z.object({
        heading: z.string().describe('Section heading'),
        content: z.string().describe('Section content')
    })).describe('Article sections'),
    tags: z.array(z.string()).describe('Article tags/keywords'),
    wordCount: z.number().describe('Approximate word count')
});

type Article = z.infer<typeof ArticleSchema>;

async function generateArticle(topic: string, tone: string, length: string): Promise<Article | null> {
    const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        organization: process.env.OPENAI_ORG_ID,
    });

    console.log('\n🤖 Generating article...\n');

    try {
        const completion = await client.beta.chat.completions.parse({
            model: process.env.OPENAI_MODEL || 'gpt-4o-2024-08-06',
            messages: [
                {
                    role: 'system',
                    content: `You are a professional article writer. Generate well-structured articles with clear sections.
                    
The article should have:
- A compelling title
- An author name
- A brief summary
- Multiple sections with headings and content
- Relevant tags
- Accurate word count`
                },
                { 
                    role: 'user', 
                    content: `Write a ${length} article about "${topic}" in a ${tone} tone.` 
                },
            ],
            response_format: zodResponseFormat(ArticleSchema, 'article'),
        });

        const message = completion.choices[0]?.message;
        
        if (message?.parsed) {
            return message.parsed;
        } else if (message?.refusal) {
            console.error('❌ Request was refused:', message.refusal);
            return null;
        } else {
            console.error('❌ No response received');
            return null;
        }
    } catch (error) {
        if (error instanceof Error) {
            console.error('❌ Error:', error.message);
        } else {
            console.error('❌ Unknown error occurred');
        }
        return null;
    }
}

function displayArticle(article: Article) {
    console.log('\n' + '═'.repeat(60));
    console.log('📄 GENERATED ARTICLE');
    console.log('═'.repeat(60));
    
    console.log(`\n📌 Title: ${article.title}`);
    console.log(`✍️  Author: ${article.author}`);
    console.log(`📊 Word Count: ${article.wordCount}`);
    console.log(`🏷️  Tags: ${article.tags.join(', ')}`);
    
    console.log(`\n📝 Summary:`);
    console.log(`   ${article.summary}`);
    
    console.log(`\n📖 Content:\n`);
    article.sections.forEach((section, index) => {
        console.log(`${index + 1}. ${section.heading}`);
        console.log(`   ${section.content}\n`);
    });
    
    console.log('═'.repeat(60));
    console.log('\n📄 Full JSON Output:\n');
    console.log(JSON.stringify(article, null, 2));
    console.log('\n');
}

async function main() {
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║         OpenAI Structured Output - Article Generator  ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    // Run preflight checks
    const preflightResult = await runPreflight();
    
    if (!preflightResult.success) {
        console.error('\n❌ Preflight checks failed. Please fix the errors above.\n');
        process.exit(1);
    }

    console.log('🚀 Ready to generate article!\n');

    // Prompt user for article details
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'topic',
            message: 'What topic should the article be about?',
            default: 'The benefits of TypeScript in modern web development',
            validate: (input: string) => {
                if (input.trim().length === 0) {
                    return 'Please enter a topic';
                }
                return true;
            }
        },
        {
            type: 'list',
            name: 'tone',
            message: 'What tone should the article have?',
            choices: [
                { name: 'Professional', value: 'professional' },
                { name: 'Casual', value: 'casual' },
                { name: 'Academic', value: 'academic' },
                { name: 'Humorous', value: 'humorous' },
                { name: 'Technical', value: 'technical' }
            ],
            default: 'professional'
        },
        {
            type: 'list',
            name: 'length',
            message: 'How long should the article be?',
            choices: [
                { name: 'Very Short (200-300 words)', value: 'very short (200-300 words)' },
                { name: 'Short (400-500 words)', value: 'short (400-500 words)' },
                { name: 'Medium (600-800 words)', value: 'medium (600-800 words)' }
            ],
            default: 'very short (200-300 words)'
        },
        {
            type: 'confirm',
            name: 'confirm',
            message: 'Generate article with these settings?',
            default: true
        }
    ]);

    if (!answers.confirm) {
        console.log('\n❌ Generation cancelled\n');
        process.exit(0);
    }

    // Generate the article
    const article = await generateArticle(answers.topic, answers.tone, answers.length);

    if (article) {
        displayArticle(article);
        console.log('✅ Article generated successfully!\n');
    } else {
        console.log('❌ Failed to generate article\n');
        process.exit(1);
    }
}

main();
