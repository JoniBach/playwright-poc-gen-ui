import type { JourneyAnalysis } from './user-story.schema.js';
import {
	UserStorySchema,
	JourneyStoriesSchema,
	AcceptanceCriterionSchema,
	TestScenarioSchema,
	type UserStory,
	type JourneyStories,
	type AcceptanceCriterion,
	type TestScenario
} from './user-story.schema.js';
import {
	generateValidationCriteria,
	analyzeComponentInteractions,
	estimateComplexity
} from './journey-analyzer.js';

/**
 * Tier 2: AI-Enhanced Story Generation
 * Uses OpenAI to generate rich, contextual user stories and acceptance criteria.
 */

export interface StoryGeneratorConfig {
	openaiApiKey?: string;
	model?: string;
	includeTestScenarios?: boolean;
	maxStoriesPerJourney?: number;
}

/**
 * Generate user stories from journey analysis using OpenAI
 */
export async function generateUserStories(
	analysis: JourneyAnalysis,
	config: StoryGeneratorConfig = {}
): Promise<JourneyStories> {
	const {
		model = 'gpt-4o-mini',
		includeTestScenarios = true,
		maxStoriesPerJourney = 10
	} = config;

	// Check for OpenAI API key
	const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
	if (!apiKey) {
		console.warn('⚠️  No OpenAI API key provided. Falling back to deterministic generation.');
		return generateStoriesDeterministic(analysis);
	}

	try {
		// Generate stories using OpenAI structured output
		const stories = await generateStoriesWithAI(analysis, apiKey, model, includeTestScenarios);

		// Limit number of stories if needed
		const limitedStories = stories.slice(0, maxStoriesPerJourney);

		// Calculate summary
		const summary = calculateSummary(limitedStories);

		const journeyStories: JourneyStories = {
			journeyId: analysis.journeyId,
			journeyTitle: analysis.metadata.title || analysis.journeyId,
			journeyDescription: analysis.metadata.description,
			generatedAt: new Date().toISOString(),
			totalPages: analysis.statistics.totalPages,
			totalComponents: analysis.statistics.totalComponents,
			stories: limitedStories,
			summary
		};

		return JourneyStoriesSchema.parse(journeyStories);
	} catch (error) {
		console.error('Error generating stories with AI:', error);
		console.log('Falling back to deterministic generation...');
		return generateStoriesDeterministic(analysis);
	}
}

/**
 * Generate stories using OpenAI with structured output
 */
async function generateStoriesWithAI(
	analysis: JourneyAnalysis,
	apiKey: string,
	model: string,
	includeTestScenarios: boolean
): Promise<UserStory[]> {
	const stories: UserStory[] = [];

	// Group pages by user flow for better story generation
	const pageGroups = groupPagesForStories(analysis);

	console.log(`   📝 Generating ${pageGroups.length} stories with AI...`);
	
	for (let i = 0; i < pageGroups.length; i++) {
		const group = pageGroups[i];
		console.log(`   ⏳ Story ${i + 1}/${pageGroups.length}: ${group.theme}...`);
		
		const story = await generateStoryForPageGroup(
			analysis,
			group,
			apiKey,
			model,
			includeTestScenarios
		);
		if (story) {
			stories.push(story);
			console.log(`   ✓ Story ${i + 1}/${pageGroups.length} complete`);
		}
	}

	return stories;
}

/**
 * Group pages into logical story units
 */
function groupPagesForStories(analysis: JourneyAnalysis): Array<{
	pages: string[];
	theme: string;
}> {
	const groups: Array<{ pages: string[]; theme: string }> = [];

	// Group 1: Start/Introduction pages (first 1-2 pages)
	const startPages = analysis.pages.slice(0, Math.min(2, analysis.pages.length));
	if (startPages.length > 0) {
		groups.push({
			pages: startPages.map(p => p.id),
			theme: 'journey-start'
		});
	}

	// Group 2: Data entry pages (pages with forms)
	const dataEntryPages = analysis.pages.filter(p =>
		p.components.some(c => ['textInput', 'email', 'tel', 'textarea', 'dateInput'].includes(c.type))
	);
	if (dataEntryPages.length > 0) {
		groups.push({
			pages: dataEntryPages.map(p => p.id),
			theme: 'data-entry'
		});
	}

	// Group 3: Selection pages (pages with radios/checkboxes)
	const selectionPages = analysis.pages.filter(p =>
		p.components.some(c => ['radios', 'checkboxes', 'select'].includes(c.type))
	);
	if (selectionPages.length > 0) {
		groups.push({
			pages: selectionPages.map(p => p.id),
			theme: 'selection'
		});
	}

	// Group 4: Review/Summary pages (pages with summaryList)
	const reviewPages = analysis.pages.filter(p =>
		p.components.some(c => c.type === 'summaryList')
	);
	if (reviewPages.length > 0) {
		groups.push({
			pages: reviewPages.map(p => p.id),
			theme: 'review'
		});
	}

	// Group 5: Completion pages (last page or pages with success/panel)
	const completionPages = analysis.pages.filter(p =>
		p.components.some(c => ['panel', 'notificationBanner'].includes(c.type)) ||
		p.id === analysis.pages[analysis.pages.length - 1]?.id
	);
	if (completionPages.length > 0) {
		groups.push({
			pages: completionPages.map(p => p.id),
			theme: 'completion'
		});
	}

	return groups;
}

/**
 * Generate a single user story for a group of pages using OpenAI
 */
async function generateStoryForPageGroup(
	analysis: JourneyAnalysis,
	group: { pages: string[]; theme: string },
	apiKey: string,
	model: string,
	includeTestScenarios: boolean
): Promise<UserStory | null> {
	const relevantPages = analysis.pages.filter(p => group.pages.includes(p.id));
	if (relevantPages.length === 0) return null;

	// Build context for AI
	const context = buildStoryContext(analysis, relevantPages, group.theme);

	// Call OpenAI API with structured output
	const response = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model,
			messages: [
				{
					role: 'system',
					content: `You are an expert business analyst and QA engineer. Generate user stories and acceptance criteria for government digital services based on journey configurations. Focus on user needs, accessibility, and testability.`
				},
				{
					role: 'user',
					content: context
				}
			],
			response_format: {
				type: 'json_schema',
				json_schema: {
					name: 'user_story',
					strict: true,
					schema: {
						type: 'object',
						properties: {
							title: { type: 'string' },
							asA: { type: 'string' },
							iWant: { type: 'string' },
							soThat: { type: 'string' },
							description: { type: 'string' },
							acceptanceCriteria: {
								type: 'array',
								items: {
									type: 'object',
									properties: {
										given: { type: 'string' },
										when: { type: 'string' },
										then: { type: 'string' },
										priority: { type: 'string', enum: ['must', 'should', 'could'] },
										testable: { type: 'boolean' },
										tags: { type: 'array', items: { type: 'string' } }
									},
									required: ['given', 'when', 'then', 'priority', 'testable', 'tags'],
									additionalProperties: false
								}
							},
							testScenarios: {
								type: 'array',
								items: {
									type: 'object',
									properties: {
										id: { type: 'string' },
										title: { type: 'string' },
										description: { type: 'string' },
										steps: { type: 'array', items: { type: 'string' } },
										expectedResult: { type: 'string' },
										pageIds: { type: 'array', items: { type: 'string' } },
										componentTypes: { type: 'array', items: { type: 'string' } },
										priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
										tags: { type: 'array', items: { type: 'string' } }
									},
									required: ['id', 'title', 'description', 'steps', 'expectedResult', 'pageIds', 'componentTypes', 'priority', 'tags'],
									additionalProperties: false
								}
							},
							estimatedComplexity: { type: 'string', enum: ['simple', 'medium', 'complex'] },
							tags: { type: 'array', items: { type: 'string' } }
						},
						required: ['title', 'asA', 'iWant', 'soThat', 'description', 'acceptanceCriteria', 'testScenarios', 'estimatedComplexity', 'tags'],
						additionalProperties: false
					}
				}
			}
		})
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`OpenAI API error: ${response.status} - ${error}`);
	}

	const data = await response.json();
	const aiStory = JSON.parse(data.choices[0].message.content);

	// Build complete user story with metadata
	const storyId = `${analysis.journeyId}-${group.theme}-${Date.now()}`;
	const componentCounts: Record<string, number> = {};
	relevantPages.forEach(page => {
		Object.entries(page.componentSummary).forEach(([type, count]) => {
			componentCounts[type] = (componentCounts[type] || 0) + (count as number);
		});
	});

	const story: UserStory = {
		id: storyId,
		journeyId: analysis.journeyId,
		title: aiStory.title,
		asA: aiStory.asA,
		iWant: aiStory.iWant,
		soThat: aiStory.soThat,
		description: aiStory.description,
		acceptanceCriteria: aiStory.acceptanceCriteria,
		testScenarios: aiStory.testScenarios,
		pages: group.pages,
		components: Object.entries(componentCounts).map(([type, count]) => ({ type, count })),
		estimatedComplexity: aiStory.estimatedComplexity,
		tags: aiStory.tags
	};

	return UserStorySchema.parse(story);
}

/**
 * Build context string for AI story generation
 */
function buildStoryContext(
	analysis: JourneyAnalysis,
	pages: JourneyAnalysis['pages'],
	theme: string
): string {
	const pageDetails = pages.map(page => {
		const components = page.components.map(c => `  - ${c.type}: ${JSON.stringify(c.props || {})}`).join('\n');
		return `Page: ${page.id} (${page.title})\nComponents:\n${components}`;
	}).join('\n\n');

	const validationRules = analysis.validationRules
		.filter(rule => pages.some(p => p.id === rule.pageId))
		.map(rule => `- ${rule.fieldName} (${rule.fieldType}): ${rule.rules.map(r => r.type).join(', ')}`)
		.join('\n');

	return `Generate a user story for the following pages in a ${analysis.metadata.title} journey.

Theme: ${theme}
Journey: ${analysis.journeyId}

${pageDetails}

${validationRules ? `Validation Rules:\n${validationRules}` : ''}

Generate:
1. A clear user story (As a... I want... So that...)
2. 3-7 acceptance criteria in Given-When-Then format
3. 2-5 test scenarios suitable for Playwright automation
4. Appropriate tags for categorization

Focus on:
- User needs and benefits
- Accessibility requirements
- Form validation
- Navigation flow
- Error handling
- GOV.UK Design System compliance`;
}

/**
 * Fallback: Generate stories deterministically (without AI)
 */
function generateStoriesDeterministic(analysis: JourneyAnalysis): JourneyStories {
	const stories: UserStory[] = [];

	// Generate one story per major page group
	const pageGroups = groupPagesForStories(analysis);

	pageGroups.forEach((group, index) => {
		const relevantPages = analysis.pages.filter(p => group.pages.includes(p.id));
		const storyId = `${analysis.journeyId}-${group.theme}-${index + 1}`;

		// Generate basic acceptance criteria from validation rules
		const validationCriteria = generateValidationCriteria(
			analysis.validationRules.filter(rule => group.pages.includes(rule.pageId))
		);

		// Convert to proper format
		const acceptanceCriteria: AcceptanceCriterion[] = validationCriteria.map((vc, i) => ({
			given: vc.given,
			when: vc.when,
			then: vc.then,
			priority: vc.priority,
			testable: true,
			tags: ['validation']
		}));

		// Add navigation criteria
		if (relevantPages.some(p => p.navigation.nextPage)) {
			acceptanceCriteria.push({
				given: 'I have completed all required fields',
				when: 'I click the continue button',
				then: 'I should navigate to the next page',
				priority: 'must',
				testable: true,
				tags: ['navigation']
			});
		}

		// Generate basic test scenarios
		const interactions = analyzeComponentInteractions(relevantPages);
		const testScenarios: TestScenario[] = interactions.map((interaction, i) => ({
			id: `${storyId}-test-${i + 1}`,
			title: `Test ${interaction.interactionType} on ${interaction.pageId}`,
			description: interaction.description,
			steps: [
				`Navigate to ${interaction.pageId}`,
				interaction.description,
				'Verify expected behavior'
			],
			expectedResult: 'Interaction completes successfully',
			pageIds: [interaction.pageId],
			componentTypes: interaction.components,
			priority: interaction.interactionType === 'form-submission' ? 'critical' : 'high',
			tags: [interaction.interactionType, group.theme]
		}));

		// Component summary
		const componentCounts: Record<string, number> = {};
		relevantPages.forEach(page => {
			Object.entries(page.componentSummary).forEach(([type, count]) => {
				componentCounts[type] = (componentCounts[type] || 0) + (count as number);
			});
		});

		const story: UserStory = {
			id: storyId,
			journeyId: analysis.journeyId,
			title: `${group.theme.replace('-', ' ')} - ${analysis.metadata.title}`,
			asA: 'user of the service',
			iWant: `to complete the ${group.theme.replace('-', ' ')} step`,
			soThat: 'I can progress through the journey',
			description: `This story covers ${relevantPages.length} page(s) related to ${group.theme}`,
			acceptanceCriteria,
			testScenarios,
			pages: group.pages,
			components: Object.entries(componentCounts).map(([type, count]) => ({ type, count })),
			estimatedComplexity: estimateComplexity(analysis),
			tags: [group.theme, 'deterministic']
		};

		stories.push(story);
	});

	const summary = calculateSummary(stories);

	return {
		journeyId: analysis.journeyId,
		journeyTitle: analysis.metadata.title || analysis.journeyId,
		journeyDescription: analysis.metadata.description,
		generatedAt: new Date().toISOString(),
		totalPages: analysis.statistics.totalPages,
		totalComponents: analysis.statistics.totalComponents,
		stories,
		summary
	};
}

/**
 * Calculate summary statistics for generated stories
 */
function calculateSummary(stories: UserStory[]): JourneyStories['summary'] {
	const complexityBreakdown: Record<string, number> = {
		simple: 0,
		medium: 0,
		complex: 0
	};

	const componentCoverage: Record<string, number> = {};

	stories.forEach(story => {
		complexityBreakdown[story.estimatedComplexity]++;
		story.components.forEach(({ type, count }) => {
			componentCoverage[type] = (componentCoverage[type] || 0) + count;
		});
	});

	return {
		totalStories: stories.length,
		totalAcceptanceCriteria: stories.reduce((sum, s) => sum + s.acceptanceCriteria.length, 0),
		totalTestScenarios: stories.reduce((sum, s) => sum + s.testScenarios.length, 0),
		complexityBreakdown,
		componentCoverage
	};
}
