import type { JourneyJson } from '../../../playwright-poc-ui/src/lib/schemas/journey.schema.js';
import type { Component } from '../../../playwright-poc-ui/src/lib/schemas/component.schema.js';
import { JourneyAnalysisSchema, type JourneyAnalysis, type ValidationRule } from './user-story.schema.js';

/**
 * Tier 1: Deterministic Journey Analysis
 * Extracts structured data from journey configurations for story generation.
 */

// Interactive component types that users interact with
const INTERACTIVE_COMPONENTS = new Set([
	'textInput', 'email', 'tel', 'textarea', 'dateInput',
	'radios', 'checkboxes', 'select', 'button'
]);

// Form input components that typically have validation
const FORM_INPUT_COMPONENTS = new Set([
	'textInput', 'email', 'tel', 'textarea', 'dateInput',
	'radios', 'checkboxes', 'select'
]);

/**
 * Analyze a journey configuration and extract structured data
 */
export function analyzeJourney(journey: JourneyJson, journeyId: string): JourneyAnalysis {
	const pages = Object.entries(journey.pages).map(([pageId, page]) => {
		const components = page.components.map((component, index) => {
			const isInteractive = INTERACTIVE_COMPONENTS.has(component.type);
			const hasValidation = FORM_INPUT_COMPONENTS.has(component.type) && 
				'props' in component &&
				component.props && 
				typeof component.props === 'object' &&
				'name' in component.props;

			return {
				type: component.type,
				index,
				props: ('props' in component ? component.props : undefined) as Record<string, any> | undefined,
				hasValidation,
				isInteractive
			};
		});

		// Count components by type
		const componentSummary: Record<string, number> = {};
		components.forEach(c => {
			componentSummary[c.type] = (componentSummary[c.type] || 0) + 1;
		});

		return {
			id: pageId,
			title: page.title,
			components,
			navigation: {
				nextPage: page.nextPage,
				previousPage: page.previousPage,
				hasConditionalRouting: !!(page.nextPage && page.nextPage.includes('?'))
			},
			componentSummary
		};
	});

	// Extract validation rules from components
	const validationRules: ValidationRule[] = [];
	pages.forEach(page => {
		page.components.forEach(component => {
			if (component.hasValidation && component.props?.name) {
				const rules: ValidationRule['rules'] = [];

				// Check for common validation patterns
				const props = component.props as any;
				
				// Required field (inferred from component type or explicit prop)
				if (props.required !== false) {
					rules.push({
						type: 'required',
						value: true,
						message: `${props.label || props.name} is required`
					});
				}

				// Email validation
				if (component.type === 'email') {
					rules.push({
						type: 'email',
						value: true,
						message: 'Enter a valid email address'
					});
				}

				// Tel validation
				if (component.type === 'tel') {
					rules.push({
						type: 'tel',
						value: true,
						message: 'Enter a valid phone number'
					});
				}

				// Max length
				if (props.maxlength) {
					rules.push({
						type: 'maxLength',
						value: props.maxlength,
						message: `Must be ${props.maxlength} characters or less`
					});
				}

				// Pattern validation
				if (props.pattern) {
					rules.push({
						type: 'pattern',
						value: props.pattern,
						message: props.patternMessage || 'Invalid format'
					});
				}

				if (rules.length > 0) {
					validationRules.push({
						fieldName: props.name,
						fieldType: component.type,
						rules,
						pageId: page.id,
						componentIndex: component.index
					});
				}
			}
		});
	});

	// Identify user flows (paths through the journey)
	const userFlows = identifyUserFlows(journey, journeyId);

	// Calculate statistics
	const totalComponents = pages.reduce((sum, page) => sum + page.components.length, 0);
	const interactiveComponents = pages.reduce(
		(sum, page) => sum + page.components.filter(c => c.isInteractive).length,
		0
	);
	const validatedFields = validationRules.length;

	const componentTypeBreakdown: Record<string, number> = {};
	pages.forEach(page => {
		Object.entries(page.componentSummary).forEach(([type, count]) => {
			componentTypeBreakdown[type] = (componentTypeBreakdown[type] || 0) + count;
		});
	});

	const analysis: JourneyAnalysis = {
		journeyId,
		metadata: {
			title: journey.name || journeyId,
			description: undefined,
			startPage: journey.startPage
		},
		pages,
		validationRules,
		userFlows,
		statistics: {
			totalPages: pages.length,
			totalComponents,
			interactiveComponents,
			validatedFields,
			componentTypeBreakdown
		}
	};

	// Validate against schema
	return JourneyAnalysisSchema.parse(analysis);
}

/**
 * Identify possible user flows through the journey
 */
function identifyUserFlows(journey: JourneyJson, journeyId: string): JourneyAnalysis['userFlows'] {
	const flows: JourneyAnalysis['userFlows'] = [];
	const visited = new Set<string>();
	
	// Main happy path
	const happyPath: string[] = [];
	let currentPage = journey.startPage;
	
	while (currentPage && !visited.has(currentPage)) {
		visited.add(currentPage);
		happyPath.push(currentPage);
		
		const page = journey.pages[currentPage];
		if (!page) break;
		
		// Follow the main nextPage (ignore conditional routing for happy path)
		currentPage = page.nextPage?.split('?')[0] || '';
	}
	
	if (happyPath.length > 0) {
		flows.push({
			name: 'Happy Path',
			path: happyPath,
			description: 'Main user flow through the journey from start to completion'
		});
	}

	// Identify alternative paths (if conditional routing exists)
	const conditionalPages = Object.entries(journey.pages)
		.filter(([_, page]) => page.nextPage && page.nextPage.includes('?'));
	
	if (conditionalPages.length > 0) {
		flows.push({
			name: 'Alternative Paths',
			path: conditionalPages.map(([id]) => id),
			description: 'Pages with conditional routing that may lead to different outcomes'
		});
	}

	// Back navigation flow (if any pages have previousPage)
	const backNavPages = Object.entries(journey.pages)
		.filter(([_, page]) => page.previousPage)
		.map(([id]) => id);
	
	if (backNavPages.length > 0) {
		flows.push({
			name: 'Back Navigation',
			path: backNavPages,
			description: 'Pages that support backward navigation'
		});
	}

	return flows;
}

/**
 * Generate basic acceptance criteria from validation rules (deterministic)
 */
export function generateValidationCriteria(validationRules: ValidationRule[]): Array<{
	given: string;
	when: string;
	then: string;
	priority: 'must' | 'should' | 'could';
}> {
	const criteria: Array<{
		given: string;
		when: string;
		then: string;
		priority: 'must' | 'should' | 'could';
	}> = [];

	validationRules.forEach(rule => {
		rule.rules.forEach(validationRule => {
			switch (validationRule.type) {
				case 'required':
					criteria.push({
						given: `I am on the page with the "${rule.fieldName}" field`,
						when: `I submit the form without entering a value in "${rule.fieldName}"`,
						then: `I should see an error message "${validationRule.message || 'This field is required'}"`,
						priority: 'must'
					});
					break;

				case 'email':
					criteria.push({
						given: `I am on the page with the "${rule.fieldName}" email field`,
						when: `I enter an invalid email format`,
						then: `I should see an error message "${validationRule.message || 'Enter a valid email address'}"`,
						priority: 'must'
					});
					break;

				case 'tel':
					criteria.push({
						given: `I am on the page with the "${rule.fieldName}" phone field`,
						when: `I enter an invalid phone number format`,
						then: `I should see an error message "${validationRule.message || 'Enter a valid phone number'}"`,
						priority: 'must'
					});
					break;

				case 'maxLength':
					criteria.push({
						given: `I am on the page with the "${rule.fieldName}" field`,
						when: `I enter more than ${validationRule.value} characters`,
						then: `I should see an error message "${validationRule.message || 'Input is too long'}"`,
						priority: 'should'
					});
					break;

				case 'pattern':
					criteria.push({
						given: `I am on the page with the "${rule.fieldName}" field`,
						when: `I enter a value that doesn't match the required pattern`,
						then: `I should see an error message "${validationRule.message || 'Invalid format'}"`,
						priority: 'must'
					});
					break;
			}
		});
	});

	return criteria;
}

/**
 * Analyze component interactions for test scenario generation
 */
export function analyzeComponentInteractions(pages: JourneyAnalysis['pages']): Array<{
	pageId: string;
	interactionType: string;
	components: string[];
	description: string;
}> {
	const interactions: Array<{
		pageId: string;
		interactionType: string;
		components: string[];
		description: string;
	}> = [];

	pages.forEach(page => {
		const formInputs = page.components.filter(c => FORM_INPUT_COMPONENTS.has(c.type));
		const buttons = page.components.filter(c => c.type === 'button');
		const radios = page.components.filter(c => c.type === 'radios');
		const checkboxes = page.components.filter(c => c.type === 'checkboxes');

		// Form submission interaction
		if (formInputs.length > 0 && buttons.length > 0) {
			interactions.push({
				pageId: page.id,
				interactionType: 'form-submission',
				components: [...formInputs.map(c => c.type), 'button'],
				description: `Complete and submit form with ${formInputs.length} input field(s)`
			});
		}

		// Radio selection interaction
		if (radios.length > 0) {
			interactions.push({
				pageId: page.id,
				interactionType: 'radio-selection',
				components: ['radios'],
				description: 'Select option from radio buttons'
			});
		}

		// Checkbox selection interaction
		if (checkboxes.length > 0) {
			interactions.push({
				pageId: page.id,
				interactionType: 'checkbox-selection',
				components: ['checkboxes'],
				description: 'Select one or more checkboxes'
			});
		}

		// Navigation interaction
		if (page.navigation.nextPage || page.navigation.previousPage) {
			interactions.push({
				pageId: page.id,
				interactionType: 'navigation',
				components: ['button'],
				description: `Navigate ${page.navigation.nextPage ? 'forward' : 'backward'}`
			});
		}
	});

	return interactions;
}

/**
 * Estimate journey complexity based on analysis
 */
export function estimateComplexity(analysis: JourneyAnalysis): 'simple' | 'medium' | 'complex' {
	const { totalPages, interactiveComponents, validatedFields } = analysis.statistics;
	const hasConditionalRouting = analysis.pages.some(p => p.navigation.hasConditionalRouting);

	// Simple: 1-3 pages, few inputs, no conditional routing
	if (totalPages <= 3 && interactiveComponents <= 5 && !hasConditionalRouting) {
		return 'simple';
	}

	// Complex: 10+ pages, many inputs, conditional routing
	if (totalPages >= 10 || interactiveComponents >= 20 || (hasConditionalRouting && validatedFields >= 10)) {
		return 'complex';
	}

	// Medium: everything else
	return 'medium';
}
