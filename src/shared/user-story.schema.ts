import { z } from 'zod';

/**
 * Zod schemas for user stories and acceptance criteria generation.
 * These schemas enable OpenAI structured output generation.
 */

// Gherkin-style acceptance criterion
export const AcceptanceCriterionSchema = z.object({
	given: z.string().describe('The initial context or precondition'),
	when: z.string().describe('The action or event that triggers the scenario'),
	then: z.string().describe('The expected outcome or result'),
	priority: z.enum(['must', 'should', 'could']).describe('MoSCoW priority'),
	testable: z.boolean().describe('Whether this can be automated in Playwright'),
	tags: z.array(z.string()).optional().describe('Tags for categorization (e.g., validation, navigation, accessibility)')
});

export type AcceptanceCriterion = z.infer<typeof AcceptanceCriterionSchema>;

// Test scenario for Playwright generation
export const TestScenarioSchema = z.object({
	id: z.string().describe('Unique identifier for the test scenario'),
	title: z.string().describe('Descriptive title for the test'),
	description: z.string().describe('What the test validates'),
	steps: z.array(z.string()).describe('Step-by-step test actions'),
	expectedResult: z.string().describe('What should happen if the test passes'),
	pageIds: z.array(z.string()).describe('Journey pages involved in this test'),
	componentTypes: z.array(z.string()).describe('Component types being tested'),
	priority: z.enum(['critical', 'high', 'medium', 'low']).describe('Test priority'),
	tags: z.array(z.string()).describe('Test tags (e.g., smoke, regression, accessibility)')
});

export type TestScenario = z.infer<typeof TestScenarioSchema>;

// User story in standard format
export const UserStorySchema = z.object({
	id: z.string().describe('Unique identifier (e.g., journey-page-001)'),
	journeyId: z.string().describe('The journey this story belongs to'),
	title: z.string().describe('Short, descriptive title'),
	asA: z.string().describe('User role or persona'),
	iWant: z.string().describe('What the user wants to do'),
	soThat: z.string().describe('The benefit or value to the user'),
	description: z.string().optional().describe('Additional context or background'),
	acceptanceCriteria: z.array(AcceptanceCriterionSchema).describe('Acceptance criteria in Given-When-Then format'),
	testScenarios: z.array(TestScenarioSchema).describe('Test scenarios for Playwright'),
	pages: z.array(z.string()).describe('Journey pages covered by this story'),
	components: z.array(z.object({
		type: z.string(),
		count: z.number()
	})).describe('Component types and counts in this story'),
	estimatedComplexity: z.enum(['simple', 'medium', 'complex']).describe('Implementation complexity'),
	tags: z.array(z.string()).describe('Story tags (e.g., form-validation, data-entry, navigation)')
});

export type UserStory = z.infer<typeof UserStorySchema>;

// Collection of user stories for a journey
export const JourneyStoriesSchema = z.object({
	journeyId: z.string(),
	journeyTitle: z.string(),
	journeyDescription: z.string().optional(),
	generatedAt: z.string().describe('ISO timestamp'),
	totalPages: z.number(),
	totalComponents: z.number(),
	stories: z.array(UserStorySchema),
	summary: z.object({
		totalStories: z.number(),
		totalAcceptanceCriteria: z.number(),
		totalTestScenarios: z.number(),
		complexityBreakdown: z.record(z.string(), z.number()).describe('Count by complexity level'),
		componentCoverage: z.record(z.string(), z.number()).describe('Components covered across all stories')
	})
});

export type JourneyStories = z.infer<typeof JourneyStoriesSchema>;

// Validation rule analysis (extracted from journey config)
export const ValidationRuleSchema = z.object({
	fieldName: z.string(),
	fieldType: z.string(),
	rules: z.array(z.object({
		type: z.string().describe('e.g., required, minLength, pattern'),
		value: z.union([z.string(), z.number(), z.boolean()]).optional(),
		message: z.string().optional()
	})),
	pageId: z.string(),
	componentIndex: z.number()
});

export type ValidationRule = z.infer<typeof ValidationRuleSchema>;

// Journey analysis (Tier 1 output - deterministic extraction)
export const JourneyAnalysisSchema = z.object({
	journeyId: z.string(),
	metadata: z.object({
		title: z.string().optional(),
		description: z.string().optional(),
		startPage: z.string()
	}),
	pages: z.array(z.object({
		id: z.string(),
		title: z.string(),
		components: z.array(z.object({
			type: z.string(),
			index: z.number(),
			props: z.record(z.string(), z.unknown()).optional(),
			hasValidation: z.boolean(),
			isInteractive: z.boolean()
		})),
		navigation: z.object({
			nextPage: z.string().optional(),
			previousPage: z.string().optional(),
			hasConditionalRouting: z.boolean()
		}),
		componentSummary: z.record(z.string(), z.number()).describe('Count by component type')
	})),
	validationRules: z.array(ValidationRuleSchema),
	userFlows: z.array(z.object({
		name: z.string(),
		path: z.array(z.string()).describe('Sequence of page IDs'),
		description: z.string()
	})),
	statistics: z.object({
		totalPages: z.number(),
		totalComponents: z.number(),
		interactiveComponents: z.number(),
		validatedFields: z.number(),
		componentTypeBreakdown: z.record(z.string(), z.number())
	})
});

export type JourneyAnalysis = z.infer<typeof JourneyAnalysisSchema>;
