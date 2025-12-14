import { z } from 'zod';

// Schema for AI-generated journey metadata
export const JourneyMetadataSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    slug: z.string(),
    department: z.string(),
    departmentSlug: z.string(),
    type: z.enum(['data-entry', 'data-lookup']),
    enabled: z.boolean().optional(), // Make optional for now due to API warning
});

// Schema for final index entries
export const IndexEntrySchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    slug: z.string(),
    department: z.string(),
    departmentSlug: z.string(),
    type: z.string(),
    enabled: z.boolean(),
    created: z.string(),
});

// Schema for simple test generation
export const TestSchema = z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    priority: z.enum(['low', 'medium', 'high']),
});

// Type exports for convenience
export type JourneyMetadata = z.infer<typeof JourneyMetadataSchema>;
export type IndexEntry = z.infer<typeof IndexEntrySchema>;
export type TestData = z.infer<typeof TestSchema>;
