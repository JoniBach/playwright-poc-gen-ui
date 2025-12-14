import { z } from 'zod';

/**
 * Validation types and interfaces for journey validation
 */

export interface ValidationError {
    path: string[];
    message: string;
    expected?: string;
    received?: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: string[];
}

export interface AutoFixResult {
    fixed: any;
    changes: string[];
}
