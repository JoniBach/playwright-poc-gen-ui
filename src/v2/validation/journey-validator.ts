import type { ValidationError, ValidationResult, AutoFixResult } from './validation-types.js';
import { JourneyJson } from '../schemas/journey.js';
import {
    validateTextInput,
    validateRadios,
    validateCheckboxes,
    validateHeading,
    validateParagraph,
    validateInsetText,
    validateWarningText,
    validateButton
} from './component-validators.js';

/**
 * Validation utility that mimics the actual UI schema validation
 * This catches errors BEFORE saving the file
 */

/**
 * Validate a journey against the UI schema requirements
 */
export function validateJourney(journey: JourneyJson): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Validate basic structure
    if (!journey.id) {
        errors.push({ path: ['id'], message: 'Journey must have an id' });
    }
    if (!journey.name) {
        errors.push({ path: ['name'], message: 'Journey must have a name' });
    }
    if (!journey.startPage) {
        errors.push({ path: ['startPage'], message: 'Journey must have a startPage' });
    }
    if (!journey.pages || Object.keys(journey.pages).length === 0) {
        errors.push({ path: ['pages'], message: 'Journey must have at least one page' });
    }

    // Validate each page
    if (journey.pages) {
        Object.entries(journey.pages).forEach(([pageId, page]) => {
            // Check page structure
            if (!page.id) {
                errors.push({ path: ['pages', pageId, 'id'], message: 'Page must have an id' });
            }
            if (!page.title) {
                errors.push({ path: ['pages', pageId, 'title'], message: 'Page must have a title' });
            }
            if (!page.components || page.components.length === 0) {
                warnings.push(`Page ${pageId} has no components`);
            }

            // Validate each component
            page.components?.forEach((component, idx) => {
                const componentPath = ['pages', pageId, 'components', idx.toString()];
                
                if (!component.type) {
                    errors.push({ 
                        path: [...componentPath, 'type'], 
                        message: 'Component must have a type' 
                    });
                    return;
                }

                if (!component.id) {
                    errors.push({ 
                        path: [...componentPath, 'id'], 
                        message: `Component of type ${component.type} must have an id` 
                    });
                }

                // Check for duplicate title in heading components
                if (component.type === 'heading' && page.title) {
                    const headingText = component.props?.text || (component.props as any)?.content;
                    if (headingText && headingText === page.title) {
                        errors.push({
                            path: [...componentPath, 'props'],
                            message: `Heading component duplicates the page title "${page.title}". The page title is automatically rendered as an <h1> by GovUKPage, so this heading component is redundant and creates duplicate <h1> elements.`,
                            expected: 'A different heading text or remove this component',
                            received: headingText
                        });
                    }
                }

                // Type-specific validation
                switch (component.type) {
                    case 'textInput':
                        validateTextInput(component as any, componentPath, errors);
                        break;
                    case 'radios':
                        validateRadios(component as any, componentPath, errors);
                        break;
                    case 'checkboxes':
                        validateCheckboxes(component as any, componentPath, errors);
                        break;
                    case 'heading':
                        validateHeading(component as any, componentPath, errors);
                        break;
                    case 'paragraph':
                        validateParagraph(component as any, componentPath, errors);
                        break;
                    case 'insetText':
                        validateInsetText(component as any, componentPath, errors);
                        break;
                    case 'warningText':
                        validateWarningText(component as any, componentPath, errors);
                        break;
                    case 'button':
                        validateButton(component as any, componentPath, errors);
                        break;
                    default:
                        warnings.push(`Unknown component type: ${(component as any).type} at ${componentPath.join('.')}`);
                }
            });
        });
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Display validation results in a user-friendly format
 */
export function displayValidationResults(result: ValidationResult, journeyId: string): void {
    if (result.valid) {
        console.log('✅ Journey validation passed!\n');
        if (result.warnings.length > 0) {
            console.log('⚠️  Warnings:');
            result.warnings.forEach(warning => {
                console.log(`   - ${warning}`);
            });
            console.log('');
        }
        return;
    }

    console.error('\n❌ Journey validation FAILED!\n');
    console.error(`Found ${result.errors.length} error(s) in journey "${journeyId}":\n`);

    result.errors.forEach((error, idx) => {
        console.error(`${idx + 1}. Path: ${error.path.join(' → ')}`);
        console.error(`   Message: ${error.message}`);
        if (error.expected) {
            console.error(`   Expected: ${error.expected}`);
            console.error(`   Received: ${error.received || 'undefined'}`);
        }
        console.error('');
    });

    if (result.warnings.length > 0) {
        console.log('⚠️  Warnings:');
        result.warnings.forEach(warning => {
            console.log(`   - ${warning}`);
        });
        console.log('');
    }
}

/**
 * Attempt to auto-fix common validation errors
 */
export function autoFixJourney(journey: JourneyJson): AutoFixResult {
    const changes: string[] = [];
    const fixed = JSON.parse(JSON.stringify(journey)); // Deep clone

    // Fix pages
    if (fixed.pages) {
        Object.entries(fixed.pages).forEach(([pageId, page]: [string, any]) => {
            // Track components to remove (duplicate headings)
            const componentsToRemove: number[] = [];

            page.components?.forEach((component: any, idx: number) => {
                const componentId = component.id || `${component.type}-${idx}`;

                // Fix duplicate heading: remove heading components that match the page title
                if (component.type === 'heading' && page.title) {
                    const headingText = component.props?.text || component.props?.content;
                    if (headingText && headingText === page.title) {
                        componentsToRemove.push(idx);
                        changes.push(`Removed duplicate heading "${headingText}" from page ${pageId} (page title already renders this as <h1>)`);
                        return; // Skip other fixes for this component since it will be removed
                    }
                }

                // Fix textInput: add id to props
                if (component.type === 'textInput' && component.props && !component.props.id) {
                    component.props.id = componentId;
                    changes.push(`Added missing id to textInput props at page ${pageId}, component ${idx}`);
                }

                // Fix radios: add id to props
                if (component.type === 'radios' && component.props && !component.props.id) {
                    component.props.id = componentId;
                    changes.push(`Added missing id to radios props at page ${pageId}, component ${idx}`);
                }

                // Fix checkboxes: add id to props
                if (component.type === 'checkboxes' && component.props && !component.props.id) {
                    component.props.id = componentId;
                    changes.push(`Added missing id to checkboxes props at page ${pageId}, component ${idx}`);
                }

                // Fix warningText: rename text to content
                if (component.type === 'warningText' && component.props) {
                    if (component.props.text && !component.props.content) {
                        component.props.content = component.props.text;
                        delete component.props.text;
                        changes.push(`Renamed text to content in warningText at page ${pageId}, component ${idx}`);
                    }
                }
            });

            // Remove duplicate heading components (in reverse order to maintain indices)
            componentsToRemove.reverse().forEach(idx => {
                page.components.splice(idx, 1);
            });
        });
    }

    return { fixed, changes };
}
