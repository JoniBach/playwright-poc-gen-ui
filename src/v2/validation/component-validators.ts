import type { ValidationError } from './validation-types.js';

/**
 * Component-specific validation functions
 */

export function validateTextInput(component: any, path: string[], errors: ValidationError[]) {
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

export function validateRadios(component: any, path: string[], errors: ValidationError[]) {
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

export function validateCheckboxes(component: any, path: string[], errors: ValidationError[]) {
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

export function validateHeading(component: any, path: string[], errors: ValidationError[]) {
    const props = component.props || {};

    // Must have either text or content
    if (!props.text && !props.content) {
        errors.push({
            path: [...path, 'props'],
            message: 'heading must have either text or content property'
        });
    }
}

export function validateParagraph(component: any, path: string[], errors: ValidationError[]) {
    const props = component.props || {};

    // Must have either text or content
    if (!props.text && !props.content) {
        errors.push({
            path: [...path, 'props'],
            message: 'paragraph must have either text or content property'
        });
    }
}

export function validateInsetText(component: any, path: string[], errors: ValidationError[]) {
    const props = component.props || {};

    // Must have either text or content
    if (!props.text && !props.content) {
        errors.push({
            path: [...path, 'props'],
            message: 'insetText must have either text or content property'
        });
    }
}

export function validateWarningText(component: any, path: string[], errors: ValidationError[]) {
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

export function validateButton(component: any, path: string[], errors: ValidationError[]) {
    const props = component.props || {};

    if (!props.text) {
        errors.push({
            path: [...path, 'props', 'text'],
            message: 'button must have text'
        });
    }
}
