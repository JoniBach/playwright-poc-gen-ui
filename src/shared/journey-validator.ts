import { z } from 'zod';
import type { JourneyJson } from './journey-generator.js';

/**
 * Validation utility that mimics the actual UI schema validation
 * This catches errors BEFORE saving the file
 */

interface ValidationError {
    path: string[];
    message: string;
    expected?: string;
    received?: string;
}

interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: string[];
}

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

                // Type-specific validation
                switch (component.type) {
                    case 'textInput':
                        validateTextInput(component, componentPath, errors);
                        break;
                    case 'radios':
                        validateRadios(component, componentPath, errors);
                        break;
                    case 'checkboxes':
                        validateCheckboxes(component, componentPath, errors);
                        break;
                    case 'heading':
                        validateHeading(component, componentPath, errors);
                        break;
                    case 'paragraph':
                        validateParagraph(component, componentPath, errors);
                        break;
                    case 'insetText':
                        validateInsetText(component, componentPath, errors);
                        break;
                    case 'warningText':
                        validateWarningText(component, componentPath, errors);
                        break;
                    case 'button':
                        validateButton(component, componentPath, errors);
                        break;
                    default:
                        warnings.push(`Unknown component type: ${component.type} at ${componentPath.join('.')}`);
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

function validateTextInput(component: any, path: string[], errors: ValidationError[]) {
    const props = component.props || {};
    
    // Required fields
    if (!props.id) {
        errors.push({ 
            path: [...path, 'props', 'id'], 
            message: 'textInput props must have an id field',
            expected: 'string',
            received: 'undefined'
        });
    }
    if (!props.name) {
        errors.push({ path: [...path, 'props', 'name'], message: 'textInput must have name' });
    }
    if (!props.label) {
        errors.push({ 
            path: [...path, 'props', 'label'], 
            message: 'textInput must have label',
            expected: 'string',
            received: 'undefined'
        });
    }
}

function validateRadios(component: any, path: string[], errors: ValidationError[]) {
    const props = component.props || {};
    
    // Required fields
    if (!props.id) {
        errors.push({ 
            path: [...path, 'props', 'id'], 
            message: 'radios props must have an id field',
            expected: 'string',
            received: 'undefined'
        });
    }
    if (!props.name) {
        errors.push({ path: [...path, 'props', 'name'], message: 'radios must have name' });
    }
    if (!props.legend) {
        errors.push({ 
            path: [...path, 'props', 'legend'], 
            message: 'radios must have legend',
            expected: 'string',
            received: 'undefined'
        });
    }
    if (!props.items || !Array.isArray(props.items)) {
        errors.push({ path: [...path, 'props', 'items'], message: 'radios must have items array' });
    }
}

function validateCheckboxes(component: any, path: string[], errors: ValidationError[]) {
    const props = component.props || {};
    
    // Required fields
    if (!props.id) {
        errors.push({ 
            path: [...path, 'props', 'id'], 
            message: 'checkboxes props must have an id field',
            expected: 'string',
            received: 'undefined'
        });
    }
    if (!props.name) {
        errors.push({ path: [...path, 'props', 'name'], message: 'checkboxes must have name' });
    }
    if (!props.legend) {
        errors.push({ 
            path: [...path, 'props', 'legend'], 
            message: 'checkboxes must have legend',
            expected: 'string',
            received: 'undefined'
        });
    }
    if (!props.items || !Array.isArray(props.items)) {
        errors.push({ path: [...path, 'props', 'items'], message: 'checkboxes must have items array' });
    }
}

function validateHeading(component: any, path: string[], errors: ValidationError[]) {
    const props = component.props || {};
    
    // Must have either text or content
    if (!props.text && !props.content) {
        errors.push({ 
            path: [...path, 'props'], 
            message: 'heading must have either text or content property' 
        });
    }
}

function validateParagraph(component: any, path: string[], errors: ValidationError[]) {
    const props = component.props || {};
    
    // Must have either text or content
    if (!props.text && !props.content) {
        errors.push({ 
            path: [...path, 'props'], 
            message: 'paragraph must have either text or content property' 
        });
    }
}

function validateInsetText(component: any, path: string[], errors: ValidationError[]) {
    const props = component.props || {};
    
    // Must have either text or content
    if (!props.text && !props.content) {
        errors.push({ 
            path: [...path, 'props'], 
            message: 'insetText must have either text or content property' 
        });
    }
}

function validateWarningText(component: any, path: string[], errors: ValidationError[]) {
    const props = component.props || {};
    
    // Must have content (not text)
    if (!props.content) {
        errors.push({ 
            path: [...path, 'props', 'content'], 
            message: 'warningText must have content property (not text)',
            expected: 'string',
            received: 'undefined'
        });
    }
    
    // Warn if using text instead of content
    if (props.text && !props.content) {
        errors.push({ 
            path: [...path, 'props'], 
            message: 'warningText uses "text" but should use "content"' 
        });
    }
}

function validateButton(component: any, path: string[], errors: ValidationError[]) {
    const props = component.props || {};
    
    if (!props.text) {
        errors.push({ 
            path: [...path, 'props', 'text'], 
            message: 'button must have text' 
        });
    }
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
export function autoFixJourney(journey: JourneyJson): { fixed: JourneyJson; changes: string[] } {
    const changes: string[] = [];
    const fixed = JSON.parse(JSON.stringify(journey)); // Deep clone

    // Fix pages
    if (fixed.pages) {
        Object.entries(fixed.pages).forEach(([pageId, page]: [string, any]) => {
            page.components?.forEach((component: any, idx: number) => {
                const componentId = component.id || `${component.type}-${idx}`;
                
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
        });
    }

    return { fixed, changes };
}
