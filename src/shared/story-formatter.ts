import type { JourneyStories, UserStory, AcceptanceCriterion, TestScenario } from './user-story.schema.js';

/**
 * Format user stories and acceptance criteria for various output formats
 */

/**
 * Format stories as Markdown
 */
export function formatAsMarkdown(journeyStories: JourneyStories): string {
	const lines: string[] = [];

	// Header
	lines.push(`# User Stories: ${journeyStories.journeyTitle}`);
	lines.push('');
	if (journeyStories.journeyDescription) {
		lines.push(journeyStories.journeyDescription);
		lines.push('');
	}
	lines.push(`**Generated:** ${new Date(journeyStories.generatedAt).toLocaleString()}`);
	lines.push(`**Journey ID:** \`${journeyStories.journeyId}\``);
	lines.push('');

	// Summary
	lines.push('## Summary');
	lines.push('');
	lines.push(`- **Total Pages:** ${journeyStories.totalPages}`);
	lines.push(`- **Total Components:** ${journeyStories.totalComponents}`);
	lines.push(`- **User Stories:** ${journeyStories.summary.totalStories}`);
	lines.push(`- **Acceptance Criteria:** ${journeyStories.summary.totalAcceptanceCriteria}`);
	lines.push(`- **Test Scenarios:** ${journeyStories.summary.totalTestScenarios}`);
	lines.push('');

	// Complexity breakdown
	lines.push('### Complexity Breakdown');
	lines.push('');
	Object.entries(journeyStories.summary.complexityBreakdown).forEach(([complexity, count]) => {
		if ((count as number) > 0) {
			lines.push(`- **${complexity}:** ${count} ${(count as number) === 1 ? 'story' : 'stories'}`);
		}
	});
	lines.push('');

	// Component coverage
	lines.push('### Component Coverage');
	lines.push('');
	const sortedComponents = Object.entries(journeyStories.summary.componentCoverage)
		.sort(([, a], [, b]) => (b as number) - (a as number));
	sortedComponents.forEach(([type, count]) => {
		lines.push(`- **${type}:** ${count}`);
	});
	lines.push('');
	lines.push('---');
	lines.push('');

	// Individual stories
	journeyStories.stories.forEach((story, index) => {
		lines.push(`## Story ${index + 1}: ${story.title}`);
		lines.push('');
		lines.push(`**ID:** \`${story.id}\``);
		lines.push(`**Complexity:** ${story.estimatedComplexity}`);
		lines.push(`**Tags:** ${story.tags.map(t => `\`${t}\``).join(', ')}`);
		lines.push('');

		// User story
		lines.push('### User Story');
		lines.push('');
		lines.push(`> **As a** ${story.asA}`);
		lines.push(`> **I want** ${story.iWant}`);
		lines.push(`> **So that** ${story.soThat}`);
		lines.push('');

		if (story.description) {
			lines.push('**Description:**');
			lines.push('');
			lines.push(story.description);
			lines.push('');
		}

		// Pages covered
		lines.push('**Pages:** ' + story.pages.map(p => `\`${p}\``).join(', '));
		lines.push('');

		// Components
		if (story.components.length > 0) {
			lines.push('**Components:**');
			lines.push('');
			story.components.forEach(({ type, count }) => {
				lines.push(`- ${type}: ${count as number}`);
			});
			lines.push('');
		}

		// Acceptance Criteria
		lines.push('### Acceptance Criteria');
		lines.push('');
		story.acceptanceCriteria.forEach((ac, acIndex) => {
			const priority = ac.priority.toUpperCase();
			const testable = ac.testable ? '✅' : '⚠️';
			lines.push(`#### ${acIndex + 1}. [${priority}] ${testable}`);
			lines.push('');
			lines.push(`- **Given** ${ac.given}`);
			lines.push(`- **When** ${ac.when}`);
			lines.push(`- **Then** ${ac.then}`);
			if (ac.tags && ac.tags.length > 0) {
				lines.push(`- **Tags:** ${ac.tags.map(t => `\`${t}\``).join(', ')}`);
			}
			lines.push('');
		});

		// Test Scenarios
		if (story.testScenarios.length > 0) {
			lines.push('### Test Scenarios');
			lines.push('');
			story.testScenarios.forEach((ts, tsIndex) => {
				lines.push(`#### ${tsIndex + 1}. ${ts.title} [${ts.priority}]`);
				lines.push('');
				lines.push(`**ID:** \`${ts.id}\``);
				lines.push(`**Description:** ${ts.description}`);
				lines.push('');
				lines.push('**Steps:**');
				lines.push('');
				ts.steps.forEach((step, stepIndex) => {
					lines.push(`${stepIndex + 1}. ${step}`);
				});
				lines.push('');
				lines.push(`**Expected Result:** ${ts.expectedResult}`);
				lines.push('');
				lines.push(`**Pages:** ${ts.pageIds.map(p => `\`${p}\``).join(', ')}`);
				lines.push(`**Components:** ${ts.componentTypes.map(c => `\`${c}\``).join(', ')}`);
				lines.push(`**Tags:** ${ts.tags.map(t => `\`${t}\``).join(', ')}`);
				lines.push('');
			});
		}

		lines.push('---');
		lines.push('');
	});

	return lines.join('\n');
}

/**
 * Format stories as Gherkin feature files (for BDD)
 */
export function formatAsGherkin(journeyStories: JourneyStories): string {
	const lines: string[] = [];

	lines.push(`Feature: ${journeyStories.journeyTitle}`);
	if (journeyStories.journeyDescription) {
		lines.push(`  ${journeyStories.journeyDescription}`);
	}
	lines.push('');

	journeyStories.stories.forEach(story => {
		lines.push(`  Scenario: ${story.title}`);
		lines.push(`    # Story: As a ${story.asA}, I want ${story.iWant}, so that ${story.soThat}`);
		lines.push(`    # ID: ${story.id}`);
		lines.push(`    # Pages: ${story.pages.join(', ')}`);
		lines.push('');

		// Use first acceptance criterion as the main scenario
		if (story.acceptanceCriteria.length > 0) {
			const ac = story.acceptanceCriteria[0];
			lines.push(`    Given ${ac.given}`);
			lines.push(`    When ${ac.when}`);
			lines.push(`    Then ${ac.then}`);
			lines.push('');
		}

		// Additional acceptance criteria as scenario outlines or examples
		if (story.acceptanceCriteria.length > 1) {
			story.acceptanceCriteria.slice(1).forEach(ac => {
				lines.push(`  Scenario: ${story.title} - ${ac.priority}`);
				lines.push(`    Given ${ac.given}`);
				lines.push(`    When ${ac.when}`);
				lines.push(`    Then ${ac.then}`);
				lines.push('');
			});
		}
	});

	return lines.join('\n');
}

/**
 * Format stories as JSON (for programmatic use)
 */
export function formatAsJSON(journeyStories: JourneyStories): string {
	return JSON.stringify(journeyStories, null, 2);
}

/**
 * Format stories as CSV (for spreadsheet import)
 */
export function formatAsCSV(journeyStories: JourneyStories): string {
	const lines: string[] = [];

	// Header
	lines.push('Story ID,Title,As A,I Want,So That,Priority,Complexity,Pages,AC Given,AC When,AC Then,AC Priority,Testable,Tags');

	// Rows
	journeyStories.stories.forEach(story => {
		story.acceptanceCriteria.forEach(ac => {
			const row = [
				story.id,
				escapeCSV(story.title),
				escapeCSV(story.asA),
				escapeCSV(story.iWant),
				escapeCSV(story.soThat),
				story.estimatedComplexity,
				story.pages.join('; '),
				escapeCSV(ac.given),
				escapeCSV(ac.when),
				escapeCSV(ac.then),
				ac.priority,
				ac.testable ? 'Yes' : 'No',
				(ac.tags || []).join('; ')
			];
			lines.push(row.join(','));
		});
	});

	return lines.join('\n');
}

function escapeCSV(value: string): string {
	if (value.includes(',') || value.includes('"') || value.includes('\n')) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

/**
 * Format test scenarios as Playwright test stubs (Tier 3 prep)
 */
export function formatAsPlaywrightStubs(journeyStories: JourneyStories): string {
	const lines: string[] = [];

	lines.push(`import { test, expect } from '@playwright/test';`);
	lines.push('');
	lines.push(`/**`);
	lines.push(` * Generated Playwright tests for: ${journeyStories.journeyTitle}`);
	lines.push(` * Journey ID: ${journeyStories.journeyId}`);
	lines.push(` * Generated: ${new Date(journeyStories.generatedAt).toLocaleString()}`);
	lines.push(` */`);
	lines.push('');

	journeyStories.stories.forEach(story => {
		lines.push(`test.describe('${story.title}', () => {`);
		lines.push(`  // Story: As a ${story.asA}, I want ${story.iWant}, so that ${story.soThat}`);
		lines.push(`  // Pages: ${story.pages.join(', ')}`);
		lines.push('');

		story.testScenarios.forEach(scenario => {
			const testName = scenario.title.replace(/'/g, "\\'");
			lines.push(`  test('${testName}', async ({ page }) => {`);
			lines.push(`    // ${scenario.description}`);
			lines.push(`    // Priority: ${scenario.priority}`);
			lines.push(`    // Tags: ${scenario.tags.join(', ')}`);
			lines.push('');

			scenario.steps.forEach((step, index) => {
				lines.push(`    // Step ${index + 1}: ${step}`);
				lines.push(`    // TODO: Implement step`);
				lines.push('');
			});

			lines.push(`    // Expected: ${scenario.expectedResult}`);
			lines.push(`    // TODO: Add assertions`);
			lines.push('');
			lines.push(`  });`);
			lines.push('');
		});

		lines.push(`});`);
		lines.push('');
	});

	return lines.join('\n');
}

/**
 * Format as console output (for CLI)
 */
export function formatAsConsole(journeyStories: JourneyStories): string {
	const lines: string[] = [];

	lines.push('');
	lines.push('═══════════════════════════════════════════════════════════════');
	lines.push(`  📖 User Stories Generated: ${journeyStories.journeyTitle}`);
	lines.push('═══════════════════════════════════════════════════════════════');
	lines.push('');

	// Summary
	lines.push('📊 Summary:');
	lines.push(`   Stories: ${journeyStories.summary.totalStories}`);
	lines.push(`   Acceptance Criteria: ${journeyStories.summary.totalAcceptanceCriteria}`);
	lines.push(`   Test Scenarios: ${journeyStories.summary.totalTestScenarios}`);
	lines.push('');

	// Stories
	journeyStories.stories.forEach((story, index) => {
		lines.push(`${index + 1}. ${story.title}`);
		lines.push(`   ID: ${story.id}`);
		lines.push(`   Complexity: ${story.estimatedComplexity} | Pages: ${story.pages.length}`);
		lines.push(`   As a ${story.asA}`);
		lines.push(`   I want ${story.iWant}`);
		lines.push(`   So that ${story.soThat}`);
		lines.push('');
		lines.push(`   ✓ ${story.acceptanceCriteria.length} acceptance criteria`);
		lines.push(`   ✓ ${story.testScenarios.length} test scenarios`);
		lines.push('');
	});

	lines.push('═══════════════════════════════════════════════════════════════');
	lines.push('');

	return lines.join('\n');
}
