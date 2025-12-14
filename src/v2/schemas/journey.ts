
import { z } from 'zod';
import { ComponentSchema } from './component';


const JourneyPageSchema = z.object({
    id: z.string(),
    title: z.string(),
    components: z.array(ComponentSchema),
    nextPage: z.string().nullable().optional(),
    previousPage: z.string().nullable().optional(),
});

const LandingPageSectionSchema = z.object({
    type: z.enum(['paragraph', 'heading', 'list', 'insetText', 'warningText', 'details']),
    content: z.union([z.string(), z.array(z.string())]),
    level: z.enum(['s', 'm', 'l', 'xl']).nullable().optional(),
    summary: z.string().nullable().optional(),
    listType: z.enum(['bullet', 'number']).nullable().optional(),
});

const LandingPageSchema = z.object({
    title: z.string(),
    lead: z.string(),
    sections: z.array(LandingPageSectionSchema),
    startButtonText: z.string().nullable().optional(),
    startButtonHref: z.string(),
});

// For OpenAI structured outputs, we need to use an array instead of a record
const JourneyPageWithIdSchema = z.object({
    id: z.string(),
    title: z.string(),
    components: z.array(ComponentSchema),
    nextPage: z.string().nullable().optional(),
    previousPage: z.string().nullable().optional(),
});

const JourneySchemaForAI = z.object({
    id: z.string(),
    name: z.string(),
    landingPage: LandingPageSchema.nullable().optional(),
    startPage: z.string(),
    pages: z.array(JourneyPageWithIdSchema), // Array instead of record for OpenAI
    checkYourAnswersPage: z.string().nullable().optional(),
    completionPage: z.string().nullable().optional(),
});

// Final schema with record for actual use
const JourneySchema = z.object({
    id: z.string(),
    name: z.string(),
    landingPage: LandingPageSchema.nullable().optional(),
    startPage: z.string(),
    pages: z.record(z.string(), JourneyPageSchema),
    checkYourAnswersPage: z.string().nullable().optional(),
    completionPage: z.string().nullable().optional(),
});

export { JourneySchema, JourneySchemaForAI, ComponentSchema };
export type JourneyJson = z.infer<typeof JourneySchema>;