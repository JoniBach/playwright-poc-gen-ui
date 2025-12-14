
// Component schema for journey generation
import { z } from 'zod';
 // Import the actual schemas from the UI project
// Note: These are simplified versions - in production, import from the actual schema files
export const ComponentSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('heading'),
        id: z.string(),
        props: z.object({
            text: z.string(),
            size: z.enum(['s', 'm', 'l', 'xl']).nullable().optional(),
        }),
    }),
    z.object({
        type: z.literal('paragraph'),
        id: z.string(),
        props: z.object({
            text: z.string(),
        }),
    }),
    z.object({
        type: z.literal('textInput'),
        id: z.string(),
        props: z.object({
            id: z.string(), // Required by UI schema
            name: z.string(),
            label: z.string(),
            hint: z.string().nullable().optional(),
            value: z.string().nullable().optional(),
            type: z.enum(['text', 'email', 'tel', 'number']).nullable().optional(),
            autocomplete: z.string().nullable().optional(),
            width: z.enum(['5', '10', '20', '30', 'full']).nullable().optional(),
            disabled: z.boolean().nullable().optional(),
            readonly: z.boolean().nullable().optional(),
            spellcheck: z.boolean().nullable().optional(),
        }),
    }),
    z.object({
        type: z.literal('radios'),
        id: z.string(),
        props: z.object({
            id: z.string(),
            name: z.string(),
            legend: z.string(),
            hint: z.string().nullable().optional(),
            items: z.array(z.object({
                value: z.string(),
                text: z.string(),
                hint: z.string().nullable().optional(),
                checked: z.boolean().nullable().optional(),
                disabled: z.boolean().nullable().optional(),
            })),
        }),
    }),
    z.object({
        type: z.literal('checkboxes'),
        id: z.string(),
        props: z.object({
            id: z.string(),
            name: z.string(),
            legend: z.string(),
            hint: z.string().nullable().optional(),
            items: z.array(z.object({
                value: z.string(),
                text: z.string(),
                hint: z.string().nullable().optional(),
                checked: z.boolean().nullable().optional(),
                disabled: z.boolean().nullable().optional(),
            })),
        }),
    }),
    z.object({
        type: z.literal('button'),
        id: z.string(),
        props: z.object({
            text: z.string(),
            href: z.string().nullable().optional(),
        }),
    }),
    z.object({
        type: z.literal('insetText'),
        id: z.string(),
        props: z.object({
            text: z.string(),
        }),
    }),
    z.object({
        type: z.literal('warningText'),
        id: z.string(),
        props: z.object({
            content: z.string(), // UI schema uses 'content', not 'text'
            iconFallbackText: z.string().nullable().optional(),
        }),
    }),
]);